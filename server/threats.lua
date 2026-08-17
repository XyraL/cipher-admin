-- Cipher-Admin Server — Threat Detection
--
-- Detections come in two kinds, marked on each handler below.
--
--   SERVER-AUTHORITATIVE — entity state the server owns under OneSync, or
--   network events it receives regardless of what the client sends. Cannot be
--   suppressed or forged client-side.
--
--   ADVISORY — from the client heartbeat, for state with no server-side
--   native. Spoofable; the useful signal is a client that stops answering.
--
-- Everything ships as action='flag'. Auto-actions are opt-in per detection.
--
-- Staff are exempt by default: noclip is a teleport, god mode is a health
-- anomaly, and bring is a 900m jump on the person being brought.

local IsAdmin       = function(src) return exports['cipher-admin']:IsAdmin(src) end
local HasPermission = function(src, p) return exports['cipher-admin']:HasPermission(src, p) end
local GetIds        = function(src) return exports['cipher-admin']:GetIdentifiers(src) end

-- Load marker for the boot self-check in server/main.lua.
CipherAdminThreats = true

local AC = Config.AntiCheat or { Enabled = false, Detections = {} }

-- ── State ─────────────────────────────────────────────────────────────────────

-- Counts decay, so a player who trips one check a week never accumulates
-- their way into an automatic ban.
local COUNT_WINDOW = 600

local _counts    = {}   -- src -> { [detection] = { n, first, last } }
local _exempt    = {}   -- src -> os.time() until which they are not checked
local _connected = {}   -- src -> os.time() of connect, for the grace period
local _lastPos   = {}   -- src -> { x, y, z, t } from the previous sweep
local _rate      = {}   -- src -> { [key] = { count, windowStart } }
local _recent    = {}   -- newest-first ring of flags, for the panel's live feed
local _adminSrcs = {}   -- refreshed on a timer; who to push live flags to
local _heartbeat = {}   -- src -> { last = os.time(), misses = 0 }
local _flagged   = {}   -- src -> { [detection] = true } — first-hit dedupe

local RECENT_MAX = 300

local SEVERITY = {
    health       = 'high',
    teleport     = 'medium',
    speed        = 'medium',
    explosion    = 'high',
    weapondamage = 'high',
    entityspawn  = 'medium',
    giveweapon   = 'high',
    taskclear    = 'medium',
    armour       = 'medium',
    silent       = 'low',
    evasion      = 'high',
}

local LABELS = {
    health       = 'Health overflow',
    teleport     = 'Impossible movement',
    speed        = 'Impossible speed',
    explosion    = 'Explosion abuse',
    weapondamage = 'Weapon damage anomaly',
    entityspawn  = 'Entity spawn abuse',
    giveweapon   = 'Client weapon give',
    taskclear    = 'Remote task clear',
    armour       = 'Armour overflow',
    silent       = 'Client agent silent',
    evasion      = 'Ban evasion',
}

-- hash -> name, built at start so the hot paths are lookups not GetHashKey.
local _blModels  = {}
local _blWeapons = {}

-- ── Helpers ───────────────────────────────────────────────────────────────────

local function DetCfg(key)
    local d = AC.Detections and AC.Detections[key]
    if not d or d.enabled == false then return nil end
    return d
end

local function PlayerName(src)
    local ok, name = pcall(GetPlayerName, src)
    return (ok and name) or ('src ' .. tostring(src))
end

local function CitizenId(src)
    local ok, p = pcall(Framework.GetPlayer, src)
    if ok and p and p.PlayerData then return p.PlayerData.citizenid end
    return nil
end

local function IsExempt(src)
    if _exempt[src] and _exempt[src] > os.time() then return true end

    local since = _connected[src]
    if since and (os.time() - since) < (AC.ConnectGrace or 90) then return true end

    if AC.ExemptAdmins ~= false and IsAdmin(src) then return true end

    return false
end

-- Sliding-window rate limiter, shared by the explosion and spawn checks.
local function RateExceeded(src, key, maxPerMinute)
    if not maxPerMinute or maxPerMinute <= 0 then return false end
    local now = os.time()
    _rate[src] = _rate[src] or {}
    local r = _rate[src][key]
    if not r or (now - r.windowStart) >= 60 then
        _rate[src][key] = { count = 1, windowStart = now }
        return false
    end
    r.count = r.count + 1
    return r.count > maxPerMinute
end

-- ── Flag pipeline ─────────────────────────────────────────────────────────────

local function PushToAdmins(payload)
    if AC.NotifyAdmins == false then return end
    for _, asrc in ipairs(_adminSrcs) do
        TriggerClientEvent('cipher-admin:client:threatFlag', asrc, payload)
    end
end

local function PostWebhook(payload)
    local url = (AC.Webhook and AC.Webhook ~= '' and AC.Webhook) or Config.AuditWebhook
    if not url or url == '' then return end

    local colors = { low = 10197915, medium = 16098851, high = 15022389 }

    PerformHttpRequest(url, function() end, 'POST', json.encode({
        embeds = { {
            title  = 'Threat flag: ' .. (LABELS[payload.detection] or payload.detection),
            color  = colors[payload.severity] or 15022389,
            fields = {
                { name = 'Player',   value = payload.player_name or 'N/A',       inline = true },
                { name = 'Severity', value = payload.severity or 'N/A',          inline = true },
                { name = 'Count',    value = tostring(payload.count or 1),       inline = true },
                { name = 'Detail',   value = payload.detail or 'N/A',            inline = false },
            },
            timestamp = os.date('!%Y-%m-%dT%H:%M:%SZ'),
        } },
    }), { ['Content-Type'] = 'application/json' })
end

local function ApplyAction(src, det, cfg, count, detail)
    if count < (cfg.threshold or 1) then return nil end

    local action = cfg.action or 'flag'
    if action == 'kick' then
        DropPlayer(src, ('Kicked by threat detection: %s'):format(LABELS[det] or det))
        return 'kick'
    elseif action == 'ban' then
        local reason = ('Threat detection: %s (%s)'):format(LABELS[det] or det, detail or '')
        -- Same path as a staff ban: every identifier attached.
        local ok = pcall(function()
            exports['cipher-admin']:SystemBan(src, reason, cfg.banDuration or 0)
        end)
        if not ok then
            DropPlayer(src, ('Kicked by threat detection: %s'):format(LABELS[det] or det))
            return 'kick'
        end
        return 'ban'
    end

    return nil
end

-- src is nil for evasion hits, which are raised during the connect deferral.
local function Flag(src, det, detail, meta)
    if not AC.Enabled then return end

    local cfg = DetCfg(det)
    if not cfg then return end

    if src and IsExempt(src) then return end

    local now = os.time()

    -- Rolling count for this detection
    local count = 1
    if src then
        _counts[src] = _counts[src] or {}
        local c = _counts[src][det]
        if c and (now - c.last) < COUNT_WINDOW then
            c.n = c.n + 1
            c.last = now
            count = c.n
        else
            _counts[src][det] = { n = 1, first = now, last = now }
        end
    end

    local name    = meta and meta.playerName or (src and PlayerName(src)) or 'Unknown'
    local license = meta and meta.license
    local cid     = meta and meta.citizenid

    if src and not license then
        local ok, ids = pcall(GetIds, src)
        if ok and ids then license = ids.license end
    end
    if src and not cid then cid = CitizenId(src) end

    local payload = {
        src         = src,
        detection   = det,
        label       = LABELS[det] or det,
        severity    = SEVERITY[det] or 'medium',
        detail      = detail,
        player_name = name,
        citizenid   = cid,
        license     = license,
        count       = count,
        created_at  = os.date('%Y-%m-%d %H:%M:%S'),
    }

    MySQL.insert('INSERT INTO admin_flags (citizenid, license, player_name, detection, severity, detail, meta) VALUES (?,?,?,?,?,?,?)', {
        cid, license, name, det, payload.severity, detail, meta and json.encode(meta) or nil,
    })

    table.insert(_recent, 1, payload)
    if #_recent > RECENT_MAX then table.remove(_recent) end

    -- Only the first hit of a type per player is pushed live. A speed hack
    -- trips its check every sweep; unthrottled, staff learn to ignore the feed.
    local firstOfType = false
    if src then
        _flagged[src] = _flagged[src] or {}
        if not _flagged[src][det] then
            _flagged[src][det] = true
            firstOfType = true
        end
    else
        firstOfType = true
    end

    if firstOfType then
        PushToAdmins(payload)
        PostWebhook(payload)
    end

    if src then
        local taken = ApplyAction(src, det, cfg, count, detail)
        if taken then
            payload.action = taken
            PushToAdmins({ detection = det, label = LABELS[det] or det, severity = 'high',
                           player_name = name, detail = ('Auto-action: %s'):format(taken),
                           created_at = payload.created_at, count = count })
        end
    end
end

-- ── SERVER-AUTHORITATIVE: entity sweep ───────────────────────────────────────
-- Reads the server's own copy of the ped. Needs OneSync; without it the sweep
-- does not start and says so at boot rather than flagging everyone.

local _onesync = false

local function SweepPlayer(src, dt)
    local ok, ped = pcall(GetPlayerPed, src)
    if not ok or not ped or ped == 0 then return end

    -- At the ceiling is ordinary, so the check is strictly greater.
    local hCfg = DetCfg('health')
    if hCfg then
        local okH, health = pcall(GetEntityHealth, ped)
        local maxH = hCfg.maxHealth or 200
        if okH and health and health > maxH then
            Flag(src, 'health', ('Health %d (max %d)'):format(health, maxH))
        end
    end

    local okC, coords = pcall(GetEntityCoords, ped)
    if not okC or not coords then return end

    local prev = _lastPos[src]
    _lastPos[src] = { x = coords.x, y = coords.y, z = coords.z, t = os.time() }
    if not prev then return end

    local dx, dy, dz = coords.x - prev.x, coords.y - prev.y, coords.z - prev.z
    local dist = math.sqrt(dx * dx + dy * dy + dz * dz)

    -- A ped at the origin is loading, dead, or between interiors — measuring a
    -- jump to or from 0,0,0 is a guaranteed false positive.
    if (math.abs(coords.x) < 1.0 and math.abs(coords.y) < 1.0)
        or (math.abs(prev.x) < 1.0 and math.abs(prev.y) < 1.0) then
        return
    end

    local inVehicle = false
    local okV, veh = pcall(GetVehiclePedIsIn, ped)
    if okV and veh and veh ~= 0 then inVehicle = true end

    local tCfg = DetCfg('teleport')
    if tCfg and not inVehicle and dist > (tCfg.maxDistance or 200.0) then
        Flag(src, 'teleport', ('Moved %.0fm on foot in %ds'):format(dist, dt))
    end

    local sCfg = DetCfg('speed')
    if sCfg then
        local okVel, vel = pcall(GetEntityVelocity, ped)
        if okVel and vel then
            local speed = math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z)
            local limit = inVehicle and (sCfg.maxVehicle or 130.0) or (sCfg.maxOnFoot or 15.0)
            if speed > limit then
                Flag(src, 'speed', ('%.1f m/s %s (limit %.0f)')
                    :format(speed, inVehicle and 'in vehicle' or 'on foot', limit))
            end
        end
    end
end

CreateThread(function()
    if not AC.Enabled then return end

    Wait(5000)

    _onesync = GetConvar('onesync', 'off') ~= 'off'
    if not _onesync then
        print('^3[cipher-admin]^0 OneSync is off — server-side health/position/speed')
        print('^3[cipher-admin]^0 detection is disabled. Event-based detection (explosions,')
        print('^3[cipher-admin]^0 weapon damage, entity spawns) still runs.')
        return
    end

    local interval = math.max(1, AC.PollInterval or 3)

    while true do
        Wait(interval * 1000)
        if AC.Enabled then
            for _, psrc in ipairs(GetPlayers()) do
                local src = tonumber(psrc)
                if src and not IsExempt(src) then
                    pcall(SweepPlayer, src, interval)
                end
            end
        end
    end
end)

-- ── SERVER-AUTHORITATIVE: explosions ─────────────────────────────────────────
-- Blacklisted types are cancelled outright rather than logged after the fact.

AddEventHandler('explosionEvent', function(sender, ev)
    local cfg = DetCfg('explosion')
    if not cfg then return end

    local src = tonumber(sender)
    if not src or src <= 0 then return end
    if IsExempt(src) then return end

    local etype = ev and ev.explosionType
    local blacklisted = etype and AC.BlacklistedExplosions and AC.BlacklistedExplosions[etype]

    if blacklisted then
        if cfg.cancelBlacklisted ~= false then CancelEvent() end
        Flag(src, 'explosion', ('Blacklisted explosion: %s (type %d)'):format(blacklisted, etype))
        return
    end

    if RateExceeded(src, 'explosion', cfg.maxPerMinute) then
        Flag(src, 'explosion', ('More than %d explosions in a minute'):format(cfg.maxPerMinute or 12))
    end
end)

-- ── SERVER-AUTHORITATIVE: weapon damage ──────────────────────────────────────
-- overrideDefaultDamage being set at all is the stronger signal: it is the
-- client saying "ignore the weapon's damage, use mine". Gameplay never sets it.

AddEventHandler('weaponDamageEvent', function(sender, data)
    local cfg = DetCfg('weapondamage')
    if not cfg then return end

    local src = tonumber(sender)
    if not src or src <= 0 then return end
    if IsExempt(src) then return end

    if data.overrideDefaultDamage then
        Flag(src, 'weapondamage', 'Client set overrideDefaultDamage')
        return
    end

    local dmg = tonumber(data.weaponDamage) or 0
    local maxDmg = cfg.maxDamage or 250
    if dmg > maxDmg then
        Flag(src, 'weapondamage', ('Damage %d exceeds cap %d'):format(dmg, maxDmg))
    end
end)

-- ── SERVER-AUTHORITATIVE: entity creation ────────────────────────────────────
-- Fires before the entity exists network-wide, so cancelling means it is never
-- spawned. Server-created entities have no owner and are skipped.

AddEventHandler('entityCreating', function(entity)
    local cfg = DetCfg('entityspawn')
    if not cfg then return end

    local okOwner, owner = pcall(NetworkGetEntityOwner, entity)
    if not okOwner or not owner or owner <= 0 then return end

    local src = owner
    if IsExempt(src) then return end

    local okModel, model = pcall(GetEntityModel, entity)
    if okModel and model and _blModels[model] then
        if cfg.cancelBlacklisted ~= false then CancelEvent() end
        Flag(src, 'entityspawn', ('Blacklisted model: %s'):format(_blModels[model]))
        return
    end

    if RateExceeded(src, 'entityspawn', cfg.maxPerMinute) then
        Flag(src, 'entityspawn', ('More than %d entities spawned in a minute'):format(cfg.maxPerMinute or 25))
    end
end)

-- ── SERVER-AUTHORITATIVE: client weapon gives ────────────────────────────────
-- The event a client fires to arm a ped it does not own.

AddEventHandler('giveWeaponEvent', function(sender, data)
    local cfg = DetCfg('giveweapon')
    if not cfg then return end

    local src = tonumber(sender)
    if not src or src <= 0 then return end
    if IsExempt(src) then return end

    local hash = data and data.weaponType
    local name = hash and _blWeapons[hash]
    if name then
        CancelEvent()
        Flag(src, 'giveweapon', ('Blacklisted weapon: %s'):format(name))
    end
end)

-- ── SERVER-AUTHORITATIVE: remote task clears ─────────────────────────────────
-- The mechanism behind remote ragdoll, remote freeze and drag-from-vehicle.

AddEventHandler('clearPedTasksEvent', function(sender, data)
    local cfg = DetCfg('taskclear')
    if not cfg then return end

    local src = tonumber(sender)
    if not src or src <= 0 then return end
    if IsExempt(src) then return end

    local pedNet = data and data.pedId
    if not pedNet then return end

    local okEnt, ent = pcall(NetworkGetEntityFromNetworkId, pedNet)
    if not okEnt or not ent or ent == 0 then return end

    local okOwn, owner = pcall(NetworkGetEntityOwner, ent)
    if not okOwn or not owner then return end

    -- Clearing your own tasks is ordinary; doing it to someone else is not.
    if owner ~= src then
        Flag(src, 'taskclear', ('Cleared tasks on %s\'s ped'):format(PlayerName(owner)))
    end
end)

-- ── ADVISORY: client heartbeat ───────────────────────────────────────────────
-- Values are spoofable. The reliable half is the absence of a report.

RegisterNetEvent('cipher-admin:server:heartbeat')
AddEventHandler('cipher-admin:server:heartbeat', function(data)
    local src = source
    if not AC.Enabled then return end

    _heartbeat[src] = { last = os.time(), misses = 0 }

    if IsExempt(src) then return end
    if type(data) ~= 'table' then return end

    local aCfg = DetCfg('armour')
    if aCfg then
        local armour = tonumber(data.armour) or 0
        local maxA = aCfg.maxArmour or 100
        if armour > maxA then
            Flag(src, 'armour', ('Armour %d (max %d)'):format(armour, maxA))
        end
    end
end)

CreateThread(function()
    if not AC.Enabled then return end
    local hb = AC.Heartbeat or {}
    if hb.Enabled == false then return end

    local interval = math.max(5, hb.Interval or 10)
    local allowed  = math.max(1, hb.MissesBeforeFlag or 3)

    Wait(20000)

    while true do
        Wait(interval * 1000)
        if AC.Enabled and DetCfg('silent') then
            local now = os.time()
            for _, psrc in ipairs(GetPlayers()) do
                local src = tonumber(psrc)
                if src and not IsExempt(src) then
                    local h = _heartbeat[src]
                    if not h then
                        _heartbeat[src] = { last = now, misses = 0 }
                    elseif (now - h.last) > (interval * allowed) then
                        h.misses = h.misses + 1
                        h.last   = now   -- re-arm so one silent client flags once per window
                        Flag(src, 'silent', ('No client report for %ds'):format(interval * allowed))
                    end
                end
            end
        end
    end
end)

-- ── Lifecycle ─────────────────────────────────────────────────────────────────

AddEventHandler('playerConnecting', function()
    _connected[source] = os.time()
end)

AddEventHandler('playerDropped', function()
    local src = source
    _counts[src], _exempt[src], _connected[src] = nil, nil, nil
    _lastPos[src], _rate[src], _heartbeat[src], _flagged[src] = nil, nil, nil, nil
end)

-- Refreshed on a timer, not per flag: building the admin cache walks every
-- player, and a flood of flags is when you least want to do that per event.
CreateThread(function()
    while true do
        local list = {}
        for _, psrc in ipairs(GetPlayers()) do
            local src = tonumber(psrc)
            if src and IsAdmin(src) and HasPermission(src, 'viewthreats') then
                list[#list + 1] = src
            end
        end
        _adminSrcs = list
        Wait(30000)
    end
end)

AddEventHandler('onResourceStart', function(res)
    if res ~= GetCurrentResourceName() then return end

    MySQL.query.await([[
        CREATE TABLE IF NOT EXISTS `admin_flags` (
            `id`          INT AUTO_INCREMENT PRIMARY KEY,
            `citizenid`   VARCHAR(50)  DEFAULT NULL,
            `license`     VARCHAR(100) DEFAULT NULL,
            `player_name` VARCHAR(100) DEFAULT NULL,
            `detection`   VARCHAR(40)  NOT NULL,
            `severity`    VARCHAR(10)  DEFAULT 'medium',
            `detail`      TEXT         DEFAULT NULL,
            `meta`        TEXT         DEFAULT NULL,
            `handled`     TINYINT(1)   DEFAULT 0,
            `handled_by`  VARCHAR(100) DEFAULT NULL,
            `created_at`  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
            KEY `idx_detection` (`detection`),
            KEY `idx_created`   (`created_at`),
            KEY `idx_license`   (`license`),
            KEY `idx_handled`   (`handled`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ]])

    for _, m in ipairs(AC.BlacklistedModels or {}) do
        _blModels[GetHashKey(m)] = m
    end
    for _, w in ipairs(AC.BlacklistedWeapons or {}) do
        _blWeapons[GetHashKey(w)] = w
    end

    if AC.Enabled then
        local n = 0
        for _ in pairs(AC.Detections or {}) do n = n + 1 end
        print(('[Cipher-Admin] Threat detection active — %d detections configured.'):format(n))
    else
        print('[Cipher-Admin] Threat detection disabled in config.')
    end
end)

-- ── NUI callbacks ─────────────────────────────────────────────────────────────

lib.callback.register('cipher-admin:server:getThreats', function(src, data)
    if not IsAdmin(src) then return nil end
    if not HasPermission(src, 'viewthreats') then return nil end

    data = data or {}

    local where, params = {}, {}
    if data.detection and #data.detection > 0 then
        where[#where + 1] = 'detection = ?'; params[#params + 1] = data.detection
    end
    if data.severity and #data.severity > 0 then
        where[#where + 1] = 'severity = ?'; params[#params + 1] = data.severity
    end
    if data.search and #data.search > 0 then
        where[#where + 1] = 'player_name LIKE ?'; params[#params + 1] = '%' .. data.search .. '%'
    end
    if data.unhandled then
        where[#where + 1] = 'handled = 0'
    end

    local sql = 'SELECT * FROM admin_flags'
    if #where > 0 then sql = sql .. ' WHERE ' .. table.concat(where, ' AND ') end
    sql = sql .. ' ORDER BY created_at DESC LIMIT 250'

    local rows = MySQL.query.await(sql, params) or {}

    -- Which are still online, so the panel can offer spectate/kick.
    local onlineByCid = {}
    for _, psrc in ipairs(GetPlayers()) do
        local psrcn = tonumber(psrc)
        local cid = CitizenId(psrcn)
        if cid then onlineByCid[cid] = psrcn end
    end
    for _, r in ipairs(rows) do
        r.label    = LABELS[r.detection] or r.detection
        r.onlineSrc = r.citizenid and onlineByCid[r.citizenid] or nil
    end

    local summary = MySQL.query.await([[
        SELECT detection, severity, COUNT(*) AS n
        FROM admin_flags
        WHERE created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
        GROUP BY detection, severity
        ORDER BY n DESC
    ]]) or {}
    for _, s in ipairs(summary) do s.label = LABELS[s.detection] or s.detection end

    local unhandled = MySQL.scalar.await('SELECT COUNT(*) FROM admin_flags WHERE handled = 0') or 0
    local last24    = MySQL.scalar.await('SELECT COUNT(*) FROM admin_flags WHERE created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)') or 0

    return {
        flags     = rows,
        summary   = summary,
        unhandled = unhandled,
        last24    = last24,
        enabled   = AC.Enabled and true or false,
        onesync   = _onesync,
        canManage = HasPermission(src, 'managethreats'),
    }
end)

lib.callback.register('cipher-admin:server:resolveThreat', function(src, data)
    if not IsAdmin(src) then return false end
    if not HasPermission(src, 'managethreats') then return false end

    local a = exports['cipher-admin']:GetAdminCache(src)
    local aName = a and a.name or 'Owner'

    if data.all then
        MySQL.update.await('UPDATE admin_flags SET handled = 1, handled_by = ? WHERE handled = 0', { aName })
        exports['cipher-admin']:Audit(src, 'RESOLVE_THREATS', nil, nil, 'Marked all flags handled')
    elseif data.player and #data.player > 0 then
        MySQL.update.await('UPDATE admin_flags SET handled = 1, handled_by = ? WHERE handled = 0 AND player_name = ?', { aName, data.player })
        exports['cipher-admin']:Audit(src, 'RESOLVE_THREATS', data.player, nil, 'Marked player flags handled')
    elseif data.id then
        MySQL.update.await('UPDATE admin_flags SET handled = 1, handled_by = ? WHERE id = ?', { aName, data.id })
    else
        return false
    end

    return true
end)

-- ── Exports ───────────────────────────────────────────────────────────────────

-- Stops an admin teleporting someone from flagging them for teleporting.
local function Exempt(src, seconds)
    if not src then return end
    _exempt[tonumber(src)] = os.time() + (seconds or AC.ActionExemptSeconds or 20)
end

exports('AcExempt', Exempt)
exports('AcFlag',   Flag)
exports('AcLabels', function() return LABELS end)

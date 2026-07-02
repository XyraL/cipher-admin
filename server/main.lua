-- Cipher-Admin Server Core — permissions engine, auth, audit

local QBX = exports['qbx_core']

-- ── In-memory caches ──────────────────────────────────────────────────────────
local _roles       = {}   -- name -> { label, color, permissions }
local _assignments = {}   -- citizenid -> roleName
local _adminCache  = {}   -- source -> { citizenid, name, role, permissions, isOwner }
local _dutyAdmins  = {}   -- citizenid -> { name, role, roleLabel, roleColor, since }

-- ── Helpers ───────────────────────────────────────────────────────────────────
local function GetIdentifiers(src)
    local ids = {}
    for i = 0, GetNumPlayerIdentifiers(src) - 1 do
        local id = GetPlayerIdentifier(src, i)
        if id then
            local t = id:match('^([^:]+):')
            if t then ids[t] = id end
        end
    end
    ids.ip = GetPlayerEndpoint(src)
    return ids
end

local function IsOwner(src)
    local ids = GetIdentifiers(src)
    for _, ownerLicense in ipairs(Config.Owners) do
        if ids.license == ownerLicense then return true end
    end
    return false
end

local function LoadRoles()
    local rows = MySQL.query.await('SELECT * FROM admin_roles')
    _roles = {}
    for _, r in ipairs(rows) do
        local ok, perms = pcall(json.decode, r.permissions)
        _roles[r.name] = {
            name        = r.name,
            label       = r.label,
            color       = r.color,
            permissions = ok and perms or {},
        }
    end
end

local function LoadAssignments()
    local rows = MySQL.query.await('SELECT citizenid, role FROM admin_assignments')
    _assignments = {}
    for _, r in ipairs(rows) do
        _assignments[r.citizenid] = r.role
    end
end

local function SeedDefaultRoles()
    local count = MySQL.scalar.await('SELECT COUNT(*) FROM admin_roles') or 0
    if count > 0 then return end
    for _, role in ipairs(Config.DefaultRoles) do
        MySQL.insert.await('INSERT IGNORE INTO admin_roles (name, label, color, permissions) VALUES (?,?,?,?)', {
            role.name, role.label, role.color, json.encode(role.permissions)
        })
    end
    print('[Cipher-Admin] Default roles seeded.')
end

-- ── Permission check ──────────────────────────────────────────────────────────
local function HasPermission(src, perm)
    local a = _adminCache[src]
    if not a then return false end
    if a.isOwner then return true end
    if not a.permissions then return false end
    return a.permissions[perm] == true or a.permissions.all == true
end

local function BuildAdminCache(src)
    if IsOwner(src) then
        _adminCache[src] = {
            citizenid   = nil,
            name        = GetPlayerName(src),
            role        = 'owner',
            roleLabel   = 'Owner',
            roleColor   = '#f59e0b',
            permissions = { all = true },
            isOwner     = true,
        }
        local p = QBX:GetPlayer(src)
        if p then _adminCache[src].citizenid = p.PlayerData.citizenid end
        return true
    end

    local p = QBX:GetPlayer(src)
    if not p then return false end
    local cid  = p.PlayerData.citizenid
    local role = _assignments[cid]
    if not role then return false end

    local roleData = _roles[role]
    if not roleData then return false end

    _adminCache[src] = {
        citizenid   = cid,
        name        = p.PlayerData.charinfo.firstname .. ' ' .. p.PlayerData.charinfo.lastname,
        role        = role,
        roleLabel   = roleData.label,
        roleColor   = roleData.color,
        permissions = roleData.permissions,
        isOwner     = false,
    }
    return true
end

local function IsAdmin(src)
    if _adminCache[src] then return true end
    return BuildAdminCache(src)
end

-- ── Audit log ─────────────────────────────────────────────────────────────────
local function Audit(adminSrc, action, targetName, targetCid, details)
    local a = _adminCache[adminSrc]
    local aName = a and a.name or GetPlayerName(adminSrc)
    local aCid  = a and a.citizenid or 'unknown'

    MySQL.insert('INSERT INTO admin_audit (action, admin_name, admin_citizenid, target_name, target_citizenid, details) VALUES (?,?,?,?,?,?)', {
        action, aName, aCid, targetName, targetCid, details
    })

    if Config.AuditWebhook ~= '' then
        PerformHttpRequest(Config.AuditWebhook, function() end, 'POST', json.encode({
            embeds = {{
                title  = '🔨 Cipher-Admin: ' .. action,
                color  = 15158332,
                fields = {
                    { name = 'Admin',   value = aName or 'N/A',      inline = true },
                    { name = 'Target',  value = targetName or 'N/A', inline = true },
                    { name = 'Details', value = details or 'N/A',    inline = false },
                },
                timestamp = os.date('!%Y-%m-%dT%H:%M:%SZ'),
            }}
        }), { ['Content-Type'] = 'application/json' })
    end
end

-- ── Init ──────────────────────────────────────────────────────────────────────
local _serverStartTime = os.time()

AddEventHandler('onResourceStart', function(res)
    if res ~= GetCurrentResourceName() then return end
    MySQL.query.await([[
        CREATE TABLE IF NOT EXISTS `admin_reports` (
            `id` int(11) NOT NULL AUTO_INCREMENT,
            `citizenid` varchar(50) DEFAULT NULL,
            `player_name` varchar(100) DEFAULT NULL,
            `src` int(11) DEFAULT NULL,
            `message` text NOT NULL,
            `status` varchar(20) DEFAULT 'open',
            `assigned_to` varchar(100) DEFAULT NULL,
            `response` text DEFAULT NULL,
            `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ]])
    SeedDefaultRoles()
    LoadRoles()
    LoadAssignments()
    local roleCount = 0
    for _ in pairs(_roles) do roleCount = roleCount + 1 end
    print('[Cipher-Admin] Ready. Roles loaded: ' .. roleCount)
end)

-- ── Join-time tracking (for online duration) ─────────────────────────────────
local _joinTimes = {}
AddEventHandler('playerConnecting', function() _joinTimes[source] = os.time() end)
AddEventHandler('playerDropped', function()
    local a = _adminCache[source]
    if a and a.citizenid then _dutyAdmins[a.citizenid] = nil end
    _adminCache[source] = nil
    _joinTimes[source]  = nil
end)

-- ── Admin Chat ────────────────────────────────────────────────────────────────
RegisterNetEvent('cipher-admin:server:adminChat')
AddEventHandler('cipher-admin:server:adminChat', function(message)
    local src = source
    if not IsAdmin(src) then return end
    if not message or message == '' then return end
    -- Truncate long messages
    if #message > 300 then message = string.sub(message, 1, 300) end

    local a      = _adminCache[src]
    local sender = a and a.name or GetPlayerName(src)
    local data   = { sender = sender, message = message, time = os.time() }

    for _, psrc in ipairs(GetPlayers()) do
        local pid = tonumber(psrc)
        if _adminCache[pid] then
            TriggerClientEvent('cipher-admin:client:adminChat', pid, data)
        end
    end
end)

-- ── NUI: Open admin panel ─────────────────────────────────────────────────────
lib.callback.register('cipher-admin:server:open', function(src)
    if not IsAdmin(src) then return nil end
    local a = _adminCache[src]

    -- Gather online player count, active bans today, warnings today
    local activeBans  = MySQL.scalar.await("SELECT COUNT(*) FROM admin_bans WHERE is_active=1") or 0
    local warnToday   = MySQL.scalar.await("SELECT COUNT(*) FROM admin_warnings WHERE DATE(created_at)=CURDATE()") or 0
    local bansToday   = MySQL.scalar.await("SELECT COUNT(*) FROM admin_bans WHERE DATE(created_at)=CURDATE()") or 0

    -- Count online admins
    local onlineAdmins = 0
    for _ in pairs(_adminCache) do onlineAdmins = onlineAdmins + 1 end

    return {
        admin        = a,
        serverName   = Config.ServerName,
        playerCount  = #GetPlayers(),
        activeBans   = activeBans,
        warnToday    = warnToday,
        bansToday    = bansToday,
        onlineAdmins = onlineAdmins,
        banPresets       = Config.BanDurationPresets,
        quickBanReasons  = Config.QuickBanReasons,
        quickWarnReasons = Config.QuickWarnReasons,
        dutyAdmins       = _dutyAdmins,
        onDuty           = _dutyAdmins[a and a.citizenid] ~= nil,
    }
end)

-- ── Admin duty toggle ─────────────────────────────────────────────────────────
lib.callback.register('cipher-admin:server:setAdminDuty', function(src, data)
    if not IsAdmin(src) then return false end
    local a = _adminCache[src]
    if not a or not a.citizenid then return false end
    if data.onDuty then
        _dutyAdmins[a.citizenid] = {
            name      = a.name,
            role      = a.role,
            roleLabel = a.roleLabel,
            roleColor = a.roleColor,
            since     = os.time(),
        }
    else
        _dutyAdmins[a.citizenid] = nil
    end
    return true
end)

lib.callback.register('cipher-admin:server:getDutyAdmins', function(src)
    if not IsAdmin(src) then return nil end
    return _dutyAdmins
end)

-- ── NUI: Get online players ───────────────────────────────────────────────────
lib.callback.register('cipher-admin:server:getPlayers', function(src)
    if not IsAdmin(src) then return nil end
    local result = {}
    for _, psrc in ipairs(GetPlayers()) do
        psrc = tonumber(psrc)
        local p = QBX:GetPlayer(psrc)
        if p then
            local pd   = p.PlayerData
            local cid  = pd.citizenid
            local a    = _adminCache[psrc]
            local warnCount = MySQL.scalar.await('SELECT COUNT(*) FROM admin_warnings WHERE citizenid=?', { cid }) or 0
            result[#result+1] = {
                src        = psrc,
                name       = pd.charinfo.firstname .. ' ' .. pd.charinfo.lastname,
                citizenid  = cid,
                job        = pd.job.name,
                jobLabel   = pd.job.label,
                grade      = pd.job.grade.level,
                gradeLabel = pd.job.grade.name,
                ping        = GetPlayerPing(psrc),
                isAdmin     = a ~= nil,
                adminRole   = a and a.roleLabel or nil,
                adminColor  = a and a.roleColor or nil,
                warnings    = warnCount,
                onduty      = pd.job.onduty,
                onlineSeconds = _joinTimes[psrc] and (os.time() - _joinTimes[psrc]) or 0,
            }
        end
    end
    return result
end)

-- ── NUI: Get audit log ────────────────────────────────────────────────────────
lib.callback.register('cipher-admin:server:getAudit', function(src, data)
    if not IsAdmin(src) then return nil end
    if not HasPermission(src, 'viewaudit') then return nil end
    data = data or {}
    local where, params = {}, {}
    if data.action and #data.action > 0 then
        where[#where+1] = 'action = ?'; params[#params+1] = data.action
    end
    if data.admin and #data.admin > 0 then
        where[#where+1] = 'admin_name LIKE ?'; params[#params+1] = '%'..data.admin..'%'
    end
    if data.dateFrom and #data.dateFrom > 0 then
        where[#where+1] = 'DATE(created_at) >= ?'; params[#params+1] = data.dateFrom
    end
    if data.dateTo and #data.dateTo > 0 then
        where[#where+1] = 'DATE(created_at) <= ?'; params[#params+1] = data.dateTo
    end
    local sql = 'SELECT * FROM admin_audit'
    if #where > 0 then sql = sql .. ' WHERE ' .. table.concat(where, ' AND ') end
    sql = sql .. ' ORDER BY created_at DESC LIMIT 300'
    return MySQL.query.await(sql, params)
end)

-- ── NUI: Get roles for permissions panel ─────────────────────────────────────
lib.callback.register('cipher-admin:server:getRoles', function(src)
    if not IsAdmin(src) then return nil end
    if not HasPermission(src, 'manageroles') then return nil end
    local rows = MySQL.query.await('SELECT * FROM admin_roles ORDER BY id ASC')
    for _, r in ipairs(rows) do
        local ok, perms = pcall(json.decode, r.permissions)
        r.permissions = ok and perms or {}
    end
    return rows
end)

-- ── NUI: Save role permissions ────────────────────────────────────────────────
lib.callback.register('cipher-admin:server:saveRolePermissions', function(src, data)
    if not IsAdmin(src) then return false end
    if not HasPermission(src, 'manageroles') then return false end
    MySQL.update.await('UPDATE admin_roles SET permissions=? WHERE name=?', {
        json.encode(data.permissions), data.role
    })
    -- Reload into memory
    LoadRoles()
    -- Bust all admin caches so permissions refresh
    _adminCache = {}
    Audit(src, 'EDIT_ROLE', nil, nil, 'Role: ' .. data.role)
    return true
end)

-- ── NUI: Assign role to player ────────────────────────────────────────────────
lib.callback.register('cipher-admin:server:assignRole', function(src, data)
    if not IsAdmin(src) then return false end
    if not HasPermission(src, 'assignroles') then return false end
    if not data.citizenid or not data.role then return false end
    MySQL.insert.await([[
        INSERT INTO admin_assignments (citizenid, player_name, role, assigned_by)
        VALUES (?,?,?,?)
        ON DUPLICATE KEY UPDATE role=VALUES(role), assigned_by=VALUES(assigned_by)
    ]], { data.citizenid, data.playerName or 'Unknown', data.role, _adminCache[src] and _adminCache[src].name or 'Owner' })
    _assignments[data.citizenid] = data.role
    -- Refresh cache for target if online
    for _, psrc in ipairs(GetPlayers()) do
        psrc = tonumber(psrc)
        local p = QBX:GetPlayer(psrc)
        if p and p.PlayerData.citizenid == data.citizenid then
            _adminCache[psrc] = nil
            BuildAdminCache(psrc)
            break
        end
    end
    Audit(src, 'ASSIGN_ROLE', data.playerName, data.citizenid, 'Role: ' .. data.role)
    return true
end)

-- ── NUI: Remove role from player ──────────────────────────────────────────────
lib.callback.register('cipher-admin:server:removeRole', function(src, data)
    if not IsAdmin(src) then return false end
    if not HasPermission(src, 'assignroles') then return false end
    MySQL.update.await('DELETE FROM admin_assignments WHERE citizenid=?', { data.citizenid })
    _assignments[data.citizenid] = nil
    for _, psrc in ipairs(GetPlayers()) do
        psrc = tonumber(psrc)
        local p = QBX:GetPlayer(psrc)
        if p and p.PlayerData.citizenid == data.citizenid then
            _adminCache[psrc] = nil
            break
        end
    end
    Audit(src, 'REMOVE_ROLE', data.playerName, data.citizenid, nil)
    return true
end)

-- ── NUI: Get admin staff list ─────────────────────────────────────────────────
lib.callback.register('cipher-admin:server:getStaff', function(src)
    if not IsAdmin(src) then return nil end
    if not HasPermission(src, 'assignroles') then return nil end
    return MySQL.query.await('SELECT a.*, r.label as role_label, r.color as role_color FROM admin_assignments a LEFT JOIN admin_roles r ON r.name = a.role ORDER BY a.created_at DESC')
end)

-- ── NUI: Search players offline (character lookup) ────────────────────────────
lib.callback.register('cipher-admin:server:searchCharacter', function(src, query)
    if not IsAdmin(src) then return nil end
    if not query or #query < 2 then return {} end
    local s = '%' .. query .. '%'
    return MySQL.query.await([[
        SELECT p.citizenid,
               JSON_UNQUOTE(JSON_EXTRACT(p.charinfo,'$.firstname')) as firstname,
               JSON_UNQUOTE(JSON_EXTRACT(p.charinfo,'$.lastname'))  as lastname,
               JSON_UNQUOTE(JSON_EXTRACT(p.charinfo,'$.birthdate')) as dob,
               JSON_UNQUOTE(JSON_EXTRACT(p.charinfo,'$.phone'))     as phone,
               JSON_UNQUOTE(JSON_EXTRACT(p.job,'$.name'))           as job,
               JSON_UNQUOTE(JSON_EXTRACT(p.job,'$.label'))          as job_label,
               JSON_UNQUOTE(JSON_EXTRACT(p.money,'$.bank'))         as bank,
               JSON_UNQUOTE(JSON_EXTRACT(p.money,'$.cash'))         as cash
        FROM players p
        WHERE CONCAT(JSON_UNQUOTE(JSON_EXTRACT(p.charinfo,'$.firstname')),' ',JSON_UNQUOTE(JSON_EXTRACT(p.charinfo,'$.lastname'))) LIKE ?
           OR p.citizenid LIKE ?
        LIMIT 20
    ]], { s, s })
end)

-- ── NUI: Get full character profile ──────────────────────────────────────────
lib.callback.register('cipher-admin:server:getCharacter', function(src, citizenid)
    if not IsAdmin(src) then return nil end
    local p = MySQL.single.await([[
        SELECT p.citizenid, p.charinfo, p.job, p.money, p.metadata
        FROM players p WHERE p.citizenid = ?
    ]], { citizenid })
    if not p then return nil end

    local ok1, ci = pcall(json.decode, p.charinfo); p.charinfo = ok1 and ci or {}
    local ok2, jo = pcall(json.decode, p.job);      p.job      = ok2 and jo or {}
    local ok3, mo = pcall(json.decode, p.money);    p.money    = ok3 and mo or {}

    p.warnings = MySQL.query.await('SELECT * FROM admin_warnings WHERE citizenid=? ORDER BY created_at DESC', { citizenid })
    p.bans     = MySQL.query.await('SELECT * FROM admin_bans WHERE citizenid=? ORDER BY created_at DESC', { citizenid })

    if HasPermission(src, 'viewnotes') then
        p.notes = MySQL.query.await('SELECT * FROM admin_notes WHERE citizenid=? ORDER BY created_at DESC', { citizenid })
    end

    -- Check if online
    for _, psrc in ipairs(GetPlayers()) do
        psrc = tonumber(psrc)
        local op = QBX:GetPlayer(psrc)
        if op and op.PlayerData.citizenid == citizenid then
            p.onlineSrc = psrc
            break
        end
    end

    return p
end)

-- ── NUI: Add note ─────────────────────────────────────────────────────────────
lib.callback.register('cipher-admin:server:addNote', function(src, data)
    if not IsAdmin(src) then return false end
    if not HasPermission(src, 'addnote') then return false end
    local a = _adminCache[src]
    MySQL.insert.await('INSERT INTO admin_notes (citizenid, note, admin_name, admin_citizenid) VALUES (?,?,?,?)', {
        data.citizenid, data.note, a and a.name or 'Owner', a and a.citizenid or 'owner'
    })
    Audit(src, 'ADD_NOTE', data.playerName, data.citizenid, data.note)
    return true
end)

-- ── NUI: Server announcement ──────────────────────────────────────────────────
lib.callback.register('cipher-admin:server:announce', function(src, data)
    if not IsAdmin(src) then return false end
    if not HasPermission(src, 'announcement') then return false end
    local a = _adminCache[src]
    TriggerClientEvent('cipher-admin:client:announcement', -1, {
        message   = data.message,
        adminName = a and a.name or 'Server',
        type      = data.type or 'info',
    })
    Audit(src, 'ANNOUNCEMENT', nil, nil, data.message)
    return true
end)

-- ── NUI: Set weather ──────────────────────────────────────────────────────────
lib.callback.register('cipher-admin:server:setWeather', function(src, data)
    if not IsAdmin(src) then return false end
    if not HasPermission(src, 'weather') then return false end
    local w = data.weather or 'CLEAR'
    -- Update whichever weathersync is running first
    if GetResourceState('qb-weathersync') == 'started' then
        TriggerEvent('qb-weathersync:server:changeWeather', w)
    elseif GetResourceState('renewed-weathersync') == 'started' then
        TriggerEvent('renewed-weathersync:server:setWeather', w)
    elseif GetResourceState('rcore_weathersync') == 'started' then
        pcall(function() exports['rcore_weathersync']:SetWeather(w) end)
    elseif GetResourceState('cd_easytime') == 'started' then
        pcall(function() exports['cd_easytime']:SetWeather(w) end)
    end
    -- Broadcast to all clients (works standalone or as fallback)
    TriggerClientEvent('cipher-admin:client:setWeather', -1, w)
    Audit(src, 'SET_WEATHER', nil, nil, w)
    return true
end)

-- ── NUI: Mass announce with optional countdown ───────────────────────────────
lib.callback.register('cipher-admin:server:massAnnounce', function(src, data)
    if not IsAdmin(src) then return false end
    if not HasPermission(src, 'announcement') then return false end
    local a = _adminCache[src]
    TriggerClientEvent('cipher-admin:client:announcement', -1, {
        message   = data.message,
        adminName = a and a.name or 'Server',
        type      = data.type or 'inform',
        countdown = data.countdown or 0,
    })
    Audit(src, 'MASS_ANNOUNCE', nil, nil, data.message)
    return true
end)

-- ── NUI: Set time ─────────────────────────────────────────────────────────────
lib.callback.register('cipher-admin:server:setTime', function(src, data)
    if not IsAdmin(src) then return false end
    if not HasPermission(src, 'time') then return false end
    local h = data.hour
    local m = data.minute

    -- Try to update whichever weathersync resource is running so it doesn't
    -- immediately revert the time. Check resource state before triggering so we
    -- don't rely on pcall+TriggerEvent which never throws even with no handler.
    if GetResourceState('qb-weathersync') == 'started' then
        TriggerEvent('qb-weathersync:server:changeTime', h, m, 0, false)
    elseif GetResourceState('renewed-weathersync') == 'started' then
        TriggerEvent('renewed-weathersync:server:setTime', h, m, false)
    elseif GetResourceState('rcore_weathersync') == 'started' then
        pcall(function() exports['rcore_weathersync']:SetTime(h, m, 0) end)
    elseif GetResourceState('cd_easytime') == 'started' then
        pcall(function() exports['cd_easytime']:SetTime(h, m) end)
    end

    -- Always broadcast to clients — if no weathersync is running this is the
    -- only change; if one IS running the export above already updated it.
    TriggerClientEvent('cipher-admin:client:setTime', -1, h, m)

    Audit(src, 'SET_TIME', nil, nil, h .. ':' .. string.format('%02d', m))
    return true
end)

-- ── NUI: Delete character ─────────────────────────────────────────────────────
lib.callback.register('cipher-admin:server:deleteCharacter', function(src, data)
    if not IsAdmin(src) then return { success = false, reason = 'Not admin' } end
    if not HasPermission(src, 'deletechar') then return { success = false, reason = 'No permission' } end
    local cid = data and data.citizenid
    if not cid then return { success = false, reason = 'No citizenid' } end

    -- Block deletion of online players
    for _, psrc in ipairs(GetPlayers()) do
        local p = QBX:GetPlayer(tonumber(psrc))
        if p and p.PlayerData.citizenid == cid then
            return { success = false, reason = 'Player is currently online' }
        end
    end

    MySQL.query.await('DELETE FROM players WHERE citizenid = ?', { cid })
    MySQL.query.await('DELETE FROM player_vehicles WHERE citizenid = ?', { cid })
    MySQL.query.await('DELETE FROM admin_warnings WHERE citizenid = ?', { cid })
    MySQL.query.await('DELETE FROM admin_notes WHERE citizenid = ?', { cid })
    MySQL.query.await('DELETE FROM admin_assignments WHERE citizenid = ?', { cid })
    pcall(function() exports.ox_inventory:RemoveInventory(cid) end)

    local a = _adminCache[src]
    Audit(src, 'DELETE_CHARACTER', data.name or cid, cid, 'Permanently deleted from database')
    return { success = true }
end)

-- ── NUI: Summon All ───────────────────────────────────────────────────────────
lib.callback.register('cipher-admin:server:summonAll', function(src)
    if not IsAdmin(src) then return false end
    if not HasPermission(src, 'summonall') then return false end
    local pos = GetEntityCoords(GetPlayerPed(src))
    for _, psrc in ipairs(GetPlayers()) do
        local pid = tonumber(psrc)
        if pid ~= src then
            TriggerClientEvent('cipher-admin:client:teleport', pid, { x = pos.x, y = pos.y, z = pos.z })
        end
    end
    Audit(src, 'SUMMON_ALL', nil, nil, string.format('%.0f, %.0f, %.0f', pos.x, pos.y, pos.z))
    return true
end)

-- ── NUI: Server Stats ─────────────────────────────────────────────────────────
lib.callback.register('cipher-admin:server:getStats', function(src)
    if not IsAdmin(src) then
        print('[cipher-admin] getStats: IsAdmin failed for src ' .. tostring(src))
        return { error = 'not admin' }
    end
    local ok, result = pcall(function()
        local numRes = GetNumResources()
        local started, stopped, other = 0, 0, 0
        for i = 0, numRes - 1 do
            local rname = GetResourceByFindIndex(i)
            local state = rname and GetResourceState(rname) or 'missing'
            if     state == 'started' then started = started + 1
            elseif state == 'stopped' then stopped = stopped + 1
            else                           other   = other   + 1
            end
        end
        local players = GetPlayers()
        local hostname = GetConvar('sv_projectName', '') ~= '' and GetConvar('sv_projectName', '') or GetConvar('sv_hostname', 'Unknown')
        return {
            playerCount      = #players,
            maxPlayers       = GetConvarInt('sv_maxClients', 32),
            resourceCount    = numRes,
            resourcesStarted = started,
            resourcesStopped = stopped,
            resourcesOther   = other,
            serverName       = hostname,
            uptimeSeconds    = os.time() - _serverStartTime,
            onesync          = GetConvar('onesync', 'off'),
            gamemode         = GetConvar('gametype', 'N/A'),
        }
    end)
    if not ok then
        print('[cipher-admin] getStats error: ' .. tostring(result))
        return { error = tostring(result) }
    end
    return result
end)

-- Expose internals to other server files
exports('IsAdmin',        IsAdmin)
exports('HasPermission',  HasPermission)
exports('GetAdminCache',  function(src) return _adminCache[src] end)
exports('Audit',          Audit)
exports('GetIdentifiers', GetIdentifiers)

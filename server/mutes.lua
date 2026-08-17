-- Cipher-Admin Server — Chat Mutes
--
-- Persisted rather than held in memory: a mute that evaporates on the next
-- restart is not a moderation tool, it is a suggestion.
--
-- SCOPE, and it is stated on the button too: this mutes the CHAT. Voice is
-- owned by whichever voice resource the server runs (pma-voice, mumble-voip,
-- salty) and there is no common API to reach for, so muting voice here would
-- either silently do nothing or hard-depend on one of them. If you run
-- pma-voice, Config.MuteVoiceExport lets you name the export to call.

local IsAdmin       = function(src) return exports['cipher-admin']:IsAdmin(src) end
local HasPermission = function(src, p) return exports['cipher-admin']:HasPermission(src, p) end
local GetAdminCache = function(src) return exports['cipher-admin']:GetAdminCache(src) end
local Audit         = function(...) exports['cipher-admin']:Audit(...) end

-- Load marker for the boot self-check in server/main.lua.
CipherAdminMutes = true

-- citizenid -> { expires = os.time() or 0 for permanent, reason }
-- Mirrors the table so the chat hook is a table lookup rather than a query on
-- every message sent on the server.
local _muted = {}

-- oxmysql hands DATETIME back as 'YYYY-MM-DD HH:MM:SS' (or as ms since epoch,
-- depending on driver settings). Both are handled; anything else is treated as
-- permanent rather than as already-expired, so a parse failure cannot silently
-- lift a mute.
local function ToEpoch(v)
    if v == nil then return 0 end
    if type(v) == 'number' then return math.floor(v / 1000) end

    local y, mo, d, h, mi, s = tostring(v):match('(%d+)-(%d+)-(%d+)[T ](%d+):(%d+):(%d+)')
    if not y then return 0 end
    return os.time({
        year = tonumber(y), month = tonumber(mo), day = tonumber(d),
        hour = tonumber(h), min = tonumber(mi), sec = tonumber(s),
        isdst = false,
    })
end

local function LoadMutes()
    local rows = MySQL.query.await(
        'SELECT citizenid, reason, expires_at FROM admin_mutes WHERE expires_at IS NULL OR expires_at > NOW()') or {}
    _muted = {}
    for _, r in ipairs(rows) do
        _muted[r.citizenid] = {
            expires = r.expires_at and ToEpoch(r.expires_at) or 0,
            reason  = r.reason,
        }
    end
    return #rows
end

local function CitizenIdOf(src)
    local ok, p = pcall(Framework.GetPlayer, src)
    if ok and p and p.PlayerData then return p.PlayerData.citizenid end
    return nil
end

local function IsMuted(cid)
    if not cid then return false end
    local m = _muted[cid]
    if not m then return false end
    if m.expires ~= 0 and os.time() > m.expires then
        _muted[cid] = nil
        return false
    end
    return true, m
end

-- Suppressing the message at the source event covers the default chat resource
-- and anything else that routes through it. A resource with its own chat
-- pipeline will need its own hook; the export below exists for that.
AddEventHandler('chatMessage', function(src)
    local cid = CitizenIdOf(src)
    local muted, m = IsMuted(cid)
    if not muted then return end

    CancelEvent()
    TriggerClientEvent('cipher-admin:client:mutedNotice', src, {
        reason  = m.reason,
        expires = m.expires,
    })
end)

lib.callback.register('cipher-admin:server:mutePlayer', function(src, data)
    if not IsAdmin(src) then return false end
    if not HasPermission(src, 'mute') then return false end

    local cid = data and data.citizenid
    if not cid then return false end

    local a     = GetAdminCache(src)
    local aName = a and a.name or 'Owner'

    if data.unmute then
        MySQL.update.await('DELETE FROM admin_mutes WHERE citizenid = ?', { cid })
        _muted[cid] = nil
        Audit(src, 'UNMUTE', data.playerName, cid, nil)
        if data.targetSrc then
            TriggerClientEvent('cipher-admin:client:mutedNotice', tonumber(data.targetSrc), { unmuted = true })
        end
        return { success = true, muted = false }
    end

    local duration = tonumber(data.duration) or 0
    local expiresAt = nil
    if duration > 0 then
        expiresAt = os.date('%Y-%m-%d %H:%M:%S', os.time() + duration)
    end

    MySQL.query.await([[
        INSERT INTO admin_mutes (citizenid, player_name, reason, admin_name, expires_at)
        VALUES (?,?,?,?,?)
        ON DUPLICATE KEY UPDATE reason=VALUES(reason), admin_name=VALUES(admin_name), expires_at=VALUES(expires_at)
    ]], { cid, data.playerName or 'Unknown', data.reason or 'No reason given', aName, expiresAt })

    _muted[cid] = {
        expires = duration > 0 and (os.time() + duration) or 0,
        reason  = data.reason or 'No reason given',
    }

    if Config.MuteVoiceExport and Config.MuteVoiceExport ~= '' and data.targetSrc then
        pcall(function()
            local res, fn = Config.MuteVoiceExport:match('^([^%.]+)%.(.+)$')
            if res and fn then exports[res][fn](nil, tonumber(data.targetSrc), true) end
        end)
    end

    if data.targetSrc then
        TriggerClientEvent('cipher-admin:client:mutedNotice', tonumber(data.targetSrc), {
            reason  = data.reason,
            expires = _muted[cid].expires,
            fresh   = true,
        })
    end

    Audit(src, 'MUTE', data.playerName, cid, ('%s [%s]'):format(
        data.reason or 'No reason given',
        duration > 0 and (math.floor(duration / 60) .. 'm') or 'permanent'))

    return { success = true, muted = true }
end)

lib.callback.register('cipher-admin:server:getMutes', function(src)
    if not IsAdmin(src) then return nil end
    if not HasPermission(src, 'mute') then return nil end
    return MySQL.query.await([[
        SELECT * FROM admin_mutes
        WHERE expires_at IS NULL OR expires_at > NOW()
        ORDER BY created_at DESC LIMIT 100
    ]]) or {}
end)

AddEventHandler('onResourceStart', function(res)
    if res ~= GetCurrentResourceName() then return end

    MySQL.query.await([[
        CREATE TABLE IF NOT EXISTS `admin_mutes` (
            `id`          INT AUTO_INCREMENT PRIMARY KEY,
            `citizenid`   VARCHAR(50)  NOT NULL,
            `player_name` VARCHAR(100) DEFAULT NULL,
            `reason`      TEXT         DEFAULT NULL,
            `admin_name`  VARCHAR(100) DEFAULT NULL,
            `expires_at`  DATETIME     DEFAULT NULL,
            `created_at`  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY `uk_cid` (`citizenid`),
            KEY `idx_expires` (`expires_at`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ]])

    local n = LoadMutes()
    if n > 0 then print(('[Cipher-Admin] %d active mute(s) loaded.'):format(n)) end
end)

-- For a chat resource that does not fire chatMessage.
exports('IsPlayerMuted', function(src)
    local muted = IsMuted(CitizenIdOf(src))
    return muted and true or false
end)

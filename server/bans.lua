-- Cipher-Admin Server — Ban & Warning System

local QBX          = exports['qbx_core']
local IsAdmin       = function(src) return exports['cipher-admin']:IsAdmin(src) end
local HasPermission = function(src, p) return exports['cipher-admin']:HasPermission(src, p) end
local GetAdminCache = function(src) return exports['cipher-admin']:GetAdminCache(src) end
local Audit         = function(...) exports['cipher-admin']:Audit(...) end
local GetIds        = function(src) return exports['cipher-admin']:GetIdentifiers(src) end

-- ── Check ban on connect ──────────────────────────────────────────────────────
AddEventHandler('playerConnecting', function(_, _, deferrals)
    local src = source
    deferrals.defer()
    Wait(0)

    local ids = GetIds(src)

    -- Check license, IP, discord
    local checks = {}
    if ids.license then checks[#checks+1] = { col = 'license', val = ids.license } end
    if ids.ip      then checks[#checks+1] = { col = 'ip',      val = ids.ip      } end
    if ids.discord then checks[#checks+1] = { col = 'discord', val = ids.discord } end

    for _, check in ipairs(checks) do
        local ban = MySQL.single.await(
            'SELECT * FROM admin_bans WHERE ' .. check.col .. ' = ? AND is_active = 1 AND (is_permanent = 1 OR expires_at > NOW())',
            { check.val }
        )
        if ban then
            local expiryStr = ban.is_permanent == 1 and 'Permanent' or tostring(ban.expires_at)
            deferrals.done(string.format(Config.BanMessage, ban.reason, expiryStr))
            return
        end
    end

    deferrals.done()
end)

-- ── Issue ban ─────────────────────────────────────────────────────────────────
lib.callback.register('cipher-admin:server:banPlayer', function(src, data)
    if not IsAdmin(src) then return false end

    local isPerm = data.duration == 0 or data.permanent == true
    if isPerm then
        if not HasPermission(src, 'permban') then return false end
    else
        if not HasPermission(src, 'tempban') then return false end
    end

    local a = GetAdminCache(src)
    local aName  = a and a.name or GetPlayerName(src)
    local aCid   = a and a.citizenid or 'owner'

    local tSrc    = tonumber(data.targetSrc)
    local tName   = data.targetName or 'Unknown'
    local tCid    = data.targetCid
    local license = data.license
    local ip      = data.ip
    local discord = data.discord

    -- Pull live identifiers if player is online
    if tSrc then
        local ids = GetIds(tSrc)
        license = ids.license or license
        ip      = ids.ip      or ip
        discord = ids.discord or discord
    end

    local expiresAt = nil
    if not isPerm and data.duration and data.duration > 0 then
        expiresAt = os.date('%Y-%m-%d %H:%M:%S', os.time() + data.duration)
    end

    MySQL.insert.await([[
        INSERT INTO admin_bans (citizenid, player_name, license, ip, discord, reason, admin_name, admin_citizenid, expires_at, is_permanent)
        VALUES (?,?,?,?,?,?,?,?,?,?)
    ]], { tCid, tName, license, ip, discord, data.reason, aName, aCid, expiresAt, isPerm and 1 or 0 })

    if tSrc then
        local msg = string.format(Config.BanMessage, data.reason, isPerm and 'Permanent' or expiresAt)
        DropPlayer(tSrc, msg)
    end

    Audit(src, isPerm and 'PERMBAN' or 'TEMPBAN', tName, tCid, data.reason .. (isPerm and ' [PERM]' or (' [' .. (data.duration/3600) .. 'h]')))
    return true
end)

-- ── Unban ─────────────────────────────────────────────────────────────────────
lib.callback.register('cipher-admin:server:unban', function(src, data)
    if not IsAdmin(src) then return false end
    if not HasPermission(src, 'unban') then return false end
    local a = GetAdminCache(src)
    local aName = a and a.name or 'Owner'
    MySQL.update.await('UPDATE admin_bans SET is_active=0, unbanned_by=? WHERE id=?', { aName, data.banId })
    Audit(src, 'UNBAN', data.playerName, nil, 'Ban ID: ' .. data.banId)
    return true
end)

-- ── Get ban list ──────────────────────────────────────────────────────────────
lib.callback.register('cipher-admin:server:getBans', function(src, data)
    if not IsAdmin(src) then return nil end
    data = data or {}
    local where, params = { 'is_active = 1' }, {}
    if data.expired then where = {}; params = {} end  -- show all
    if data.search and #data.search > 0 then
        where[#where+1] = 'player_name LIKE ?'
        params[#params+1] = '%' .. data.search .. '%'
    end
    local sql = 'SELECT * FROM admin_bans'
    if #where > 0 then sql = sql .. ' WHERE ' .. table.concat(where, ' AND ') end
    sql = sql .. ' ORDER BY created_at DESC LIMIT 200'
    return MySQL.query.await(sql, params)
end)

-- ── Issue warning ─────────────────────────────────────────────────────────────
lib.callback.register('cipher-admin:server:warnPlayer', function(src, data)
    if not IsAdmin(src) then return false end
    if not HasPermission(src, 'warn') then return false end

    local a = GetAdminCache(src)
    local aName = a and a.name or 'Owner'
    local aCid  = a and a.citizenid or 'owner'

    MySQL.insert.await('INSERT INTO admin_warnings (citizenid, player_name, reason, admin_name, admin_citizenid) VALUES (?,?,?,?,?)', {
        data.citizenid, data.playerName, data.reason, aName, aCid
    })

    -- Notify player if online
    local tSrc = tonumber(data.targetSrc)
    if tSrc then
        TriggerClientEvent('cipher-admin:client:receiveWarning', tSrc, {
            reason    = data.reason,
            adminName = aName,
        })
    end

    -- Check thresholds
    local count = MySQL.scalar.await('SELECT COUNT(*) FROM admin_warnings WHERE citizenid=?', { data.citizenid }) or 0
    for _, threshold in ipairs(Config.WarningThresholds) do
        if count >= threshold.count then
            if threshold.action == 'kick' and tSrc then
                DropPlayer(tSrc, threshold.reason)
            elseif threshold.action == 'tempban' then
                lib.callback.await('cipher-admin:server:banPlayer', false, src, {
                    targetSrc  = tSrc,
                    targetName = data.playerName,
                    targetCid  = data.citizenid,
                    reason     = threshold.reason,
                    duration   = threshold.duration or 86400,
                })
            end
            break
        end
    end

    Audit(src, 'WARN', data.playerName, data.citizenid, data.reason)
    return true
end)

-- ── Get warnings for a player ─────────────────────────────────────────────────
lib.callback.register('cipher-admin:server:getWarnings', function(src, citizenid)
    if not IsAdmin(src) then return nil end
    return MySQL.query.await('SELECT * FROM admin_warnings WHERE citizenid=? ORDER BY created_at DESC', { citizenid })
end)

-- ── Delete warning ────────────────────────────────────────────────────────────
lib.callback.register('cipher-admin:server:deleteWarning', function(src, data)
    if not IsAdmin(src) then return false end
    if not HasPermission(src, 'warn') then return false end
    MySQL.update.await('DELETE FROM admin_warnings WHERE id=?', { data.warnId })
    Audit(src, 'DELETE_WARNING', data.playerName, nil, 'Warn ID: ' .. data.warnId)
    return true
end)

-- Client receives warning notification
RegisterNetEvent('cipher-admin:client:receiveWarning')
AddEventHandler('cipher-admin:client:receiveWarning', function(data)
    -- handled in client/main.lua via NUI or lib.notify
end)

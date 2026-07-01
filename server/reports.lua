-- Cipher-Admin Server — Player Reports

local QBX           = exports['qbx_core']
local IsAdmin       = function(src) return exports['cipher-admin']:IsAdmin(src) end
local HasPermission = function(src, p) return exports['cipher-admin']:HasPermission(src, p) end
local GetAdminCache = function(src) return exports['cipher-admin']:GetAdminCache(src) end
local Audit         = function(...) exports['cipher-admin']:Audit(...) end

-- ── Submit report (any player) ────────────────────────────────────────────────
RegisterNetEvent('cipher-admin:server:submitReport')
AddEventHandler('cipher-admin:server:submitReport', function(message, isReply)
    local src = source
    if not message or #message < 3 then
        TriggerClientEvent('ox_lib:notify', src, { title = 'Report', description = 'Message is too short.', type = 'error' })
        return
    end
    local p = QBX:GetPlayer(src)
    if not p then return end
    local name = p.PlayerData.charinfo.firstname .. ' ' .. p.PlayerData.charinfo.lastname
    local cid  = p.PlayerData.citizenid

    -- Mark replies with a prefix so admins can distinguish them
    local displayMsg = isReply and ('[REPLY] ' .. message) or message

    -- If this is a reply, reopen the player's most recent responded report instead of creating a new one
    if isReply then
        local existing = MySQL.query.await(
            'SELECT id FROM admin_reports WHERE citizenid = ? AND status IN (\'responded\', \'claimed\', \'open\') ORDER BY created_at DESC LIMIT 1',
            { cid }
        )
        if existing and existing[1] then
            MySQL.update.await(
                'UPDATE admin_reports SET message = CONCAT(message, \'\n[PLAYER REPLY] \', ?), status = \'open\' WHERE id = ?',
                { message, existing[1].id }
            )
            TriggerClientEvent('ox_lib:notify', src, { title = 'Reply Sent', description = 'Your reply has been added to your report.', type = 'success' })
            -- Notify admins
            for _, psrc in ipairs(GetPlayers()) do
                local pid = tonumber(psrc)
                if IsAdmin(pid) then
                    TriggerClientEvent('cipher-admin:client:newReport', pid, { name = name, citizenid = cid, message = '[REPLY] ' .. message })
                end
            end
            return
        end
        -- No existing report — fall through and create a new one
    end

    local id = MySQL.insert.await('INSERT INTO admin_reports (citizenid, player_name, src, message) VALUES (?,?,?,?)', { cid, name, src, displayMsg })
    local reportData = { id = id or 0, name = name, citizenid = cid, message = displayMsg }
    for _, psrc in ipairs(GetPlayers()) do
        local pid = tonumber(psrc)
        if IsAdmin(pid) then
            TriggerClientEvent('cipher-admin:client:newReport', pid, reportData)
        end
    end
    TriggerClientEvent('ox_lib:notify', src, { title = isReply and 'Reply Sent' or 'Report Submitted', description = 'An admin will respond shortly.', type = 'success' })
end)

-- ── Get reports list ──────────────────────────────────────────────────────────
lib.callback.register('cipher-admin:server:getReports', function(src, data)
    if not IsAdmin(src) then return nil end
    if not HasPermission(src, 'reports') then return nil end
    local status = (data and data.status) or 'open'
    if status == 'all' then
        return MySQL.query.await('SELECT * FROM admin_reports ORDER BY created_at DESC LIMIT 100')
    end
    return MySQL.query.await('SELECT * FROM admin_reports WHERE status = ? ORDER BY created_at DESC LIMIT 100', { status })
end)

-- ── Claim report ──────────────────────────────────────────────────────────────
lib.callback.register('cipher-admin:server:claimReport', function(src, data)
    if not IsAdmin(src) then return false end
    if not HasPermission(src, 'reports') then return false end
    local a    = GetAdminCache(src)
    local name = a and a.name or GetPlayerName(src)
    MySQL.update.await('UPDATE admin_reports SET status=?, assigned_to=? WHERE id=?', { 'claimed', name, data.id })
    return true
end)

-- ── Respond to report ─────────────────────────────────────────────────────────
lib.callback.register('cipher-admin:server:respondReport', function(src, data)
    if not IsAdmin(src) then return false end
    if not HasPermission(src, 'reports') then return false end
    local a    = GetAdminCache(src)
    local from = a and a.name or GetPlayerName(src)
    MySQL.update.await('UPDATE admin_reports SET status=?, response=?, assigned_to=? WHERE id=?', {
        'responded', data.response, from, data.id
    })
    -- Notify player if online (client/reports.lua handles the display + /reply hint)
    for _, psrc in ipairs(GetPlayers()) do
        local pid = tonumber(psrc)
        local pp  = QBX:GetPlayer(pid)
        if pp and pp.PlayerData.citizenid == data.citizenid then
            TriggerClientEvent('cipher-admin:client:reportResponse', pid, { admin = from, response = data.response })
            break
        end
    end
    Audit(src, 'REPORT_RESPONSE', data.player_name, data.citizenid, data.response)
    return true
end)

-- ── Close report ──────────────────────────────────────────────────────────────
lib.callback.register('cipher-admin:server:closeReport', function(src, data)
    if not IsAdmin(src) then return false end
    if not HasPermission(src, 'reports') then return false end
    MySQL.update.await('UPDATE admin_reports SET status=? WHERE id=?', { 'closed', data.id })
    return true
end)

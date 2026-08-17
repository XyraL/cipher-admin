-- Cipher-Admin Client — Player Report Commands
--
-- Names come from Config.Commands so they can be renamed around a clash or
-- disabled with ''. /r collides with a lot of radio and reply resources.

local function RegisterReportCommand(cfgKey, default, isReply)
    local c    = Config.Commands
    local name = (c and c[cfgKey] ~= nil) and c[cfgKey] or default
    if name == '' then return end

    RegisterCommand(name, function(_, args)
        if #args == 0 then
            Notify({
                title       = isReply and 'Reply' or 'Report',
                description = ('Usage: /%s [your message]'):format(name),
                type        = 'error',
            })
            return
        end
        TriggerServerEvent('cipher-admin:server:submitReport', table.concat(args, ' '), isReply)
    end, false)
end

RegisterReportCommand('Report',      'report', false)
RegisterReportCommand('ReportShort', 'r',      false)
-- /reply — follow-up on your last report after an admin responds
RegisterReportCommand('Reply',       'reply',  true)

-- Show admin response notification
RegisterNetEvent('cipher-admin:client:reportResponse')
AddEventHandler('cipher-admin:client:reportResponse', function(data)
    Notify({
        title       = 'Admin Response — ' .. (data.admin or 'Admin'),
        description = (data.response or '') .. '\n\nUse /reply to respond.',
        type        = 'inform',
        duration    = 12000,
    })
end)

-- New report notification (for admins — handled in main.lua, but keep registered here too)
RegisterNetEvent('cipher-admin:client:newReport')

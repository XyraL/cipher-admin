-- Cipher-Admin Client — Player Report Commands

RegisterCommand('report', function(_, args)
    if #args == 0 then
        lib.notify({ title = 'Report', description = 'Usage: /report [your message]', type = 'error' })
        return
    end
    TriggerServerEvent('cipher-admin:server:submitReport', table.concat(args, ' '), false)
end, false)

RegisterCommand('r', function(_, args)
    if #args == 0 then
        lib.notify({ title = 'Report', description = 'Usage: /r [your message]', type = 'error' })
        return
    end
    TriggerServerEvent('cipher-admin:server:submitReport', table.concat(args, ' '), false)
end, false)

-- /reply — follow-up on your last report after an admin responds
RegisterCommand('reply', function(_, args)
    if #args == 0 then
        lib.notify({ title = 'Reply', description = 'Usage: /reply [your message]', type = 'error' })
        return
    end
    TriggerServerEvent('cipher-admin:server:submitReport', table.concat(args, ' '), true)
end, false)

-- Show admin response notification
RegisterNetEvent('cipher-admin:client:reportResponse')
AddEventHandler('cipher-admin:client:reportResponse', function(data)
    lib.notify({
        title       = 'Admin Response — ' .. (data.admin or 'Admin'),
        description = (data.response or '') .. '\n\nUse /reply to respond.',
        type        = 'inform',
        duration    = 12000,
    })
end)

-- New report notification (for admins — handled in main.lua, but keep registered here too)
RegisterNetEvent('cipher-admin:client:newReport')

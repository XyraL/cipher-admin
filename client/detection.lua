-- Cipher-Admin Client — Detection Agent
--
-- Anything the server can read for itself is read in server/threats.lua, where
-- the client cannot lie about it. This reports the one thing with no
-- server-side native — armour — and that value is advisory; the panel labels
-- it as such.
--
-- The part a cheater cannot get around is the silence. Stop the resource or
-- block the event and the reports stop arriving, and the server flags the gap.
--
-- GetPlayerInvincible() is deliberately not reported: most menu god mode never
-- sets it, while this resource's own Self Actions god mode does, so it would
-- miss cheaters and flag staff. Health above maximum, checked server-side, is
-- the signal that works.

CreateThread(function()
    local AC = Config.AntiCheat
    if not AC or not AC.Enabled then return end

    local hb = AC.Heartbeat or {}
    if hb.Enabled == false then return end

    local interval = math.max(5, hb.Interval or 10) * 1000

    -- The ped may not exist for the first few seconds of a session.
    Wait(15000)

    while true do
        Wait(interval)

        local ped = PlayerPedId()
        if ped and ped ~= 0 and DoesEntityExist(ped) then
            TriggerServerEvent('cipher-admin:server:heartbeat', {
                armour = GetPedArmour(ped),
            })
        end
    end
end)

-- Staff with viewthreats receive flags as they happen. The server sends only
-- the first hit of each type per player, so a speed hack is one notification
-- rather than one per sweep.
RegisterNetEvent('cipher-admin:client:threatFlag')
AddEventHandler('cipher-admin:client:threatFlag', function(payload)
    if type(payload) ~= 'table' then return end

    SendNUIMessage({ type = 'threatFlag', data = payload })

    -- A silent client is worth recording and not worth interrupting anyone over.
    if payload.severity == 'low' then return end

    Notify({
        title       = 'Threat: ' .. (payload.label or payload.detection or 'flag'),
        description = ('%s — %s'):format(payload.player_name or 'Unknown', payload.detail or ''),
        type        = payload.severity == 'high' and 'error' or 'warning',
        duration    = 7000,
    })
end)

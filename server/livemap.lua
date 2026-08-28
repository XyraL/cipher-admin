-- Live map data.
--
-- The panel polls this while the map tab is open. Everything comes from server
-- natives — no client heartbeat, no events, nothing for a modder to spoof: the
-- server reads every ped's real position itself, so what the map shows is what
-- the server knows, not what clients claim.
local IsAdmin = function(src) return exports['cipher-admin']:IsAdmin(src) end

lib.callback.register('cipher-admin:server:getLiveMap', function(src)
    if not IsAdmin(src) then return nil end

    local out = {}
    for _, id in ipairs(GetPlayers()) do
        local pSrc = tonumber(id)
        local ped = pSrc and GetPlayerPed(pSrc)

        if ped and ped ~= 0 then
            local pos = GetEntityCoords(ped)
            local veh = GetVehiclePedIsIn(ped, false)

            local cid, charName
            local ok, player = pcall(function() return exports['cipher-admin']:GetPlayer(pSrc) end)
            if ok and player and player.PlayerData then
                cid = player.PlayerData.citizenid
                local ci = player.PlayerData.charinfo
                if ci then charName = ('%s %s'):format(ci.firstname or '', ci.lastname or ''):gsub('^%s+', '') end
            end

            out[#out + 1] = {
                src = pSrc,
                name = GetPlayerName(pSrc),
                charName = charName,
                cid = cid,
                x = pos.x,
                y = pos.y,
                vehicle = veh ~= 0,
                -- 0 health on a ped is pre-spawn; treat only real lows as down.
                dead = GetEntityHealth(ped) <= 1,
            }
        end
    end

    return out
end)

-- Cipher-Admin Client

local isOpen    = false
local noclipOn      = false
local invisOn       = false
local _superSprintOn = false
local _superJumpOn   = false
local spectating = false
local spectateTarget = nil

-- ── Open / Close ──────────────────────────────────────────────────────────────
local function OpenAdmin()
    if isOpen then return end
    lib.callback('cipher-admin:server:open', false, function(data)
        if not data then
            lib.notify({ title = 'Access Denied', description = 'You do not have admin access.', type = 'error' })
            return
        end
        isOpen = true
        SetNuiFocus(true, true)
        SendNUIMessage({ type = 'open', data = data })
    end)
end

local function CloseAdmin()
    if not isOpen then return end
    isOpen = false
    SetNuiFocus(false, false)
    SendNUIMessage({ type = 'close' })
end

-- Keybind
RegisterKeyMapping('cipher_admin_open', 'Open Cipher-Admin', 'keyboard', Config.OpenKey)
RegisterCommand('cipher_admin_open', function()
    if isOpen then CloseAdmin() else OpenAdmin() end
end, false)

-- NUI close button
RegisterNUICallback('close', function(_, cb)
    CloseAdmin()
    cb('ok')
end)

-- ── NUI Callbacks — lib.callback proxies ──────────────────────────────────────
-- All caFetch() calls from JS land here; endpoint is the lib.callback name
local function ProxyCallback(endpoint, data, cb)
    lib.callback(endpoint, false, function(result)
        cb(result)
    end, data)
end

-- Register all server callback proxies
local PROXY_ENDPOINTS = {
    'cipher-admin:server:open',
    'cipher-admin:server:getPlayers',
    'cipher-admin:server:getAudit',
    'cipher-admin:server:getRoles',
    'cipher-admin:server:saveRolePermissions',
    'cipher-admin:server:assignRole',
    'cipher-admin:server:removeRole',
    'cipher-admin:server:getStaff',
    'cipher-admin:server:searchCharacter',
    'cipher-admin:server:getCharacter',
    'cipher-admin:server:addNote',
    'cipher-admin:server:announce',
    'cipher-admin:server:setWeather',
    'cipher-admin:server:setTime',
    'cipher-admin:server:banPlayer',
    'cipher-admin:server:unban',
    'cipher-admin:server:getBans',
    'cipher-admin:server:warnPlayer',
    'cipher-admin:server:getWarnings',
    'cipher-admin:server:deleteWarning',
    'cipher-admin:server:getInventory',
    'cipher-admin:server:giveItem',
    'cipher-admin:server:removeItem',
    'cipher-admin:server:clearInventory',
    'cipher-admin:server:getItemList',
    'cipher-admin:server:getVehicleList',
    'cipher-admin:server:deleteCharacter',
    'cipher-admin:server:getResources',
    'cipher-admin:server:restartResource',
    'cipher-admin:server:getReports',
    'cipher-admin:server:claimReport',
    'cipher-admin:server:respondReport',
    'cipher-admin:server:closeReport',
    'cipher-admin:server:massAnnounce',
    'cipher-admin:server:summonAll',
    'cipher-admin:server:getStats',
    'cipher-admin:server:getAdminInventory',
    'cipher-admin:server:transferItem',
}

for _, endpoint in ipairs(PROXY_ENDPOINTS) do
    local ep = endpoint
    RegisterNUICallback(ep, function(data, cb)
        lib.callback(ep, false, function(result)
            cb(result ~= nil and result or false)
        end, data)
    end)
end

-- ── NUI Callbacks — Player Actions ────────────────────────────────────────────
RegisterNUICallback('playerAction', function(data, cb)
    -- spawnveh handled client-side to avoid double-spawn from the relay chain
    if data.action == 'spawnveh' then
        local model    = data.model
        local targetSrc = tonumber(data.targetSrc)

        if targetSrc and targetSrc ~= GetPlayerServerId(PlayerId()) then
            -- Spawning for another player — use server relay
            TriggerServerEvent('cipher-admin:server:playerAction', data)
        else
            -- Spawning for self — do it locally
            CreateThread(function()
                local hash = GetHashKey(model)
                RequestModel(hash)
                local t = 0
                while not HasModelLoaded(hash) do Wait(100); t=t+100; if t>8000 then lib.notify({title='Model not found',type='error'}); return end end
                local ped     = PlayerPedId()
                local coords  = GetEntityCoords(ped)
                local heading = GetEntityHeading(ped)
                local veh = CreateVehicle(hash, coords.x + 3.0, coords.y, coords.z, heading, true, false)
                SetVehicleOnGroundProperly(veh)
                SetEntityAsMissionEntity(veh, true, true)
                SetModelAsNoLongerNeeded(hash)
                TaskWarpPedIntoVehicle(ped, veh, -1)
                local plate = GetVehicleNumberPlateText(veh)
                TriggerServerEvent('cipher-admin:server:giveVehicleKeys', plate, model)
                lib.notify({ title = 'Vehicle Spawned', description = model, type = 'success' })
            end)
        end
        cb('ok')
        return
    end
    TriggerServerEvent('cipher-admin:server:playerAction', data)
    cb('ok')
end)

-- ── GPS / Goto ────────────────────────────────────────────────────────────────
RegisterNetEvent('cipher-admin:client:teleport')
AddEventHandler('cipher-admin:client:teleport', function(coords)
    local ped = PlayerPedId()
    SetEntityCoords(ped, coords.x, coords.y, coords.z, false, false, false, false)
end)

-- ── Bring ─────────────────────────────────────────────────────────────────────
RegisterNetEvent('cipher-admin:client:bringMe')
AddEventHandler('cipher-admin:client:bringMe', function()
    local ped    = PlayerPedId()
    local coords = GetEntityCoords(ped)
    TriggerServerEvent('cipher-admin:server:receiveBringCoords', coords)
end)

RegisterNetEvent('cipher-admin:client:bringTarget')
AddEventHandler('cipher-admin:client:bringTarget', function(coords)
    local ped = PlayerPedId()
    SetEntityCoords(ped, coords.x, coords.y, coords.z + 1.0, false, false, false, false)
end)

-- ── Spectate ──────────────────────────────────────────────────────────────────
RegisterNetEvent('cipher-admin:client:spectate')
AddEventHandler('cipher-admin:client:spectate', function(targetNetId)
    if spectating then
        NetworkSetInSpectatorMode(false, PlayerPedId())
        spectating     = false
        spectateTarget = nil
        lib.notify({ title = 'Spectate', description = 'Stopped spectating.', type = 'inform' })
        return
    end
    local targetPed = NetToPed(targetNetId)
    if not targetPed or targetPed == 0 then
        lib.notify({ title = 'Error', description = 'Player not found.', type = 'error' })
        return
    end
    NetworkSetInSpectatorMode(true, targetPed)
    spectating     = true
    spectateTarget = targetNetId
    lib.notify({ title = 'Spectate', description = 'Spectating player. Use /stopspectate or reopen admin to stop.', type = 'inform' })
end)

RegisterCommand('stopspectate', function()
    if spectating then
        NetworkSetInSpectatorMode(false, PlayerPedId())
        spectating = false
        lib.notify({ title = 'Spectate', description = 'Stopped spectating.', type = 'inform' })
    end
end, false)

-- ── Noclip shared thread ─────────────────────────────────────────────────────
local function StartNoclipThread()
    CreateThread(function()
        while noclipOn do
            Wait(0)
            local ped   = PlayerPedId()
            local speed = IsControlPressed(0, 21) and 12.0 or 2.5

            -- Use camera rotation so movement matches where you're looking
            local camRot = GetGameplayCamRot(2)
            local h      = math.rad(camRot.z)
            local pit    = math.rad(camRot.x)
            local cosP   = math.abs(math.cos(pit))

            local fwdX = -math.sin(h) * cosP
            local fwdY =  math.cos(h) * cosP
            local fwdZ =  math.sin(pit)
            local rgtX =  math.cos(h)
            local rgtY =  math.sin(h)

            local vx, vy, vz = 0.0, 0.0, 0.0
            if IsControlPressed(0, 32) then vx=vx+fwdX*speed; vy=vy+fwdY*speed; vz=vz+fwdZ*speed end
            if IsControlPressed(0, 33) then vx=vx-fwdX*speed; vy=vy-fwdY*speed; vz=vz-fwdZ*speed end
            if IsControlPressed(0, 34) then vx=vx-rgtX*speed; vy=vy-rgtY*speed end
            if IsControlPressed(0, 35) then vx=vx+rgtX*speed; vy=vy+rgtY*speed end
            if IsControlPressed(0, 22) then vz=vz+speed end
            if IsControlPressed(0, 36) then vz=vz-speed end

            SetEntityVelocity(ped, vx, vy, vz)
            SetEntityCollision(ped, false, false)  -- re-apply every frame; game re-enables it otherwise
        end
        local ped = PlayerPedId()
        SetEntityCollision(ped, true, true)
        ResetEntityAlpha(ped)
    end)
end

-- ── Noclip ────────────────────────────────────────────────────────────────────
RegisterNetEvent('cipher-admin:client:toggleNoclip')
AddEventHandler('cipher-admin:client:toggleNoclip', function()
    noclipOn = not noclipOn
    local ped   = PlayerPedId()
    local netId = PedToNet(ped)

    if noclipOn then
        SetEntityCollision(ped, false, false)
        SetEntityAlpha(ped, 0, false)
        TriggerServerEvent('cipher-admin:server:noclipSync', netId, true)
        lib.notify({ title = 'Noclip ON', description = 'WASD / Space / Ctrl · Shift=fast', type = 'inform' })
        StartNoclipThread()
    else
        SetEntityCollision(ped, true, true)
        ResetEntityAlpha(ped)
        TriggerServerEvent('cipher-admin:server:noclipSync', netId, false)
        lib.notify({ title = 'Noclip OFF', type = 'inform' })
    end
end)

-- ── Invisible ─────────────────────────────────────────────────────────────────
RegisterNetEvent('cipher-admin:client:toggleInvisible')
AddEventHandler('cipher-admin:client:toggleInvisible', function()
    invisOn = not invisOn
    local ped = PlayerPedId()
    if invisOn then
        SetEntityAlpha(ped, 0, false)
    else
        ResetEntityAlpha(ped)
    end
    lib.notify({ title = 'Invisible', description = invisOn and 'ON' or 'OFF', type = 'inform' })
end)

-- ── Freeze (self when targeting) ──────────────────────────────────────────────
RegisterNetEvent('cipher-admin:client:freeze')
AddEventHandler('cipher-admin:client:freeze', function(state)
    FreezeEntityPosition(PlayerPedId(), state)
end)

-- ── Weather ───────────────────────────────────────────────────────────────────
RegisterNetEvent('cipher-admin:client:setWeather')
AddEventHandler('cipher-admin:client:setWeather', function(weather)
    SetWeatherTypePersist(weather)
    SetWeatherTypeNow(weather)
    SetWeatherTypeNowPersist(weather)
    lib.notify({ title = 'Weather', description = 'Set to ' .. weather, type = 'inform' })
end)

-- ── Time ──────────────────────────────────────────────────────────────────────
RegisterNetEvent('cipher-admin:client:setTime')
AddEventHandler('cipher-admin:client:setTime', function(hour, minute)
    SetClockTime(hour, minute, 0)
    lib.notify({ title = 'Time', description = string.format('Set to %02d:%02d', hour, minute), type = 'inform' })
end)

-- ── Announcement ──────────────────────────────────────────────────────────────
RegisterNetEvent('cipher-admin:client:announcement')
AddEventHandler('cipher-admin:client:announcement', function(data)
    SendNUIMessage({ type = 'announcement', data = data })
    lib.notify({
        title       = '📢 ' .. (data.adminName or 'Server'),
        description = data.message,
        type        = data.type or 'inform',
        duration    = 8000,
    })
end)

-- ── Get coords then relay to admin ───────────────────────────────────────────
RegisterNetEvent('cipher-admin:client:getCoordsThen')
AddEventHandler('cipher-admin:client:getCoordsThen', function(adminSrc)
    local coords = GetEntityCoords(PlayerPedId())
    TriggerServerEvent('cipher-admin:server:relayGotoCoords', adminSrc, { x = coords.x, y = coords.y, z = coords.z })
end)

-- ── Get spawn coords and relay ────────────────────────────────────────────────
RegisterNetEvent('cipher-admin:client:getSpawnCoords')
AddEventHandler('cipher-admin:client:getSpawnCoords', function(model, adminSrc)
    local ped    = PlayerPedId()
    local coords = GetEntityCoords(ped)
    local heading = GetEntityHeading(ped)
    TriggerServerEvent('cipher-admin:server:spawnVehCoords', adminSrc, model, { x = coords.x + 3.0, y = coords.y, z = coords.z, w = heading })
end)

-- ── Revive / Heal ─────────────────────────────────────────────────────────────
RegisterNetEvent('cipher-admin:client:revive')
AddEventHandler('cipher-admin:client:revive', function()
    local ped = PlayerPedId()
    ResurrectPed(ped)
    SetEntityHealth(ped, 200)
    SetPedArmour(ped, 100)
    ClearPedBloodDamage(ped)
end)

RegisterNetEvent('cipher-admin:client:heal')
AddEventHandler('cipher-admin:client:heal', function()
    local ped = PlayerPedId()
    SetEntityHealth(ped, 200)
    SetPedArmour(ped, 100)
    ClearPedBloodDamage(ped)
end)

-- ── Strip Weapons ─────────────────────────────────────────────────────────────
RegisterNetEvent('cipher-admin:client:stripWeapons')
AddEventHandler('cipher-admin:client:stripWeapons', function()
    RemoveAllPedWeapons(PlayerPedId(), true)
end)

-- ── Delete nearest vehicle ────────────────────────────────────────────────────
RegisterNetEvent('cipher-admin:client:deleteNearestVeh')
AddEventHandler('cipher-admin:client:deleteNearestVeh', function()
    local ped  = PlayerPedId()
    local pos  = GetEntityCoords(ped)
    local veh  = GetClosestVehicle(pos.x, pos.y, pos.z, 5.0, 0, 71)
    if veh and veh ~= 0 then
        SetEntityAsMissionEntity(veh, true, true)
        DeleteVehicle(veh)
        lib.notify({ title = 'Vehicle Deleted', type = 'success' })
    end
end)

-- ── God Mode ─────────────────────────────────────────────────────────────────
local godModeOn = false

local function ToggleGodMode()
    godModeOn = not godModeOn
    if godModeOn then
        lib.notify({ title = 'God Mode', description = 'ON', type = 'success' })
        CreateThread(function()
            while godModeOn do
                Wait(0)
                local ped = PlayerPedId()
                SetEntityHealth(ped, 200)
                SetPedArmour(ped, 100)
                SetEntityInvincible(ped, true)
            end
            SetEntityInvincible(PlayerPedId(), false)
        end)
    else
        SetEntityInvincible(PlayerPedId(), false)
        lib.notify({ title = 'God Mode', description = 'OFF', type = 'inform' })
    end
end

-- ── Self Action NUI callback ──────────────────────────────────────────────────
RegisterNUICallback('selfAction', function(data, cb)
    local action = data.action

    -- Personal
    if action == 'godmode' then
        ToggleGodMode()

    elseif action == 'heal' then
        local ped = PlayerPedId()
        SetEntityHealth(ped, 200); SetPedArmour(ped, 100); ClearPedBloodDamage(ped)
        lib.notify({ title = 'Healed', type = 'success' })

    elseif action == 'revive' then
        local ped = PlayerPedId()
        ResurrectPed(ped); SetEntityHealth(ped, 200); SetPedArmour(ped, 100); ClearPedBloodDamage(ped)
        lib.notify({ title = 'Revived', type = 'success' })

    elseif action == 'foodwater' then
        TriggerServerEvent('cipher-admin:server:selfFoodWater')
        lib.notify({ title = 'Food & Water', description = 'Hunger & thirst maxed', type = 'success' })

    -- Appearance
    elseif action == 'invisible' then
        invisOn = not invisOn
        local ped = PlayerPedId()
        if invisOn then
            SetEntityAlpha(ped, 0, false)
        else
            ResetEntityAlpha(ped)
        end
        lib.notify({ title = 'Invisible', description = invisOn and 'ON' or 'OFF', type = 'inform' })

    elseif action == 'pedmodel' then
        local model = data.model or ''
        if model == '' then cb('ok') return end
        local hash = GetHashKey(model)
        RequestModel(hash)
        local t = 0
        while not HasModelLoaded(hash) do
            Wait(100); t = t + 100
            if t > 5000 then lib.notify({ title = 'Model not found', description = model, type = 'error' }); cb('ok'); return end
        end
        SetPlayerModel(PlayerId(), hash)
        SetModelAsNoLongerNeeded(hash)
        lib.notify({ title = 'Ped Model Set', description = model, type = 'success' })

    elseif action == 'clothing' then
        TriggerEvent('qb-clothing:client:openMenu')

    -- Movement
    elseif action == 'noclip' then
        noclipOn = not noclipOn
        local ped = PlayerPedId()
        if noclipOn then
            SetEntityCollision(ped, false, false)
            SetEntityAlpha(ped, 0, false)
            TriggerServerEvent('cipher-admin:server:setPlayerAlpha', 0)
            lib.notify({ title = 'Noclip ON', description = 'WASD / Space / Ctrl · Shift=fast · Invisible to others', type = 'inform' })
            StartNoclipThread()
        else
            SetEntityCollision(ped, true, true)
            if not invisOn then
                ResetEntityAlpha(ped)
                TriggerServerEvent('cipher-admin:server:setPlayerAlpha', 255)
            end
            lib.notify({ title = 'Noclip OFF', type = 'inform' })
        end

    elseif action == 'waypoint' then
        local wp = GetFirstBlipInfoId(8)
        if DoesBlipExist(wp) then
            local coords = GetBlipInfoIdCoord(wp)
            SetEntityCoords(PlayerPedId(), coords.x, coords.y, coords.z + 2.0, false, false, false, false)
            lib.notify({ title = 'Teleported to Waypoint', type = 'success' })
        else
            lib.notify({ title = 'No waypoint set on map', type = 'error' })
        end

    elseif action == 'copyvector' then
        local ped = PlayerPedId()
        local c   = GetEntityCoords(ped)
        local h   = GetEntityHeading(ped)
        cb({ vector = string.format('vector4(%.4f, %.4f, %.4f, %.4f)', c.x, c.y, c.z, h) })
        return

    -- Vehicle
    elseif action == 'deleteveh' then
        local ped = PlayerPedId()
        local veh = GetVehiclePedIsIn(ped, false)
        if not veh or veh == 0 then
            local pos = GetEntityCoords(ped)
            veh = GetClosestVehicle(pos.x, pos.y, pos.z, 25.0, 0, 70)
        end
        if veh and veh ~= 0 then
            SetEntityAsMissionEntity(veh, true, true)
            DeleteVehicle(veh)
            lib.notify({ title = 'Vehicle Deleted', type = 'success' })
        else
            lib.notify({ title = 'No vehicle nearby', type = 'error' })
        end

    elseif action == 'repairveh' then
        local veh = GetVehiclePedIsIn(PlayerPedId(), false)
        if veh and veh ~= 0 then
            SetVehicleFixed(veh); SetVehicleDeformationFixed(veh); SetVehicleUndriveable(veh, false)
            WashDecalsFromVehicle(veh, 100.0); SetVehicleEngineHealth(veh, 1000.0); SetVehiclePetrolTankHealth(veh, 1000.0)
            lib.notify({ title = 'Vehicle Repaired', type = 'success' })
        else
            lib.notify({ title = 'Must be inside a vehicle', type = 'error' })
        end

    elseif action == 'maxmods' then
        local veh = GetVehiclePedIsIn(PlayerPedId(), false)
        if veh and veh ~= 0 then
            SetVehicleModKit(veh, 0)
            for i = 0, 49 do
                local max = GetNumVehicleMods(veh, i) - 1
                if max >= 0 then SetVehicleMod(veh, i, max, false) end
            end
            ToggleVehicleMod(veh, 18, true)
            ToggleVehicleMod(veh, 20, true)
            SetVehicleTyresCanBurst(veh, false)
            lib.notify({ title = 'Max Mods Applied', type = 'success' })
        else
            lib.notify({ title = 'Must be inside a vehicle', type = 'error' })
        end

    elseif action == 'setowner' then
        local ped = PlayerPedId()
        local veh = GetVehiclePedIsIn(ped, false)
        if not veh or veh == 0 then
            local pos = GetEntityCoords(ped)
            veh = GetClosestVehicle(pos.x, pos.y, pos.z, 25.0, 0, 70)
        end
        if veh and veh ~= 0 then
            local plate = GetVehicleNumberPlateText(veh)
            local model = GetEntityModel(veh)
            TriggerServerEvent('cipher-admin:server:selfSetVehicleOwner', plate, model)
        else
            lib.notify({ title = 'No vehicle nearby', type = 'error' })
        end

    -- Super sprint
    elseif action == 'supersprint' then
        _superSprintOn = not _superSprintOn
        if _superSprintOn then
            Citizen.CreateThread(function()
                while _superSprintOn do
                    SetRunSprintMultiplierForPlayer(PlayerId(), 2.5)
                    Wait(0)
                end
                SetRunSprintMultiplierForPlayer(PlayerId(), 1.0)
            end)
        end
        lib.notify({ title = 'Super Sprint', description = _superSprintOn and 'ON' or 'OFF', type = 'inform' })

    -- Super jump
    elseif action == 'superjump' then
        _superJumpOn = not _superJumpOn
        if _superJumpOn then
            Citizen.CreateThread(function()
                while _superJumpOn do
                    SetSuperJumpThisFrame(PlayerId())
                    Wait(0)
                end
            end)
        end
        lib.notify({ title = 'Super Jump', description = _superJumpOn and 'ON' or 'OFF', type = 'inform' })

    -- Clear area (vehicles + peds in radius)
    elseif action == 'cleararea' then
        local ped  = PlayerPedId()
        local pos  = GetEntityCoords(ped)
        local r    = data.radius or 50.0
        local delV = 0; local delP = 0
        for _, v in ipairs(GetGamePool('CVehicle')) do
            if #(GetEntityCoords(v) - pos) <= r then
                SetEntityAsMissionEntity(v, true, true)
                DeleteEntity(v)
                delV = delV + 1
            end
        end
        for _, p in ipairs(GetGamePool('CPed')) do
            if p ~= ped and not IsPedAPlayer(p) and #(GetEntityCoords(p) - pos) <= r then
                SetEntityAsMissionEntity(p, true, true)
                DeleteEntity(p)
                delP = delP + 1
            end
        end
        lib.notify({ title = 'Area Cleared', description = delV .. ' vehicles, ' .. delP .. ' peds', type = 'success' })

    -- Delete closest ped (NPC only)
    elseif action == 'deleteped' then
        local ped  = PlayerPedId()
        local pos  = GetEntityCoords(ped)
        local best, bestDist = nil, 20.0
        for _, p in ipairs(GetGamePool('CPed')) do
            if p ~= ped and not IsPedAPlayer(p) then
                local d = #(GetEntityCoords(p) - pos)
                if d < bestDist then best = p; bestDist = d end
            end
        end
        if best then
            SetEntityAsMissionEntity(best, true, true)
            DeleteEntity(best)
            lib.notify({ title = 'Ped Deleted', type = 'success' })
        else
            lib.notify({ title = 'No NPC nearby', type = 'error' })
        end

    -- World
    elseif action == 'spawnprop' then
        local model  = data.model or ''
        local frozen = data.frozen ~= false
        if model == '' then cb('ok') return end
        local hash = GetHashKey(model)
        RequestModel(hash)
        local t = 0
        while not HasModelLoaded(hash) do
            Wait(100); t = t + 100
            if t > 5000 then lib.notify({ title = 'Prop not found', description = model, type = 'error' }); cb('ok'); return end
        end
        local coords = GetEntityCoords(PlayerPedId())
        local prop   = CreateObject(hash, coords.x + 2.0, coords.y, coords.z, true, true, false)
        PlaceObjectOnGroundProperly(prop)
        FreezeEntityPosition(prop, frozen)
        SetModelAsNoLongerNeeded(hash)
        lib.notify({ title = 'Prop Spawned', description = model, type = 'success' })

    end

    cb('ok')
end)

-- ── Entity Inspector NUI callback ────────────────────────────────────────────
RegisterNUICallback('ca_getEntities', function(data, cb)
    local ped    = PlayerPedId()
    local pos    = GetEntityCoords(ped)
    local radius = (data and data.radius) or 150.0
    local vehs, peds, objs = {}, {}, {}

    for _, v in ipairs(GetGamePool('CVehicle')) do
        local vp = GetEntityCoords(v)
        local d  = #(vp - pos)
        if d <= radius then
            vehs[#vehs+1] = {
                netId  = NetworkGetNetworkIdFromEntity(v),
                model  = GetDisplayNameFromVehicleModel(GetEntityModel(v)):lower(),
                plate  = GetVehicleNumberPlateText(v),
                hp     = math.floor(GetEntityHealth(v) / 2.5),
                dist   = math.floor(d),
                x = math.floor(vp.x), y = math.floor(vp.y), z = math.floor(vp.z),
            }
        end
    end

    for _, p in ipairs(GetGamePool('CPed')) do
        local pp = GetEntityCoords(p)
        local d  = #(pp - pos)
        if d <= radius and not IsPedAPlayer(p) then
            peds[#peds+1] = {
                netId = NetworkGetNetworkIdFromEntity(p),
                model = tostring(GetEntityModel(p)),
                hp    = math.floor(GetEntityHealth(p) / 2.5),
                dist  = math.floor(d),
                x = math.floor(pp.x), y = math.floor(pp.y), z = math.floor(pp.z),
            }
        end
    end

    -- Sort by distance
    table.sort(vehs, function(a,b) return a.dist < b.dist end)
    table.sort(peds, function(a,b) return a.dist < b.dist end)
    cb({ vehicles = vehs, peds = peds })
end)

RegisterNUICallback('ca_deleteEntityByNet', function(data, cb)
    local ent = NetToEnt(tonumber(data.netId))
    if ent and ent ~= 0 then
        SetEntityAsMissionEntity(ent, true, true)
        DeleteEntity(ent)
        cb({ ok = true })
    else
        cb({ ok = false })
    end
end)

-- ── Give weapon (received from server) ───────────────────────────────────────
RegisterNetEvent('cipher-admin:client:giveWeapon')
AddEventHandler('cipher-admin:client:giveWeapon', function(weaponName, ammo)
    local hash = GetHashKey(weaponName)
    GiveWeaponToPed(PlayerPedId(), hash, ammo, false, true)
    lib.notify({ title = 'Weapon Received', description = weaponName .. ' x' .. ammo, type = 'success' })
end)

-- ── Noclip visibility sync (received by other clients) ───────────────────────
RegisterNetEvent('cipher-admin:client:noclipAlpha')
AddEventHandler('cipher-admin:client:noclipAlpha', function(netId, visible)
    CreateThread(function()
        Wait(200) -- brief wait for ped to exist
        local ped = NetToPed(netId)
        if not ped or ped == 0 then return end
        if visible then ResetEntityAlpha(ped) else SetEntityAlpha(ped, 0, false) end
    end)
end)

-- ── Admin Chat ───────────────────────────────────────────────────────────────
RegisterNUICallback('adminChat', function(data, cb)
    TriggerServerEvent('cipher-admin:server:adminChat', data.message or '')
    cb('ok')
end)

RegisterNetEvent('cipher-admin:client:adminChat')
AddEventHandler('cipher-admin:client:adminChat', function(data)
    SendNUIMessage({ type = 'adminChat', data = data })
    if not isOpen then
        lib.notify({ title = '[ADMIN] ' .. (data.sender or '?'), description = data.message, type = 'inform', duration = 5000 })
    end
end)

-- ── Slap ─────────────────────────────────────────────────────────────────────
RegisterNetEvent('cipher-admin:client:slap')
AddEventHandler('cipher-admin:client:slap', function()
    local ped = PlayerPedId()
    SetEntityVelocity(ped, math.random(-8, 8) * 1.0, math.random(-8, 8) * 1.0, 18.0)
    lib.notify({ title = 'Slapped!', description = 'An admin used the hand of justice.', type = 'error', duration = 3000 })
end)

-- ── Reset position ────────────────────────────────────────────────────────────
RegisterNetEvent('cipher-admin:client:resetPosition')
AddEventHandler('cipher-admin:client:resetPosition', function()
    local ped = PlayerPedId()
    SetEntityCoords(ped, 194.9438, -934.1517, 30.6868, false, false, false, false)
    SetEntityHeading(ped, 336.8065)
    lib.notify({ title = 'Position Reset', description = 'Teleported to spawn.', type = 'inform' })
end)

-- ── DM from admin ─────────────────────────────────────────────────────────────
RegisterNetEvent('cipher-admin:client:dm')
AddEventHandler('cipher-admin:client:dm', function(adminName, message)
    lib.notify({ title = '[ADMIN DM] ' .. adminName, description = message, type = 'inform', duration = 10000 })
    SendNUIMessage({ type = 'dm', adminName = adminName, message = message })
end)

-- ── Screenshot result ─────────────────────────────────────────────────────────
RegisterNetEvent('cipher-admin:client:screenshotResult')
AddEventHandler('cipher-admin:client:screenshotResult', function(url, targetName, err)
    SendNUIMessage({ type = 'screenshotResult', data = { url = url, playerName = targetName, err = err } })
end)

-- ── Remote alpha (noclip invisible to others) ─────────────────────────────────
RegisterNetEvent('cipher-admin:client:setRemoteAlpha')
AddEventHandler('cipher-admin:client:setRemoteAlpha', function(netId, alpha)
    local ent = NetToEnt(netId)
    if not ent or ent == 0 then return end
    if alpha == 0 then SetEntityAlpha(ent, 0, false) else ResetEntityAlpha(ent) end
end)

-- ── Report response to player ─────────────────────────────────────────────────
RegisterNetEvent('cipher-admin:client:reportResponse')
AddEventHandler('cipher-admin:client:reportResponse', function(data)
    lib.notify({ title = '[ADMIN RESPONSE]', description = (data.admin or 'Admin') .. ': ' .. (data.response or ''), type = 'success', duration = 12000 })
end)

-- ── New report (notify admins) ────────────────────────────────────────────────
RegisterNetEvent('cipher-admin:client:newReport')
AddEventHandler('cipher-admin:client:newReport', function(data)
    lib.notify({ title = '[REPORT] ' .. (data.name or 'Player'), description = data.message or '', type = 'inform', duration = 8000 })
    SendNUIMessage({ type = 'newReport', data = data })
end)

-- ── Warning notification ──────────────────────────────────────────────────────
RegisterNetEvent('cipher-admin:client:receiveWarning')
AddEventHandler('cipher-admin:client:receiveWarning', function(data)
    lib.notify({
        title       = '⚠️ Warning Received',
        description = 'Reason: ' .. (data.reason or 'N/A') .. '\nAdmin: ' .. (data.adminName or 'Admin'),
        type        = 'error',
        duration    = 10000,
    })
end)

-- ── Spawn Vehicle (client receives and spawns) ────────────────────────────────
RegisterNetEvent('cipher-admin:client:spawnVehicle')
AddEventHandler('cipher-admin:client:spawnVehicle', function(model, coords)
    local hash = GetHashKey(model)
    RequestModel(hash)
    local t = 0
    while not HasModelLoaded(hash) do Wait(100); t = t + 100; if t > 5000 then return end end
    local veh = CreateVehicle(hash, coords.x, coords.y, coords.z, coords.w or 0.0, true, false)
    SetVehicleOnGroundProperly(veh)
    SetEntityAsMissionEntity(veh, true, true)
    SetModelAsNoLongerNeeded(hash)
    TaskWarpPedIntoVehicle(PlayerPedId(), veh, -1)
    lib.notify({ title = 'Vehicle Spawned', description = model, type = 'success' })
end)

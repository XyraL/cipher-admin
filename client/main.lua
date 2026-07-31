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
    'cipher-admin:server:setAdminDuty',
    'cipher-admin:server:getDutyAdmins',
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
-- ── Self-action state & helpers ──────────────────────────────────────────────
_infStaminaOn, _fireproofOn, _noRagdollOn = false, false, false
_vehGodOn, _freezeTimeOn, _blackoutOn = false, false, false
_savedPosition, _lastPosition = nil, nil

-- 1.0 = stock. Applied every frame because the density natives only hold for
-- the frame they're called in.
_trafficDensity, _pedDensity = 1.0, 1.0

CreateThread(function()
    while true do
        if _trafficDensity < 1.0 or _pedDensity < 1.0 then
            SetVehicleDensityMultiplierThisFrame(_trafficDensity)
            SetRandomVehicleDensityMultiplierThisFrame(_trafficDensity)
            SetParkedVehicleDensityMultiplierThisFrame(_trafficDensity)
            SetPedDensityMultiplierThisFrame(_pedDensity)
            SetScenarioPedDensityMultiplierThisFrame(_pedDensity, _pedDensity)
            Wait(0)
        else
            Wait(500)
        end
    end
end)

-- Captured before every teleport so 'tpback' has somewhere to return to.
function RememberPosition()
    local c = GetEntityCoords(PlayerPedId())
    _lastPosition = { x = c.x, y = c.y, z = c.z }
end

function NearestVehicle(radius)
    local pos = GetEntityCoords(PlayerPedId())
    return GetClosestVehicle(pos.x, pos.y, pos.z, radius or 25.0, 0, 70)
end

function SetPedModelSafely(model)
    local hash = GetHashKey(model)
    if not IsModelInCdimage(hash) or not IsModelValid(hash) then
        lib.notify({ title = 'Model not found', description = model, type = 'error' })
        return false
    end
    RequestModel(hash)
    local t = 0
    while not HasModelLoaded(hash) do
        Wait(50); t = t + 50
        if t > 5000 then
            lib.notify({ title = 'Model failed to load', description = model, type = 'error' })
            return false
        end
    end
    SetPlayerModel(PlayerId(), hash)
    SetPedDefaultComponentVariation(PlayerPedId())
    SetModelAsNoLongerNeeded(hash)
    lib.notify({ title = 'Ped model set', description = model, type = 'success' })
    return true
end

-- Reapplying the character's OWN appearance is framework/resource specific —
-- a bare SetPlayerModel would put them in a default freemode body and throw
-- away their saved clothing. Ask whichever appearance resource is configured.
function RevertToOwnPed()
    local res = Config.AppearanceResource
    if res == 'illenium-appearance' or res == 'fivem-appearance' then
        TriggerEvent(res .. ':client:reloadSkin')
    elseif res == 'qb-clothing' then
        TriggerServerEvent('qb-clothes:loadPlayerSkin')
    elseif res == 'qbx_core' then
        TriggerEvent('qbx_core:client:playerLoaded')
    else
        lib.notify({ title = 'Cannot revert ped',
            description = 'Set Config.AppearanceResource to your appearance script.', type = 'error' })
        return
    end
    lib.notify({ title = 'Appearance reloaded', type = 'success' })
end

function OpenAppearanceMenu()
    local res = Config.AppearanceResource
    if res == 'illenium-appearance' or res == 'fivem-appearance' then
        TriggerEvent(res .. ':client:openClothingShopMenu')
    elseif res == 'qb-clothing' then
        TriggerEvent('qb-clothing:client:openMenu')
    elseif res == 'rcore_clothing' then
        TriggerEvent('rcore_clothing:openClothing')
    else
        lib.notify({ title = 'No appearance resource configured',
            description = 'Set Config.AppearanceResource in config.lua.', type = 'error' })
    end
end

-- Screen-centre raycast, used by Entity Info. Ignores the player's own ped so
-- looking straight down doesn't just report yourself.
function RaycastFromCamera(distance)
    local cam = GetGameplayCamCoord()
    local rot = GetGameplayCamRot(2)
    local rx, rz = math.rad(rot.x), math.rad(rot.z)
    local absX = math.abs(math.cos(rx))
    local dir = vector3(-math.sin(rz) * absX, math.cos(rz) * absX, math.sin(rx))
    local dest = cam + (dir * (distance or 30.0))
    local ray = StartShapeTestRay(cam.x, cam.y, cam.z, dest.x, dest.y, dest.z, -1, PlayerPedId(), 0)
    local _, hit, _, _, entity = GetShapeTestResult(ray)
    if hit == 1 then return entity end
    return 0
end

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
        -- Was hardcoded to qb-clothing, which does not exist on most QBox
        -- servers (illenium-appearance / fivem-appearance are the common
        -- choices there), so this button silently did nothing for them.
        -- Config.AppearanceResource now decides, and an unrecognised value
        -- says so instead of failing quietly.
        OpenAppearanceMenu()

    -- ── Personal (extended) ──
    elseif action == 'armour' then
        SetPedArmour(PlayerPedId(), 100)
        lib.notify({ title = 'Armour restored', type = 'success' })

    elseif action == 'infstamina' then
        _infStaminaOn = not _infStaminaOn
        if _infStaminaOn then
            Citizen.CreateThread(function()
                while _infStaminaOn do
                    RestorePlayerStamina(PlayerId(), 1.0)
                    Wait(1000)
                end
            end)
        end
        lib.notify({ title = 'Infinite Stamina', description = _infStaminaOn and 'ON' or 'OFF', type = 'inform' })

    elseif action == 'fireproof' then
        _fireproofOn = not _fireproofOn
        SetEntityProofs(PlayerPedId(), false, _fireproofOn, false, false, false, false, false, false)
        lib.notify({ title = 'Fireproof', description = _fireproofOn and 'ON' or 'OFF', type = 'inform' })

    elseif action == 'noragdoll' then
        _noRagdollOn = not _noRagdollOn
        SetPedCanRagdoll(PlayerPedId(), not _noRagdollOn)
        lib.notify({ title = 'No Ragdoll', description = _noRagdollOn and 'ON' or 'OFF', type = 'inform' })

    elseif action == 'clearwanted' then
        ClearPlayerWantedLevel(PlayerId())
        SetPlayerWantedLevel(PlayerId(), 0, false)
        SetPlayerWantedLevelNow(PlayerId(), false)
        lib.notify({ title = 'Wanted level cleared', type = 'success' })

    elseif action == 'setwanted' then
        local lvl = math.max(0, math.min(5, tonumber(data.level) or 0))
        SetPlayerWantedLevel(PlayerId(), lvl, false)
        SetPlayerWantedLevelNow(PlayerId(), false)
        lib.notify({ title = ('Wanted level set to %d'):format(lvl), type = 'inform' })

    -- ── Appearance (extended) ──
    elseif action == 'randomped' then
        local pool = {
            'a_m_m_beach_01','a_f_y_beach_01','a_m_y_business_01','a_f_m_business_02',
            'a_m_y_hipster_01','a_f_y_hipster_02','s_m_y_cop_01','s_m_m_paramedic_01',
            'a_m_m_farmer_01','a_m_y_skater_01','g_m_y_lost_01','u_m_y_zombie_01',
        }
        SetPedModelSafely(pool[math.random(#pool)])

    elseif action == 'revertped' then
        -- Asks the framework to reapply the character's own appearance rather
        -- than guessing a freemode model — the player may be either gender and
        -- carries saved clothing that a bare SetPlayerModel would discard.
        RevertToOwnPed()

    elseif action == 'walkstyle' then
        local style = data.style or 'RESET'
        if style == 'RESET' then
            ResetPedMovementClipset(PlayerPedId(), 0.0)
            lib.notify({ title = 'Walk style reset', type = 'inform' })
        else
            RequestAnimSet(style)
            local t = 0
            while not HasAnimSetLoaded(style) and t < 3000 do Wait(50); t = t + 50 end
            if HasAnimSetLoaded(style) then
                SetPedMovementClipset(PlayerPedId(), style, 0.25)
                lib.notify({ title = 'Walk style set', description = style, type = 'success' })
            else
                lib.notify({ title = 'Clipset not found', description = style, type = 'error' })
            end
        end

    -- ── Movement (extended) ──
    elseif action == 'tpcoords' then
        local x, y, z = tonumber(data.x), tonumber(data.y), tonumber(data.z)
        if not x or not y or not z then
            lib.notify({ title = 'Invalid coordinates', type = 'error' })
        else
            RememberPosition()
            SetEntityCoords(PlayerPedId(), x + 0.0, y + 0.0, z + 0.0, false, false, false, false)
            lib.notify({ title = 'Teleported', description = ('%.1f, %.1f, %.1f'):format(x, y, z), type = 'success' })
        end

    elseif action == 'savepos' then
        local c = GetEntityCoords(PlayerPedId())
        _savedPosition = { x = c.x, y = c.y, z = c.z, h = GetEntityHeading(PlayerPedId()) }
        lib.notify({ title = 'Position saved', description = ('%.1f, %.1f, %.1f'):format(c.x, c.y, c.z), type = 'success' })

    elseif action == 'loadpos' then
        if not _savedPosition then
            lib.notify({ title = 'No saved position', description = 'Use Save Position first', type = 'error' })
        else
            RememberPosition()
            SetEntityCoords(PlayerPedId(), _savedPosition.x, _savedPosition.y, _savedPosition.z, false, false, false, false)
            SetEntityHeading(PlayerPedId(), _savedPosition.h or 0.0)
            lib.notify({ title = 'Returned to saved position', type = 'success' })
        end

    elseif action == 'tpback' then
        -- One level of undo, captured by RememberPosition before every
        -- teleport this file performs. Deliberately not a stack: the case
        -- that matters is "I meant to click the other one".
        if not _lastPosition then
            lib.notify({ title = 'Nowhere to go back to', type = 'error' })
        else
            local p = _lastPosition
            _lastPosition = nil
            SetEntityCoords(PlayerPedId(), p.x, p.y, p.z, false, false, false, false)
            lib.notify({ title = 'Teleported back', type = 'success' })
        end

    -- ── Vehicle (extended) ──
    elseif action == 'flipveh' then
        local veh = GetVehiclePedIsIn(PlayerPedId(), false)
        if veh == 0 then veh = NearestVehicle(25.0) end
        if veh and veh ~= 0 then
            SetVehicleOnGroundProperly(veh)
            SetEntityRotation(veh, 0.0, 0.0, GetEntityHeading(veh), 2, true)
            lib.notify({ title = 'Vehicle flipped upright', type = 'success' })
        else
            lib.notify({ title = 'No vehicle nearby', type = 'error' })
        end

    elseif action == 'refuelveh' then
        local veh = GetVehiclePedIsIn(PlayerPedId(), false)
        if veh and veh ~= 0 then
            SetVehicleFuelLevel(veh, 100.0)
            -- Most fuel resources read a statebag rather than the native, so
            -- set both and let whichever is in use win.
            Entity(veh).state:set('fuel', 100.0, true)
            lib.notify({ title = 'Refuelled', type = 'success' })
        else
            lib.notify({ title = 'Must be inside a vehicle', type = 'error' })
        end

    elseif action == 'cleanveh' then
        local veh = GetVehiclePedIsIn(PlayerPedId(), false)
        if veh == 0 then veh = NearestVehicle(25.0) end
        if veh and veh ~= 0 then
            WashDecalsFromVehicle(veh, 1.0)
            SetVehicleDirtLevel(veh, 0.0)
            lib.notify({ title = 'Vehicle cleaned', type = 'success' })
        else
            lib.notify({ title = 'No vehicle nearby', type = 'error' })
        end

    elseif action == 'vehgod' then
        _vehGodOn = not _vehGodOn
        local veh = GetVehiclePedIsIn(PlayerPedId(), false)
        if veh == 0 then veh = NearestVehicle(25.0) end
        if veh and veh ~= 0 then
            SetEntityInvincible(veh, _vehGodOn)
            SetVehicleCanBeVisiblyDamaged(veh, not _vehGodOn)
            SetVehicleTyresCanBurst(veh, not _vehGodOn)
            SetVehicleWheelsCanBreak(veh, not _vehGodOn)
            lib.notify({ title = 'Vehicle God', description = _vehGodOn and 'ON' or 'OFF', type = 'inform' })
        else
            lib.notify({ title = 'No vehicle nearby', type = 'error' })
        end

    elseif action == 'setplate' then
        local veh = GetVehiclePedIsIn(PlayerPedId(), false)
        if veh == 0 then veh = NearestVehicle(25.0) end
        if veh and veh ~= 0 then
            SetVehicleNumberPlateText(veh, tostring(data.plate or ''):sub(1, 8))
            lib.notify({ title = 'Plate updated', description = data.plate, type = 'success' })
        else
            lib.notify({ title = 'No vehicle nearby', type = 'error' })
        end

    -- ── World (extended) ──
    elseif action == 'freezetime' then
        _freezeTimeOn = not _freezeTimeOn
        -- Client-side only: it holds YOUR clock, it does not change the
        -- server's. Use the Time action for that.
        if _freezeTimeOn then
            local h, m = GetClockHours(), GetClockMinutes()
            Citizen.CreateThread(function()
                while _freezeTimeOn do
                    NetworkOverrideClockTime(h, m, 0)
                    Wait(500)
                end
            end)
        end
        lib.notify({ title = 'Freeze Time', description = _freezeTimeOn and 'ON (local)' or 'OFF', type = 'inform' })

    elseif action == 'blackout' then
        _blackoutOn = not _blackoutOn
        SetArtificialLightsState(_blackoutOn)
        SetArtificialLightsStateAffectsVehicles(false)
        lib.notify({ title = 'Blackout', description = _blackoutOn and 'ON (local)' or 'OFF', type = 'inform' })

    elseif action == 'traffic' or action == 'peddensity' then
        local v = tonumber(data.value) or 1.0
        if action == 'traffic' then _trafficDensity = v else _pedDensity = v end
        lib.notify({ title = action == 'traffic' and 'Traffic density' or 'Pedestrian density',
                     description = ('%d%%'):format(math.floor(v * 100)), type = 'inform' })

    -- ── Area (extended) ──
    elseif action == 'clearvehicles' or action == 'clearpeds' or action == 'clearobjects' then
        local ped = PlayerPedId()
        local pos = GetEntityCoords(ped)
        local r   = tonumber(data.radius) or 50.0
        local pool = action == 'clearvehicles' and 'CVehicle'
                  or action == 'clearpeds' and 'CPed'
                  or 'CObject'
        local n = 0
        for _, e in ipairs(GetGamePool(pool)) do
            -- Never delete the admin's own ped, another player, or the
            -- vehicle the admin is currently sitting in.
            local skip = (e == ped)
                or (pool == 'CPed' and IsPedAPlayer(e))
                or (pool == 'CVehicle' and e == GetVehiclePedIsIn(ped, false))
            if not skip and #(GetEntityCoords(e) - pos) <= r then
                SetEntityAsMissionEntity(e, true, true)
                DeleteEntity(e)
                n = n + 1
            end
        end
        lib.notify({ title = 'Area cleared', description = ('%d removed within %dm'):format(n, r), type = 'success' })

    -- ── Utility (extended) ──
    elseif action == 'copyvector3' then
        local c = GetEntityCoords(PlayerPedId())
        cb({ vector = string.format('vector3(%.4f, %.4f, %.4f)', c.x, c.y, c.z) })
        return

    elseif action == 'entityinfo' then
        local ent = RaycastFromCamera(30.0)
        if not ent or ent == 0 or not DoesEntityExist(ent) then
            lib.notify({ title = 'Nothing in view', description = 'Aim at an entity and try again', type = 'error' })
        else
            local kind = IsEntityAVehicle(ent) and 'Vehicle' or IsEntityAPed(ent) and 'Ped' or 'Object'
            local model = GetEntityModel(ent)
            local c = GetEntityCoords(ent)
            lib.notify({
                title = ('%s · %d'):format(kind, model),
                description = ('net %s · %.1f, %.1f, %.1f'):format(
                    NetworkGetEntityIsNetworked(ent) and NetworkGetNetworkIdFromEntity(ent) or 'local', c.x, c.y, c.z),
                type = 'inform', duration = 12000,
            })
            print(('^3[cipher-admin]^0 %s model=%d coords=%.4f,%.4f,%.4f'):format(kind, model, c.x, c.y, c.z))
        end

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

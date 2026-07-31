-- Cipher-Admin Server — Player Actions

local IsAdmin        = function(src) return exports['cipher-admin']:IsAdmin(src) end
local HasPermission  = function(src, p) return exports['cipher-admin']:HasPermission(src, p) end
local GetAdminCache  = function(src) return exports['cipher-admin']:GetAdminCache(src) end
local Audit          = function(...) exports['cipher-admin']:Audit(...) end
local GetIdentifiers = function(src) return exports['cipher-admin']:GetIdentifiers(src) end

local function GetTargetPlayer(targetSrc)
    return Framework.GetPlayer(tonumber(targetSrc))
end

-- ── Main action handler ───────────────────────────────────────────────────────
RegisterNetEvent('cipher-admin:server:playerAction')
AddEventHandler('cipher-admin:server:playerAction', function(data)
    local src    = source
    if not IsAdmin(src) then return end
    local action = data.action
    local tSrc   = tonumber(data.targetSrc)
    local tp     = tSrc and GetTargetPlayer(tSrc)
    local tName  = tp and (tp.PlayerData.charinfo.firstname .. ' ' .. tp.PlayerData.charinfo.lastname) or data.targetName or '?'
    local tCid   = tp and tp.PlayerData.citizenid or data.targetCid

    -- ── Kick ─────────────────────────────────────────────────────────────────
    if action == 'kick' then
        if not HasPermission(src, 'kick') then return end
        if not tSrc then return end
        DropPlayer(tSrc, data.reason or 'Kicked by admin.')
        Audit(src, 'KICK', tName, tCid, data.reason)

    -- ── Freeze ───────────────────────────────────────────────────────────────
    elseif action == 'freeze' then
        if not HasPermission(src, 'freeze') then return end
        TriggerClientEvent('cipher-admin:client:freeze', tSrc, data.state)
        Audit(src, data.state and 'FREEZE' or 'UNFREEZE', tName, tCid, nil)

    -- ── Revive ────────────────────────────────────────────────────────────────
    elseif action == 'revive' then
        if not HasPermission(src, 'revive') then return end
        TriggerClientEvent('cipher-admin:client:revive', tSrc)
        Audit(src, 'REVIVE', tName, tCid, nil)

    -- ── Heal ──────────────────────────────────────────────────────────────────
    elseif action == 'heal' then
        if not HasPermission(src, 'heal') then return end
        if tp then
            tp.Functions.SetMetaData('hunger', 100)
            tp.Functions.SetMetaData('thirst', 100)
        end
        TriggerClientEvent('cipher-admin:client:heal', tSrc)
        Audit(src, 'HEAL', tName, tCid, nil)

    -- ── Goto ──────────────────────────────────────────────────────────────────
    elseif action == 'goto' then
        if not HasPermission(src, 'teleport') then return end
        -- Get target coords then teleport admin to them
        TriggerClientEvent('cipher-admin:client:getCoordsThen', tSrc, src)
        Audit(src, 'GOTO', tName, tCid, nil)

    -- ── Bring ─────────────────────────────────────────────────────────────────
    elseif action == 'bring' then
        if not HasPermission(src, 'bring') then return end
        TriggerClientEvent('cipher-admin:client:bringMe', src)
        -- bringMe asks admin client for coords → server → target teleports there
        Audit(src, 'BRING', tName, tCid, nil)
        -- Store pending bring target
        _G['_bringTarget_'..src] = tSrc

    -- ── Spectate ──────────────────────────────────────────────────────────────
    elseif action == 'spectate' then
        if not HasPermission(src, 'spectate') then return end
        local netId = NetworkGetNetworkIdFromEntity(GetPlayerPed(tSrc))
        TriggerClientEvent('cipher-admin:client:spectate', src, netId)
        Audit(src, 'SPECTATE', tName, tCid, nil)

    -- ── Noclip ────────────────────────────────────────────────────────────────
    elseif action == 'noclip' then
        if not HasPermission(src, 'noclip') then return end
        TriggerClientEvent('cipher-admin:client:toggleNoclip', src)

    -- ── Invisible ─────────────────────────────────────────────────────────────
    elseif action == 'invisible' then
        if not HasPermission(src, 'invisible') then return end
        TriggerClientEvent('cipher-admin:client:toggleInvisible', src)

    -- ── Set Job ───────────────────────────────────────────────────────────────
    elseif action == 'setjob' then
        if not HasPermission(src, 'setjob') then return end
        if not tp then return end
        tp.Functions.SetJob(data.job, data.grade or 0)
        Audit(src, 'SET_JOB', tName, tCid, data.job .. ' grade ' .. (data.grade or 0))

    -- ── Set Cash ─────────────────────────────────────────────────────────────
    elseif action == 'setcash' then
        if not HasPermission(src, 'setcash') then return end
        if not tp then return end
        local cur = tp.PlayerData.money.cash or 0
        if data.amount > cur then
            tp.Functions.AddMoney('cash', data.amount - cur)
        else
            tp.Functions.RemoveMoney('cash', cur - data.amount)
        end
        Audit(src, 'SET_CASH', tName, tCid, '$' .. data.amount)

    -- ── Set Bank ─────────────────────────────────────────────────────────────
    elseif action == 'setbank' then
        if not HasPermission(src, 'setbank') then return end
        if not tp then return end
        local cur = tp.PlayerData.money.bank or 0
        if data.amount > cur then
            tp.Functions.AddMoney('bank', data.amount - cur)
        else
            tp.Functions.RemoveMoney('bank', cur - data.amount)
        end
        Audit(src, 'SET_BANK', tName, tCid, '$' .. data.amount)

    -- ── Strip Weapons ─────────────────────────────────────────────────────────
    elseif action == 'stripweapons' then
        if not HasPermission(src, 'clearinv') then return end
        TriggerClientEvent('cipher-admin:client:stripWeapons', tSrc)
        Audit(src, 'STRIP_WEAPONS', tName, tCid, nil)

    -- ── Slap ──────────────────────────────────────────────────────────────────
    elseif action == 'slap' then
        if not HasPermission(src, 'slap') then return end
        if not tSrc then return end
        TriggerClientEvent('cipher-admin:client:slap', tSrc)
        Audit(src, 'SLAP', tName, tCid, nil)

    -- ── Reset position ────────────────────────────────────────────────────────
    elseif action == 'resetpos' then
        if not HasPermission(src, 'resetpos') then return end
        if not tSrc then return end
        TriggerClientEvent('cipher-admin:client:resetPosition', tSrc)
        Audit(src, 'RESET_POSITION', tName, tCid, nil)

    -- ── DM player ─────────────────────────────────────────────────────────────
    elseif action == 'dm' then
        if not HasPermission(src, 'dm') then return end
        if not tSrc then return end
        local a    = GetAdminCache(src)
        local from = a and a.name or GetPlayerName(src)
        TriggerClientEvent('cipher-admin:client:dm', tSrc, from, data.message or '')
        Audit(src, 'DM', tName, tCid, data.message)

    -- ── Screenshot ────────────────────────────────────────────────────────────
    elseif action == 'screenshot' then
        if not HasPermission(src, 'screenshot') then return end
        if not tSrc then return end

        local screenshotRes = nil
        for _, rname in ipairs({ 'screenshot-basic', 'screencapture' }) do
            if GetResourceState(rname) == 'started' then
                screenshotRes = rname
                break
            end
        end
        if not screenshotRes then
            TriggerClientEvent('ox_lib:notify', src, { title = 'Screenshot', description = 'No screenshot resource running (screenshot-basic / screencapture).', type = 'error' })
            return
        end

        local adminSrc   = src
        local playerName = tName
        local ok = pcall(function()
            exports[screenshotRes]:requestClientScreenshot(tSrc, { encoding = 'jpg', quality = 0.75 }, function(err, url)
                if not url then
                    TriggerClientEvent('ox_lib:notify', adminSrc, { title = 'Screenshot Failed', description = tostring(err or 'No URL returned'), type = 'error' })
                    return
                end
                TriggerClientEvent('cipher-admin:client:screenshotResult', adminSrc, url, playerName, err)
            end)
        end)
        if not ok then
            TriggerClientEvent('ox_lib:notify', src, { title = 'Screenshot', description = 'Export call failed.', type = 'error' })
        end

        Audit(src, 'SCREENSHOT', tName, tCid, nil)
        return  -- async, skip cb below

    -- ── Give weapon ───────────────────────────────────────────────────────────────
    elseif action == 'giveweapon' then
        if not HasPermission(src, 'giveweapon') then return end
        if not tSrc then return end
        local weaponName = (data.weapon or 'WEAPON_PISTOL'):lower()
        local ammo = tonumber(data.ammo) or 100
        -- Add to ox_inventory so it persists through relogs
        if Config.InventoryResource == 'ox_inventory' then
            pcall(function()
                exports.ox_inventory:AddItem(tSrc, weaponName, 1, { ammo = ammo })
            end)
        end
        -- Also give natively for immediate in-hand effect
        TriggerClientEvent('cipher-admin:client:giveWeapon', tSrc, weaponName, ammo)
        Audit(src, 'GIVE_WEAPON', tName, tCid, weaponName .. ' x' .. tostring(ammo))

    -- ── Delete nearest vehicle ────────────────────────────────────────────────
    elseif action == 'deletevehicle' then
        if not HasPermission(src, 'deleteveh') then return end
        TriggerClientEvent('cipher-admin:client:deleteNearestVeh', tSrc or src)
        Audit(src, 'DELETE_VEHICLE', tName, tCid, nil)

    -- ── Spawn Vehicle ─────────────────────────────────────────────────────────
    elseif action == 'spawnveh' then
        if not HasPermission(src, 'spawnveh') then return end
        local spawnSrc = tSrc or src
        TriggerClientEvent('cipher-admin:client:getSpawnCoords', spawnSrc, data.model, src)
        Audit(src, 'SPAWN_VEHICLE', tName, tCid, data.model)
    end
end)

-- ── Bring coord relay ─────────────────────────────────────────────────────────
RegisterNetEvent('cipher-admin:server:receiveBringCoords')
AddEventHandler('cipher-admin:server:receiveBringCoords', function(coords)
    local src      = source
    local targetSrc = _G['_bringTarget_'..src]
    if targetSrc then
        TriggerClientEvent('cipher-admin:client:bringTarget', targetSrc, coords)
        _G['_bringTarget_'..src] = nil
    end
end)

-- ── Goto coord relay ─────────────────────────────────────────────────────────
RegisterNetEvent('cipher-admin:server:relayGotoCoords')
AddEventHandler('cipher-admin:server:relayGotoCoords', function(adminSrc, coords)
    TriggerClientEvent('cipher-admin:client:teleport', tonumber(adminSrc), coords)
end)

-- ── Get coords then relay ─────────────────────────────────────────────────────
RegisterNetEvent('cipher-admin:client:getCoordsThen')
-- handled client-side; client fires relayGotoCoords back

-- Client events received
RegisterNetEvent('cipher-admin:client:revive')
RegisterNetEvent('cipher-admin:client:heal')
RegisterNetEvent('cipher-admin:client:stripWeapons')
RegisterNetEvent('cipher-admin:client:deleteNearestVeh')
RegisterNetEvent('cipher-admin:client:getSpawnCoords')

-- ── Spawn vehicle coord relay ─────────────────────────────────────────────────
RegisterNetEvent('cipher-admin:server:spawnVehCoords')
AddEventHandler('cipher-admin:server:spawnVehCoords', function(adminSrc, model, coords)
    TriggerClientEvent('cipher-admin:client:spawnVehicle', tonumber(adminSrc), model, coords)
end)

-- ── Give vehicle keys after admin spawn ──────────────────────────────────────
RegisterNetEvent('cipher-admin:server:giveVehicleKeys')
AddEventHandler('cipher-admin:server:giveVehicleKeys', function(plate, model)
    local src = source
    if not IsAdmin(src) then return end
    local p   = Framework.GetPlayer(src)
    local cid = p and p.PlayerData.citizenid

    -- qbx_vehiclekeys (standard QBX key resource): addKey(plate, citizenid)
    local ok = cid and pcall(function()
        exports['qbx_vehiclekeys']:addKey(plate, cid)
    end)
    if not ok then
        -- ox_inventory vehicle_key item fallback
        local ok2 = pcall(function()
            exports.ox_inventory:AddItem(src, 'vehicle_key', 1, { plate = plate, label = model })
        end)
        if not ok2 then
            -- Legacy QB key event last resort
            TriggerClientEvent('vehiclekeys:client:SetOwner', src, plate)
        end
    end
end)

-- ── Noclip visibility broadcast ───────────────────────────────────────────────
RegisterNetEvent('cipher-admin:server:noclipSync')
AddEventHandler('cipher-admin:server:noclipSync', function(netId, visible)
    local src = source
    if not IsAdmin(src) then return end
    for _, psrc in ipairs(GetPlayers()) do
        local pid = tonumber(psrc)
        if pid ~= src then
            TriggerClientEvent('cipher-admin:client:noclipAlpha', pid, netId, visible)
        end
    end
end)

-- ── Noclip alpha broadcast (invisible to others while noclipping) ────────────
RegisterNetEvent('cipher-admin:server:setPlayerAlpha')
AddEventHandler('cipher-admin:server:setPlayerAlpha', function(alpha)
    local src   = source
    if not IsAdmin(src) then return end
    local netId = NetworkGetNetworkIdFromEntity(GetPlayerPed(src))
    for _, psrc in ipairs(GetPlayers()) do
        local pid = tonumber(psrc)
        if pid ~= src then
            TriggerClientEvent('cipher-admin:client:setRemoteAlpha', pid, netId, alpha)
        end
    end
end)

-- ── Self: Food & Water ────────────────────────────────────────────────────────
RegisterNetEvent('cipher-admin:server:selfFoodWater')
AddEventHandler('cipher-admin:server:selfFoodWater', function()
    local src = source
    if not IsAdmin(src) then return end
    local p   = Framework.GetPlayer(src)
    if p then
        p.Functions.SetMetaData('hunger', 100)
        p.Functions.SetMetaData('thirst', 100)
    end
end)

-- ── Self: Register vehicle ownership ─────────────────────────────────────────
RegisterNetEvent('cipher-admin:server:selfSetVehicleOwner')
AddEventHandler('cipher-admin:server:selfSetVehicleOwner', function(plate, modelHash)
    local src = source
    if not IsAdmin(src) then return end
    local p   = Framework.GetPlayer(src)
    if not p then return end
    local cid = p.PlayerData.citizenid
    -- Check if plate already registered
    local existing = MySQL.scalar.await('SELECT COUNT(*) FROM player_vehicles WHERE plate = ?', { plate })
    if existing and existing > 0 then
        MySQL.update.await('UPDATE player_vehicles SET citizenid = ? WHERE plate = ?', { cid, plate })
    else
        MySQL.insert.await('INSERT INTO player_vehicles (citizenid, plate, vehicle, hash, garage, state) VALUES (?, ?, ?, ?, ?, ?)', {
            cid, plate, '{}', modelHash, 'pillboxgarage', 1
        })
    end
    TriggerClientEvent('ox_lib:notify', src, { title = 'Vehicle Registered', description = 'Plate: ' .. plate, type = 'success' })
end)

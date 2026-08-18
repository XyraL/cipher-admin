-- Framework bridge — detects QBox (qbx_core) or QBCore (qb-core) and exposes
-- one API so nothing else in this resource branches on which is running.
--
-- The surface needing abstraction is small: both frameworks return a player
-- object with the same shape (.PlayerData with citizenid/charinfo/money/items,
-- .Functions with AddMoney/RemoveMoney/AddItem/RemoveItem/SetJob/SetMetaData).
-- Only obtaining it differs.

-- cb(nil) sends no response body, so the page's fetch never settles and the
-- calling panel sits on "Loading..." forever. Sixteen server callbacks can
-- legitimately return nil. false encodes fine and still reads as "no data" to
-- every consumer in the panel.
if not IsDuplicityVersion() and type(RegisterNUICallback) == 'function' then
    local _registerNUI = RegisterNUICallback

    RegisterNUICallback = function(name, handler)
        return _registerNUI(name, function(data, cb)
            handler(data, function(payload, ...)
                if payload == nil then payload = false end
                cb(payload, ...)
            end)
        end)
    end
end

Framework = { name = nil, core = nil }

if GetResourceState('qbx_core') == 'started' then
    Framework.name = 'qbox'
elseif GetResourceState('qb-core') == 'started' then
    Framework.name = 'qbcore'
    Framework.core = exports['qb-core']:GetCoreObject()
else
    -- Not a hard error: the panel should still open so an admin can read this.
    print('^1[cipher-admin]^0 No supported framework found. Start qbx_core or qb-core BEFORE cipher-admin.')
end

-- Returns the framework player object for a server id, or nil if that source
-- has no loaded character.
function Framework.GetPlayer(src)
    if not src then return nil end

    if Framework.name == 'qbox' then
        return exports.qbx_core:GetPlayer(src)
    elseif Framework.name == 'qbcore' then
        return Framework.core.Functions.GetPlayer(src)
    end
    return nil
end

-- ── Shared data ───────────────────────────────────────────────────────────────
-- GetPlayer was the only function here for a long time, because player
-- enumeration and offline lookups are already framework-agnostic. These three
-- are not: QBCore keeps vehicles, items and weapons on QBCore.Shared, while
-- QBox exposes vehicles through qbx_core exports and hands items and weapons
-- to ox_inventory entirely.
--
-- Each returns a normalised table, or nil when the source is unavailable so the
-- caller can fall back to its built-in list rather than render an empty picker.

-- { [spawnName] = { label, brand, category } }
function Framework.GetVehicles()
    if Framework.name == 'qbox' then
        local ok, list = pcall(function() return exports.qbx_core:GetVehiclesByName() end)
        if ok and type(list) == 'table' and next(list) then
            local out = {}
            for spawn, v in pairs(list) do
                out[spawn] = {
                    label    = v.name or spawn,
                    brand    = v.brand,
                    category = v.category or 'Uncategorised',
                }
            end
            return out
        end

    elseif Framework.name == 'qbcore' and Framework.core then
        local shared = Framework.core.Shared and Framework.core.Shared.Vehicles
        if type(shared) == 'table' and next(shared) then
            local out = {}
            for spawn, v in pairs(shared) do
                out[spawn] = {
                    label    = v.name or spawn,
                    brand    = v.brand,
                    category = v.category or 'Uncategorised',
                }
            end
            return out
        end
    end

    return nil
end

-- { [name] = { label, weight } }
function Framework.GetItems()
    -- ox_inventory owns items on QBox and on plenty of QBCore servers too, so
    -- it is tried first regardless of framework.
    local ok, items = pcall(function() return exports.ox_inventory:Items() end)
    if ok and type(items) == 'table' and next(items) then
        local out = {}
        for name, item in pairs(items) do
            out[name] = { label = item.label or name, weight = item.weight }
        end
        return out
    end

    if Framework.name == 'qbcore' and Framework.core then
        local shared = Framework.core.Shared and Framework.core.Shared.Items
        if type(shared) == 'table' and next(shared) then
            local out = {}
            for name, item in pairs(shared) do
                out[name] = { label = item.label or name, weight = item.weight }
            end
            return out
        end
    end

    return nil
end

-- { [name] = { label } } — name is the spawn name, e.g. 'weapon_pistol'.
function Framework.GetWeapons()
    -- On an ox_inventory server a weapon is just an item whose name starts
    -- weapon_, so the item list is the weapon list.
    local items = Framework.GetItems()
    if items then
        local out, found = {}, false
        for name, item in pairs(items) do
            if name:sub(1, 7) == 'weapon_' then
                out[name] = { label = item.label }
                found = true
            end
        end
        if found then return out end
    end

    -- QBCore keys Shared.Weapons by hash, with the spawn name on the value.
    if Framework.name == 'qbcore' and Framework.core then
        local shared = Framework.core.Shared and Framework.core.Shared.Weapons
        if type(shared) == 'table' and next(shared) then
            local out = {}
            for _, w in pairs(shared) do
                if w.name then out[w.name] = { label = w.label or w.name } end
            end
            return out
        end
    end

    return nil
end

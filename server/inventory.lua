-- Cipher-Admin Server — Inventory Viewer / Editor

local IsAdmin       = function(src) return exports['cipher-admin']:IsAdmin(src) end
local HasPermission = function(src, p) return exports['cipher-admin']:HasPermission(src, p) end
local GetAdminCache = function(src) return exports['cipher-admin']:GetAdminCache(src) end
local Audit         = function(...) exports['cipher-admin']:Audit(...) end

-- Resolve the ox_inventory key from request data.
-- Returns a player source (number) for online players or citizenid (string) for offline.
-- The search box is labelled "Name (online) or Citizenid", but only citizenid
-- was ever matched — a name fell straight through and got handed to
-- ox_inventory as if it were an inventory id, which silently returned nothing.
-- Names are now resolved too, in order of how confident the match is:
--   1. exact citizenid          2. exact full name
--   3. unique partial name      4. treat the input as an offline citizenid
-- Partial matches only win when exactly one player matches, so typing "sam"
-- with two Sams on the server opens neither rather than the wrong one.
local function ResolveInvKey(data)
    local tSrc = tonumber(data.targetSrc)
    if tSrc and tSrc > 0 then return tSrc end

    local query = ((data.targetCid or data.invId) or ''):lower():match('^%s*(.-)%s*$')
    if query == '' then return nil end

    local exactName, partials = nil, {}

    for _, psrc in ipairs(GetPlayers()) do
        local pid = tonumber(psrc)
        local p = Framework.GetPlayer(pid)

        if p then
            local pd = p.PlayerData

            if (pd.citizenid or ''):lower() == query then
                return pid
            end

            local ci = pd.charinfo or {}
            local full = ('%s %s'):format(ci.firstname or '', ci.lastname or ''):lower():match('^%s*(.-)%s*$')

            if full ~= '' and full == query then
                exactName = pid
            elseif full ~= '' and full:find(query, 1, true) then
                partials[#partials + 1] = pid
            else
                -- Fall back to the connection name, which is what an admin
                -- sees in the server console and may well be what they typed.
                local conn = (GetPlayerName(pid) or ''):lower()
                if conn ~= '' and conn:find(query, 1, true) then
                    partials[#partials + 1] = pid
                end
            end
        end
    end

    if exactName then return exactName end
    if #partials == 1 then return partials[1] end

    -- Ambiguous, or nothing online matched: treat it as an offline citizenid.
    return query
end

-- The qb/qs inventory paths need a numeric player source, not an inventory
-- key. They previously read data.targetSrc straight from the request, which is
-- null whenever the admin found the player by NAME rather than by clicking a
-- row — so on those inventory systems give/remove/transfer silently did
-- nothing. ResolveInvKey already returns a source for online players, so
-- prefer that and only fall back to the raw field.
local function ResolveSrc(data, invKey)
    if type(invKey) == 'number' then return invKey end
    return tonumber(data.targetSrc)
end

local function GetOxItems(invKey)
    local inv = exports.ox_inventory:GetInventory(invKey, false)
    if not inv then return nil, nil end
    local items = {}
    for slot, item in pairs(inv.items or {}) do
        if item then
            items[#items+1] = {
                slot     = slot,
                name     = item.name,
                label    = item.label or item.name,
                count    = item.count or item.amount or 1,
                metadata = item.metadata,
                weight   = item.weight,
            }
        end
    end
    return items, inv
end

-- ── Get inventory ─────────────────────────────────────────────────────────────
lib.callback.register('cipher-admin:server:getInventory', function(src, data)
    if not IsAdmin(src) then return nil end
    if not HasPermission(src, 'viewinv') then return nil end

    local res = Config.InventoryResource

    if res == 'ox_inventory' then
        local invKey = ResolveInvKey(data)
        if not invKey then return nil end
        local items, inv = GetOxItems(invKey)
        if not inv then return nil end
        return { items = items, label = inv.label or tostring(invKey), weight = inv.weight, maxWeight = inv.maxWeight }

    elseif res == 'qb-inventory' then
        -- Resolved rather than raw, so a name search works here too.
        local inv = exports['qb-inventory']:GetInventory(tostring(ResolveInvKey(data) or data.targetCid))
        if not inv then return nil end
        local items = {}
        for _, item in pairs(inv) do
            if item and item.name then
                items[#items+1] = { slot = item.slot, name = item.name, label = item.label or item.name, count = item.amount or 1 }
            end
        end
        return { items = items }

    elseif res == 'qs-inventory' then
        local inv = exports['qs-inventory']:GetInventory(ResolveInvKey(data) or data.targetCid)
        if not inv then return nil end
        local items = {}
        for _, item in pairs(inv.items or inv) do
            if item and item.name then
                items[#items+1] = { slot = item.slot, name = item.name, label = item.label or item.name, count = item.count or item.amount or 1 }
            end
        end
        return { items = items }
    end

    return nil
end)

-- ── Get admin's own inventory (for comparison pane) ───────────────────────────
lib.callback.register('cipher-admin:server:getAdminInventory', function(src)
    if not IsAdmin(src) then return nil end
    if Config.InventoryResource ~= 'ox_inventory' then return nil end
    local items, inv = GetOxItems(tonumber(src))
    if not inv then return nil end
    return { items = items, label = inv.label or 'Your Inventory', weight = inv.weight, maxWeight = inv.maxWeight }
end)

-- ── Give item ─────────────────────────────────────────────────────────────────
lib.callback.register('cipher-admin:server:giveItem', function(src, data)
    if not IsAdmin(src) then return false end
    if not HasPermission(src, 'giveitem') then return false end

    local res   = Config.InventoryResource
    local invKey = ResolveInvKey(data)
    local item  = data.item
    local count = tonumber(data.count) or 1

    if res == 'ox_inventory' then
        exports.ox_inventory:AddItem(invKey, item, count, data.metadata)
    elseif res == 'qb-inventory' then
        local p = Framework.GetPlayer(ResolveSrc(data, invKey))
        if p then p.Functions.AddItem(item, count, false, data.metadata) end
    elseif res == 'qs-inventory' then
        exports['qs-inventory']:AddItem(ResolveSrc(data, invKey), item, count, data.metadata)
    end

    Audit(src, 'GIVE_ITEM', data.targetName, data.targetCid, count .. 'x ' .. item)
    return true
end)

-- ── Remove item ───────────────────────────────────────────────────────────────
lib.callback.register('cipher-admin:server:removeItem', function(src, data)
    if not IsAdmin(src) then return false end
    if not HasPermission(src, 'editinv') then return false end

    local res    = Config.InventoryResource
    local invKey = ResolveInvKey(data)
    local item   = data.item
    local count  = tonumber(data.count) or 1

    if not invKey then return false end

    if res == 'ox_inventory' then
        exports.ox_inventory:RemoveItem(invKey, item, count)
    elseif res == 'qb-inventory' then
        local p = Framework.GetPlayer(ResolveSrc(data, invKey))
        if p then p.Functions.RemoveItem(item, count) end
    elseif res == 'qs-inventory' then
        exports['qs-inventory']:RemoveItem(ResolveSrc(data, invKey), item, count)
    end

    Audit(src, 'REMOVE_ITEM', data.targetName, data.targetCid, count .. 'x ' .. item)
    return true
end)

-- ── Transfer item (between admin and target) ──────────────────────────────────
lib.callback.register('cipher-admin:server:transferItem', function(src, data)
    if not IsAdmin(src) then return false end
    if not HasPermission(src, 'editinv') then return false end
    if Config.InventoryResource ~= 'ox_inventory' then return false end

    local targetKey = ResolveInvKey(data)
    local adminKey  = tonumber(src)
    local item  = data.item
    local count = tonumber(data.count) or 1

    if not targetKey then return false end

    local fromKey, toKey
    if data.direction == 'toAdmin' then
        fromKey = targetKey; toKey = adminKey
    else
        fromKey = adminKey; toKey = targetKey
    end

    local removed = exports.ox_inventory:RemoveItem(fromKey, item, count)
    if removed then
        exports.ox_inventory:AddItem(toKey, item, count)
        local dir = data.direction == 'toAdmin' and 'TOOK' or 'GAVE'
        Audit(src, 'TRANSFER_ITEM_' .. dir, data.targetName, data.targetCid, count .. 'x ' .. item)
        return true
    end
    return false
end)

-- ── Clear inventory ───────────────────────────────────────────────────────────
lib.callback.register('cipher-admin:server:clearInventory', function(src, data)
    if not IsAdmin(src) then return false end
    if not HasPermission(src, 'clearinv') then return false end

    local res    = Config.InventoryResource
    local invKey = ResolveInvKey(data)

    if res == 'ox_inventory' then
        exports.ox_inventory:ClearInventory(invKey)
    elseif res == 'qb-inventory' then
        local p = Framework.GetPlayer(ResolveSrc(data, invKey))
        if p then
            for _, item in pairs(p.PlayerData.items or {}) do
                if item then p.Functions.RemoveItem(item.name, item.amount) end
            end
        end
    elseif res == 'qs-inventory' then
        exports['qs-inventory']:ClearInventory(ResolveSrc(data, invKey))
    end

    Audit(src, 'CLEAR_INVENTORY', data.targetName, data.targetCid, nil)
    return true
end)

-- ── Get item list (for give item search) ──────────────────────────────────────
lib.callback.register('cipher-admin:server:getItemList', function(src)
    if not IsAdmin(src) then return nil end
    if Config.InventoryResource == 'ox_inventory' then
        local items = exports.ox_inventory:Items()
        local list  = {}
        for name, item in pairs(items) do
            list[#list+1] = { name = name, label = item.label or name, weight = item.weight }
        end
        return list
    end
    return {}
end)

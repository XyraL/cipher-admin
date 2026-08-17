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

-- GetPlayer is the only function here on purpose. Player enumeration uses the
-- native GetPlayers(), and offline lookups read the `players` table directly —
-- both already framework-agnostic.

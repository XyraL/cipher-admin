-- Cipher-Admin Server — Resource Manager

local IsAdmin       = function(src) return exports['cipher-admin']:IsAdmin(src) end
local HasPermission = function(src, p) return exports['cipher-admin']:HasPermission(src, p) end
local Audit         = function(...) exports['cipher-admin']:Audit(...) end

lib.callback.register('cipher-admin:server:getResources', function(src)
    if not IsAdmin(src) then return nil end
    local result = {}
    for i = 0, GetNumResources() - 1 do
        local name  = GetResourceByFindIndex(i)
        local state = GetResourceState(name)
        if name and name ~= '' then
            result[#result+1] = { name = name, state = state }
        end
    end
    table.sort(result, function(a, b) return a.name < b.name end)
    return result
end)

lib.callback.register('cipher-admin:server:restartResource', function(src, data)
    if not IsAdmin(src) then return false end
    if not HasPermission(src, 'restartresource') then return false end
    local name = data and data.name
    if not name or name == '' then return false end
    -- Delay so the callback can return before the resource is stopped
    SetTimeout(600, function()
        StopResource(name)
        SetTimeout(1200, function() StartResource(name) end)
    end)
    Audit(src, 'RESTART_RESOURCE', nil, nil, name)
    return true
end)

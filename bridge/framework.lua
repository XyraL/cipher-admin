-- ─────────────────────────────────────────────────────────────
-- Framework bridge
--
-- Auto-detects QBox (qbx_core) or QBCore (qb-core) and exposes one API, so
-- nothing else in this resource branches on which framework is running.
--
-- Until now the README, the fxmanifest dependencies block and the GitHub
-- description all advertised "QBox / QBCore" while the code called
-- exports['qbx_core'] directly in five files — so QBCore servers installed it
-- and hit an immediate export error. This file is what makes that claim true.
--
-- The good news is that the surface needing abstraction is tiny: both
-- frameworks return a player object with the SAME shape (`.PlayerData` with
-- citizenid/charinfo/money/items, and `.Functions` with AddMoney/RemoveMoney/
-- AddItem/RemoveItem/SetJob/SetMetaData). Only the way you *obtain* that
-- object differs, so that is all this bridge normalises. Call sites keep
-- using `player.PlayerData.citizenid` and `player.Functions.AddMoney(...)`
-- exactly as before.
-- ─────────────────────────────────────────────────────────────
Framework = { name = nil, core = nil }

if GetResourceState('qbx_core') == 'started' then
    Framework.name = 'qbox'
elseif GetResourceState('qb-core') == 'started' then
    Framework.name = 'qbcore'
    Framework.core = exports['qb-core']:GetCoreObject()
else
    -- Deliberately not a hard error: the NUI should still be able to load so
    -- an admin can see the panel and read this message, rather than the
    -- resource dying silently and looking like a missing file.
    print('^1[cipher-admin]^0 No supported framework found. Start qbx_core or qb-core BEFORE cipher-admin.')
end

-- Returns the framework player object for a server id, or nil if that source
-- has no loaded character. Callers already handle nil.
function Framework.GetPlayer(src)
    if not src then return nil end

    if Framework.name == 'qbox' then
        return exports.qbx_core:GetPlayer(src)
    elseif Framework.name == 'qbcore' then
        return Framework.core.Functions.GetPlayer(src)
    end
    return nil
end

-- GetPlayer is deliberately the ONLY function here. Two other things looked
-- like they'd need bridging and turned out not to:
--   * Enumerating players — the codebase uses the native GetPlayers(), which
--     is framework-agnostic already.
--   * Offline character lookups — those go straight to the `players` table,
--     and QBox and QBCore share that schema.
-- Adding wrappers for either would have been abstraction with no caller.

if Config and Config.Debug then
    print(('^2[cipher-admin]^0 framework bridge loaded (%s)'):format(Framework.name or 'NONE'))
end

Config = {}

-- ── Owner Identifiers ─────────────────────────────────────────────────────────
-- Players with ANY of these identifiers are always Owner regardless of DB role.
-- Find yours with: print(GetPlayerIdentifierByType(source, 'license'))
Config.Owners = {
    '',
}

-- ── Keybind ───────────────────────────────────────────────────────────────────
Config.OpenKey = 'F7'   -- Default key — players can rebind in Settings > Key Bindings > FiveM

-- ── Discord Webhook ───────────────────────────────────────────────────────────
-- Audit log posts for kicks, bans, warns
Config.AuditWebhook = ''

-- ── Inventory Resource ────────────────────────────────────────────────────────
-- 'ox_inventory' | 'qb-inventory' | 'qs-inventory'
Config.InventoryResource = 'ox_inventory'

-- ── Default Roles ─────────────────────────────────────────────────────────────
-- Seeded into DB on first start if the roles table is empty.
-- After first start, manage roles live from the Permissions panel.
Config.DefaultRoles = {
    {
        name  = 'senioradmin',
        label = 'Senior Admin',
        color = '#6366f1',
        permissions = {
            -- Player actions
            kick         = true,
            warn         = true,
            tempban      = true,
            permban      = true,
            freeze       = true,
            spectate     = true,
            bring        = true,
            teleport     = true,
            revive       = true,
            heal         = true,
            noclip       = true,
            invisible    = true,
            godmode      = true,
            clearwanted  = true,
            -- Character
            setjob       = true,
            setgrade     = true,
            setcash      = true,
            setbank      = true,
            -- Inventory
            viewinv      = true,
            editinv      = true,
            clearinv     = true,
            giveitem     = true,
            -- Vehicles
            spawnveh     = true,
            deleteveh    = true,
            -- Server
            announcement = true,
            weather      = true,
            time         = true,
            -- Admin mgmt
            viewnotes    = true,
            addnote      = true,
            viewaudit    = true,
            manageroles  = false,
            assignroles  = false,
            unban        = true,
            deletechar   = true,
            -- New features
            screenshot      = true,
            slap            = true,
            resetpos        = true,
            dm              = true,
            restartresource = true,
            reports         = true,
            giveweapon      = true,
            summonall       = true,
            viewentities    = true,
        },
    },
    {
        name  = 'admin',
        label = 'Admin',
        color = '#8b5cf6',
        permissions = {
            kick         = true,
            warn         = true,
            tempban      = true,
            permban      = false,
            freeze       = true,
            spectate     = true,
            bring        = true,
            teleport     = true,
            revive       = true,
            heal         = true,
            noclip       = true,
            invisible    = true,
            godmode      = true,
            clearwanted  = true,
            setjob       = true,
            setgrade     = true,
            setcash      = false,
            setbank      = false,
            viewinv      = true,
            editinv      = false,
            clearinv     = false,
            giveitem     = true,
            spawnveh     = true,
            deleteveh    = true,
            announcement = true,
            weather      = false,
            time         = false,
            viewnotes    = true,
            addnote      = true,
            viewaudit    = false,
            manageroles  = false,
            assignroles  = false,
            unban        = false,
            deletechar   = false,
            -- New features
            screenshot      = true,
            slap            = true,
            resetpos        = true,
            dm              = true,
            restartresource = false,
            reports         = true,
            giveweapon      = true,
            summonall       = false,
            viewentities    = true,
        },
    },
    {
        name  = 'moderator',
        label = 'Moderator',
        color = '#10b981',
        permissions = {
            kick         = true,
            warn         = true,
            tempban      = false,
            permban      = false,
            freeze       = true,
            spectate     = true,
            bring        = false,
            teleport     = true,
            revive       = true,
            heal         = true,
            noclip       = false,
            invisible    = false,
            godmode      = false,
            clearwanted  = true,
            setjob       = false,
            setgrade     = false,
            setcash      = false,
            setbank      = false,
            viewinv      = true,
            editinv      = false,
            clearinv     = false,
            giveitem     = false,
            spawnveh     = false,
            deleteveh    = false,
            announcement = false,
            weather      = false,
            time         = false,
            viewnotes    = true,
            addnote      = true,
            viewaudit    = false,
            manageroles  = false,
            assignroles  = false,
            unban        = false,
            -- New features
            screenshot      = true,
            slap            = false,
            resetpos        = true,
            dm              = true,
            restartresource = false,
            reports         = true,
            giveweapon      = false,
            summonall       = false,
            viewentities    = true,
        },
    },
    {
        name  = 'support',
        label = 'Support',
        color = '#f59e0b',
        permissions = {
            kick         = false,
            warn         = true,
            tempban      = false,
            permban      = false,
            freeze       = false,
            spectate     = true,
            bring        = false,
            teleport     = true,
            revive       = true,
            heal         = true,
            noclip       = false,
            invisible    = false,
            godmode      = false,
            clearwanted  = true,
            setjob       = false,
            setgrade     = false,
            setcash      = false,
            setbank      = false,
            viewinv      = true,
            editinv      = false,
            clearinv     = false,
            giveitem     = false,
            spawnveh     = false,
            deleteveh    = false,
            announcement = false,
            weather      = false,
            time         = false,
            viewnotes    = true,
            addnote      = false,
            viewaudit    = false,
            manageroles  = false,
            assignroles  = false,
            unban        = false,
            -- New features
            screenshot      = false,
            slap            = false,
            resetpos        = true,
            dm              = false,
            restartresource = false,
            reports         = true,
            giveweapon      = false,
            summonall       = false,
            viewentities    = false,
        },
    },
}

-- ── Ban Settings ──────────────────────────────────────────────────────────────
Config.BanMessage = 'You have been banned from this server.\nReason: %s\nExpires: %s\nAppeal: discord.gg/yourserver'

Config.BanDurationPresets = {
    { label = '1 Hour',   seconds = 3600 },
    { label = '6 Hours',  seconds = 21600 },
    { label = '12 Hours', seconds = 43200 },
    { label = '24 Hours', seconds = 86400 },
    { label = '3 Days',   seconds = 259200 },
    { label = '7 Days',   seconds = 604800 },
    { label = '30 Days',  seconds = 2592000 },
    { label = 'Permanent', seconds = 0 },
}

-- ── Warning Auto-Actions ──────────────────────────────────────────────────────
Config.WarningThresholds = {
    { count = 3,  action = 'kick',    reason = 'Auto-kick: 3 warnings' },
    { count = 5,  action = 'tempban', duration = 86400, reason = 'Auto-ban: 5 warnings (24h)' },
}

-- ── Server Info ───────────────────────────────────────────────────────────────
Config.ServerName = 'My FiveM Server'

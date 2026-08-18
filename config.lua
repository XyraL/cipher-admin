Config = {}

-- ── Owner Identifiers ─────────────────────────────────────────────────────────
-- Players with ANY of these identifiers are always Owner regardless of DB role.
-- Find yours with: print(GetPlayerIdentifierByType(source, 'license'))
Config.Owners = {
    '',
}

-- ── Keybind ───────────────────────────────────────────────────────────────────
Config.OpenKey = 'F7'   -- Default key — players can rebind in Settings > Key Bindings > FiveM

-- ── Commands ──────────────────────────────────────────────────────────────────
-- Rename anything that clashes, or set a name to '' to skip registering it.
-- Two resources registering /report means one of them silently wins.
Config.Commands = {
    OpenPanel    = 'admin',        -- chat alternative to the keybind
    Report       = 'report',
    ReportShort  = 'r',
    Reply        = 'reply',
    StopSpectate = 'stopspectate',
}

-- Panel shown when the menu opens. Any nav panel name:
-- dashboard | players | character | spawner | inventory | bans | threats
-- permissions | audit | reports | resources | entities | stats | self | adminchat
Config.DefaultPanel = 'dashboard'

-- ── Interface ─────────────────────────────────────────────────────────────────
-- Applied at runtime — a resource restart, no CSS editing. Accent drives nav
-- state, focus rings, headings and the lit edge of the drawer.
--
-- Accent and danger are separated by weight, not hue: accents are thin bars and
-- outlines, destructive actions get solid fills. Change Accent and Ban/Delete
-- stay red on purpose — a filled red button always means "this destroys
-- something", whatever colour the rest of the panel is.
Config.Theme = {
    Accent    = '#e5484d',
    Side      = 'right',   -- 'right' | 'left' — which edge the drawer slides from
    Width     = '80vw',    -- any CSS width; capped by MaxWidth below
    MaxWidth  = '1360px',
    Scanlines = true,      -- faint screen grain over the panel
    Dim       = 0.45,      -- opacity of the backdrop behind the drawer, 0–1
}

-- ── Notifications ─────────────────────────────────────────────────────────────
-- ox_lib is the default because it is already a dependency; servers with their
-- own styled notifications usually want these to match.
--   'ox_lib' — lib.notify (default)
--   'qb'     — QBCore:Notify
--   'custom' — triggers Config.Notify.CustomEvent with (message, type)
--   'chat'   — plain chat messages, no dependency
Config.Notify = {
    Resource    = 'ox_lib',
    CustomEvent = '',
    Position    = 'top-right',   -- ox_lib only
    Duration    = 5000,
}

-- ── Voice mute (optional) ─────────────────────────────────────────────────────
-- Muting a player mutes CHAT. Voice belongs to whichever voice resource you
-- run and there is no common API, so it is opt-in: name an export as
-- 'resource.exportName' and it is called with (targetSrc, muted).
-- Example for pma-voice: 'pma-voice.setPlayerRadio' — check your own resource's
-- exports; leave empty to mute chat only.
Config.MuteVoiceExport = ''

-- ── Screenshot resource ───────────────────────────────────────────────────────
-- 'auto' detects screenshot-basic or screencapture, whichever is started.
-- Name one explicitly if you run both and want a specific one.
Config.ScreenshotResource = 'auto'   -- 'auto' | 'screenshot-basic' | 'screencapture'

-- ── Discord Webhook ───────────────────────────────────────────────────────────
-- Audit log posts for kicks, bans, warns
Config.AuditWebhook = ''

-- ── Inventory Resource ────────────────────────────────────────────────────────
-- 'ox_inventory' | 'qb-inventory' | 'qs-inventory'
Config.InventoryResource = 'ox_inventory'

-- ── Time / weather resource ───────────────────────────────────────────────────
-- Whatever runs your clock reasserts it every tick, so setting the time means
-- telling that resource — not just setting the clock and hoping.
--
-- 'auto' tries the known ones in order. If the time snaps back after you set
-- it, yours is not on that list: put its resource name here, and the console
-- line printed on a failed Set Time tells you what was tried.
Config.TimeResource = 'auto'

-- ── Ambulance / death resource ────────────────────────────────────────────────
-- Revive has to go through whatever owns the death state, or the ped stands up
-- while the ambulance script still believes the player is dead — which is
-- exactly what "revive doesn't work" looks like.
-- 'qbx_medical' | 'qb-ambulancejob' | 'wasabi_ambulance' | 'custom' | 'none'
Config.AmbulanceResource = 'qbx_medical'

-- Only used when AmbulanceResource is 'custom'. Triggered client-side on the
-- player being revived, with no arguments.
Config.CustomReviveEvent = ''

-- ── Vehicle keys resource ─────────────────────────────────────────────────────
-- Spawning a car does not give you keys unless something is told to hand them
-- over. Set this to whatever you run.
-- 'qbx_vehiclekeys' | 'qb-vehiclekeys' | 'qs-vehiclekeys' | 'wasabi_carlock'
-- | 'mk_vehiclekeys' | 'custom' | 'none'
Config.VehicleKeysResource = 'qbx_vehiclekeys'

-- Only used when VehicleKeysResource is 'custom'. Triggered server-side with
-- (source, plate, vehicleNetId).
Config.CustomGiveKeysEvent = ''

-- Give keys automatically to whoever a vehicle is spawned for.
Config.GiveKeysOnSpawn = true

-- ── Appearance Resource ───────────────────────────────────────────────────────
-- Drives the Self Actions "Clothing" and "Revert Ped" buttons. Set this to
-- whatever you actually run or both buttons do nothing.
-- 'illenium-appearance' | 'fivem-appearance' | 'qb-clothing' | 'rcore_clothing' | 'qbx_core'
Config.AppearanceResource = 'illenium-appearance'

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
            -- Threat detection
            viewthreats     = true,
            managethreats   = true,
            viewlinked      = true,

            -- Player actions added in 1.2.0
            killplayer   = true,
            sethealth    = true,
            eject        = true,
            mute         = true,
            massactions  = true,
            viewids      = true,
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
            -- Threat detection
            viewthreats     = true,
            managethreats   = true,
            viewlinked      = true,

            -- Player actions added in 1.2.0
            killplayer   = true,
            sethealth    = true,
            eject        = true,
            mute         = true,
            massactions  = false,
            viewids      = true,
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
            deletechar   = false,
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
            -- Threat detection
            viewthreats     = true,
            managethreats   = false,
            viewlinked      = true,

            -- Player actions added in 1.2.0
            killplayer   = false,
            sethealth    = false,
            eject        = true,
            mute         = true,
            massactions  = false,
            viewids      = false,
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
            deletechar   = false,
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
            -- Threat detection
            viewthreats     = false,
            managethreats   = false,
            viewlinked      = false,

            -- Player actions added in 1.2.0
            killplayer   = false,
            sethealth    = false,
            eject        = false,
            mute         = false,
            massactions  = false,
            viewids      = false,
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

-- ── Quick Ban Reasons ─────────────────────────────────────────────────────────
-- Shown as preset buttons in the ban modal. Edit to match your server rules.
Config.QuickBanReasons = {
    'Cheating / Hacking',
    'Repeated RDM',
    'Racial Slurs / Hate Speech',
    'Harassment',
    'Ban Evasion',
    'DDoS Threats',
    'Staff Disrespect',
    'Exploiting',
}

-- ── Quick Warn Reasons ────────────────────────────────────────────────────────
Config.QuickWarnReasons = {
    'RDM',
    'VDM',
    'Metagaming',
    'Powergaming',
    'NITRP',
    'Fail RP',
    'Exploiting',
    'Cop Baiting',
}

-- ── Server Info ───────────────────────────────────────────────────────────────
Config.ServerName = 'My FiveM Server'

-- ══════════════════════════════════════════════════════════════════════════════
--  SELF ACTIONS
-- ══════════════════════════════════════════════════════════════════════════════
Config.SelfTuning = {
    MaxHealth        = 200,    -- what Heal and Revive restore to
    ArmourAmount     = 100,    -- Armour Only, and the armour half of Heal
    SprintMultiplier = 2.5,    -- Super Sprint. 1.0 is normal, 1.49 is the engine cap for
                               -- the *animation*; higher still moves you faster
    NoclipSpeed      = 2.5,    -- units per frame
    NoclipFastSpeed  = 12.0,   -- while holding Shift
    WeaponAmmo       = 250,    -- rounds given by All Weapons / Refill Ammo
    ClearAreaRadius  = 100.0,  -- default radius for the Area section
}

-- ── Landmarks (Self Actions → To Landmark) ────────────────────────────────────
-- Add your own server's locations. Order here is the order in the dropdown.
Config.Landmarks = {
    { name = 'Legion Square',      x = 195.0,   y = -933.0,  z = 30.7 },
    { name = 'Mission Row PD',     x = 441.0,   y = -982.0,  z = 30.7 },
    { name = 'Pillbox Hospital',   x = 298.0,   y = -584.0,  z = 43.3 },
    { name = 'Los Santos Customs', x = -337.0,  y = -136.0,  z = 39.0 },
    { name = 'LS International',   x = -1037.0, y = -2737.0, z = 20.2 },
    { name = 'Del Perro Pier',     x = -1850.0, y = -1231.0, z = 13.0 },
    { name = 'Vespucci Beach',     x = -1223.0, y = -1493.0, z = 4.3  },
    { name = 'Maze Bank Roof',     x = -75.0,   y = -818.0,  z = 326.2 },
    { name = 'Diamond Casino',     x = 925.0,   y = 46.0,    z = 81.1 },
    { name = 'Vinewood Sign',      x = 711.0,   y = 1198.0,  z = 348.5 },
    { name = 'Bolingbroke Prison', x = 1845.0,  y = 2585.0,  z = 45.0 },
    { name = 'Sandy Shores',       x = 1853.0,  y = 3689.0,  z = 34.3 },
    { name = 'Grapeseed',          x = 1698.0,  y = 4924.0,  z = 42.0 },
    { name = 'Paleto Bay',         x = -448.0,  y = 6008.0,  z = 31.7 },
    { name = 'Mount Chiliad',      x = 450.0,   y = 5566.0,  z = 806.2 },
    { name = 'Cayo Perico',        x = 4840.0,  y = -5175.0, z = 2.0  },
}

-- ── Weapons given by Self Actions → All Weapons ───────────────────────────────
-- Excludes launchers and explosives: those are in AntiCheat.BlacklistedWeapons,
-- so arming yourself here would flag you through your own detection.
Config.SelfWeapons = {
    'WEAPON_PISTOL', 'WEAPON_COMBATPISTOL', 'WEAPON_APPISTOL', 'WEAPON_PISTOL50',
    'WEAPON_SMG', 'WEAPON_MICROSMG', 'WEAPON_ASSAULTSMG',
    'WEAPON_CARBINERIFLE', 'WEAPON_ASSAULTRIFLE', 'WEAPON_SPECIALCARBINE',
    'WEAPON_PUMPSHOTGUN', 'WEAPON_SAWNOFFSHOTGUN',
    'WEAPON_SNIPERRIFLE', 'WEAPON_MARKSMANRIFLE',
    'WEAPON_KNIFE', 'WEAPON_BAT', 'WEAPON_CROWBAR', 'WEAPON_FLASHLIGHT',
    'WEAPON_STUNGUN', 'WEAPON_NIGHTSTICK',
}

-- ── Ped models offered in Self Actions → Ped Model ────────────────────────────
-- The picker also accepts any model typed by hand.
Config.PedModels = {
    'mp_m_freemode_01', 'mp_f_freemode_01',
    'a_m_m_beach_01', 'a_f_m_beach_01',
    's_m_m_cop_01', 's_m_m_paramedic_01', 's_m_m_doctor_01',
    'u_m_m_prolsec', 'g_m_y_lost_01',
    'player_zero', 'player_one', 'player_two',
}

-- Pool used by Self Actions → Random Ped
Config.RandomPeds = {
    'a_m_m_beach_01', 'a_f_y_beach_01', 'a_m_y_business_01', 'a_f_m_business_02',
    'a_m_y_hipster_01', 'a_f_y_hipster_02', 's_m_y_cop_01', 's_m_m_paramedic_01',
    'a_m_m_farmer_01', 'a_m_y_skater_01', 'g_m_y_lost_01', 'u_m_y_zombie_01',
}

-- ── Walk styles (Self Actions → Walk Style) ───────────────────────────────────
-- Any movement clipset name works. 'RESET' is handled specially.
Config.WalkStyles = {
    'move_m@casual@a', 'move_m@confident', 'move_m@business@a', 'move_m@tough_guy@',
    'move_f@sexy@a', 'move_m@injured', 'move_m@drunk@moderatedrunk', 'move_m@hurry@a',
    'move_m@swagger', 'move_m@gangster@generic', 'RESET',
}

-- ── Vehicle colours (Self Actions → Colour) ───────────────────────────────────
-- A shortlist, not the full 160 game indices.
Config.VehicleColours = {
    { id = 0,   name = 'Black' },      { id = 1,   name = 'Graphite' },
    { id = 4,   name = 'Silver' },     { id = 111, name = 'White' },
    { id = 27,  name = 'Red' },        { id = 38,  name = 'Orange' },
    { id = 88,  name = 'Yellow' },     { id = 55,  name = 'Lime' },
    { id = 49,  name = 'Dark Green' }, { id = 64,  name = 'Sea Wash' },
    { id = 70,  name = 'Blue' },       { id = 73,  name = 'Light Blue' },
    { id = 145, name = 'Purple' },     { id = 135, name = 'Hot Pink' },
    { id = 90,  name = 'Gold' },       { id = 117, name = 'Brushed Steel' },
}

-- ══════════════════════════════════════════════════════════════════════════════
--  DATA RETENTION
-- ══════════════════════════════════════════════════════════════════════════════
-- The flags table grows fastest — a speed hack writes a row every sweep. Set
-- any value to 0 to keep that table forever. Bans and warnings are never
-- pruned; those are the records you still want years later.
Config.Retention = {
    Enabled        = true,
    AuditDays      = 90,
    FlagDays       = 30,
    IdentifierDays = 0,    -- 0 = keep forever. Pruning these weakens alt detection.
    RunAtHour      = 4,    -- server local hour to run the sweep
}

-- ══════════════════════════════════════════════════════════════════════════════
--  THREAT DETECTION
-- ══════════════════════════════════════════════════════════════════════════════
-- Checks marked SERVER-AUTHORITATIVE read state the client cannot lie about:
-- an entity property the server owns under OneSync, or a network event it sees
-- regardless of what the client claims.
--
-- The client heartbeat is ADVISORY — its values can be spoofed. What it is good
-- for is the opposite signal: a client that stops answering has usually had the
-- resource stopped or blocked.
--
-- Nothing bans anyone unless you configure it to. Every detection defaults to
-- 'flag'. Turn individual ones up to 'kick' or 'ban' once you have watched your
-- own traffic for a week and know what is normal for it.
Config.AntiCheat = {
    Enabled = true,

    -- Server-side entity reads (health, position, speed) need OneSync. With it
    -- off, those detections are skipped and the resource says so at startup;
    -- the event-based detections still run.
    PollInterval = 3,          -- seconds between server-side entity sweeps

    -- Staff have noclip, god mode and teleport as job tools; without this the
    -- panel spends all day flagging the people reading it.
    ExemptAdmins = true,

    -- A bring is indistinguishable from a teleport hack if you only look at
    -- coordinates, so the target of any admin action is exempt for this long.
    ActionExemptSeconds = 20,

    -- Spawn selection, loading screens and character select all move the ped
    -- before the player has control.
    ConnectGrace = 90,

    -- Empty falls back to Config.AuditWebhook. A separate channel keeps
    -- detection noise out of the audit log.
    Webhook = '',

    -- Notify on-duty admins in-game the moment a flag lands.
    NotifyAdmins = true,

    Heartbeat = {
        Enabled  = true,
        Interval = 10,   -- seconds between client reports
        -- Consecutive missed reports before flagging. 3 × 10s = 30s of silence.
        MissesBeforeFlag = 3,
    },

    -- ── Detections ────────────────────────────────────────────────────────────
    -- action:    'flag' (record only) | 'kick' | 'ban'
    -- threshold: hits from one player before the action fires. 1 for things
    --            that are never an accident.
    -- Set enabled = false on anything that doesn't suit your server — a
    -- military RP server has entirely legitimate tank shells.
    Detections = {
        -- SERVER-AUTHORITATIVE. Above the engine maximum — the classic
        -- health-hack signature; no legitimate script produces it.
        health = {
            enabled = true, action = 'flag', threshold = 2,
            maxHealth = 200,
        },

        -- SERVER-AUTHORITATIVE. Generous on purpose: interiors, elevators and
        -- cutscenes all move players abruptly.
        teleport = {
            enabled = true, action = 'flag', threshold = 3,
            maxDistance = 200.0,   -- metres per sweep, on foot
        },

        -- SERVER-AUTHORITATIVE. The vehicle limit is high on purpose — modded
        -- supercars and aircraft are normal on most servers.
        speed = {
            enabled = true, action = 'flag', threshold = 4,
            maxOnFoot  = 15.0,    -- m/s — sprinting tops out around 7
            maxVehicle = 130.0,   -- m/s — roughly 470 km/h
        },

        -- SERVER-AUTHORITATIVE. Blocked explosions are cancelled, not logged.
        explosion = {
            enabled = true, action = 'flag', threshold = 2,
            maxPerMinute = 12,
            cancelBlacklisted = true,
        },

        -- SERVER-AUTHORITATIVE. Damage above what the weapon can do, or the
        -- override-damage flag being set at all.
        weapondamage = {
            enabled = true, action = 'flag', threshold = 4,
            maxDamage = 250,
        },

        -- SERVER-AUTHORITATIVE. Blacklisted models only.
        --
        -- There was a per-minute spawn cap here too. It was removed rather than
        -- retuned: entityCreating fires for every entity on the server and
        -- OneSync assigns the owner by scope, not by cause, so entities that
        -- merely stream in near a player get counted against them. No threshold
        -- fixes that. A model hash has no such ambiguity.
        entityspawn = {
            enabled = true, action = 'flag', threshold = 1,
            cancelBlacklisted = true,
        },

        -- SERVER-AUTHORITATIVE. Weapons handed out by the client, not a script.
        giveweapon = {
            enabled = true, action = 'flag', threshold = 2,
        },

        -- SERVER-AUTHORITATIVE. How remote-freeze and remote-ragdoll work.
        taskclear = {
            enabled = true, action = 'flag', threshold = 4,
        },

        -- ADVISORY (client heartbeat). Armour above the engine maximum.
        armour = {
            enabled = true, action = 'flag', threshold = 3,
            maxArmour = 100,
        },

        -- ADVISORY. The resource was stopped, blocked, or the client is hung.
        silent = {
            enabled = true, action = 'flag', threshold = 1,
        },

        -- Raised by the identifier matcher on connect. See Config.BanEvasion.
        evasion = {
            enabled = true, action = 'flag', threshold = 1,
        },
    },

    -- Models nobody should be spawning. Empty this out on a military server.
    BlacklistedModels = {
        'rhino', 'khanjali', 'chernobog', 'thruster',
        'lazer', 'hydra', 'savage', 'hunter', 'akula', 'annihilator',
        'oppressor', 'oppressor2',
        'insurgent3', 'nightshark', 'apc',
        'scramjet', 'deluxo', 'stromberg', 'toreador',
    },

    -- Explosion type indices. Names are from the game's EXP_TAG_ enum.
    BlacklistedExplosions = {
        [5]  = 'TANKSHELL',
        [32] = 'PLANE_ROCKET',
        [36] = 'RAILGUN',
        [41] = 'VALKYRIE_CANNON',
        [42] = 'AIR_DEFENCE',
        [46] = 'APCSHELL',
        [51] = 'TORPEDO',
        [53] = 'BOMBUSHKA_CANNON',
        [55] = 'HUNTER_BARRAGE',
        [56] = 'HUNTER_CANNON',
        [57] = 'ROGUE_CANNON',
        [59] = 'ORBITAL_CANNON',
        [62] = 'OPPRESSOR2_CANNON',
        [63] = 'MORTAR_KINETIC',
    },

    -- Weapons that should only ever come from a script, never from the client.
    BlacklistedWeapons = {
        'WEAPON_RAILGUN',
        'WEAPON_RPG',
        'WEAPON_GRENADELAUNCHER',
        'WEAPON_MINIGUN',
        'WEAPON_FIREWORK',
        'WEAPON_HOMINGLAUNCHER',
        'WEAPON_COMPACTLAUNCHER',
        'WEAPON_RAYMINIGUN',
        'WEAPON_RAYCARBINE',
        'WEAPON_RAYPISTOL',
    },
}

-- ══════════════════════════════════════════════════════════════════════════════
--  BAN EVASION
-- ══════════════════════════════════════════════════════════════════════════════
-- A ban against one identifier is defeated by changing that identifier. Every
-- identifier a player presents is recorded on connect, anchored to their
-- license, and a ban attaches all of them — so a ban on a Discord account still
-- catches that person on a fresh license.
--
-- Accounts that have ever shared an identifier are treated as linked, which is
-- what surfaces alts in the Threats panel.
Config.BanEvasion = {
    Enabled = true,

    -- IP is the weakest — a household or hotspot shares one — so it is recorded
    -- and shown as a link but does not deny a connection by default.
    MatchOn = {
        license  = true,
        license2 = true,
        discord  = true,
        steam    = true,
        xbl      = true,
        live     = true,
        fivem    = true,
        token    = true,   -- hardware tokens: the strongest signal available
        ip       = false,  -- link-only by default. See the note above.
    },

    -- Opaque values FiveM derives from the machine, and the most reliable
    -- evasion signal available. Set false if you would rather not store them.
    StoreTokens = true,

    -- When a clean account is linked to a banned one — they are not themselves
    -- banned, someone they share hardware or an account with is.
    --   'flag'  — let them in, raise a threat flag for staff (default)
    --   'deny'  — refuse the connection
    LinkedAccountAction = 'flag',

    -- Message shown when a connection is denied for evasion.
    EvasionMessage = 'This account is linked to a banned account.\nIf you believe this is a mistake, appeal at discord.gg/yourserver',
}

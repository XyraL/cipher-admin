<h1 align="center">Cipher Admin</h1>

<p align="center">An advanced admin suite for <strong>QBox</strong> and <strong>QBCore</strong> — player management, bans, reports, inventory tools and entity inspection.</p>

<p align="center">
  <a href="https://github.com/XyraL/cipher-admin/releases"><img src="https://img.shields.io/github/v/release/XyraL/cipher-admin?style=flat-square&color=ff5364&label=release" alt="Latest release"></a>
  <img src="https://img.shields.io/badge/framework-QBox%20%7C%20QBCore-55dcff?style=flat-square" alt="framework">
  <img src="https://img.shields.io/badge/price-free-30d158?style=flat-square" alt="price">
  <a href="https://xyralscripts.dev/docs-cipher-admin"><img src="https://img.shields.io/badge/docs-xyralscripts.dev-a889ff?style=flat-square" alt="docs"></a>
  <a href="https://discord.gg/XRURAw4TM2"><img src="https://img.shields.io/badge/support-discord-5865F2?style=flat-square" alt="support"></a>
</p>

<p align="center">
  <a href="https://xyralscripts.dev/cipher-admin">Website</a> &nbsp;·&nbsp;
  <a href="https://xyralscripts.dev/docs-cipher-admin">Setup guide</a> &nbsp;·&nbsp;
  <a href="https://github.com/XyraL/cipher-admin/releases">Releases</a> &nbsp;·&nbsp;
  <a href="https://discord.gg/XRURAw4TM2">Discord</a>
</p>

<!-- SCREENSHOTS: drop 2-3 in-game shots here once captured -->

---

## Dependencies

| Resource | Required |
|---|---|
| [ox_lib](https://github.com/overextended/ox_lib) | ✅ |
| [qbx_core](https://github.com/Qbox-project/qbx_core) **or** [qb-core](https://github.com/qbcore-framework/qb-core) | ✅ — whichever your server runs; the framework bridge auto-detects |
| [oxmysql](https://github.com/overextended/oxmysql) | ✅ |
| ox_inventory | Optional — enables inventory editing & transfer |
| screenshot-basic **or** screencapture | Optional — enables screenshot feature |
| Any weathersync resource | Optional — enables persistent time/weather changes |

---

## Installation

1. **Drop the folder** into your `resources` directory.

2. **Import the SQL schema** into your database:
   ```
   sql/admin.sql
   ```
   This creates tables for roles, assignments, bans, warnings, audit log, and player notes. The resource will also seed default roles on first start.

   The threat-detection and ban-evasion tables (`admin_flags`,
   `admin_identifiers`, `admin_ban_identifiers`) are created automatically on
   start, so **upgrading from 1.1.x needs no SQL import**. Existing bans are
   backfilled into the new identifier matcher on that same start.

3. **Add to `server.cfg`:**
   ```
   ensure cipher-admin
   ```

4. **Set your owner identifier** in `config.lua`:
   ```lua
   Config.Owners = {
       'license:YOURLICENSEHERE',
   }
   ```
   Find your license with `print(GetPlayerIdentifierByType(source, 'license'))` in the server console.

5. **Restart the server** (or `refresh` + `ensure cipher-admin`).

---

## Configuration

All options are in `config.lua`.

```lua
-- Your license identifiers — always Owner regardless of DB role
Config.Owners = { 'license:...' }

-- Default keybind to open the panel (players can rebind in Settings)
Config.OpenKey = 'F7'

-- Discord webhook for audit log entries (kicks, bans, warns)
Config.AuditWebhook = ''

-- Inventory resource: 'ox_inventory' | 'qb-inventory' | 'qs-inventory'
Config.InventoryResource = 'ox_inventory'

-- Appearance resource — drives the Self Actions "Clothing" and "Revert Ped"
-- buttons. Set this to whatever you actually run, or those two do nothing.
-- 'illenium-appearance' | 'fivem-appearance' | 'qb-clothing' | 'rcore_clothing' | 'qbx_core'
Config.AppearanceResource = 'illenium-appearance'

-- Your server name (shown in Server Stats panel)
Config.ServerName = 'My FiveM Server'

-- Command names. Rename around a clash, or set to '' to skip registering one
-- — /r in particular collides with a lot of radio and reply resources.
Config.Commands = {
    OpenPanel = 'admin', Report = 'report', ReportShort = 'r',
    Reply = 'reply', StopSpectate = 'stopspectate',
}
Config.DefaultPanel = 'dashboard'   -- panel shown when the menu opens

-- Interface. Applied at runtime — recolour the panel without touching CSS.
Config.Theme = {
    Accent    = '#e5484d',
    Side      = 'right',    -- which edge the drawer slides from
    Width     = '80vw',
    MaxWidth  = '1360px',
    Scanlines = true,
    Dim       = 0.45,       -- backdrop opacity behind the drawer
}

-- Notifications: 'ox_lib' | 'qb' | 'custom' | 'chat'
Config.Notify = { Resource = 'ox_lib', CustomEvent = '', Duration = 5000 }

-- Time resource. Whatever runs your clock reasserts it every tick, so Set Time
-- has to tell it. 'auto' tries the known ones; the console prints what it used.
Config.TimeResource = 'auto'

-- Revive has to go through whatever owns the death state, or the ped stands up
-- while the ambulance script still thinks the player is dead.
-- 'qbx_medical' | 'qb-ambulancejob' | 'wasabi_ambulance' | 'custom' | 'none'
Config.AmbulanceResource = 'qbx_medical'

-- Spawning a car gives no keys unless something is told to hand them over.
-- 'qbx_vehiclekeys' | 'qb-vehiclekeys' | 'qs-vehiclekeys' | 'wasabi_carlock'
-- | 'mk_vehiclekeys' | 'custom' | 'none'
Config.VehicleKeysResource = 'qbx_vehiclekeys'
Config.GiveKeysOnSpawn     = true

-- Screenshot resource: 'auto' | 'screenshot-basic' | 'screencapture'
Config.ScreenshotResource = 'auto'

-- Self Actions tuning — health, armour, sprint and noclip speeds, ammo counts
Config.SelfTuning = { MaxHealth = 200, ArmourAmount = 100, SprintMultiplier = 2.5, --[[ ... ]] }

-- Editable pick lists used by the Self Actions modals
Config.Landmarks      = { { name = 'Legion Square', x = 195.0, y = -933.0, z = 30.7 }, --[[ ... ]] }
Config.SelfWeapons    = { 'WEAPON_PISTOL', --[[ ... ]] }
Config.PedModels      = { 'mp_m_freemode_01', --[[ ... ]] }
Config.RandomPeds     = { 'a_m_m_beach_01', --[[ ... ]] }
Config.WalkStyles     = { 'move_m@casual@a', --[[ ... ]] }
Config.VehicleColours = { { id = 27, name = 'Red' }, --[[ ... ]] }

-- Automatic cleanup. Bans and warnings are never pruned.
Config.Retention = { Enabled = true, AuditDays = 90, FlagDays = 30,
                     IdentifierDays = 0, RunAtHour = 4 }

-- Threat detection. Every detection defaults to 'flag' — see the block in
-- config.lua for per-detection thresholds, actions and blacklists.
Config.AntiCheat = {
    Enabled = true,
    ExemptAdmins = true,          -- staff have noclip and god mode as job tools
    ConnectGrace = 90,            -- seconds; spawn selection moves the ped around
    Webhook = '',                 -- falls back to Config.AuditWebhook
    Detections = { --[[ health, teleport, speed, explosion, ... ]] },
}

-- Ban evasion. Which identifier types may DENY a connection; everything is
-- recorded either way.
Config.BanEvasion = {
    Enabled = true,
    MatchOn = { license = true, discord = true, token = true, ip = false },
    StoreTokens = true,
    LinkedAccountAction = 'flag', -- or 'deny'
}

-- Ban message shown to banned players (%s = reason, %s = expiry)
Config.BanMessage = 'You have been banned...'

-- Warning auto-actions
Config.WarningThresholds = {
    { count = 3, action = 'kick',    reason = 'Auto-kick: 3 warnings' },
    { count = 5, action = 'tempban', duration = 86400, reason = 'Auto-ban: 5 warnings' },
}

-- Durations offered in the ban modal
Config.BanDurationPresets = { { label = '24 Hours', seconds = 86400 }, ... }

-- One-click reasons in the ban and warn modals — edit to match your rules
Config.QuickBanReasons  = { 'Cheating / Hacking', 'Repeated RDM', ... }
Config.QuickWarnReasons = { 'RDM', 'VDM', 'Metagaming', ... }

-- Roles seeded into the database on first start. After that, manage them
-- from the Permissions panel — editing this table again changes nothing.
Config.DefaultRoles = { ... }
```

---

## Roles & Permissions

Four default roles are seeded on first start: **Support**, **Moderator**, **Admin**, **Senior Admin**. Owners bypass all role checks.

Roles and their permissions can be edited live from the **Permissions** panel inside the admin menu — no server restart needed.

To assign a role to a player, use the Permissions panel or set it directly in the `admin_assignments` table.

---

## Features

### Player Management
- Live player list with online time tracker and notes tooltip
- Kick, warn, temp/permban with reason
- **Mute** — chat mute with duration presets, survives restarts
- Freeze / unfreeze
- Revive, heal, **set exact health & armour**, **kill**
- Teleport to player / bring player to you / **send player to a landmark or coordinates**
- **Eject from vehicle**, optionally deleting it
- Spectate (first-person follow)
- Screenshot + **Live Watch** (auto-refreshing screenshots every 2.5s)
- Private DM to player (in-game overlay)
- Slap (knockback)
- Reset position (teleports player to spawn)
- Give weapon (choose weapon + ammo)
- Delete nearest vehicle
- **View identifiers** — every identifier the player presented, behind its own
  permission and written to the audit log
- **Mass actions** — Summon All, Freeze All / Unfreeze All, Revive Nearby.
  Freeze All skips other staff, so nobody can lock out the people able to undo it

> **Mute scope:** this mutes chat. Voice belongs to whichever voice resource you
> run and there is no common API across them, so it is opt-in — point
> `Config.MuteVoiceExport` at your own resource's export to extend it.

### Settings

Per-admin interface preferences, stored on your machine rather than the server
— so one person's choice is not everyone's.

- Accent colour: eight presets plus a custom hex
- Which side the drawer opens from, its width, and the backdrop dim
- Scanline texture on or off
- Which panel opens first

Layered over the server's `Config.Theme`, so the owner's default stays the
default for anyone who has not changed anything. Ban and Delete stay red
whatever accent you pick — a filled red button always means something is about
to be destroyed.

### Item Spawner

Browses your server's **real item list**, not a list baked into this resource.

- Search by item name or label
- Give to yourself or to any online player
- Set a quantity

### Vehicle Spawner

Reads your framework's own vehicle list — typically 900+ vehicles against
roughly 200 when it was hardcoded. Categories, brands and readable
names come from the framework too, so searching Karin and sultan both find
the same car. Falls back to a built-in list if the framework list cannot be
read, and says which it used at boot.

### Character Lookup
- Search by name or CitizenID (online or offline)
- View character info, job, cash, bank balance
- Set job / grade, set cash / bank balance
- Add and view player notes (visible as tooltip in player list)
- Delete character from database

### Inventory
- View any player's inventory (online or offline by CitizenID)
- **Compare Mode** — side-by-side view of your inventory and the target's with one-click transfer between them
- Give items, remove items, clear inventory
- Filter items by name

### Ban Manager
- View all active bans with search
- Unban players
- Preset ban durations or custom
- Bans attach **every** identifier the player has ever presented, not just the
  one they connected with — see Ban Evasion below

### Threat Detection

A **Threats** panel with a live feed of automated detections, severity, the
player, what was seen and when, plus one-click spectate / screenshot / ban.
Flags are pushed to on-duty staff as they happen and posted to Discord.

Detections split into two kinds, and the panel labels which is which:

| | Detection | What it sees |
|---|---|---|
| **Server-authoritative** | Health overflow | Health above the engine maximum |
| | Impossible movement | Distance covered on foot that nothing could cover |
| | Impossible speed | Sustained velocity past a configurable limit |
| | Explosion abuse | Blacklisted explosion types and explosion spam — **cancelled**, not just logged |
| | Weapon damage anomaly | Damage past a cap, or the client setting the override-damage flag at all |
| | Entity spawn abuse | Blacklisted models and spawn-rate limits — blacklisted spawns are **cancelled** |
| | Client weapon give | Blacklisted weapons handed out by the client |
| | Remote task clear | Clearing tasks on someone else's ped (remote freeze / ragdoll) |
| **Advisory** | Armour overflow | Reported by the client — spoofable, marked as such in the panel |
| | Client agent silent | The client stopped answering: resource stopped, blocked, or hung |

Server-authoritative checks read state the client does not get to assert —
either entity properties the server owns under OneSync, or network events the
server receives regardless. **Health, position and speed detection needs
OneSync**; with it off those are skipped and the panel says so rather than
looking quiet. Event-based detection runs either way.

Every detection ships as `action = 'flag'`, meaning "put it in front of a
human". Set individual detections to `'kick'` or `'ban'` in `config.lua` once
you know what normal traffic looks like on your own server. Staff are exempt
by default, and the target of any admin action is exempt briefly afterwards —
a bring is a 900m position jump on the person being brought.

### Ban Evasion & Alt Detection

Every identifier a player presents — license, license2, discord, steam, xbl,
live, fivem, IP and **hardware tokens** — is recorded on connect and anchored
to their license. Issuing a ban attaches all of them.

- **Bans survive an account change.** A ban placed on a Discord account still
  catches that person on a brand-new license.
- **Offline bans get the full set too**, pulled from what was recorded the last
  time that character connected.
- **Linked accounts** are surfaced in the Threats panel: any account that has
  ever shared an identifier with a banned one. A clean account linked to a
  banned one raises a flag by default rather than a denial — households and LAN
  cafes really do share hardware.
- **IP is link-only by default.** It is recorded and shown to staff as context
  but does not deny a connection on its own; turning `MatchOn.ip` on means
  eventually banning somebody's brother.
- Denied connections get a proper message with the reason, expiry and ban ID.

Identifier values are **redacted in the UI** — staff see that two accounts
share a token, not what the token is. Set `Config.BanEvasion.StoreTokens` to
`false` if you would rather not hold them at all.

Existing bans are backfilled into the new matcher on first start, so upgrading
does not quietly un-enforce anything.

### Troubleshooting threat detection

**Everyone is being flagged "Client agent silent" right after an upgrade.**
`client/detection.lua` did not upload. That detection fires when a client stops
answering, and a client that never had the file never answers — so a partial
upload flags your entire playerbase at once rather than nobody. Re-upload the
whole resource folder.

**The Threats panel is empty and the engine says "events only".** OneSync is
off. Health, position and speed are read from the server's own copy of the ped
and need it; the event-based detections (explosions, weapon damage, entity
spawns, weapon gives, task clears) run regardless.

**Staff keep appearing in the feed.** `Config.AntiCheat.ExemptAdmins` is off, or
the person has no role assigned and so is not recognised as staff. Owners listed
in `Config.Owners` are always exempt.

**A legitimate script is tripping a detection.** Turn that one detection off
rather than the engine — every entry in `Config.AntiCheat.Detections` has its
own `enabled` flag. Military RP servers in particular will want to empty
`BlacklistedModels` and `BlacklistedExplosions`.

### Self Actions

63 actions across eight sections, with a live filter box and a favourites bar
(right-click any action to pin it).

| Section | Actions |
|---|---|
| **Personal** (10) | God Mode, Heal, Revive, Food & Water, Armour Only, Infinite Stamina, Fireproof, No Ragdoll, Freeze Self, Kill Self |
| **Weapons** (3) | Refill Ammo, Infinite Ammo, Remove Weapons |
| **Appearance** (6) | Invisible, Ped Model, Random Ped, Revert Ped, Clothing, Walk Style |
| **Movement** (11) | Noclip, Super Jump, Super Sprint, To Waypoint, To Coords, Save Position, Load Position, Undo Teleport, To Landmark, To Last Death, Into Vehicle |
| **Vehicle** (13) | Spawn Vehicle, Repair, Max Mods, Take Keys, Flip Upright, Refuel, Clean, Vehicle God, Set Plate, Engine, Colour, Doors, Delete |
| **World** (8) | Weather, Time, Freeze Time, Blackout, Announce, Traffic, Pedestrians, Time Scale |
| **Area** (5) | Clear Area, Clear Vehicles, Clear Peds, Clear Objects, Delete Ped |
| **Utility** (7) | Copy Vector4, Copy Vector3, Entity Info, Spawn Prop, Name Tags, Player Blips, Dev HUD |

**Weapons is gated on the `giveweapon` permission** — the section does not
render at all for staff without it. Everything else affects only the person
clicking it.

**Name Tags and Player Blips show players in your scope**, which under OneSync
is roughly the people near you, not everyone on the server.

**To Landmark** covers 16 common locations (Legion, MRPD, Pillbox, the airport,
Sandy, Paleto, the prison, Chiliad, Cayo Perico and more); Undo Teleport brings
you back. **Time Scale** is client-side only — useful for watching a collision
or a suspected cheat frame by frame without slowing anyone else down.

Weather and time sync with a weathersync resource if one is running (see
below). "Clothing" and "Revert Ped" require `Config.AppearanceResource` to
match the appearance script you actually run.

### Entity Inspector
- Scan nearby vehicles and NPCs within a selectable radius (50 / 100 / 150 / 250m)
- View model, plate, HP, distance
- Delete any entity by network ID

### Server Stats
- Live player count / capacity bar
- Server uptime, resource count (started / stopped)
- OneSync mode, game mode

### Resource Manager
- List all resources with state
- Restart any resource from the panel

### Reports
- Players submit reports in-game with `/report <message>`
- Players can reply to an open report with `/reply <message>`
- Admins claim, respond, and close reports from the Reports panel
- Unread badge on the nav icon

### Admin Chat
- In-game staff chat visible only to admins
- Unread badge indicator

### Audit Log
- All admin actions logged to database and optionally to Discord webhook

---

## Player Commands

| Command | Description |
|---|---|
| `/report <message>` | Submit a support report |
| `/reply <message>` | Reply to your most recent open report |

---

## Weathersync Compatibility

Set time and weather will automatically sync with any of the following resources if they are running:

- `qb-weathersync`
- `renewed-weathersync`
- `rcore_weathersync`
- `cd_easytime`

If none are detected, time/weather is broadcast directly to all clients.

---

> Add your own screenshots here.

---

Free to use on any server you own or operate, including commercial ones.
**Do not redistribute or resell** — see [LICENSE](LICENSE) for the full terms.

---

## Documentation

Full setup guide, requirements and troubleshooting:
**[xyralscripts.dev/docs-cipher-admin](https://xyralscripts.dev/docs-cipher-admin)**

## Support

- **Found a bug?** [Open an issue](https://github.com/XyraL/cipher-admin/issues)
- **Need setup help?** [Join the Discord](https://discord.gg/XRURAw4TM2) — check the setup guide first, it usually has the answer

## The rest of the Cipher line

All free, all source-available.

| Script | What it is |
|---|---|
| **[Cipher](https://github.com/XyraL/cipher)** | modular criminal device for QBox and QBCore — gang ops, blackmarket and boosting in one encrypted tablet. |
| **[Cipher MDT](https://github.com/XyraL/cipher-mdt)** | multi-department MDT for QBox — police, EMS and fire with live CAD, records, patient care and a live unit map. |
| **[Cipher Drone](https://github.com/XyraL/cipher-drone)** | deployable police drone for QBox and QBCore — smooth flight, thermal, spotlight, tracker darts and real counterplay. |
| **[Cipher Trucking](https://github.com/XyraL/cipher-trucking)** | civilian trucking job for QBox and QBCore — live route map, truck ownership, fuel and maintenance, and companies. |
| **[Cipher MultiCharacter](https://github.com/XyraL/cipher-multicharacter)** | cinematic character selection for QBox and QBCore — identity dossiers, saved appearances, spawn cameras and configurable slots. |
| **[Cipher Dispatch](https://github.com/XyraL/cipher-dispatch)** | multi-department live dispatch for QBox and QBCore — responder tracking, priority calls, TAC radio and provider integrations. |

## License

Free to use on any server you own or operate, including commercial ones.
**Do not redistribute or resell** — see [LICENSE](LICENSE) for the full terms.

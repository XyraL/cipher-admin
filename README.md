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

-- Ban message shown to banned players (%s = reason, %s = expiry)
Config.BanMessage = 'You have been banned...'

-- Warning auto-actions
Config.WarningThresholds = {
    { count = 3, action = 'kick',    reason = 'Auto-kick: 3 warnings' },
    { count = 5, action = 'tempban', duration = 86400, reason = 'Auto-ban: 5 warnings' },
}
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
- Freeze / unfreeze
- Revive, heal, clear wanted level
- Teleport to player / bring player to you
- Spectate (first-person follow)
- Screenshot + **Live Watch** (auto-refreshing screenshots every 2.5s)
- Private DM to player (in-game overlay)
- Slap (knockback)
- Reset position (teleports player to spawn)
- Give weapon (choose weapon + ammo)
- Delete nearest vehicle
- Summon All — teleport all players to your location

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

### Self Actions

50 actions across seven sections, with a live filter box and a favourites bar
(right-click any action to pin it).

| Section | Actions |
|---|---|
| **Personal** (10) | God Mode, Heal, Revive, Food & Water, Armour Only, Infinite Stamina, Fireproof, No Ragdoll, Clear Wanted, Set Wanted |
| **Appearance** (6) | Invisible, Ped Model, Random Ped, Revert Ped, Clothing, Walk Style |
| **Movement** (8) | Noclip, Super Jump, Super Sprint, To Waypoint, To Coords, Save Position, Load Position, Undo Teleport |
| **Vehicle** (10) | Spawn Vehicle, Repair, Max Mods, Take Keys, Flip Upright, Refuel, Clean, Vehicle God, Set Plate, Delete |
| **World** (7) | Weather, Time, Freeze Time, Blackout, Announce, Traffic density, Pedestrian density |
| **Area** (5) | Clear Area, Clear Vehicles, Clear Peds, Clear Objects, Delete Ped |
| **Utility** (4) | Copy Vector4, Copy Vector3, Entity Info, Spawn Prop |

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
| **[Cipher MDT](https://github.com/XyraL/cipher-mdt)** | full police MDT for QBox and QBCore — live CAD dispatch, civilian records, warrants, BOLOs and supervisor audit. |
| **[Cipher Drone](https://github.com/XyraL/cipher-drone)** | deployable police drone for QBox and QBCore — smooth flight, thermal, spotlight, tracker darts and real counterplay. |
| **[Cipher Trucking](https://github.com/XyraL/cipher-trucking)** | civilian trucking job for QBox and QBCore — live route map, truck ownership, fuel and maintenance, and companies. |

## License

Free to use on any server you own or operate, including commercial ones.
**Do not redistribute or resell** — see [LICENSE](LICENSE) for the full terms.

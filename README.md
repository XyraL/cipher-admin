# Cipher-Admin

Advanced admin panel for **QBox / QBCore** FiveM servers. Full NUI interface with player management, inventory editing, ban system, live entity inspector, server stats, and more.

---

## Dependencies

| Resource | Required |
|---|---|
| [ox_lib](https://github.com/overextended/ox_lib) | ✅ |
| [qbx_core](https://github.com/Qbox-project/qbx_core) | ✅ |
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
- God mode, noclip, invisible
- Heal, revive, food & water
- Super sprint, super jump
- Set ped model, open clothing menu
- Repair vehicle, max mods, set vehicle owner
- Clear area (delete nearby vehicles/peds in configurable radius)
- Delete closest NPC
- Teleport to waypoint, copy current vector4
- Set weather (syncs with weathersync resource if present)
- Set time (syncs with weathersync resource if present)
- Spawn prop
- Send announcement with optional countdown timer
- **Favorites bar** — right-click any self action button to pin it

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

## Screenshots

> Add your own screenshots here.

---

## License

Released for free use. Do not redistribute or resell.

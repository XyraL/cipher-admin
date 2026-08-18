# Changelog

All notable changes to **Cipher-Admin**.

## [1.3.0] — 2026-08-17

Two new tabs, and a batch of fixes.

### New

**Settings tab** — pick your own accent colour, which side the panel opens from, how wide it is, how dark the background goes, and which tab it opens on. Saved per admin, so your choice doesn't change it for anyone else.

**Item Spawner tab** — browse your server's own item list, search it, and give anything to yourself or to another player.

**The vehicle spawner, item list and weapon picker now build themselves from your server** instead of a list built into the script. Most servers go from around 200 vehicles to 900 or more, with proper names — so searching a brand finds the car, not just the spawn code.

### Fixed

- Spawning a car now gives you the keys
- Take Keys no longer crashes the game
- Revive actually revives
- Setting the time sticks instead of snapping straight back
- Noclip is much faster with Shift held
- Threat detection no longer flags your own staff for vehicles and props that load in near them

### Removed

- **Set and Clear Wanted** — most RP servers turn the NPC police off, so the star system did nothing
- **Give All Weapons** — it dumped twenty weapons into your inventory in one click

### Updating

Re-upload the whole folder. No database changes.

Worth checking two settings match what your server runs: `Config.AmbulanceResource` (for revive) and `Config.VehicleKeysResource` (for vehicle keys). If setting the time still snaps back, see `Config.TimeResource` — the server console tells you what it found.

## [1.2.0] — 2026-08-16

The two biggest additions so far: automatic cheat detection, and bans that actually stick.

### New

**Threat detection** — a Threats tab showing suspicious activity as it happens: impossible speed, health hacks, explosion abuse, blacklisted vehicles and more. Blacklisted spawns are blocked outright rather than just logged, and flags reach your on-duty staff in game straight away.

Nothing bans anyone on its own. Every check starts as "tell me about it" — you decide which ones get stronger once you've seen what's normal for your server.

**Ban evasion** — bans now cover every identifier someone has, including their hardware. Change your Rockstar account and the ban still finds you. Accounts that share an identifier are shown as linked, so alts are easy to spot.

Shared IPs don't ban anyone on their own, because households and phone hotspots share them.

**Self actions: 50 → 66**, including a new Weapons section, teleport to landmarks, name tags above players, player blips on the map and a dev HUD.

**A lot more you can configure** — recolour the panel, rename any command, edit the landmark, vehicle and ped lists, and set how long logs are kept.

### Fixed

- Several security fixes around player names and report text being shown in the admin panel
- 13 permissions existed but had no toggle in the Permissions tab
- One badly formed role could break the Permissions tab for every role

### Updating

Re-upload the whole folder — this release adds new files, and missing one causes odd behaviour.

**No SQL import needed.** The new tables create themselves on start, and your existing bans are carried across automatically.

## [1.1.3] — 2026-07-31

### Fixed
- **Panels could hang on "Loading..." forever.** `cb(nil)` sends no response
  body, so the page's fetch never settles — not resolved, not rejected, just
  pending. Sixteen server callbacks can legitimately return nil, including
  `getInventory` when the player isn't found and `getCharacter` on a search
  that matches nothing, so a failed lookup hung the panel instead of showing
  an empty state. Every NUI response now substitutes `false` for a nil
  payload. Found while fixing the same bug in Cipher-Trucking.

## [1.1.2] — 2026-07-31

### Fixed
- **Inventory viewer could not find players by name.** The search box is
  labelled "Name (online) or Citizenid", but only citizenid was ever matched —
  a name fell straight through and was handed to the inventory resource as if
  it were an inventory id, which returned nothing with no error. Names now
  resolve by exact citizenid, then exact full name, then a unique partial
  match, then as an offline citizenid. A partial only wins when exactly one
  player matches, so an ambiguous search opens nobody rather than the wrong
  person.
- Give, remove, transfer and clear read the player source straight from the
  request, which is empty on a name search — so on qb-inventory and
  qs-inventory those actions silently did nothing for a player found by name.
  They now use the resolved source.

## [1.1.1] — 2026-07-31

### Fixed
- **Diagnosing a partial upgrade.** 1.1.0 added a new `bridge/` directory. If
  an upgrade copies the changed files but misses that new folder, `Framework`
  never gets defined and every callback fails with
  `attempt to index a nil value (global 'Framework')`, each error pointing at
  itself rather than at the missing file. A boot self-check now names any
  server file that failed to load, and tells you to re-upload the whole
  folder including new directories.
- **Callbacks that error no longer hang the panel.** An unhandled error meant
  the response was never sent, so the client kept waiting and the tab loaded
  forever with nothing to explain it. Every `lib.callback.register` in the
  resource is now wrapped so a failing handler still responds and logs itself
  by name.

> Upgrading from 1.1.0: replace the **entire** folder. `bridge/framework.lua`
> is required and is a new directory.

## [1.1.0] — 2026-07-30

### Added
- **QBCore support.** New `bridge/framework.lua` auto-detects QBox (`qbx_core`)
  or QBCore (`qb-core`) and exposes one API. Previously the README and
  manifest advertised both while the code called `exports['qbx_core']`
  directly in five files, so QBCore servers hit an immediate export error on
  start. `qbx_core` is no longer a hard dependency in `fxmanifest.lua`.
- **Self Actions panel expanded to 50 actions** across seven sections —
  Personal, Appearance, Movement, Vehicle, World, Area and Utility. Includes
  ped model changing, a clothing menu hook, walk styles, vehicle spawning and
  tuning, weather and time control, area cleanup tools and coordinate copying.
- **Consistent SVG icon set** (`html/js/core.js`) replacing a mix of geometric
  text glyphs and colour emoji, which rendered at different weights and in the
  platform's own palette rather than the theme's.
- **Command-deck theme** — neutral graphite with a red authority accent,
  deliberately distinct from the rest of the Cipher suite so staff tooling
  never looks like player tooling. Accent and danger are separated by weight
  rather than hue: accents are outlines and thin bars, destructive actions are
  solid fills.
- Real typography — Saira (display), Inter (body), JetBrains Mono (numeric).
  The panel previously loaded no fonts at all.
- `Config.AppearanceResource` for selecting your appearance script.
- `LICENSE`, `.gitignore` and this changelog.

### Fixed
- **Player action buttons broke on names containing an apostrophe.** Names were
  interpolated into inline `onclick` handlers as quoted JS strings, so a player
  called O'Brien silently disabled every action button on their row. All inline
  handlers are now `data-*` attributes dispatched by a single delegated
  listener, so player-controlled data never becomes code.
- **Cross-site scripting against staff.** The same interpolation meant a
  crafted character name, ban reason or note executed arbitrary JavaScript
  inside the admin's own session, which holds every permission on the server.
  All 57 `innerHTML` writes now escape their inputs.
- **Quick-reason preset buttons did nothing.** The Warn and Ban modals emitted
  `onclick="setWarnReason('Spamming'"` — the closing parenthesis was missing
  from the template, making the attribute a JavaScript syntax error.
- **Appearance actions silently did nothing.** The clothing and revert-ped
  buttons were hardcoded to `qb-clothing`, which the QBox servers this
  resource targets do not typically run. Now driven by
  `Config.AppearanceResource`, and an unrecognised value reports itself
  instead of failing quietly.
- Admin role colours are validated as hex literals before being interpolated
  into `style` attributes, where escaping alone would not have prevented a
  crafted value from restyling the panel.

### Security
- Owner identifiers in `config.lua` ship as an empty placeholder. Fill in your
  own; do not commit it.

## [1.0.0] — 2026-07-06

First public release.

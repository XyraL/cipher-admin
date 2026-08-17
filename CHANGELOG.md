# Changelog

All notable changes to **Cipher-Admin**.

## [1.2.0] — 2026-08-16

> **Upgrading:** this release adds new files — `server/threats.lua`, `server/mutes.lua` and
> `server/identity.lua` — plus `client/detection.lua` and
> `html/js/panels/threats.js`. No new directories this time, but re-upload the
> whole folder rather than hand-picking changed files. The boot self-check names
> any of the new server files if it fails to load.
>
> **If `client/detection.lua` is missed, every player on the server is flagged
> at once** — that detection fires when a client stops answering, and a client
> that never had the file never answers. That is the loudest symptom of a
> partial upload, and it is not a real threat.
>
> Four tables (`admin_flags`, `admin_identifiers`, `admin_ban_identifiers`,
> `admin_mutes`) are created automatically on start — **no SQL import needed**.
> Existing bans are backfilled into the new matcher on that same start.

### Added
- **Threat detection.** A new Threats panel with a live feed of automated
  detections, 24-hour summary, severity filtering and one-click
  spectate / screenshot / ban. Flags push to on-duty staff in-game as they
  happen and post to Discord.

  Eight server-authoritative detections read state the client cannot assert —
  health overflow, impossible movement, impossible speed, explosion abuse,
  weapon damage anomalies, entity spawn abuse, client weapon gives, and remote
  task clears. Blacklisted explosions, entity spawns and weapon gives are
  **cancelled**, not merely logged.

  Two advisory detections come from a client heartbeat and are labelled as such
  in the panel, because their values can be spoofed: armour overflow, and the
  client agent going silent. The silence is the reliable half — a client that
  stops answering has had the resource stopped or blocked.

  Every detection ships as `action = 'flag'`. Nothing auto-bans until you
  configure it to.

- **Ban evasion and alt detection.** Every identifier a player presents —
  including hardware tokens — is recorded on connect and anchored to their
  license. Bans attach all of them, so a ban placed on a Discord account still
  catches that person on a new license, and an offline ban gets the full set
  from what was recorded last time they connected. Accounts that have ever
  shared an identifier are surfaced as linked, with a redacted identifier list
  and each linked account's ban status.

  IP is recorded and shown as a link but does not deny a connection by default:
  households, hotspots and LAN cafes share one. A clean account linked to a
  banned one raises a flag rather than a denial, for the same reason.

- Denied connections now get a proper message with the reason, expiry and ban
  ID, and say which identifier type matched.

- **Self Actions: 50 → 66**, and a new Weapons section.

  | Section | New |
  |---|---|
  | Personal | Freeze Self, Kill Self |
  | **Weapons** (new) | All Weapons, Refill Ammo, Infinite Ammo, Remove Weapons |
  | Movement | To Landmark (16 locations), To Last Death, Into Vehicle |
  | Vehicle | Engine, Colour, Doors |
  | World | Time Scale |
  | Utility | Name Tags, Player Blips, Dev HUD |

  Name Tags draws names and server IDs above nearby players; Player Blips puts
  them on the map; Dev HUD shows live coords, heading, speed, FPS and the
  vehicle you are in. All three are scoped to players the client can see —
  under OneSync that is roughly the people near you, and the buttons say so.

- **Registry entries can now declare a `perm`**, and a section whose every card
  is hidden does not render an empty heading. Weapons is gated on the existing
  `giveweapon` permission: most self actions affect only the person clicking
  them, but handing yourself an armoury changes what you can do to other
  players. The weapon list deliberately excludes the launchers and explosives
  the threat detector blacklists — arming yourself through the admin menu
  should not flag you through your own anticheat.

- Kill Self turns god mode off first. It would otherwise silently swallow the
  action, and "the button did nothing" is a worse outcome than the toggle
  flipping.

- **Configuration options.** Most of what follows was previously a literal
  somewhere in a file that gets overwritten on every update, which meant
  customising it was a change you had to remember to reapply.

  | Option | What it does |
  |---|---|
  | `Config.Theme` | Accent colour, which edge the drawer opens from, width, scanlines, backdrop dim — applied at runtime, no CSS editing |
  | `Config.Notify` | ox_lib / QBCore / a custom event / plain chat |
  | `Config.Commands` | Rename `/admin`, `/report`, `/r`, `/reply`, `/stopspectate`, or set any to `''` to skip registering it |
  | `Config.DefaultPanel` | Which panel the menu opens on |
  | `Config.ScreenshotResource` | Pin screenshot-basic or screencapture instead of auto-detecting |
  | `Config.SelfTuning` | Health, armour, sprint multiplier, noclip speeds, ammo counts |
  | `Config.Landmarks` | The To Landmark list — add your own server's locations |
  | `Config.SelfWeapons` | What All Weapons hands out |
  | `Config.PedModels` / `RandomPeds` / `WalkStyles` / `VehicleColours` | The Self Actions pick lists |
  | `Config.Retention` | Nightly prune of audit rows, threat flags and identifier records |

  Every list falls back to its previous built-in values, so a server upgrading
  with an old `config.lua` keeps working rather than rendering empty dropdowns.

- The accent is validated as a literal hex before it is written, and theme
  widths against a CSS length pattern. These land in inline style properties,
  so an arbitrary string would be a CSS injection — the same reasoning behind
  whitelisting role colours rather than escaping them.

- Retention checks hourly and runs on a configured hour rather than every 24h
  from boot. A boot-relative timer drifts to a different clock time after each
  restart, which is how a maintenance job ends up running at peak.

- Notifications now route through a single `Notify()` adapter (110 call sites)
  instead of calling `lib.notify` directly.

- The ped model picker is delegated rather than an inline `onclick`. Its
  entries come from config now, and interpolating a config value into a JS
  string literal inside an HTML attribute is exactly the nested-context problem
  `core.js` exists to avoid — one apostrophe in a model name would have broken
  the row.

- The keybind's mapping name is deliberately **not** configurable: FiveM stores
  each player's rebind against it, so renaming it would silently discard
  everyone's chosen key. `Config.Commands.OpenPanel` adds a chat alias instead.

- **Eight new player actions.** The player-action surface was the thinnest part
  of the panel; these are the ones staff reach for and had to leave the menu to
  do:

  | Action | Notes |
  |---|---|
  | Clear Wanted | see Fixed — this was documented and permissioned but never implemented for players |
  | Kill | for testing death and EMS flows |
  | Set Health / Armour | Heal is all-or-nothing; this sets an exact state |
  | Eject | remove from a vehicle, optionally deleting it |
  | Send To | Goto and Bring move *you* or move them *to you*. This is the third case — with the landmark list prefilling the coordinate fields |
  | Mute | chat mute with duration presets, persisted through restarts |
  | View Identifiers | behind its own permission and written to the audit log |
  | Mass actions | Freeze All / Unfreeze All / Revive Nearby |

  Freeze All deliberately skips other staff — an admin who freezes the whole
  server and forgets has otherwise locked out everyone who could unfreeze it.

  Six new permissions (`killplayer`, `sethealth`, `eject`, `mute`,
  `massactions`, `viewids`), all toggleable in the Permissions panel.

### Fixed
- **"Clear wanted level" was documented but did not exist.** The `clearwanted`
  permission has shipped in every default role since 1.0.0 and the README has
  always listed it under Player Management, but it was only ever implemented as
  a *Self* action — there was no server branch and no button. The README has
  been claiming a feature that was never wired. Now implemented.

- **XSS in the reports panel.** Each row serialised the whole report record —
  including the player-written message — into an inline `onclick` as JSON with
  only `"` escaped. Reports are now looked up by id from the last-rendered
  list, the same pattern the ban list already used.

- **Player names still reached inline handlers in three places.** The Give
  Weapon and DM modals built `doGiveWeapon(src,'cid','name')` with the name
  interpolated raw, and the inventory slot did the same with item labels. An
  apostrophe broke the button; a crafted value did worse. All are delegated
  now.

- **Pinned Self Actions rendered the word "shield" instead of an icon.**
  Favourites store an icon *name*, which worked while the set was emoji and
  broke silently when it moved to SVG. The favourites bar now renders through
  `icon()` like every other card.

- **Four duplicate escape helpers.** `core.js` was added in 1.1.0 to be the one
  place output escaping lived, but the local helpers it replaced were never
  deleted — `escHtml` in adminchat, `_escHtml` in app and reports, `_esc` in
  inventory, `_escStat` in stats. Three of them were weaker than `esc()`
  (no `'` escaping). All now call the canonical one.

- **XSS in modal titles.** The v1.1.0 escaping sweep covered modal bodies and
  removed the inline handlers, but `openModal()` wrote its `title` argument
  straight into `innerHTML` — and a dozen call sites pass a raw player name
  into it (`Ban — ${name}`). Same untrusted-data-into-a-staff-session path as
  the bugs that sweep closed, one argument to the left. Titles are now escaped
  inside `openModal()` rather than at each call site, so a modal added later is
  safe without anyone having to remember.

- **13 permissions had no toggle in the Permissions panel.** They were declared
  in `config.lua` and enforced on the server, but the panel's list had fallen
  behind — ten from the 1.1.0 feature batch (Screenshot, Slap, Reset Position,
  DM, Summon All, Give Weapons, Entity Inspector, Handle Reports, Restart
  Resources, Delete Characters) and three added with threat detection. The only
  way to change any of them was editing the `admin_roles` table by hand. All 13
  are now toggleable, and the audit script fails if that list ever falls behind
  again.

- **A role could take the whole Permissions panel down.** A `permissions`
  column holding the JSON literal `null` decodes *successfully* to nil, so
  `ok and perms or {}` yielded nil rather than an empty table — the key was
  then dropped from the payload entirely and the first lookup threw, killing
  the render for every role, not just the malformed one. Both the decode and
  the lookup are now guarded.

### Changed
- The connect-time ban check moved from `server/bans.lua` to
  `server/identity.lua`. The old check tested three columns one at a time and
  was only as durable as whichever of them happened to be populated — usually
  none, for an offline ban. It also had to move rather than be added alongside:
  two `playerConnecting` handlers both calling `deferrals.done()` is a race.
- Automatic bans go through the same path a staff ban does — same table, same
  identifier attachment — so they appear in the Ban Manager and are exactly as
  hard to evade as a manual one.
- `moderator` and `support` now declare `deletechar = false` explicitly. It was
  already denied by absence; the config is a template people read, so the
  omission was misleading rather than broken.
- The boot self-check waits for the resource to finish loading before
  reporting, so it can check files that load after `server/main.lua`.

- **Codebase cleanup.** No behavioural change intended in any of these:
  - Removed 189 lines of dead code from `app.js` — ten functions that
    `self.js`, `adminchat.js` and `reports.js` also defined and which load
    later, so the `app.js` copies had never run.
  - `adminchat.js` no longer monkey-patches `switchPanel`. The function every
    other panel called was a wrapper installed by whichever script happened to
    load last; it is a plain hook now.
  - Every emoji is gone from the interface. The audit log and dashboard each
    carried their own emoji map for the same actions and had drifted nine
    entries apart; both now read one table in `core.js`.
  - `var` is gone — the JS is uniformly `const`/`let`.
  - Line endings normalised to LF, with a `.gitattributes` so they stay that
    way. Five files were CRLF against the rest of the tree.
  - Comment density brought down to the codebase's own norm.

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

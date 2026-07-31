# Changelog

All notable changes to **Cipher-Admin**.

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

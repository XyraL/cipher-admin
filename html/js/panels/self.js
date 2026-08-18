// Cipher-Admin — Self Actions Panel
//
// The grid is generated from the registry below rather than hand-written in
// index.html, where every new action needed markup, a routing line and a Lua
// branch kept in sync by hand. Adding one is now a registry entry plus its
// Lua branch.
//
// Fields:
//   key      matches the `action` string handled in client/main.lua
//   toggle   renders as a stateful on/off card
//   ui       handled entirely in the NUI (opens a modal / switches panel);
//            never reaches Lua
//   danger   styled as destructive
//   perm     hides the card unless the admin holds it. Most self actions
//            affect only the clicker; arming yourself is the exception.
const SELF_ACTIONS = [
    // ── Personal ──
    { sec: 'Personal', key: 'godmode',     label: 'God Mode',      desc: 'Toggle invincibility',       ico: 'shield', toggle: true },
    { sec: 'Personal', key: 'heal',        label: 'Heal',          desc: 'Full health & armour',       ico: 'heal' },
    { sec: 'Personal', key: 'revive',      label: 'Revive',        desc: 'Resurrect if dead',          ico: 'revive' },
    { sec: 'Personal', key: 'foodwater',   label: 'Food & Water',  desc: 'Max hunger & thirst',        ico: 'heal' },
    { sec: 'Personal', key: 'armour',      label: 'Armour Only',   desc: 'Top up armour, keep health', ico: 'shield' },
    { sec: 'Personal', key: 'infstamina',  label: 'Infinite Stamina', desc: 'Never run out of breath', ico: 'self', toggle: true },
    { sec: 'Personal', key: 'fireproof',   label: 'Fireproof',     desc: 'Immune to fire damage',      ico: 'shield', toggle: true },
    { sec: 'Personal', key: 'noragdoll',   label: 'No Ragdoll',    desc: 'Stay on your feet',          ico: 'self', toggle: true },
    { sec: 'Personal', key: 'freezeself',  label: 'Freeze Self',   desc: 'Lock yourself in place',     ico: 'freeze', toggle: true },
    { sec: 'Personal', key: 'killself',    label: 'Kill Self',     desc: 'Test the death & EMS flow',  ico: 'warn', danger: true },

    // Gated on `giveweapon` — the one self action that changes what you can do
    // to other players.
    { sec: 'Weapons', key: 'refillammo',     label: 'Refill Ammo',     desc: 'Top up everything you carry', ico: 'weapon', perm: 'giveweapon' },
    { sec: 'Weapons', key: 'infammo',        label: 'Infinite Ammo',   desc: 'Never reload',               ico: 'weapon', perm: 'giveweapon', toggle: true },
    { sec: 'Weapons', key: 'removeweapons',  label: 'Remove Weapons',  desc: 'Strip your loadout',         ico: 'trash', perm: 'giveweapon', danger: true },

    // ── Appearance ──
    { sec: 'Appearance', key: 'invisible',  label: 'Invisible',    desc: 'Toggle visibility',          ico: 'spectate', toggle: true },
    { sec: 'Appearance', key: 'pedmodel',   label: 'Ped Model',    desc: 'Browse and apply a model',   ico: 'players', ui: true },
    { sec: 'Appearance', key: 'randomped',  label: 'Random Ped',   desc: 'Surprise yourself',          ico: 'refresh' },
    { sec: 'Appearance', key: 'revertped',  label: 'Revert Ped',   desc: 'Back to your own character', ico: 'character' },
    { sec: 'Appearance', key: 'clothing',   label: 'Clothing',     desc: 'Open the appearance menu',   ico: 'inventory' },
    { sec: 'Appearance', key: 'walkstyle',  label: 'Walk Style',   desc: 'Change movement clipset',    ico: 'bring', ui: true },

    // ── Movement ──
    { sec: 'Movement', key: 'noclip',      label: 'Noclip',        desc: 'Free camera flight',         ico: 'entities', toggle: true },
    { sec: 'Movement', key: 'superjump',   label: 'Super Jump',    desc: 'Leap tall buildings',        ico: 'self', toggle: true },
    { sec: 'Movement', key: 'supersprint', label: 'Super Sprint',  desc: 'Move at speed',              ico: 'self', toggle: true },
    { sec: 'Movement', key: 'waypoint',    label: 'To Waypoint',   desc: 'Teleport to map marker',     ico: 'goto' },
    { sec: 'Movement', key: 'tpcoords',    label: 'To Coords',     desc: 'Teleport to exact position', ico: 'goto', ui: true },
    { sec: 'Movement', key: 'savepos',     label: 'Save Position', desc: 'Remember where you are',     ico: 'note' },
    { sec: 'Movement', key: 'loadpos',     label: 'Load Position', desc: 'Return to saved spot',       ico: 'goto' },
    { sec: 'Movement', key: 'tpback',      label: 'Undo Teleport', desc: 'Back to previous location',  ico: 'refresh' },
    { sec: 'Movement', key: 'landmark',    label: 'To Landmark',   desc: 'Jump to a known location',   ico: 'map', ui: true },
    { sec: 'Movement', key: 'lastdeath',   label: 'To Last Death', desc: 'Where you died most recently', ico: 'revive' },
    { sec: 'Movement', key: 'tpveh',       label: 'Into Vehicle',  desc: 'Seat yourself in the nearest', ico: 'spawner' },

    // ── Vehicle ──
    { sec: 'Vehicle', key: 'spawner',    label: 'Spawn Vehicle', desc: 'Open the vehicle spawner',   ico: 'spawner', ui: true },
    { sec: 'Vehicle', key: 'repairveh',  label: 'Repair',        desc: 'Fix and clean your vehicle', ico: 'check' },
    { sec: 'Vehicle', key: 'maxmods',    label: 'Max Mods',      desc: 'Fit every performance part',  ico: 'spawner' },
    { sec: 'Vehicle', key: 'setowner',   label: 'Take Keys',     desc: 'Give yourself ownership',    ico: 'permissions' },
    { sec: 'Vehicle', key: 'flipveh',    label: 'Flip Upright',  desc: 'Roll it back onto its wheels', ico: 'refresh' },
    { sec: 'Vehicle', key: 'refuelveh',  label: 'Refuel',        desc: 'Fill the tank',              ico: 'spawner' },
    { sec: 'Vehicle', key: 'cleanveh',   label: 'Clean',         desc: 'Wash off dirt and decals',   ico: 'check' },
    { sec: 'Vehicle', key: 'vehgod',     label: 'Vehicle God',   desc: 'Indestructible vehicle',     ico: 'shield', toggle: true },
    { sec: 'Vehicle', key: 'setplate',   label: 'Set Plate',     desc: 'Change the licence plate',   ico: 'note', ui: true },
    { sec: 'Vehicle', key: 'engine',     label: 'Engine',        desc: 'Toggle the engine on or off', ico: 'refresh', toggle: true },
    { sec: 'Vehicle', key: 'vehcolour',  label: 'Colour',        desc: 'Repaint primary & secondary', ico: 'entities', ui: true },
    { sec: 'Vehicle', key: 'vehdoors',   label: 'Doors',         desc: 'Open or close any door',     ico: 'kick', ui: true },
    { sec: 'Vehicle', key: 'deleteveh',  label: 'Delete',        desc: 'Remove nearest vehicle',     ico: 'trash', danger: true },

    // ── World ──
    { sec: 'World', key: 'weather',    label: 'Weather',      desc: 'Set the server weather',      ico: 'entities', ui: true },
    { sec: 'World', key: 'settime',    label: 'Time',         desc: 'Set the server clock',        ico: 'clock', ui: true },
    { sec: 'World', key: 'freezetime', label: 'Freeze Time',  desc: 'Hold the clock still',        ico: 'clock', toggle: true },
    { sec: 'World', key: 'blackout',   label: 'Blackout',     desc: 'Kill the city lights',        ico: 'entities', toggle: true },
    { sec: 'World', key: 'announce',   label: 'Announce',     desc: 'Broadcast to everyone',       ico: 'adminchat', ui: true },
    { sec: 'World', key: 'traffic',    label: 'Traffic',      desc: 'Set vehicle density',         ico: 'spawner', ui: true },
    { sec: 'World', key: 'peddensity', label: 'Pedestrians',  desc: 'Set pedestrian density',      ico: 'players', ui: true },
    { sec: 'World', key: 'slowmo',     label: 'Time Scale',   desc: 'Slow the world down',         ico: 'clock', ui: true },

    // ── Area ──
    { sec: 'Area', key: 'cleararea',     label: 'Clear Area',     desc: 'Wipe everything nearby',    ico: 'trash', danger: true },
    { sec: 'Area', key: 'clearvehicles', label: 'Clear Vehicles', desc: 'Remove nearby vehicles',    ico: 'trash', danger: true },
    { sec: 'Area', key: 'clearpeds',     label: 'Clear Peds',     desc: 'Remove nearby NPCs',        ico: 'trash', danger: true },
    { sec: 'Area', key: 'clearobjects',  label: 'Clear Objects',  desc: 'Remove nearby props',       ico: 'trash', danger: true },
    { sec: 'Area', key: 'deleteped',     label: 'Delete Ped',     desc: 'Remove the closest NPC',    ico: 'trash', danger: true },

    // ── Utility ──
    { sec: 'Utility', key: 'copyvec',    label: 'Copy Vector4',  desc: 'Position + heading',         ico: 'note', ui: true },
    { sec: 'Utility', key: 'copyvec3',   label: 'Copy Vector3',  desc: 'Position only',              ico: 'note', ui: true },
    { sec: 'Utility', key: 'entityinfo', label: 'Entity Info',   desc: 'Inspect what you look at',   ico: 'search' },
    { sec: 'Utility', key: 'spawnprop',  label: 'Spawn Prop',    desc: 'Place an object',            ico: 'inventory', ui: true },
    { sec: 'Utility', key: 'nametags',   label: 'Name Tags',     desc: 'Names and IDs above players', ico: 'tag', toggle: true },
    { sec: 'Utility', key: 'playerblips', label: 'Player Blips', desc: 'Map blips for players in scope', ico: 'map', toggle: true },
    { sec: 'Utility', key: 'devhud',     label: 'Dev HUD',       desc: 'Live coords, heading and FPS', ico: 'stats', toggle: true },
];

// Keyed state rather than loose booleans, so the renderer can ask about any
// key without a lookup table per action.
const _selfToggles = {};

function renderSelfPanel() {
    const panel = document.getElementById('panel-self');
    if (!panel) return;

    // Filtered before sections are collected, so a fully hidden section never
    // renders an empty heading.
    const visible = SELF_ACTIONS.filter(function (a) {
        return !a.perm || hasPermission(a.perm);
    });

    const sections = [];
    visible.forEach(function (a) {
        if (sections.indexOf(a.sec) === -1) sections.push(a.sec);
    });

    let html = '<div class="section-header mb-12"><div>'
        + '<div class="section-title">Self Actions</div>'
        + '<div class="section-sub">Quick commands targeting yourself &mdash; right-click any card to pin it</div>'
        + '</div><div class="search-wrap" style="width:220px">'
        + '<input class="input search-input" id="self-filter" placeholder="Filter actions...">'
        + '</div></div>'
        + '<div id="sa-favorites-wrap" style="display:none">'
        + '<div class="self-section-title">Favorites</div>'
        + '<div class="self-action-grid" id="sa-favorites-grid"></div>'
        + '</div>';

    sections.forEach(function (sec) {
        const cards = visible.filter(function (a) { return a.sec === sec; }).map(selfCardHtml).join('');
        html += '<div class="self-section" data-section="' + escAttr(sec) + '">'
            + '<div class="self-section-title">' + esc(sec) + '</div>'
            + '<div class="self-action-grid">' + cards + '</div></div>';
    });

    panel.innerHTML = html;

    const filter = document.getElementById('self-filter');
    if (filter) filter.oninput = function () { selfFilter(this.value); };

    _renderFavsBar();
}

function selfCardHtml(a) {
    const on = _selfToggles[a.key];
    return '<button class="self-action-card' + (on ? ' active' : '') + (a.danger ? ' danger' : '') + '"'
        + ' id="sa-' + escAttr(a.key) + '"'
        + ' data-ca-action="selfCard" data-key="' + escAttr(a.key) + '"'
        + ' data-search="' + escAttr((a.label + ' ' + a.desc + ' ' + a.sec).toLowerCase()) + '">'
        + '<div class="sa-icon">' + icon(a.ico) + '</div>'
        + '<div class="sa-label">' + esc(a.label) + '</div>'
        + '<div class="sa-desc">' + esc(a.desc) + '</div>'
        + (a.toggle ? '<span class="sa-state">' + (on ? 'ON' : 'OFF') + '</span>' : '')
        + '</button>';
}

// Matches the precomputed data-search string, not the DOM text of every card.
function selfFilter(q) {
    const needle = (q || '').trim().toLowerCase();
    document.querySelectorAll('#panel-self .self-action-card').forEach(function (card) {
        card.style.display = (!needle || (card.dataset.search || '').indexOf(needle) !== -1) ? '' : 'none';
    });
    // Hide a whole section once every card in it is filtered out.
    document.querySelectorAll('#panel-self .self-section').forEach(function (sec) {
        const any = [].slice.call(sec.querySelectorAll('.self-action-card'))
            .some(function (c) { return c.style.display !== 'none'; });
        sec.style.display = any ? '' : 'none';
    });
}

caAction('selfCard', function (d) { selfBtn(d.key); });

// Right-click pins to Favourites. Registered once so it survives re-renders.
document.addEventListener('contextmenu', function (e) {
    const card = e.target.closest && e.target.closest('#panel-self .self-action-card');
    if (!card) return;
    e.preventDefault();
    const def = SELF_ACTIONS.find(function (a) { return a.key === card.dataset.key; });
    if (def) selfToggleFav(def.key, def.label, def.ico, e);
});

window.renderSelfPanel = renderSelfPanel;
window.SELF_ACTIONS = SELF_ACTIONS;

const _godModeActive   = false;
const _noclipActive    = false;
const _invisibleActive = false;

function selfBtn(key) {
    const def = SELF_ACTIONS.find(function (a) { return a.key === key; });

    // NUI-only actions never reach Lua.
    if (key === 'spawner')    { switchPanel('spawner'); return; }
    if (key === 'copyvec')    { selfCopyVector('copyvector'); return; }
    if (key === 'copyvec3')   { selfCopyVector('copyvector3'); return; }
    if (key === 'walkstyle')  { selfWalkModal(); return; }
    if (key === 'tpcoords')   { selfCoordsModal(); return; }
    if (key === 'setplate')   { selfPlateModal(); return; }
    if (key === 'traffic')    { selfDensityModal('traffic', 'Traffic Density'); return; }
    if (key === 'peddensity') { selfDensityModal('peddensity', 'Pedestrian Density'); return; }
    if (key === 'pedmodel')   { selfPedModelModal(); return; }
    if (key === 'spawnprop')  { selfPropModal(); return; }
    if (key === 'announce')   { selfAnnounceModal(); return; }
    if (key === 'weather')    { selfWeatherModal(); return; }
    if (key === 'settime')    { selfTimeModal(); return; }
    if (key === 'landmark')   { selfLandmarkModal(); return; }
    if (key === 'vehcolour')  { selfColourModal(); return; }
    if (key === 'vehdoors')   { selfDoorsModal(); return; }
    if (key === 'slowmo')     { selfSlowmoModal(); return; }

    if (def && def.toggle) {
        _selfToggles[key] = !_selfToggles[key];
        const btn = document.getElementById('sa-' + key);
        if (btn) {
            btn.classList.toggle('active', _selfToggles[key]);
            const st = btn.querySelector('.sa-state');
            if (st) st.textContent = _selfToggles[key] ? 'ON' : 'OFF';
        }
    }

    fetch('https://cipher-admin/selfAction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: key })
    });
}

function _selfSend(action, extra) {
    const body = Object.assign({ action: action }, extra || {});
    fetch('https://cipher-admin/selfAction', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
}

function selfWalkModal() {
    const styles = _selfList('walkStyles',
        ['move_m@casual@a','move_m@confident','move_m@business@a','move_m@tough_guy@',
         'move_f@sexy@a','move_m@injured','move_m@drunk@moderatedrunk','move_m@hurry@a',
         'move_m@swagger','move_m@gangster@generic','RESET']);
    const opts = styles.map(function (s) { return '<option value="' + escAttr(s) + '">' + esc(s) + '</option>'; }).join('');
    openModal('Walk Style',
        '<div class="form-group"><label>Clipset</label><select class="select" id="walk-sel">' + opts + '</select></div>',
        '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'
        + '<button class="btn btn-primary" data-ca-action="applyWalk">Apply</button>');
}
caAction('applyWalk', function () {
    const v = (document.getElementById('walk-sel') || {}).value || 'RESET';
    closeModal();
    _selfSend('walkstyle', { style: v });
});

function selfCoordsModal() {
    openModal('Teleport to Coordinates',
        '<div class="form-group"><label>X</label><input class="input" id="tp-x" type="number" step="0.01" placeholder="0.0"></div>'
        + '<div class="form-group"><label>Y</label><input class="input" id="tp-y" type="number" step="0.01" placeholder="0.0"></div>'
        + '<div class="form-group"><label>Z</label><input class="input" id="tp-z" type="number" step="0.01" placeholder="0.0"></div>'
        + '<div style="font-size:11px;color:var(--text-muted)">Paste a vector3/vector4 into X and the other fields fill automatically.</div>',
        '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'
        + '<button class="btn btn-primary" data-ca-action="applyCoords">Teleport</button>');

    // Convenience: pasting a whole "vector4(1.0, 2.0, 3.0, 4.0)" into X splits
    // it across the fields rather than making you separate it by hand.
    const x = document.getElementById('tp-x');
    if (x) x.addEventListener('paste', function (ev) {
        const txt = (ev.clipboardData || window.clipboardData).getData('text') || '';
        const nums = txt.match(/-?\d+(\.\d+)?/g);
        if (nums && nums.length >= 3) {
            ev.preventDefault();
            document.getElementById('tp-x').value = nums[0];
            document.getElementById('tp-y').value = nums[1];
            document.getElementById('tp-z').value = nums[2];
        }
    });
}
caAction('applyCoords', function () {
    const g = function (id) { return parseFloat((document.getElementById(id) || {}).value); };
    const x = g('tp-x'), y = g('tp-y'), z = g('tp-z');
    if (isNaN(x) || isNaN(y) || isNaN(z)) return;
    closeModal();
    _selfSend('tpcoords', { x: x, y: y, z: z });
});

function selfPlateModal() {
    openModal('Set Licence Plate',
        '<div class="form-group"><label>Plate (max 8 characters)</label><input class="input" id="plate-inp" maxlength="8" placeholder="ADMIN01"></div>',
        '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'
        + '<button class="btn btn-primary" data-ca-action="applyPlate">Apply</button>');
}
caAction('applyPlate', function () {
    const v = ((document.getElementById('plate-inp') || {}).value || '').trim();
    if (!v) return;
    closeModal();
    _selfSend('setplate', { plate: v });
});

function selfDensityModal(action, title) {
    const opts = [['0','Off (0%)'],['0.25','Low (25%)'],['0.5','Half (50%)'],['1','Normal (100%)']]
        .map(function (o) { return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join('');
    openModal(title,
        '<div class="form-group"><label>Density</label><select class="select" id="dens-sel">' + opts + '</select></div>'
        + '<div style="font-size:11px;color:var(--text-muted)">Applies to your client only &mdash; useful for clearing a scene before a screenshot.</div>',
        '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'
        + '<button class="btn btn-primary" data-ca-action="applyDensity" data-act="' + escAttr(action) + '">Apply</button>');
}
caAction('applyDensity', function (d) {
    const v = parseFloat((document.getElementById('dens-sel') || {}).value);
    if (isNaN(v)) return;
    closeModal();
    _selfSend(d.act, { value: v });
});

// ── Server-configurable pick lists ───────────────────────────────────────────
// These come from config.lua with the open payload. The arrays below are
// fallbacks for a config.lua predating those keys — without them an old config
// renders empty dropdowns rather than ignoring a setting it never made.
function _selfList(name, fallback) {
    const l = (CA.lists || {})[name];
    return (Array.isArray(l) && l.length) ? l : fallback;
}

// ── Landmarks ────────────────────────────────────────────────────────────────
const SELF_LANDMARKS = [
    { name: 'Legion Square',      x: 195.0,   y: -933.0,  z: 30.7 },
    { name: 'Mission Row PD',     x: 441.0,   y: -982.0,  z: 30.7 },
    { name: 'Pillbox Hospital',   x: 298.0,   y: -584.0,  z: 43.3 },
    { name: 'Los Santos Customs', x: -337.0,  y: -136.0,  z: 39.0 },
    { name: 'LS International',   x: -1037.0, y: -2737.0, z: 20.2 },
    { name: 'Del Perro Pier',     x: -1850.0, y: -1231.0, z: 13.0 },
    { name: 'Vespucci Beach',     x: -1223.0, y: -1493.0, z: 4.3  },
    { name: 'Maze Bank Roof',     x: -75.0,   y: -818.0,  z: 326.2 },
    { name: 'Diamond Casino',     x: 925.0,   y: 46.0,    z: 81.1 },
    { name: 'Vinewood Sign',      x: 711.0,   y: 1198.0,  z: 348.5 },
    { name: 'Bolingbroke Prison', x: 1845.0,  y: 2585.0,  z: 45.0 },
    { name: 'Sandy Shores',       x: 1853.0,  y: 3689.0,  z: 34.3 },
    { name: 'Grapeseed',          x: 1698.0,  y: 4924.0,  z: 42.0 },
    { name: 'Paleto Bay',         x: -448.0,  y: 6008.0,  z: 31.7 },
    { name: 'Mount Chiliad',      x: 450.0,   y: 5566.0,  z: 806.2 },
    { name: 'Cayo Perico',        x: 4840.0,  y: -5175.0, z: 2.0  },
];

function selfLandmarkModal() {
    const list = _selfList('landmarks', SELF_LANDMARKS);
    const opts = list.map(function (l, i) {
        return '<option value="' + i + '">' + esc(l.name) + '</option>';
    }).join('');
    openModal('Teleport to Landmark',
        '<div class="form-group"><label>Location</label><select class="select" id="lm-sel">' + opts + '</select></div>'
        + '<div style="font-size:11px;color:var(--text-muted)">Undo Teleport will bring you back.</div>',
        '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'
        + '<button class="btn btn-primary" data-ca-action="applyLandmark">Teleport</button>');
}
caAction('applyLandmark', function () {
    const i = parseInt((document.getElementById('lm-sel') || {}).value);
    const l = _selfList('landmarks', SELF_LANDMARKS)[i];
    if (!l) return;
    closeModal();
    _selfSend('tpcoords', { x: l.x, y: l.y, z: l.z });
});

// A shortlist, not all 160 indices — three clicks to something photogenic or
// identifiable. Los Santos Customs exists for the full range.
const SELF_COLOURS = [
    ['0', 'Black'], ['1', 'Graphite'], ['4', 'Silver'], ['111', 'White'],
    ['27', 'Red'], ['38', 'Orange'], ['88', 'Yellow'], ['55', 'Lime'],
    ['49', 'Dark Green'], ['64', 'Sea Wash'], ['70', 'Blue'], ['73', 'Light Blue'],
    ['145', 'Purple'], ['135', 'Hot Pink'], ['90', 'Gold'], ['117', 'Brushed Steel'],
];

function selfColourModal() {
    // Config supplies {id, name}, the fallback is [id, name] — normalised here
    // rather than in two render paths.
    const list = _selfList('vehicleColours', null);
    const opts = (list
        ? list.map(function (c) { return [String(c.id), c.name]; })
        : SELF_COLOURS
    ).map(function (c) {
        return '<option value="' + escNum(c[0]) + '">' + esc(c[1]) + '</option>';
    }).join('');
    openModal('Vehicle Colour',
        '<div class="form-group"><label>Primary</label><select class="select" id="col-p">' + opts + '</select></div>'
        + '<div class="form-group"><label>Secondary</label><select class="select" id="col-s">' + opts + '</select></div>'
        + '<div style="font-size:11px;color:var(--text-muted)">Applies to the vehicle you are in, or the nearest one.</div>',
        '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'
        + '<button class="btn btn-primary" data-ca-action="applyColour">Apply</button>');
}
caAction('applyColour', function () {
    const p = parseInt((document.getElementById('col-p') || {}).value);
    const s = parseInt((document.getElementById('col-s') || {}).value);
    if (isNaN(p) || isNaN(s)) return;
    closeModal();
    _selfSend('vehcolour', { primary: p, secondary: s });
});

// ── Vehicle doors ────────────────────────────────────────────────────────────
function selfDoorsModal() {
    const doors = [['-1','All doors'],['0','Front left'],['1','Front right'],['2','Rear left'],
                 ['3','Rear right'],['4','Bonnet'],['5','Boot']];
    const opts = doors.map(function (d) { return '<option value="' + d[0] + '">' + d[1] + '</option>'; }).join('');
    openModal('Vehicle Doors',
        '<div class="form-group"><label>Door</label><select class="select" id="door-sel">' + opts + '</select></div>',
        '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'
        + '<button class="btn btn-ghost" data-ca-action="applyDoors" data-open="0">Close</button>'
        + '<button class="btn btn-primary" data-ca-action="applyDoors" data-open="1">Open</button>');
}
caAction('applyDoors', function (d) {
    const door = parseInt((document.getElementById('door-sel') || {}).value);
    if (isNaN(door)) return;
    closeModal();
    _selfSend('vehdoors', { door: door, open: d.open === '1' });
});

// ── Time scale ───────────────────────────────────────────────────────────────
function selfSlowmoModal() {
    const opts = [['1.0','Normal (100%)'],['0.5','Half (50%)'],['0.25','Quarter (25%)'],['0.1','Crawl (10%)']]
        .map(function (o) { return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join('');
    openModal('Time Scale',
        '<div class="form-group"><label>Speed</label><select class="select" id="ts-sel">' + opts + '</select></div>'
        + '<div style="font-size:11px;color:var(--text-muted)">Client-side only &mdash; nobody else slows down. '
        + 'Useful for watching a collision or a suspected cheat frame by frame.</div>',
        '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'
        + '<button class="btn btn-primary" data-ca-action="applySlowmo">Apply</button>');
}
caAction('applySlowmo', function () {
    const v = parseFloat((document.getElementById('ts-sel') || {}).value);
    if (isNaN(v)) return;
    closeModal();
    _selfSend('slowmo', { value: v });
});

function selfCopyVector(action) {
    fetch('https://cipher-admin/selfAction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: action || 'copyvector' })
    }).then(function(r) { return r.text(); }).then(function(t) {
        if (!t || !t.trim()) return;
        const d = JSON.parse(t);
        if (!d || !d.vector) return;
        _copyUrl(d.vector);
        openModal('Current Vector',
            '<div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 12px;font-family:monospace;font-size:12px;color:var(--accent);user-select:all">' + d.vector + '</div>'
            + '<div style="font-size:11px;color:var(--text-muted);margin-top:6px">Copied to clipboard. Select above to copy manually.</div>');
    });
}

function selfPedModelModal() {
    const peds = _selfList('pedModels',
        ['mp_m_freemode_01','mp_f_freemode_01','a_m_m_beach_01','a_f_m_beach_01',
         's_m_m_cop_01','s_m_m_paramedic_01','s_m_m_doctor_01','u_m_m_prolsec',
         'g_m_y_lost_01','player_zero','player_one','player_two']);
    // Delegated: these come from config.lua now, and an apostrophe in a model
    // name would break the row if it were interpolated into an inline handler.
    const rows = peds.map(function (p) {
        return '<div class="profile-row" style="cursor:pointer" data-ca-action="pickPed"'
            + ' data-model="' + escAttr(p) + '">' + esc(p) + '</div>';
    }).join('');
    openModal('Set Ped Model',
        '<div class="form-group"><label>Model Name</label><input class="input" id="ped-inp" placeholder="e.g. mp_m_freemode_01"></div>'
        + '<div style="max-height:130px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius-sm)">' + rows + '</div>',
        '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'
        + '<button class="btn btn-primary" onclick="selfApplyPed()">Apply</button>');
}
caAction('pickPed', function (d) {
    const inp = document.getElementById('ped-inp');
    if (inp) inp.value = d.model || '';
});

window.selfApplyPed = function() {
    const m = (document.getElementById('ped-inp') || {}).value || '';
    if (!m) return;
    closeModal();
    fetch('https://cipher-admin/selfAction', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'pedmodel', model: m }) });
};

function selfPropModal() {
    openModal('Spawn Prop',
        '<div class="form-group"><label>Prop Name</label><input class="input" id="prop-inp" placeholder="e.g. prop_bench_01a"></div>'
        + '<div class="form-group"><label>Freeze in place</label> <label class="toggle" style="display:inline-flex"><input type="checkbox" id="prop-frz" checked><div class="toggle-track"></div><div class="toggle-thumb"></div></label></div>',
        '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'
        + '<button class="btn btn-primary" onclick="selfApplyProp()">Spawn</button>');
}
window.selfApplyProp = function() {
    const m = (document.getElementById('prop-inp') || {}).value || '';
    const f = document.getElementById('prop-frz') ? document.getElementById('prop-frz').checked : true;
    if (!m) return;
    closeModal();
    fetch('https://cipher-admin/selfAction', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'spawnprop', model: m, frozen: f }) });
};

function selfAnnounceModal() {
    openModal('Announcement',
        '<div class="form-group"><label>Message</label><input class="input" id="ann-msg" placeholder="Enter message..."></div>'
        + '<div class="form-group"><label>Type</label><select class="select" id="ann-type"><option value="inform">Info</option><option value="success">Success</option><option value="error">Alert</option></select></div>',
        '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'
        + '<button class="btn btn-primary" onclick="selfSendAnnounce()">Send</button>');
}
window.selfSendAnnounce = function() {
    const msg  = (document.getElementById('ann-msg')  || {}).value || '';
    let type = (document.getElementById('ann-type') || {}).value || 'inform';
    if (!msg) return;
    caFetch('cipher-admin:server:announce', { message: msg, type: type });
    closeModal();
};

function selfWeatherModal() {
    const ws = ['EXTRASUNNY','CLEAR','CLOUDS','SMOG','FOGGY','OVERCAST','RAIN','THUNDER','CLEARING','NEUTRAL','SNOW','BLIZZARD','SNOWLIGHT','XMAS','HALLOWEEN'];
    const opts = ws.map(function(w) { return '<option value="' + w + '">' + w + '</option>'; }).join('');
    openModal('Set Weather',
        '<div class="form-group"><label>Weather</label><select class="select" id="wx-sel">' + opts + '</select></div>',
        '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'
        + '<button class="btn btn-primary" onclick="selfApplyWeather()">Apply</button>');
}
window.selfApplyWeather = function() {
    const w = (document.getElementById('wx-sel') || {}).value;
    if (!w) return;
    caFetch('cipher-admin:server:setWeather', { weather: w });
    closeModal();
};

function selfTimeModal() {
    openModal('Set Time',
        '<div class="form-group"><label>Hour (0-23)</label><input class="input" id="t-hr" type="number" min="0" max="23" value="12"></div>'
        + '<div class="form-group"><label>Minute (0-59)</label><input class="input" id="t-mn" type="number" min="0" max="59" value="0"></div>',
        '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'
        + '<button class="btn btn-primary" onclick="selfApplyTime()">Apply</button>');
}
window.selfApplyTime = function() {
    const h = parseInt((document.getElementById('t-hr') || {}).value) || 12;
    const m = parseInt((document.getElementById('t-mn') || {}).value) || 0;
    caFetch('cipher-admin:server:setTime', { hour: h, minute: m });
    closeModal();
};

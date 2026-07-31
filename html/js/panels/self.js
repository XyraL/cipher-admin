// Cipher-Admin -- Self Actions Panel
//
// The action grid is generated from the SELF_ACTIONS registry below rather
// than hand-written in index.html. The panel previously carried ~23 buttons
// as literal markup, which meant every new action needed a block of HTML, a
// routing line, and a Lua branch kept in sync by hand — the reason it had
// stopped growing. Adding one now is a single registry entry plus its Lua
// branch.
//
// Fields:
//   key      matches the `action` string handled in client/main.lua
//   toggle   renders as a stateful on/off card
//   ui       handled entirely in the NUI (opens a modal / switches panel);
//            never reaches Lua
//   danger   styled as destructive
var SELF_ACTIONS = [
    // ── Personal ──
    { sec: 'Personal', key: 'godmode',     label: 'God Mode',      desc: 'Toggle invincibility',       ico: 'shield', toggle: true },
    { sec: 'Personal', key: 'heal',        label: 'Heal',          desc: 'Full health & armour',       ico: 'heal' },
    { sec: 'Personal', key: 'revive',      label: 'Revive',        desc: 'Resurrect if dead',          ico: 'revive' },
    { sec: 'Personal', key: 'foodwater',   label: 'Food & Water',  desc: 'Max hunger & thirst',        ico: 'heal' },
    { sec: 'Personal', key: 'armour',      label: 'Armour Only',   desc: 'Top up armour, keep health', ico: 'shield' },
    { sec: 'Personal', key: 'infstamina',  label: 'Infinite Stamina', desc: 'Never run out of breath', ico: 'self', toggle: true },
    { sec: 'Personal', key: 'fireproof',   label: 'Fireproof',     desc: 'Immune to fire damage',      ico: 'shield', toggle: true },
    { sec: 'Personal', key: 'noragdoll',   label: 'No Ragdoll',    desc: 'Stay on your feet',          ico: 'self', toggle: true },
    { sec: 'Personal', key: 'clearwanted', label: 'Clear Wanted',  desc: 'Drop wanted level to zero',  ico: 'check' },
    { sec: 'Personal', key: 'setwanted',   label: 'Set Wanted',    desc: 'Choose a star level',        ico: 'warn', ui: true },

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
    { sec: 'Vehicle', key: 'deleteveh',  label: 'Delete',        desc: 'Remove nearest vehicle',     ico: 'trash', danger: true },

    // ── World ──
    { sec: 'World', key: 'weather',    label: 'Weather',      desc: 'Set the server weather',      ico: 'entities', ui: true },
    { sec: 'World', key: 'settime',    label: 'Time',         desc: 'Set the server clock',        ico: 'clock', ui: true },
    { sec: 'World', key: 'freezetime', label: 'Freeze Time',  desc: 'Hold the clock still',        ico: 'clock', toggle: true },
    { sec: 'World', key: 'blackout',   label: 'Blackout',     desc: 'Kill the city lights',        ico: 'entities', toggle: true },
    { sec: 'World', key: 'announce',   label: 'Announce',     desc: 'Broadcast to everyone',       ico: 'adminchat', ui: true },
    { sec: 'World', key: 'traffic',    label: 'Traffic',      desc: 'Set vehicle density',         ico: 'spawner', ui: true },
    { sec: 'World', key: 'peddensity', label: 'Pedestrians',  desc: 'Set pedestrian density',      ico: 'players', ui: true },

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
];

// Toggle state lives here rather than in a handful of loose booleans so the
// renderer can ask about any key without a lookup table per action.
var _selfToggles = {};

function renderSelfPanel() {
    var panel = document.getElementById('panel-self');
    if (!panel) return;

    var sections = [];
    SELF_ACTIONS.forEach(function (a) {
        if (sections.indexOf(a.sec) === -1) sections.push(a.sec);
    });

    var html = '<div class="section-header mb-12"><div>'
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
        var cards = SELF_ACTIONS.filter(function (a) { return a.sec === sec; }).map(selfCardHtml).join('');
        html += '<div class="self-section" data-section="' + escAttr(sec) + '">'
            + '<div class="self-section-title">' + esc(sec) + '</div>'
            + '<div class="self-action-grid">' + cards + '</div></div>';
    });

    panel.innerHTML = html;

    var filter = document.getElementById('self-filter');
    if (filter) filter.oninput = function () { selfFilter(this.value); };

    _renderFavsBar();
}

function selfCardHtml(a) {
    var on = _selfToggles[a.key];
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

// Filters on the precomputed data-search string so it matches label, blurb
// and section without touching the DOM text of every card.
function selfFilter(q) {
    var needle = (q || '').trim().toLowerCase();
    document.querySelectorAll('#panel-self .self-action-card').forEach(function (card) {
        card.style.display = (!needle || (card.dataset.search || '').indexOf(needle) !== -1) ? '' : 'none';
    });
    // Hide a whole section once every card in it is filtered out.
    document.querySelectorAll('#panel-self .self-section').forEach(function (sec) {
        var any = [].slice.call(sec.querySelectorAll('.self-action-card'))
            .some(function (c) { return c.style.display !== 'none'; });
        sec.style.display = any ? '' : 'none';
    });
}

caAction('selfCard', function (d) { selfBtn(d.key); });

// Right-click pins to Favorites. Registered once on the panel rather than
// per-card so it survives re-renders.
document.addEventListener('contextmenu', function (e) {
    var card = e.target.closest && e.target.closest('#panel-self .self-action-card');
    if (!card) return;
    e.preventDefault();
    var def = SELF_ACTIONS.find(function (a) { return a.key === card.dataset.key; });
    if (def) selfToggleFav(def.key, def.label, def.ico, e);
});

window.renderSelfPanel = renderSelfPanel;
window.SELF_ACTIONS = SELF_ACTIONS;

var _godModeActive   = false;
var _noclipActive    = false;
var _invisibleActive = false;

function selfBtn(key) {
    var def = SELF_ACTIONS.find(function (a) { return a.key === key; });

    // NUI-only actions never reach Lua.
    if (key === 'spawner')    { switchPanel('spawner'); return; }
    if (key === 'copyvec')    { selfCopyVector('copyvector'); return; }
    if (key === 'copyvec3')   { selfCopyVector('copyvector3'); return; }
    if (key === 'setwanted')  { selfWantedModal(); return; }
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

    if (def && def.toggle) {
        _selfToggles[key] = !_selfToggles[key];
        var btn = document.getElementById('sa-' + key);
        if (btn) {
            btn.classList.toggle('active', _selfToggles[key]);
            var st = btn.querySelector('.sa-state');
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
    var body = Object.assign({ action: action }, extra || {});
    fetch('https://cipher-admin/selfAction', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
}

function selfWantedModal() {
    var opts = [0,1,2,3,4,5].map(function (n) {
        return '<option value="' + n + '">' + (n === 0 ? 'Clear (0 stars)' : n + ' star' + (n > 1 ? 's' : '')) + '</option>';
    }).join('');
    openModal('Set Wanted Level',
        '<div class="form-group"><label>Stars</label><select class="select" id="wanted-sel">' + opts + '</select></div>',
        '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'
        + '<button class="btn btn-primary" data-ca-action="applyWanted">Apply</button>');
}
caAction('applyWanted', function () {
    var v = parseInt((document.getElementById('wanted-sel') || {}).value) || 0;
    closeModal();
    _selfSend('setwanted', { level: v });
});

function selfWalkModal() {
    var styles = ['move_m@casual@a','move_m@confident','move_m@business@a','move_m@tough_guy@',
                  'move_f@sexy@a','move_m@injured','move_m@drunk@moderatedrunk','move_m@hurry@a',
                  'move_m@swagger','move_m@gangster@generic','RESET'];
    var opts = styles.map(function (s) { return '<option value="' + escAttr(s) + '">' + esc(s) + '</option>'; }).join('');
    openModal('Walk Style',
        '<div class="form-group"><label>Clipset</label><select class="select" id="walk-sel">' + opts + '</select></div>',
        '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'
        + '<button class="btn btn-primary" data-ca-action="applyWalk">Apply</button>');
}
caAction('applyWalk', function () {
    var v = (document.getElementById('walk-sel') || {}).value || 'RESET';
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
    var x = document.getElementById('tp-x');
    if (x) x.addEventListener('paste', function (ev) {
        var txt = (ev.clipboardData || window.clipboardData).getData('text') || '';
        var nums = txt.match(/-?\d+(\.\d+)?/g);
        if (nums && nums.length >= 3) {
            ev.preventDefault();
            document.getElementById('tp-x').value = nums[0];
            document.getElementById('tp-y').value = nums[1];
            document.getElementById('tp-z').value = nums[2];
        }
    });
}
caAction('applyCoords', function () {
    var g = function (id) { return parseFloat((document.getElementById(id) || {}).value); };
    var x = g('tp-x'), y = g('tp-y'), z = g('tp-z');
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
    var v = ((document.getElementById('plate-inp') || {}).value || '').trim();
    if (!v) return;
    closeModal();
    _selfSend('setplate', { plate: v });
});

function selfDensityModal(action, title) {
    var opts = [['0','Off (0%)'],['0.25','Low (25%)'],['0.5','Half (50%)'],['1','Normal (100%)']]
        .map(function (o) { return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join('');
    openModal(title,
        '<div class="form-group"><label>Density</label><select class="select" id="dens-sel">' + opts + '</select></div>'
        + '<div style="font-size:11px;color:var(--text-muted)">Applies to your client only &mdash; useful for clearing a scene before a screenshot.</div>',
        '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'
        + '<button class="btn btn-primary" data-ca-action="applyDensity" data-act="' + escAttr(action) + '">Apply</button>');
}
caAction('applyDensity', function (d) {
    var v = parseFloat((document.getElementById('dens-sel') || {}).value);
    if (isNaN(v)) return;
    closeModal();
    _selfSend(d.act, { value: v });
});

function selfCopyVector(action) {
    fetch('https://cipher-admin/selfAction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: action || 'copyvector' })
    }).then(function(r) { return r.text(); }).then(function(t) {
        if (!t || !t.trim()) return;
        var d = JSON.parse(t);
        if (!d || !d.vector) return;
        _copyUrl(d.vector);
        openModal('Current Vector',
            '<div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 12px;font-family:monospace;font-size:12px;color:var(--accent);user-select:all">' + d.vector + '</div>'
            + '<div style="font-size:11px;color:var(--text-muted);margin-top:6px">Copied to clipboard. Select above to copy manually.</div>');
    });
}

function selfPedModelModal() {
    var peds = 'mp_m_freemode_01,mp_f_freemode_01,a_m_m_beach_01,a_f_m_beach_01,s_m_m_cop_01,s_m_m_paramedic_01,s_m_m_doctor_01,u_m_m_prolsec,g_m_y_lost_01,player_zero,player_one,player_two'.split(',');
    var rows = peds.map(function(p) {
        return '<div class="profile-row" style="cursor:pointer" onclick="document.getElementById(\'ped-inp\').value=\'' + p + '\'">' + p + '</div>';
    }).join('');
    openModal('Set Ped Model',
        '<div class="form-group"><label>Model Name</label><input class="input" id="ped-inp" placeholder="e.g. mp_m_freemode_01"></div>'
        + '<div style="max-height:130px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius-sm)">' + rows + '</div>',
        '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'
        + '<button class="btn btn-primary" onclick="selfApplyPed()">Apply</button>');
}
window.selfApplyPed = function() {
    var m = (document.getElementById('ped-inp') || {}).value || '';
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
    var m = (document.getElementById('prop-inp') || {}).value || '';
    var f = document.getElementById('prop-frz') ? document.getElementById('prop-frz').checked : true;
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
    var msg  = (document.getElementById('ann-msg')  || {}).value || '';
    var type = (document.getElementById('ann-type') || {}).value || 'inform';
    if (!msg) return;
    caFetch('cipher-admin:server:announce', { message: msg, type: type });
    closeModal();
};

function selfWeatherModal() {
    var ws = ['EXTRASUNNY','CLEAR','CLOUDS','SMOG','FOGGY','OVERCAST','RAIN','THUNDER','CLEARING','NEUTRAL','SNOW','BLIZZARD','SNOWLIGHT','XMAS','HALLOWEEN'];
    var opts = ws.map(function(w) { return '<option value="' + w + '">' + w + '</option>'; }).join('');
    openModal('Set Weather',
        '<div class="form-group"><label>Weather</label><select class="select" id="wx-sel">' + opts + '</select></div>',
        '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'
        + '<button class="btn btn-primary" onclick="selfApplyWeather()">Apply</button>');
}
window.selfApplyWeather = function() {
    var w = (document.getElementById('wx-sel') || {}).value;
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
    var h = parseInt((document.getElementById('t-hr') || {}).value) || 12;
    var m = parseInt((document.getElementById('t-mn') || {}).value) || 0;
    caFetch('cipher-admin:server:setTime', { hour: h, minute: m });
    closeModal();
};

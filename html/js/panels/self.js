// Cipher-Admin -- Self Actions Panel (action handlers only; HTML is in index.html)

var _godModeActive   = false;
var _noclipActive    = false;
var _invisibleActive = false;

function selfBtn(key) {
    if (key === 'spawner')   { switchPanel('spawner'); return; }
    if (key === 'copyvec')   { selfCopyVector(); return; }
    if (key === 'pedmodel')  { selfPedModelModal(); return; }
    if (key === 'spawnprop') { selfPropModal(); return; }
    if (key === 'announce')  { selfAnnounceModal(); return; }
    if (key === 'weather')   { selfWeatherModal(); return; }
    if (key === 'settime')   { selfTimeModal(); return; }

    var toggleMap = { godmode: '_godModeActive', noclip: '_noclipActive', invisible: '_invisibleActive' };
    if (toggleMap[key]) {
        if (key === 'godmode')   _godModeActive   = !_godModeActive;
        if (key === 'noclip')    _noclipActive    = !_noclipActive;
        if (key === 'invisible') _invisibleActive = !_invisibleActive;
        var active = (key === 'godmode') ? _godModeActive : (key === 'noclip') ? _noclipActive : _invisibleActive;
        var btn = document.getElementById('sa-' + key);
        if (btn) btn.className = active ? 'self-action-card active' : 'self-action-card';
    }

    fetch('https://cipher-admin/selfAction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: key })
    });
}

function selfCopyVector() {
    fetch('https://cipher-admin/selfAction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'copyvector' })
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

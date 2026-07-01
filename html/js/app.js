// Cipher-Admin — Core NUI Bridge

const CA = {
    admin:       null,
    serverName:  '',
    playerCount: 0,
    banPresets:  [],
    currentPanel: 'dashboard',
};

// ── NUI fetch wrapper ──────────────────────────────────────────────────────────
async function caFetch(endpoint, data = {}) {
    try {
        const res = await fetch(`https://cipher-admin/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        const text = await res.text();
        if (!text || text.trim() === '') return null;
        return JSON.parse(text);
    } catch(e) {
        return null;
    }
}

// ── Message handler ───────────────────────────────────────────────────────────
window.addEventListener('message', function(e) {
    const msg = e.data;
    if (msg.type === 'open')             { onOpen(msg.data); }
    if (msg.type === 'close')            { onClose(); }
    if (msg.type === 'announcement')     { showAnnouncement(msg.data); }
    if (msg.type === 'switchPanel')      { switchPanel(msg.panel); }
    if (msg.type === 'adminChat')        { pushAdminChat(msg.data); }
    if (msg.type === 'dm')               { showDm(msg.data); }
    if (msg.type === 'screenshotResult') { showScreenshot(msg.data); }
    if (msg.type === 'newReport')        { onNewReport(msg.data); }
});

// ── Click-outside & ESC to close ─────────────────────────────────────────────
document.getElementById('admin-overlay').addEventListener('click', function(e) {
    if (e.target === this) closeAdmin();
});
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeAdmin();
});

function onOpen(data) {
    CA.admin       = data.admin;
    CA.serverName  = data.serverName;
    CA.playerCount = data.playerCount;
    CA.banPresets  = data.banPresets || [];

    document.getElementById('admin-overlay').classList.remove('hidden');
    document.getElementById('sidebar-server-name').textContent = data.serverName;
    document.getElementById('topbar-player-count').textContent = data.playerCount + ' online';
    document.getElementById('badge-bans').textContent = data.activeBans > 0 ? data.activeBans : '';

    renderAdminBadge(data.admin);
    startClock();
    switchPanel('dashboard');
    loadDashboard(data);
}

function onClose() {
    document.getElementById('admin-overlay').classList.add('hidden');
    closePlayerProfile();
}

function closeAdmin() {
    fetch('https://cipher-admin/close', { method: 'POST', body: JSON.stringify({}) });
    onClose();
}

// ── Admin badge ───────────────────────────────────────────────────────────────
function renderAdminBadge(admin) {
    const el = document.getElementById('sidebar-admin-badge');
    el.innerHTML = `
        <div class="badge-name">${admin.name || 'Admin'}</div>
        <span class="badge-role" style="background:${admin.roleColor}22;color:${admin.roleColor}">${admin.roleLabel || admin.role}</span>
    `;
}

// ── Clock ─────────────────────────────────────────────────────────────────────
let _clockInterval = null;
function startClock() {
    if (_clockInterval) clearInterval(_clockInterval);
    const tick = () => {
        const now = new Date();
        document.getElementById('topbar-time').textContent =
            now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };
    tick();
    _clockInterval = setInterval(tick, 1000);
}

// ── Panel switching ───────────────────────────────────────────────────────────
function switchPanel(name) {
    CA.currentPanel = name;

    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const panel = document.getElementById('panel-' + name);
    if (panel) panel.classList.add('active');

    const navItem = document.querySelector(`.nav-item[data-panel="${name}"]`);
    if (navItem) navItem.classList.add('active');

    const titles = {
        dashboard:   'Dashboard',
        players:     'Player List',
        character:   'Character Lookup',
        spawner:     'Vehicle Spawner',
        inventory:   'Inventory Viewer',
        bans:        'Ban Manager',
        permissions: 'Permissions',
        audit:       'Audit Log',
        reports:     'Player Reports',
        resources:   'Resource Manager',
        entities:    'Entity Inspector',
        stats:       'Server Stats',
        self:        'Self Actions',
        adminchat:   'Admin Chat',
    };
    document.getElementById('topbar-title').textContent = titles[name] || name;

    closePlayerProfile();

    if (name === 'players')     loadPlayers();
    if (name === 'spawner')     loadSpawner();
    if (name === 'bans')        loadBans();
    if (name === 'permissions') loadPermissions();
    if (name === 'audit')       loadAudit();
    if (name === 'inventory')   renderInventoryPanel();
    if (name === 'character')   renderCharacterPanel();
    if (name === 'reports') {
        _reportUnread = 0;
        var rb = document.getElementById('badge-reports');
        if (rb) rb.textContent = '';
        if (typeof loadReports === 'function') loadReports();
    }
    if (name === 'resources')   { if (typeof loadResources === 'function') loadResources(); }
    if (name === 'entities')    { if (typeof loadEntities  === 'function') loadEntities(); }
    if (name === 'stats')       { if (typeof loadStats     === 'function') loadStats(); }
    if (name === 'adminchat') {
        _chatUnread = 0;
        var badge = document.getElementById('badge-adminchat');
        if (badge) badge.textContent = '';
        var el = document.getElementById('chat-messages');
        if (el) setTimeout(function() { el.scrollTop = el.scrollHeight; }, 50);
    }
}

// Nav click
document.querySelectorAll('.nav-item[data-panel]').forEach(item => {
    item.addEventListener('click', () => switchPanel(item.dataset.panel));
});

// ── Player Profile Sidebar ────────────────────────────────────────────────────
function openPlayerProfile(playerData) {
    const panel = document.getElementById('player-profile-panel');
    panel.classList.remove('hidden');
    renderPlayerProfile(playerData);
}

function closePlayerProfile() {
    document.getElementById('player-profile-panel').classList.add('hidden');
}

// ── Modal helpers ─────────────────────────────────────────────────────────────
function openModal(title, bodyHtml, footerHtml = '') {
    closeModal();
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.id = 'ca-modal-backdrop';
    backdrop.innerHTML = `
        <div class="modal" id="ca-modal">
            <div class="modal-header">
                <span class="modal-title">${title}</span>
                <button class="modal-close" onclick="closeModal()">✕</button>
            </div>
            <div class="modal-body">${bodyHtml}</div>
            ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
        </div>
    `;
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closeModal(); });
    document.body.appendChild(backdrop);
}

function closeModal() {
    if (_liveWatchActive) {
        _liveWatchActive = false;
        if (_liveWatchInterval) { clearInterval(_liveWatchInterval); _liveWatchInterval = null; }
    }
    const el = document.getElementById('ca-modal-backdrop');
    if (el) el.remove();
}

// ── Announcement ──────────────────────────────────────────────────────────────
var _annTimer = null;
function showAnnouncement(data) {
    if (_annTimer) { clearInterval(_annTimer); _annTimer = null; }
    const overlay    = document.getElementById('announcement-overlay');
    const cdEl       = document.getElementById('announcement-countdown');
    document.getElementById('announcement-from').textContent = '📢 ' + (data.adminName || 'Server');
    document.getElementById('announcement-msg').textContent  = data.message;

    if (data.countdown && data.countdown > 0) {
        var secs = data.countdown;
        cdEl.style.display = 'block';
        cdEl.textContent = secs + 's';
        _annTimer = setInterval(function() {
            secs--;
            if (secs <= 0) { clearInterval(_annTimer); _annTimer = null; cdEl.style.display = 'none'; overlay.classList.add('hidden'); }
            else { cdEl.textContent = secs + 's'; }
        }, 1000);
    } else {
        cdEl.style.display = 'none';
    }

    overlay.classList.remove('hidden');
    if (!data.countdown) setTimeout(function() { overlay.classList.add('hidden'); }, 7000);
}

// ── DM overlay ────────────────────────────────────────────────────────────────
var _dmTimer = null;
function showDm(data) {
    if (!data) return;
    if (_dmTimer) { clearTimeout(_dmTimer); }
    var overlay = document.getElementById('dm-overlay');
    document.getElementById('dm-from').textContent = data.from || data.adminName || 'Admin';
    document.getElementById('dm-msg').textContent  = data.message || '';
    overlay.classList.remove('hidden');
    _dmTimer = setTimeout(function() { overlay.classList.add('hidden'); }, 8000);
}

// ── Screenshot result ─────────────────────────────────────────────────────────
var _liveWatchActive   = false;
var _liveWatchInterval = null;
var _liveWatchSrc      = null;
var _liveWatchName     = '';

function showScreenshot(data) {
    if (!data || !data.url) return;
    if (_liveWatchActive) {
        // Update the live watch modal image without reopening
        var img = document.getElementById('live-watch-img');
        var ts  = document.getElementById('live-watch-ts');
        if (img) { img.src = data.url; }
        if (ts)  { ts.textContent = 'Last updated: ' + new Date().toLocaleTimeString(); }
        return;
    }
    var escapedUrl = data.url.replace(/'/g, "\\'");
    openModal('Screenshot — ' + (data.playerName || ''),
        '<img src="' + data.url + '" style="width:100%;border-radius:var(--radius-sm);display:block" onerror="this.style.display=\'none\'">'
        + '<div style="font-size:11px;color:var(--text-muted);margin-top:6px;word-break:break-all">' + data.url + '</div>',
        '<button class="btn btn-ghost" onclick="_copyUrl(\'' + escapedUrl + '\')">&#x1F4CB; Copy URL</button>'
        + '<button class="btn btn-ghost" onclick="closeModal()">Close</button>');
}

function _copyUrl(url) {
    try {
        var ta = document.createElement('textarea');
        ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    } catch(e) {}
}

function startLiveWatch(src, name) {
    _liveWatchActive = true;
    _liveWatchSrc    = src;
    _liveWatchName   = name;
    openModal('Live Watch — ' + name,
        '<div style="text-align:center">'
        + '<img id="live-watch-img" src="" style="width:100%;border-radius:var(--radius-sm);display:block;min-height:200px;background:var(--bg-elevated)" onerror="this.style.opacity=0.3">'
        + '<div id="live-watch-ts" style="font-size:11px;color:var(--text-muted);margin-top:6px">Requesting first frame...</div>'
        + '</div>',
        '<button class="btn btn-danger" onclick="stopLiveWatch()">&#x25A0; Stop</button>');
    // Take first screenshot immediately, then every 2.5s
    playerAction('screenshot', src, '', name);
    _liveWatchInterval = setInterval(function() {
        if (!_liveWatchActive) { clearInterval(_liveWatchInterval); return; }
        playerAction('screenshot', src, '', name);
    }, 2500);
}

function stopLiveWatch() {
    _liveWatchActive = false;
    if (_liveWatchInterval) { clearInterval(_liveWatchInterval); _liveWatchInterval = null; }
    closeModal();
}

// ── New report badge ──────────────────────────────────────────────────────────
var _reportUnread = 0;
function onNewReport(data) {
    _reportUnread++;
    var badge = document.getElementById('badge-reports');
    if (badge) badge.textContent = _reportUnread;
    if (CA.currentPanel === 'reports' && typeof loadReports === 'function') loadReports();
}

// ── Utility ───────────────────────────────────────────────────────────────────
function timeAgo(ts) {
    if (!ts) return '';
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (diff < 60)   return diff + 's ago';
    if (diff < 3600) return Math.floor(diff/60) + 'm ago';
    if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
    return Math.floor(diff/86400) + 'd ago';
}

function formatDate(ts) {
    if (!ts) return 'N/A';
    return new Date(ts).toLocaleDateString([], { month:'short', day:'numeric', year:'numeric' });
}

function formatMoney(n) {
    return '$' + Number(n || 0).toLocaleString();
}

function pingClass(ping) {
    if (ping < 80)  return 'ping-good';
    if (ping < 150) return 'ping-medium';
    return 'ping-bad';
}

function hasPermission(perm) {
    if (!CA.admin) return false;
    if (CA.admin.isOwner) return true;
    if (!CA.admin.permissions) return false;
    return CA.admin.permissions[perm] === true || CA.admin.permissions.all === true;
}

// ── Self Favorites bar ────────────────────────────────────────────────────────
var _selfFavs = JSON.parse(localStorage.getItem('ca_selfFavs') || '[]');

function selfToggleFav(key, label, icon, e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    var idx = _selfFavs.findIndex(function(f) { return f.key === key; });
    if (idx !== -1) { _selfFavs.splice(idx, 1); } else { _selfFavs.push({ key: key, label: label, icon: icon }); }
    localStorage.setItem('ca_selfFavs', JSON.stringify(_selfFavs));
    _renderFavsBar();
}

function _renderFavsBar() {
    var wrap = document.getElementById('sa-favorites-wrap');
    var grid = document.getElementById('sa-favorites-grid');
    if (!wrap || !grid) return;
    if (!_selfFavs.length) { wrap.style.display = 'none'; return; }
    wrap.style.display = '';
    grid.innerHTML = _selfFavs.map(function(f) {
        return '<button class="self-action-card" id="sa-fav-' + f.key + '" onclick="selfBtn(\'' + f.key + '\')" oncontextmenu="selfToggleFav(\'' + f.key + '\',\'' + f.label + '\',\'' + f.icon + '\',event)">'
             + '<div class="sa-icon">' + f.icon + '</div>'
             + '<div class="sa-label">' + f.label + '</div>'
             + '<div class="sa-desc" style="color:var(--amber);font-size:10px">&#x2605; pinned</div>'
             + '</button>';
    }).join('');
}

// Initialize favorites bar on load
document.addEventListener('DOMContentLoaded', function() { _renderFavsBar(); });

window.closeAdmin          = closeAdmin;
window.switchPanel         = switchPanel;
window.openModal           = openModal;
window.closeModal          = closeModal;
window.openPlayerProfile   = openPlayerProfile;
window.closePlayerProfile  = closePlayerProfile;
window.hasPermission       = hasPermission;
window.timeAgo             = timeAgo;
window.formatDate          = formatDate;
window.formatMoney         = formatMoney;
window.caFetch             = caFetch;
window.CA                  = CA;
window.showDm              = showDm;
window.showScreenshot      = showScreenshot;
window._copyUrl            = _copyUrl;
window.startLiveWatch      = startLiveWatch;
window.stopLiveWatch       = stopLiveWatch;
window.onNewReport         = onNewReport;
window.selfToggleFav       = selfToggleFav;

// ── Self Actions ──────────────────────────────────────────────────────────────
var _godModeActive     = false;
var _noclipActive      = false;
var _invisibleActive   = false;
var _superSprintActive = false;
var _superJumpActive   = false;

function selfBtn(key) {
    if (key === 'spawner')   { switchPanel('spawner'); return; }
    if (key === 'copyvec')   { _selfCopyVector(); return; }
    if (key === 'pedmodel')  { _selfPedModelModal(); return; }
    if (key === 'spawnprop') { _selfPropModal(); return; }
    if (key === 'announce')  { _selfAnnounceModal(); return; }
    if (key === 'weather')   { _selfWeatherModal(); return; }
    if (key === 'settime')   { _selfTimeModal(); return; }

    if (key === 'godmode')     _godModeActive      = !_godModeActive;
    if (key === 'noclip')      _noclipActive       = !_noclipActive;
    if (key === 'invisible')   _invisibleActive    = !_invisibleActive;
    if (key === 'supersprint') _superSprintActive  = !_superSprintActive;
    if (key === 'superjump')   _superJumpActive    = !_superJumpActive;

    var toggles = { godmode: _godModeActive, noclip: _noclipActive, invisible: _invisibleActive, supersprint: _superSprintActive, superjump: _superJumpActive };
    if (key in toggles) {
        var btn = document.getElementById('sa-' + key);
        if (btn) btn.className = toggles[key] ? 'self-action-card active' : 'self-action-card';
    }

    fetch('https://cipher-admin/selfAction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: key })
    });
}

function _selfCopyVector() {
    fetch('https://cipher-admin/selfAction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'copyvector' })
    }).then(function(r) { return r.json(); }).then(function(d) {
        if (!d || !d.vector) return;
        try {
            var ta = document.createElement('textarea');
            ta.value = d.vector;
            ta.style.position = 'fixed'; ta.style.opacity = '0';
            document.body.appendChild(ta); ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        } catch(e) {}
        openModal('Current Vector',
            '<div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 12px;font-family:monospace;font-size:12px;color:var(--accent);user-select:all">' + d.vector + '</div>'
            + '<div style="font-size:11px;color:var(--text-muted);margin-top:6px">Select above to copy manually.</div>');
    });
}

function _selfPedModelModal() {
    var peds = ['mp_m_freemode_01','mp_f_freemode_01','a_m_m_beach_01','a_f_m_beach_01','s_m_m_cop_01','s_m_m_paramedic_01','s_m_m_doctor_01','u_m_m_prolsec','g_m_y_lost_01','player_zero','player_one','player_two'];
    var rows = '';
    for (var i = 0; i < peds.length; i++) {
        rows += '<div class="profile-row" style="cursor:pointer" onclick="document.getElementById(\'ped-inp\').value=\'' + peds[i] + '\'">' + peds[i] + '</div>';
    }
    openModal('Set Ped Model',
        '<div class="form-group"><label>Model Name</label><input class="input" id="ped-inp" placeholder="e.g. mp_m_freemode_01"></div>'
        + '<div style="max-height:130px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius-sm)">' + rows + '</div>',
        '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'
        + '<button class="btn btn-primary" onclick="selfApplyPed()">Apply</button>');
}
function selfApplyPed() {
    var m = (document.getElementById('ped-inp') || {}).value || '';
    if (!m) return;
    closeModal();
    fetch('https://cipher-admin/selfAction', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'pedmodel', model: m }) });
}

function _selfPropModal() {
    openModal('Spawn Prop',
        '<div class="form-group"><label>Prop Name</label><input class="input" id="prop-inp" placeholder="e.g. prop_bench_01a"></div>'
        + '<div class="form-group"><label>Freeze in place&nbsp;</label><input type="checkbox" id="prop-frz" checked></div>',
        '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'
        + '<button class="btn btn-primary" onclick="selfApplyProp()">Spawn</button>');
}
function selfApplyProp() {
    var m = (document.getElementById('prop-inp') || {}).value || '';
    var f = document.getElementById('prop-frz') ? document.getElementById('prop-frz').checked : true;
    if (!m) return;
    closeModal();
    fetch('https://cipher-admin/selfAction', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'spawnprop', model: m, frozen: f }) });
}

function _selfAnnounceModal() {
    openModal('Announcement',
        '<div class="form-group"><label>Message</label><input class="input" id="ann-msg" placeholder="Enter message..."></div>'
        + '<div class="form-group"><label>Type</label><select class="select" id="ann-type"><option value="inform">Info</option><option value="success">Success</option><option value="error">Alert</option></select></div>',
        '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'
        + '<button class="btn btn-primary" onclick="selfSendAnnounce()">Send</button>');
}
function selfSendAnnounce() {
    var msg  = (document.getElementById('ann-msg')  || {}).value || '';
    var type = (document.getElementById('ann-type') || {}).value || 'inform';
    if (!msg) return;
    caFetch('cipher-admin:server:announce', { message: msg, type: type });
    closeModal();
}

function _selfWeatherModal() {
    var ws = ['EXTRASUNNY','CLEAR','CLOUDS','SMOG','FOGGY','OVERCAST','RAIN','THUNDER','CLEARING','NEUTRAL','SNOW','BLIZZARD','SNOWLIGHT','XMAS','HALLOWEEN'];
    var opts = '';
    for (var i = 0; i < ws.length; i++) opts += '<option value="' + ws[i] + '">' + ws[i] + '</option>';
    openModal('Set Weather',
        '<div class="form-group"><label>Weather</label><select class="select" id="wx-sel">' + opts + '</select></div>',
        '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'
        + '<button class="btn btn-primary" onclick="selfApplyWeather()">Apply</button>');
}
function selfApplyWeather() {
    var w = (document.getElementById('wx-sel') || {}).value;
    if (!w) return;
    caFetch('cipher-admin:server:setWeather', { weather: w });
    closeModal();
}

function _selfTimeModal() {
    openModal('Set Time',
        '<div class="form-group"><label>Hour (0-23)</label><input class="input" id="t-hr" type="number" min="0" max="23" value="12"></div>'
        + '<div class="form-group"><label>Minute (0-59)</label><input class="input" id="t-mn" type="number" min="0" max="59" value="0"></div>',
        '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'
        + '<button class="btn btn-primary" onclick="selfApplyTime()">Apply</button>');
}
function selfApplyTime() {
    var h = parseInt((document.getElementById('t-hr') || {}).value) || 12;
    var m = parseInt((document.getElementById('t-mn') || {}).value) || 0;
    caFetch('cipher-admin:server:setTime', { hour: h, minute: m });
    closeModal();
}

// ── Admin Chat ────────────────────────────────────────────────────────────────
var _chatMessages = [];
var _chatUnread   = 0;

function chatSend() {
    var input = document.getElementById('chat-input');
    if (!input) return;
    var msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    fetch('https://cipher-admin/adminChat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
    });
}

function pushAdminChat(data) {
    _chatMessages.push(data);
    if (_chatMessages.length > 200) _chatMessages.shift();
    if (CA.currentPanel === 'adminchat') {
        _chatAppend(data);
    } else {
        _chatUnread++;
        var badge = document.getElementById('badge-adminchat');
        if (badge) badge.textContent = _chatUnread;
    }
}

function _chatAppend(m) {
    var el = document.getElementById('chat-messages');
    if (!el) return;
    var empty = el.querySelector('.empty-state');
    if (empty) empty.remove();
    var div = document.createElement('div');
    div.className = 'chat-msg';
    div.innerHTML = '<span class="chat-sender">' + _escHtml(m.sender) + '</span>'
                  + '<span class="chat-time">' + _chatFmtTime(m.time) + '</span>'
                  + '<div class="chat-text">' + _escHtml(m.message) + '</div>';
    el.appendChild(div);
    setTimeout(function() { el.scrollTop = el.scrollHeight; }, 50);
}

function _chatFmtTime(ts) {
    if (!ts) return '';
    var d = new Date(ts * 1000);
    var h  = ('0' + d.getHours()).slice(-2);
    var mi = ('0' + d.getMinutes()).slice(-2);
    return h + ':' + mi;
}

function _escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

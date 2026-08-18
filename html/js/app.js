// Cipher-Admin — Core NUI Bridge

const CA = {
    admin:            null,
    serverName:       '',
    playerCount:      0,
    banPresets:       [],
    quickBanReasons:  [],
    quickWarnReasons: [],
    onDuty:           false,
    dutyAdmins:       {},
    currentPanel:     'dashboard',
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
    if (msg.type === 'threatFlag')       { if (typeof pushThreatFlag === 'function') pushThreatFlag(msg.data); }
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
    CA.banPresets       = data.banPresets       || [];
    CA.quickBanReasons  = data.quickBanReasons  || [];
    CA.quickWarnReasons = data.quickWarnReasons || [];
    CA.onDuty           = data.onDuty           || false;
    CA.dutyAdmins       = data.dutyAdmins       || {};
    CA.lists            = data.lists            || {};
    CA.serverTheme      = data.theme            || {};

    // Server theme first, then this admin's own overrides on top. Settings are
    // per-machine, so an owner's Config.Theme stays the default for everyone
    // who has not changed anything.
    if (typeof caApplyEffectiveTheme === 'function') caApplyEffectiveTheme();
    else applyTheme(data.theme);

    document.getElementById('admin-overlay').classList.remove('hidden');
    document.getElementById('sidebar-server-name').textContent = data.serverName;
    document.getElementById('topbar-player-count').textContent = data.playerCount + ' online';
    document.getElementById('badge-bans').textContent = data.activeBans > 0 ? data.activeBans : '';

    renderAdminBadge(data.admin);
    startClock();
    // loadDashboard populates the header counters, so it runs even when
    // DefaultPanel is something else.
    loadDashboard(data);

    const mine = typeof caLoadSettings === 'function' ? caLoadSettings() : {};
    switchPanel(mine.defaultPanel || data.defaultPanel || 'dashboard');
}

// ── Theme ─────────────────────────────────────────────────────────────────────
// Overwrites the custom properties the stylesheet already reads. The design
// hangs off --accent and a few layout tokens, so recolouring is a property
// write rather than a second stylesheet.
function applyTheme(theme) {
    if (!theme) return;
    const root = document.documentElement;

    // Literal hex only: this lands in an inline style property, where an
    // arbitrary string is a CSS injection. Same reason role colours are
    // whitelisted rather than escaped.
    const hex = String(theme.Accent || '').trim();
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        root.style.setProperty('--accent', hex);
        // Derived, not configured separately — three pickers for one colour is
        // three chances to end up inconsistent.
        root.style.setProperty('--accent-dim',  `rgba(${r},${g},${b},0.14)`);
        root.style.setProperty('--accent-glow', `rgba(${r},${g},${b},0.35)`);
    }

    const wrapper = document.getElementById('admin-wrapper');
    const overlay = document.getElementById('admin-overlay');

    // Width/max-width are passed through only when they look like CSS lengths.
    const len = /^[0-9.]+(px|vw|vh|em|rem|%)$/;
    if (wrapper && len.test(String(theme.Width || ''))) wrapper.style.width = theme.Width;
    if (wrapper && len.test(String(theme.MaxWidth || ''))) wrapper.style.maxWidth = theme.MaxWidth;

    if (theme.Side === 'left' && wrapper && overlay) {
        overlay.style.justifyContent = 'flex-start';
        // The lit edge follows whichever side faces the game.
        wrapper.style.borderLeft  = 'none';
        wrapper.style.borderRight = '1px solid var(--accent)';
        wrapper.style.boxShadow   = '8px 0 60px rgba(0,0,0,0.8)';
        wrapper.style.animation   = 'slideInLeft 0.22s cubic-bezier(0.16,1,0.3,1)';
    }

    if (theme.Scanlines === false) wrapper?.classList.add('no-scanlines');

    const dim = Number(theme.Dim);
    if (overlay && Number.isFinite(dim) && dim >= 0 && dim <= 1) {
        overlay.style.background = `rgba(0,0,0,${dim})`;
    }
}

window.applyTheme = applyTheme;

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
        <button class="btn btn-xs mt-4" id="duty-btn" onclick="toggleAdminDuty()" style="width:100%;margin-top:6px"></button>
    `;
    _updateDutyBtn();
}

function _updateDutyBtn() {
    const btn = document.getElementById('duty-btn');
    if (!btn) return;
    if (CA.onDuty) {
        btn.className = 'btn btn-xs btn-success';
        btn.style.width = '100%';
        btn.style.marginTop = '6px';
        btn.textContent = '● On Duty';
    } else {
        btn.className = 'btn btn-xs btn-ghost';
        btn.style.width = '100%';
        btn.style.marginTop = '6px';
        btn.textContent = '○ Go On Duty';
    }
}

async function toggleAdminDuty() {
    CA.onDuty = !CA.onDuty;
    _updateDutyBtn();
    await caFetch('cipher-admin:server:setAdminDuty', { onDuty: CA.onDuty });
    if (CA.currentPanel === 'dashboard') loadDutyAdmins();
}

window.toggleAdminDuty = toggleAdminDuty;

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
        threats:     'Threat Detection',
        items:       'Item Spawner',
        settings:    'Settings',
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
    if (name === 'threats') {
        if (typeof clearThreatBadge === 'function') clearThreatBadge();
        if (typeof loadThreats === 'function') loadThreats();
    }
    if (name === 'permissions') loadPermissions();
    if (name === 'audit')       loadAudit();
    if (name === 'inventory')   renderInventoryPanel();
    if (name === 'items')       { if (typeof renderItemsPanel    === 'function') renderItemsPanel(); }
    if (name === 'settings')    { if (typeof renderSettingsPanel === 'function') renderSettingsPanel(); }
    if (name === 'character')   renderCharacterPanel();
    if (name === 'reports') {
        _reportUnread = 0;
        const rb = document.getElementById('badge-reports');
        if (rb) rb.textContent = '';
        if (typeof loadReports === 'function') loadReports();
    }
    if (name === 'self')        { if (typeof renderSelfPanel === 'function') renderSelfPanel(); }
    if (name === 'resources')   { if (typeof loadResources === 'function') loadResources(); }
    if (name === 'entities')    { if (typeof loadEntities  === 'function') loadEntities(); }
    if (name === 'stats')       { if (typeof loadStats     === 'function') loadStats(); }
    if (name === 'adminchat' && typeof chatOnPanelOpen === 'function') chatOnPanelOpen();
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
// `title` is escaped here, not at the call sites — a dozen of them pass a raw
// player name (`Ban — ${name}`), and doing it centrally means the next modal
// added is safe without anyone remembering. bodyHtml and footerHtml stay raw
// because they are markup; their contents are escaped by their callers.
function openModal(title, bodyHtml, footerHtml = '') {
    closeModal();
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.id = 'ca-modal-backdrop';
    backdrop.innerHTML = `
        <div class="modal" id="ca-modal">
            <div class="modal-header">
                <span class="modal-title">${esc(title)}</span>
                <button class="modal-close" onclick="closeModal()">${icon('close')}</button>
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
let _annTimer = null;
function showAnnouncement(data) {
    if (_annTimer) { clearInterval(_annTimer); _annTimer = null; }
    const overlay    = document.getElementById('announcement-overlay');
    const cdEl       = document.getElementById('announcement-countdown');
    document.getElementById('announcement-from').textContent = '' + (data.adminName || 'Server');
    document.getElementById('announcement-msg').textContent  = data.message;

    if (data.countdown && data.countdown > 0) {
        let secs = data.countdown;
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
let _dmTimer = null;
function showDm(data) {
    if (!data) return;
    if (_dmTimer) { clearTimeout(_dmTimer); }
    let overlay = document.getElementById('dm-overlay');
    document.getElementById('dm-from').textContent = data.from || data.adminName || 'Admin';
    document.getElementById('dm-msg').textContent  = data.message || '';
    overlay.classList.remove('hidden');
    _dmTimer = setTimeout(function() { overlay.classList.add('hidden'); }, 8000);
}

// ── Screenshot result ─────────────────────────────────────────────────────────
let _liveWatchActive   = false;
let _liveWatchInterval = null;
let _liveWatchSrc      = null;
let _liveWatchName     = '';

function showScreenshot(data) {
    if (!data || !data.url) return;
    if (_liveWatchActive) {
        // Update the live watch modal image without reopening
        const img = document.getElementById('live-watch-img');
        const ts  = document.getElementById('live-watch-ts');
        if (img) { img.src = data.url; }
        if (ts)  { ts.textContent = 'Last updated: ' + new Date().toLocaleTimeString(); }
        return;
    }
    openModal('Screenshot — ' + (data.playerName || ''),
        '<img src="' + escAttr(data.url) + '" style="width:100%;border-radius:var(--radius-sm);display:block" onerror="this.style.display=\'none\'">'
        + '<div class="mono" style="color:var(--text-muted);margin-top:6px;word-break:break-all">' + esc(data.url) + '</div>',
        '<button class="btn btn-ghost" data-ca-action="copyUrl" data-url="' + escAttr(data.url) + '">Copy URL</button>'
        + '<button class="btn btn-ghost" onclick="closeModal()">Close</button>');
}

caAction('copyUrl', (d) => _copyUrl(d.url));

function _copyUrl(url) {
    try {
        const ta = document.createElement('textarea');
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
let _reportUnread = 0;
function onNewReport(data) {
    _reportUnread++;
    const badge = document.getElementById('badge-reports');
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
const _selfFavs = JSON.parse(localStorage.getItem('ca_selfFavs') || '[]');

function selfToggleFav(key, label, icon, e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const idx = _selfFavs.findIndex(function(f) { return f.key === key; });
    if (idx !== -1) { _selfFavs.splice(idx, 1); } else { _selfFavs.push({ key: key, label: label, icon: icon }); }
    localStorage.setItem('ca_selfFavs', JSON.stringify(_selfFavs));
    _renderFavsBar();
}

function _renderFavsBar() {
    const wrap = document.getElementById('sa-favorites-wrap');
    const grid = document.getElementById('sa-favorites-grid');
    if (!wrap || !grid) return;
    if (!_selfFavs.length) { wrap.style.display = 'none'; return; }
    wrap.style.display = '';
    // f.icon is an icon NAME, not markup — it used to be an emoji, so this
    // rendered the literal string "shield" once the set moved to SVG.
    grid.innerHTML = _selfFavs.map(function (f) {
        return '<button class="self-action-card" id="sa-fav-' + escAttr(f.key) + '"'
             + ' data-ca-action="selfFav" data-key="' + escAttr(f.key) + '">'
             + '<div class="sa-icon">' + icon(f.icon) + '</div>'
             + '<div class="sa-label">' + esc(f.label) + '</div>'
             + '<div class="sa-desc pinned">pinned</div>'
             + '</button>';
    }).join('');
}

caAction('selfFav', (d) => selfBtn(d.key));

// Right-click a pinned card to unpin it.
document.addEventListener('contextmenu', function (e) {
    const card = e.target.closest && e.target.closest('#sa-favorites-grid [data-ca-action="selfFav"]');
    if (!card) return;
    e.preventDefault();
    const f = _selfFavs.find((x) => x.key === card.dataset.key);
    if (f) selfToggleFav(f.key, f.label, f.icon, e);
});

document.addEventListener('DOMContentLoaded', function () { _renderFavsBar(); });

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


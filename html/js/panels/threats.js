// Cipher-Admin — Threat Detection Panel
//
// Two tabs: what the server noticed, and who it thinks is the same person.
//
// Every value here is attacker-controlled by definition, so it all goes
// through esc() and every button is delegated.

let _threatTab     = 'flags';
let _threatFilters = { detection: '', severity: '', search: '', unhandled: false };
let _lastThreats   = [];
let _lastEvasion   = [];
let _threatMeta    = { enabled: true, onesync: true, canManage: false, unhandled: 0, last24: 0, summary: [] };

// From the client heartbeat rather than the server's own view — marked so
// nobody bans on an advisory signal alone.
const ADVISORY = { armour: true, silent: true };

const SEV_BADGE = { high: 'badge-red', medium: 'badge-amber', low: 'badge-muted' };

function loadThreats() {
    const panel = document.getElementById('panel-threats');
    if (!panel) return;

    panel.innerHTML = `
        <div class="section-header mb-12">
            <div>
                <div class="section-title">Threat Detection</div>
                <div class="section-sub">Automated detections and ban evasion matches</div>
            </div>
            <div class="flex gap-8">
                <input class="input" id="threat-search" placeholder="Search player..." style="width:170px"
                       oninput="setThreatFilter('search', this.value)">
                <select class="select" style="width:135px" onchange="setThreatFilter('severity', this.value)">
                    <option value="">All severity</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                </select>
                <button class="btn btn-ghost btn-sm" data-ca-action="threatRefresh">↻ Refresh</button>
            </div>
        </div>

        <div id="threat-status"></div>
        <div id="threat-stats" class="stat-grid"></div>

        <div class="threat-tabs mb-12">
            <button class="threat-tab active" data-ca-action="threatTab" data-tab="flags">Detections</button>
            <button class="threat-tab" data-ca-action="threatTab" data-tab="evasion">Ban Evasion</button>
        </div>

        <div class="card">
            <div class="card-header">
                <span class="card-title" id="threat-list-title">Recent detections</span>
                <div class="flex gap-8">
                    <label class="threat-toggle">
                        <input type="checkbox" id="threat-unhandled" onchange="setThreatFilter('unhandled', this.checked)">
                        Unresolved only
                    </label>
                    <button class="btn btn-ghost btn-sm" data-ca-action="threatResolveAll" id="threat-resolve-all" style="display:none">Resolve all</button>
                </div>
            </div>
            <div class="card-body" style="padding:0">
                <div id="threat-list-wrap">
                    <div class="empty-state"><div class="empty-text">Loading detections...</div></div>
                </div>
            </div>
        </div>
    `;

    fetchThreats();
}

// ── Data ──────────────────────────────────────────────────────────────────────

async function fetchThreats() {
    const data = await caFetch('cipher-admin:server:getThreats', {
        detection: _threatFilters.detection,
        severity:  _threatFilters.severity,
        search:    _threatFilters.search,
        unhandled: _threatFilters.unhandled,
    });

    if (!data) {
        const wrap = document.getElementById('threat-list-wrap');
        if (wrap) wrap.innerHTML = '<div class="empty-state"><div class="empty-text">No access to threat data</div></div>';
        return;
    }

    _lastThreats = data.flags || [];
    _threatMeta  = data;

    renderThreatStatus();
    renderThreatStats();

    const resolveAll = document.getElementById('threat-resolve-all');
    if (resolveAll) resolveAll.style.display = data.canManage ? '' : 'none';

    if (_threatTab === 'flags') renderThreatList();
}

async function fetchEvasion() {
    const rows = await caFetch('cipher-admin:server:getEvasionHits', {});
    _lastEvasion = rows || [];
    if (_threatTab === 'evasion') renderEvasionList();
}

// An empty detection list means something very different depending on whether
// the engine is off, OneSync is off, or nothing happened. Say which.
function renderThreatStatus() {
    const el = document.getElementById('threat-status');
    if (!el) return;

    const notes = [];

    if (!_threatMeta.enabled) {
        notes.push(`<div class="threat-note threat-note-red">
            Threat detection is <strong>disabled</strong> in config.lua — nothing is being checked.
        </div>`);
    } else if (!_threatMeta.onesync) {
        notes.push(`<div class="threat-note threat-note-amber">
            OneSync is off, so health, position and speed checks are inactive.
            Event-based detection (explosions, weapon damage, entity spawns) still runs.
        </div>`);
    }

    el.innerHTML = notes.join('');
}

function renderThreatStats() {
    const el = document.getElementById('threat-stats');
    if (!el) return;

    const summary = _threatMeta.summary || [];
    const top = summary.length ? summary[0] : null;
    const high = summary.filter(s => s.severity === 'high').reduce((n, s) => n + Number(s.n || 0), 0);

    el.innerHTML = `
        <div class="stat-card">
            <div class="stat-label">Unresolved</div>
            <div class="stat-value ${_threatMeta.unhandled > 0 ? 'red' : 'green'}">${escNum(_threatMeta.unhandled)}</div>
            <div class="stat-change">awaiting review</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Last 24 Hours</div>
            <div class="stat-value amber">${escNum(_threatMeta.last24)}</div>
            <div class="stat-change">${escNum(high)} high severity</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Most Common</div>
            <div class="stat-value accent" style="font-size:16px;line-height:1.4">${top ? esc(top.label) : '—'}</div>
            <div class="stat-change">${top ? escNum(top.n) + ' in 24h' : 'nothing detected'}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Engine</div>
            <div class="stat-value ${_threatMeta.enabled ? 'green' : 'red'}" style="font-size:16px;line-height:1.4">
                ${_threatMeta.enabled ? 'Active' : 'Disabled'}
            </div>
            <div class="stat-change">${_threatMeta.onesync ? 'full coverage' : 'events only'}</div>
        </div>
    `;
}

// ── Detections list ───────────────────────────────────────────────────────────

function renderThreatList() {
    const wrap = document.getElementById('threat-list-wrap');
    if (!wrap) return;

    const title = document.getElementById('threat-list-title');
    if (title) title.textContent = 'Recent detections';

    if (!_lastThreats.length) {
        wrap.innerHTML = `<div class="empty-state">
            <div class="empty-text">Nothing detected${_threatFilters.unhandled ? ' that is still unresolved' : ''}</div>
        </div>`;
        return;
    }

    wrap.innerHTML = `
        <table class="data-table audit-table" id="threat-table">
            <thead>
                <tr>
                    <th style="width:90px">Severity</th>
                    <th style="width:170px">Detection</th>
                    <th style="width:150px">Player</th>
                    <th>Detail</th>
                    <th style="width:90px">When</th>
                    <th style="width:180px"></th>
                </tr>
            </thead>
            <tbody id="threat-tbody">
                ${_lastThreats.map(threatRow).join('')}
            </tbody>
        </table>
    `;
}

function threatRow(f) {
    const sev = SEV_BADGE[f.severity] || 'badge-muted';
    const online = f.onlineSrc ? Number(f.onlineSrc) : null;

    return `
        <tr class="${f.handled ? 'threat-handled' : ''}">
            <td><span class="badge ${sev}">${esc(f.severity || 'medium')}</span></td>
            <td>
                ${esc(f.label || f.detection)}
                ${ADVISORY[f.detection] ? '<span class="threat-advisory" title="Reported by the client — treat as advisory">advisory</span>' : ''}
            </td>
            <td class="td-name">${esc(f.player_name || 'Unknown')}</td>
            <td class="text-muted">${esc(f.detail || '')}</td>
            <td class="text-muted text-sm">${esc(timeAgo(f.created_at))}</td>
            <td class="threat-actions">
                ${online && hasPermission('spectate')
                    ? `<button class="btn btn-ghost btn-xs" data-ca-action="threatSpectate" data-src="${escNum(online)}">Spectate</button>` : ''}
                ${online && hasPermission('screenshot')
                    ? `<button class="btn btn-ghost btn-xs" data-ca-action="threatShot" data-src="${escNum(online)}" data-id="${escNum(f.id)}">Shot</button>` : ''}
                ${hasPermission('viewlinked')
                    ? `<button class="btn btn-ghost btn-xs" data-ca-action="threatLinked" data-cid="${escAttr(f.citizenid || '')}" data-license="${escAttr(f.license || '')}" data-name="${escAttr(f.player_name || '')}">Links</button>` : ''}
                ${online && hasPermission('permban')
                    ? `<button class="btn btn-danger btn-xs" data-ca-action="threatBan" data-src="${escNum(online)}" data-cid="${escAttr(f.citizenid || '')}" data-name="${escAttr(f.player_name || '')}">Ban</button>` : ''}
                ${!f.handled && _threatMeta.canManage
                    ? `<button class="btn btn-success btn-xs" data-ca-action="threatResolve" data-id="${escNum(f.id)}">${icon('check')}</button>` : ''}
            </td>
        </tr>
    `;
}

// ── Ban evasion list ──────────────────────────────────────────────────────────

function renderEvasionList() {
    const wrap = document.getElementById('threat-list-wrap');
    if (!wrap) return;

    const title = document.getElementById('threat-list-title');
    if (title) title.textContent = 'Ban evasion matches';

    if (!_lastEvasion.length) {
        wrap.innerHTML = `<div class="empty-state">
            <div class="empty-text">No evasion matches recorded</div>
        </div>`;
        return;
    }

    wrap.innerHTML = `
        <table class="data-table audit-table">
            <thead>
                <tr>
                    <th style="width:180px">Connecting as</th>
                    <th>Match</th>
                    <th style="width:90px">When</th>
                    <th style="width:120px"></th>
                </tr>
            </thead>
            <tbody>
                ${_lastEvasion.map(e => `
                    <tr class="${e.handled ? 'threat-handled' : ''}">
                        <td class="td-name">${esc(e.player_name || 'Unknown')}</td>
                        <td class="text-muted">${esc(e.detail || '')}</td>
                        <td class="text-muted text-sm">${esc(timeAgo(e.created_at))}</td>
                        <td class="threat-actions">
                            <button class="btn btn-ghost btn-xs" data-ca-action="threatLinked"
                                    data-cid="" data-license="${escAttr(e.license || '')}"
                                    data-name="${escAttr(e.player_name || '')}">Links</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// ── Linked accounts ───────────────────────────────────────────────────────────

async function openLinkedAccounts(citizenid, license, name) {
    openModal(`Linked accounts — ${name || 'player'}`,
        '<div class="empty-state"><div class="empty-text">Looking up identifiers...</div></div>',
        '<button class="btn btn-ghost" onclick="closeModal()">Close</button>');

    const data = await caFetch('cipher-admin:server:getLinkedAccounts', { citizenid, license });

    const body = document.querySelector('#ca-modal .modal-body');
    if (!body) return;

    if (!data || !data.license) {
        body.innerHTML = `<div class="empty-state"><div class="empty-text">
            No identifiers on record for this player.
        </div></div>`;
        return;
    }

    const idRows = (data.identifiers || []).map(i => `
        <div class="profile-row">
            <span class="profile-row-label">${esc(i.id_type)}</span>
            <span class="profile-row-value mono">${esc(i.id_value)}</span>
        </div>
    `).join('') || '<div class="text-muted text-sm">None recorded</div>';

    const linked = (data.linked || []);

    const linkRows = linked.length ? linked.map(l => `
        <div class="linked-card ${l.banned ? 'linked-banned' : ''}">
            <div class="linked-head">
                <span class="linked-name">${esc(l.player_name || 'Unknown')}</span>
                ${l.banned
                    ? `<span class="badge badge-red">Banned — #${escNum(l.ban_id)}</span>`
                    : '<span class="badge badge-muted">Clean</span>'}
            </div>
            <div class="linked-meta">Shared: ${esc(l.shared_types || '?')} · last seen ${esc(timeAgo(l.last_seen))}</div>
            ${l.ban_reason ? `<div class="linked-meta">Reason: ${esc(l.ban_reason)}</div>` : ''}
            ${(l.characters || []).length
                ? `<div class="linked-meta">Characters: ${l.characters.map(c =>
                      esc(`${c.firstname || ''} ${c.lastname || ''}`.trim() || c.citizenid)).join(', ')}</div>`
                : ''}
        </div>
    `).join('') : `<div class="text-muted text-sm">
        No other account has ever presented one of these identifiers.
    </div>`;

    body.innerHTML = `
        <div class="threat-note threat-note-muted">
            Accounts are linked when they have presented the same identifier at some point.
            A shared IP or machine is not proof of anything on its own — households and
            LAN cafes share both.
        </div>
        <div class="modal-section-label">Linked accounts (${linked.length})</div>
        ${linkRows}
        <div class="modal-section-label" style="margin-top:14px">Identifiers on record</div>
        ${idRows}
    `;
}

// ── Filters, tabs, actions ────────────────────────────────────────────────────

function setThreatFilter(key, value) {
    _threatFilters[key] = value;
    if (_threatTab === 'flags') fetchThreats();
}

function setThreatTab(tab) {
    _threatTab = tab;
    document.querySelectorAll('.threat-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tab);
    });
    if (tab === 'evasion') { fetchEvasion(); } else { fetchThreats(); }
}

async function resolveThreat(payload) {
    await caFetch('cipher-admin:server:resolveThreat', payload);
    fetchThreats();
}

caAction('threatRefresh',    () => { if (_threatTab === 'evasion') fetchEvasion(); else fetchThreats(); });
caAction('threatTab',        (d) => setThreatTab(d.tab));
caAction('threatResolve',    (d) => resolveThreat({ id: Number(d.id) }));
caAction('threatResolveAll', () => resolveThreat({ all: true }));
caAction('threatLinked',     (d) => openLinkedAccounts(d.cid || null, d.license || null, d.name));
caAction('threatSpectate',   (d) => playerAction('spectate', Number(d.src)));
caAction('threatShot',       (d) => playerAction('screenshot', Number(d.src)));
caAction('threatBan',        (d) => openBanModal(Number(d.src), d.cid, d.name));

// The server pushes only the first hit of each type per player, so this stays
// a trickle even with someone actively cheating.

let _threatUnread = 0;

function pushThreatFlag(payload) {
    if (!payload) return;

    if (CA.currentPanel === 'threats' && _threatTab === 'flags') {
        _lastThreats.unshift(payload);
        if (_lastThreats.length > 250) _lastThreats.pop();

        const tbody = document.getElementById('threat-tbody');
        if (tbody) {
            tbody.insertAdjacentHTML('afterbegin', threatRow(payload));
            const row = tbody.firstElementChild;
            if (row) {
                row.classList.add('threat-new');
                setTimeout(() => row.classList.remove('threat-new'), 2500);
            }
        } else {
            renderThreatList();
        }
        return;
    }

    _threatUnread++;
    const badge = document.getElementById('badge-threats');
    if (badge) badge.textContent = _threatUnread;
}

function clearThreatBadge() {
    _threatUnread = 0;
    const badge = document.getElementById('badge-threats');
    if (badge) badge.textContent = '';
}

window.loadThreats        = loadThreats;
window.fetchThreats       = fetchThreats;
window.setThreatFilter    = setThreatFilter;
window.setThreatTab       = setThreatTab;
window.openLinkedAccounts = openLinkedAccounts;
window.pushThreatFlag     = pushThreatFlag;
window.clearThreatBadge   = clearThreatBadge;

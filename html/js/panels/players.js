// Cipher-Admin — Player List Panel

let _players       = [];
let _selectedPlayer = null;
let _playerFilter  = '';
let _playerSort    = 'name';

async function loadPlayers() {
    const panel = document.getElementById('panel-players');
    panel.innerHTML = `
        <div class="player-list-controls">
            <div class="search-wrap" style="flex:1">
                <span class="search-icon">⌕</span>
                <input class="input search-input" id="player-search" placeholder="Search by name, job, citizenid..." oninput="filterPlayers(this.value)">
            </div>
            <select class="select" style="width:140px" onchange="sortPlayers(this.value)">
                <option value="name">Sort: Name</option>
                <option value="ping">Sort: Ping</option>
                <option value="job">Sort: Job</option>
                <option value="src">Sort: Server ID</option>
            </select>
            <button class="btn btn-ghost btn-sm" onclick="loadPlayers()">↻ Refresh</button>
            ${hasPermission('summonall') ? `<button class="btn btn-amber btn-sm" onclick="confirmSummonAll()">Summon All</button>` : ''}
            ${hasPermission('massactions') ? `
                <button class="btn btn-ghost btn-sm" data-ca-action="massAction" data-act="freezeall" data-state="true">Freeze All</button>
                <button class="btn btn-ghost btn-sm" data-ca-action="massAction" data-act="freezeall" data-state="false">Unfreeze All</button>
                <button class="btn btn-ghost btn-sm" data-ca-action="massAction" data-act="revivenearby">Revive Nearby</button>` : ''}
        </div>
        <div class="card">
            <div class="card-body" style="padding:0">
                <div id="players-table-wrap">
                    <div class="empty-state"><div class="empty-icon">◉</div><div class="empty-text">Loading players...</div></div>
                </div>
            </div>
        </div>
    `;

    const data = await caFetch('cipher-admin:server:getPlayers', {});
    _players = data || [];
    document.getElementById('badge-players').textContent = _players.length;
    renderPlayersTable();
}

function filterPlayers(q) {
    _playerFilter = q.toLowerCase();
    renderPlayersTable();
}

function sortPlayers(by) {
    _playerSort = by;
    renderPlayersTable();
}

function renderPlayersTable() {
    const wrap = document.getElementById('players-table-wrap');
    if (!wrap) return;

    let list = [..._players];
    if (_playerFilter) {
        list = list.filter(p =>
            p.name.toLowerCase().includes(_playerFilter) ||
            (p.job || '').toLowerCase().includes(_playerFilter) ||
            (p.citizenid || '').toLowerCase().includes(_playerFilter)
        );
    }
    list.sort((a, b) => {
        if (_playerSort === 'ping') return a.ping - b.ping;
        if (_playerSort === 'job')  return (a.jobLabel||'').localeCompare(b.jobLabel||'');
        if (_playerSort === 'src')  return a.src - b.src;
        return a.name.localeCompare(b.name);
    });

    if (!list.length) {
        wrap.innerHTML = '<div class="empty-state"><div class="empty-icon">◉</div><div class="empty-text">No players found</div></div>';
        return;
    }

    wrap.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th style="width:32px">#</th>
                    <th>Name</th>
                    <th>Citizenid</th>
                    <th>Job</th>
                    <th>Online</th>
                    <th>Ping</th>
                    <th>Warns</th>
                </tr>
            </thead>
            <tbody>
                ${list.map(p => {
                    // Notes are staff-written free text and names are
                    // player-set; both land in attributes here, so both go
                    // through escAttr. adminColor is interpolated into a
                    // style, so it's whitelisted to a hex literal rather than
                    // escaped — escaping wouldn't stop a value like
                    // "red;position:fixed;top:0" from restyling the page.
                    const notesTip = (p.notes && p.notes.length)
                        ? ` title="${escAttr(p.notes.slice(0,3).map(n => n.note).join(' | '))}"`
                        : '';
                    const noteDot = (p.notes && p.notes.length)
                        ? `<span class="note-dot" title="${escAttr(p.notes[0].note)}">${icon('note')}</span>` : '';
                    const adminColor = /^#[0-9a-fA-F]{3,8}$/.test(p.adminColor || '') ? p.adminColor : 'var(--accent)';
                    return `<tr data-ca-action="selectPlayer" data-src="${escNum(p.src)}" class="${_selectedPlayer && _selectedPlayer.src === p.src ? 'selected-row' : ''}">
                        <td class="text-muted">${escNum(p.src)}</td>
                        <td class="td-name">
                            <div class="flex items-center gap-4"${notesTip}>
                                <span class="status-dot online"></span>
                                ${esc(p.name)}
                                ${noteDot}
                                ${p.isAdmin ? `<span class="badge badge-accent" style="background:${adminColor}22;color:${adminColor}">${esc(p.adminRole)}</span>` : ''}
                            </div>
                        </td>
                        <td class="text-muted text-sm">${esc(p.citizenid)}</td>
                        <td>
                            <span class="badge badge-muted">${esc(p.jobLabel || p.job || 'N/A')}</span>
                            ${p.onduty ? '<span class="badge badge-green" style="margin-left:4px">on duty</span>' : ''}
                        </td>
                        <td class="text-muted text-sm">${esc(_fmtOnlineTime(p.onlineSeconds))}</td>
                        <td class="${pingClass(p.ping)}">${escNum(p.ping)}ms</td>
                        <td>${p.warnings > 0 ? `<span class="badge badge-amber">${escNum(p.warnings)}w</span>` : '<span class="text-muted">—</span>'}</td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>
    `;
}

async function selectPlayer(src) {
    const p = _players.find(x => x.src === src);
    if (!p) return;
    _selectedPlayer = p;

    // Fetch full profile
    const profile = await caFetch('cipher-admin:server:getCharacter', p.citizenid);
    openPlayerProfile({ ...p, ...profile, onlineSrc: src });
}

function _fmtOnlineTime(secs) {
    if (!secs) return '—';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (h > 0) return h + 'h ' + m + 'm';
    return m + 'm';
}

// ── Player Profile ────────────────────────────────────────────────────────────
// `kind` picks the dispatcher: 'do' runs playerAction directly, 'open' routes
// to whichever modal that action needs (see the caAction registrations at the
// bottom of this file).
function _profileButtons(p, src, defs) {
    return defs.filter((d) => d.show).map((d) => `
        <button class="btn ${d.cls || 'btn-ghost'} btn-sm"
            data-ca-action="playerBtn"
            data-kind="${escAttr(d.kind)}"
            data-act="${escAttr(d.act)}"
            data-src="${escNum(src)}"
            data-cid="${escAttr(p.citizenid)}"
            data-name="${escAttr(p.name || '')}"
            ${d.state !== undefined ? `data-state="${escAttr(d.state)}"` : ''}>
            ${icon(d.ico)}<span>${esc(d.label)}</span>
        </button>`).join('');
}

function renderPlayerProfile(p) {
    const ci  = p.charinfo || {};
    const job = p.job      || {};
    const mo  = p.money    || {};

    const canKick        = hasPermission('kick');
    const canWarn        = hasPermission('warn');
    const canTempBan     = hasPermission('tempban');
    const canFreeze      = hasPermission('freeze');
    const canSpectate    = hasPermission('spectate');
    const canBring       = hasPermission('bring');
    const canGoto        = hasPermission('teleport');
    const canRevive      = hasPermission('revive');
    const canHeal        = hasPermission('heal');
    const canNoclip      = hasPermission('noclip');
    const canInvisible   = hasPermission('invisible');
    const canSetJob      = hasPermission('setjob');
    const canSetCash     = hasPermission('setcash');
    const canSetBank     = hasPermission('setbank');
    const canViewInv     = hasPermission('viewinv');
    const canGiveItem    = hasPermission('giveitem');
    const canClearInv    = hasPermission('clearinv');
    const canSpawnVeh    = hasPermission('spawnveh');
    const canDelVeh      = hasPermission('deleteveh');
    const canAddNote     = hasPermission('addnote');
    const canViewNotes   = hasPermission('viewnotes');
    const canSlap        = hasPermission('slap');
    const canDm          = hasPermission('dm');
    const canResetPos    = hasPermission('resetpos');
    const canScreenshot  = hasPermission('screenshot');
    const canGiveWeapon  = hasPermission('giveweapon');
    const canSummonAll   = hasPermission('summonall');
    const canClearWanted = hasPermission('clearwanted');
    const canKill        = hasPermission('killplayer');
    const canSetHealth   = hasPermission('sethealth');
    const canEject       = hasPermission('eject');
    const canMute        = hasPermission('mute');
    const canViewIds     = hasPermission('viewids');
    const canSendTo      = hasPermission('teleport');

    const src = p.onlineSrc || p.src;

    // Whitelisted to a hex literal rather than escaped: this lands inside a
    // style attribute, where escaping alone wouldn't stop a value like
    // "red;position:fixed;top:0" from restyling the whole panel.
    const profileColor = /^#[0-9a-fA-F]{3,8}$/.test(p.adminColor || '') ? p.adminColor : 'var(--accent)';

    // Every button below carries its target as data-* attributes and is
    // dispatched by the delegated listener in core.js. These used to be inline
    // onclick handlers with the player's name interpolated into a quoted JS
    // string, which meant a name containing an apostrophe (O'Brien) broke
    // every button on the profile, and a crafted name ran as script in the
    // admin's own session.
    document.getElementById('player-profile-inner').innerHTML = `
        <div class="profile-header">
            <div class="profile-avatar">${icon('players')}</div>
            <div>
                <div class="profile-name">${esc(p.name || (ci.firstname + ' ' + ci.lastname))}</div>
                <div class="profile-cid">${esc(p.citizenid)} · ID ${escNum(src)}</div>
                ${p.isAdmin ? `<span class="badge badge-accent" style="margin-top:4px;background:${profileColor}22;color:${profileColor}">${esc(p.adminRole)}</span>` : ''}
            </div>
        </div>

        <!-- Actions -->
        <div class="profile-section">
            <div class="profile-section-title">Actions</div>
            <div class="profile-actions">
                ${_profileButtons(p, src, [
                    { show: canGoto,       kind: 'do',   act: 'goto',          ico: 'goto',      label: 'Goto' },
                    { show: canBring,      kind: 'do',   act: 'bring',         ico: 'bring',     label: 'Bring' },
                    { show: canSpectate,   kind: 'do',   act: 'spectate',      ico: 'spectate',  label: 'Spectate' },
                    { show: canFreeze,     kind: 'do',   act: 'freeze',        ico: 'freeze',    label: 'Freeze',   state: 'true' },
                    { show: canFreeze,     kind: 'do',   act: 'freeze',        ico: 'freeze',    label: 'Unfreeze', state: 'false' },
                    { show: canRevive,     kind: 'do',   act: 'revive',        ico: 'revive',    label: 'Revive' },
                    { show: canHeal,       kind: 'do',   act: 'heal',          ico: 'heal',      label: 'Heal' },
                    { show: canSpawnVeh,   kind: 'open', act: 'spawnveh',      ico: 'spawner',   label: 'Spawn Veh' },
                    { show: canDelVeh,     kind: 'do',   act: 'deletevehicle', ico: 'trash',     label: 'Del Veh' },
                    { show: canViewInv,    kind: 'open', act: 'inventory',     ico: 'inventory', label: 'Inventory' },
                    { show: canScreenshot, kind: 'do',   act: 'screenshot',    ico: 'camera',    label: 'Screenshot' },
                    { show: canScreenshot, kind: 'open', act: 'watch',         ico: 'spectate',  label: 'Watch Live' },
                    { show: canSlap,       kind: 'do',   act: 'slap',          ico: 'warn',      label: 'Slap' },
                    { show: canResetPos,   kind: 'do',   act: 'resetpos',      ico: 'goto',      label: 'Reset Pos' },
                    { show: canDm,         kind: 'open', act: 'dm',            ico: 'adminchat', label: 'DM' },
                    { show: canGiveWeapon, kind: 'open', act: 'giveweapon',    ico: 'shield',    label: 'Give Weapon' },
                    { show: canClearWanted, kind: 'do',   act: 'clearwanted',  ico: 'check',     label: 'Clear Wanted' },
                    { show: canSetHealth,  kind: 'open', act: 'sethealth',     ico: 'heal',      label: 'Set HP' },
                    { show: canEject,      kind: 'open', act: 'eject',         ico: 'kick',      label: 'Eject' },
                    { show: canSendTo,     kind: 'open', act: 'sendto',        ico: 'goto',      label: 'Send To' },
                    { show: canViewIds,    kind: 'open', act: 'identifiers',   ico: 'search',    label: 'Identifiers' },
                ])}
            </div>
        </div>

        <!-- Moderation -->
        <div class="profile-section">
            <div class="profile-section-title">Moderation</div>
            <div class="profile-actions">
                ${_profileButtons(p, src, [
                    { show: canWarn,    kind: 'open', act: 'warn',  ico: 'warn',  label: 'Warn', cls: 'btn-amber' },
                    { show: canMute,    kind: 'open', act: 'mute',  ico: 'adminchat', label: 'Mute', cls: 'btn-amber' },
                    { show: canKick,    kind: 'open', act: 'kick',  ico: 'kick',  label: 'Kick' },
                    { show: canKill,    kind: 'open', act: 'kill',  ico: 'warn',  label: 'Kill', cls: 'btn-danger' },
                    { show: canTempBan, kind: 'open', act: 'ban',   ico: 'bans',  label: 'Ban',  cls: 'btn-danger' },
                ])}
            </div>
        </div>

        <!-- Character info -->
        <div class="profile-section">
            <div class="profile-section-title">Character</div>
            <div class="profile-row"><span class="profile-row-label">DOB</span><span class="profile-row-value">${ci.birthdate || 'N/A'}</span></div>
            <div class="profile-row"><span class="profile-row-label">Phone</span><span class="profile-row-value">${ci.phone || 'N/A'}</span></div>
            <div class="profile-row"><span class="profile-row-label">Gender</span><span class="profile-row-value">${ci.gender === 0 ? 'Male' : 'Female'}</span></div>
            <div class="profile-row"><span class="profile-row-label">Job</span><span class="profile-row-value">${job.label || job.name || 'N/A'}</span></div>
            <div class="profile-row"><span class="profile-row-label">Grade</span><span class="profile-row-value">${job.grade && job.grade.name || 'N/A'}</span></div>
        </div>

        <!-- Money -->
        <div class="profile-section">
            <div class="profile-section-title">Economy</div>
            <div class="profile-row">
                <span class="profile-row-label">Cash</span>
                <span class="profile-row-value">${formatMoney(mo.cash)}</span>
            </div>
            <div class="profile-row">
                <span class="profile-row-label">Bank</span>
                <span class="profile-row-value">${formatMoney(mo.bank)}</span>
            </div>
            ${canSetCash ? `<button class="btn btn-ghost btn-sm w-full mt-8" data-ca-action="openSetMoney"
                data-src="${escNum(src)}" data-cid="${escAttr(p.citizenid)}" data-name="${escAttr(p.name || '')}"
                data-cash="${escNum(mo.cash || 0)}" data-bank="${escNum(mo.bank || 0)}">Edit Money</button>` : ''}
            ${canSetJob  ? `<button class="btn btn-ghost btn-sm w-full mt-8" data-ca-action="openSetJob"
                data-src="${escNum(src)}" data-cid="${escAttr(p.citizenid)}" data-name="${escAttr(p.name || '')}">Change Job</button>` : ''}
        </div>

        <!-- Warnings -->
        <div class="profile-section">
            <div class="profile-section-title">Warnings (${(p.warnings || []).length})</div>
            ${(p.warnings && p.warnings.length) ? p.warnings.map(w => `
                <div class="activity-item" style="align-items:flex-start">
                    <div class="activity-icon">${icon('warn')}</div>
                    <div class="activity-body" style="flex:1">
                        <div class="activity-action">${esc(w.reason)}</div>
                        <div class="activity-detail">by ${esc(w.admin_name)} · ${esc(formatDate(w.created_at))}</div>
                    </div>
                    ${canWarn ? `<button class="btn btn-ghost btn-xs" style="color:var(--red);flex-shrink:0" data-ca-action="deleteWarning"
                        data-id="${escNum(w.id)}" data-cid="${escAttr(p.citizenid)}" data-src="${escNum(src)}">${icon('close')}</button>` : ''}
                </div>
            `).join('') : '<div class="text-muted text-sm">No warnings</div>'}
        </div>

        <!-- Notes -->
        ${canViewNotes ? `
        <div class="profile-section">
            <div class="profile-section-title">Admin Notes</div>
            ${(p.notes && p.notes.length) ? p.notes.map(n => `
                <div class="activity-item">
                    <div class="activity-icon">${icon('note')}</div>
                    <div class="activity-body">
                        <div class="activity-action">${esc(n.note)}</div>
                        <div class="activity-detail">by ${esc(n.admin_name)} · ${esc(formatDate(n.created_at))}</div>
                    </div>
                </div>
            `).join('') : '<div class="text-muted text-sm">No notes</div>'}
            ${canAddNote ? `
            <div class="flex gap-4 mt-8">
                <input class="input" id="note-input-${escAttr(p.citizenid)}" placeholder="Add a note...">
                <button class="btn btn-primary btn-sm" data-ca-action="addNote"
                    data-cid="${escAttr(p.citizenid)}" data-name="${escAttr(p.name || '')}">Add</button>
            </div>` : ''}
        </div>` : ''}

        <button class="btn btn-ghost btn-sm w-full mt-8" onclick="closePlayerProfile()">${icon('close')} Close</button>
    `;
}

// ── Player action relay ───────────────────────────────────────────────────────
function playerAction(action, targetSrc, targetCid, targetName, extra = {}) {
    fetch('https://cipher-admin/playerAction', {
        method: 'POST',
        body: JSON.stringify({ action, targetSrc, targetCid, targetName, ...extra }),
    });
}

// ── Modals ────────────────────────────────────────────────────────────────────
function openKickModal(src, cid, name) {
    openModal(`Kick — ${name}`, `
        <div class="form-group">
            <label>Reason</label>
            <input class="input" id="kick-reason" placeholder="Enter reason...">
        </div>
    `, `
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-danger" data-ca-action="doKick" data-src="${escNum(src)}" data-cid="${escAttr(cid)}" data-name="${escAttr(name || '')}">Kick</button>
    `);
}

function doKick(src, cid, name) {
    const reason = document.getElementById('kick-reason').value.trim() || 'Kicked by admin.';
    playerAction('kick', src, cid, name, { reason });
    closeModal();
    loadPlayers();
}

async function deleteWarning(warnId, cid, src) {
    await caFetch('cipher-admin:server:deleteWarning', { warnId, citizenid: cid });
    selectPlayer(src);
}

function openWarnModal(src, cid, name) {
    const reasons = CA.quickWarnReasons && CA.quickWarnReasons.length
        ? CA.quickWarnReasons
        : ['RDM','VDM','Metagaming','Powergaming','NITRP','Fail RP','Exploiting'];
    openModal(`Warn — ${name}`, `
        <div class="form-group">
            <label>Reason</label>
            <input class="input" id="warn-reason" placeholder="Enter reason...">
        </div>
        <div class="form-group">
            <label>Quick reasons</label>
            <div class="flex gap-4" style="flex-wrap:wrap">
                ${reasons.map(r =>
                    `<button class="btn btn-ghost btn-xs" data-ca-action="setWarnReason" data-reason="${escAttr(r)}">${esc(r)}</button>`
                ).join('')}
            </div>
        </div>
    `, `
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-amber" data-ca-action="doWarn" data-src="${escNum(src)}" data-cid="${escAttr(cid)}" data-name="${escAttr(name || '')}">Warn</button>
    `);
}

function setWarnReason(r) { const el = document.getElementById('warn-reason'); if (el) el.value = r; }

async function doWarn(src, cid, name) {
    const reason = document.getElementById('warn-reason').value.trim();
    if (!reason) return;
    await caFetch('cipher-admin:server:warnPlayer', {
        targetSrc: src, citizenid: cid, playerName: name, reason
    });
    closeModal();
    selectPlayer(src);
}

function openBanModal(src, cid, name) {
    const reasons = CA.quickBanReasons && CA.quickBanReasons.length
        ? CA.quickBanReasons
        : ['Cheating / Hacking','Repeated RDM','Racial Slurs','Harassment','Ban Evasion','DDoS Threats'];
    openModal(`Ban — ${name}`, `
        <div class="form-group">
            <label>Reason</label>
            <input class="input" id="ban-reason" placeholder="Enter reason...">
        </div>
        <div class="form-group">
            <label>Duration</label>
            <select class="select" id="ban-duration">
                ${(CA.banPresets || []).map(p => `<option value="${p.seconds}">${p.label}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>Quick reasons</label>
            <div class="flex gap-4" style="flex-wrap:wrap">
                ${reasons.map(r =>
                    `<button class="btn btn-ghost btn-xs" data-ca-action="setBanReason" data-reason="${escAttr(r)}">${esc(r)}</button>`
                ).join('')}
            </div>
        </div>
    `, `
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-danger" data-ca-action="doBan" data-src="${escNum(src)}" data-cid="${escAttr(cid)}" data-name="${escAttr(name || '')}">Ban</button>
    `);
}

function setBanReason(r) { const el = document.getElementById('ban-reason'); if (el) el.value = r; }

async function doBan(src, cid, name) {
    const reason   = document.getElementById('ban-reason').value.trim();
    const duration = parseInt(document.getElementById('ban-duration').value);
    if (!reason) return;
    await caFetch('cipher-admin:server:banPlayer', {
        targetSrc: src, targetCid: cid, targetName: name,
        reason, duration, permanent: duration === 0,
    });
    closeModal();
    loadPlayers();
}

function openSetMoneyModal(src, cid, name, cash, bank) {
    openModal(`Edit Money — ${name}`, `
        <div class="form-group">
            <label>Cash</label>
            <input class="input" id="set-cash" type="number" value="${cash}">
        </div>
        <div class="form-group">
            <label>Bank</label>
            <input class="input" id="set-bank" type="number" value="${bank}">
        </div>
    `, `
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" data-ca-action="doSetMoney" data-src="${escNum(src)}" data-cid="${escAttr(cid)}" data-name="${escAttr(name || '')}">Save</button>
    `);
}

async function doSetMoney(src, cid, name) {
    const cash = parseInt(document.getElementById('set-cash').value) || 0;
    const bank = parseInt(document.getElementById('set-bank').value) || 0;
    await fetch('https://cipher-admin/playerAction', {
        method: 'POST', body: JSON.stringify({ action: 'setcash', targetSrc: src, targetCid: cid, targetName: name, amount: cash })
    });
    await fetch('https://cipher-admin/playerAction', {
        method: 'POST', body: JSON.stringify({ action: 'setbank', targetSrc: src, targetCid: cid, targetName: name, amount: bank })
    });
    closeModal();
}

function openSetJobModal(src, cid, name) {
    openModal(`Set Job — ${name}`, `
        <div class="form-group">
            <label>Job Name</label>
            <input class="input" id="set-job" placeholder="e.g. police">
        </div>
        <div class="form-group">
            <label>Grade</label>
            <input class="input" id="set-grade" type="number" value="0" min="0">
        </div>
    `, `
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" data-ca-action="doSetJob" data-src="${escNum(src)}" data-cid="${escAttr(cid)}" data-name="${escAttr(name || '')}">Save</button>
    `);
}

async function doSetJob(src, cid, name) {
    const job   = document.getElementById('set-job').value.trim();
    const grade = parseInt(document.getElementById('set-grade').value) || 0;
    if (!job) return;
    await fetch('https://cipher-admin/playerAction', {
        method: 'POST', body: JSON.stringify({ action: 'setjob', targetSrc: src, targetCid: cid, targetName: name, job, grade })
    });
    closeModal();
}

async function addNote(cid, name) {
    const input = document.getElementById('note-input-' + cid);
    if (!input || !input.value.trim()) return;
    await caFetch('cipher-admin:server:addNote', { citizenid: cid, playerName: name, note: input.value.trim() });
    input.value = '';
}

const _weapons = [
    'WEAPON_PISTOL','WEAPON_PISTOL_MK2','WEAPON_COMBATPISTOL','WEAPON_APPISTOL','WEAPON_STUNGUN',
    'WEAPON_MICROSMG','WEAPON_SMG','WEAPON_SMG_MK2','WEAPON_ASSAULTSMG','WEAPON_COMBATPDW',
    'WEAPON_ASSAULTRIFLE','WEAPON_ASSAULTRIFLE_MK2','WEAPON_CARBINERIFLE','WEAPON_CARBINERIFLE_MK2',
    'WEAPON_ADVANCEDRIFLE','WEAPON_SPECIALCARBINE','WEAPON_BULLPUPRIFLE','WEAPON_COMPACTRIFLE',
    'WEAPON_MG','WEAPON_COMBATMG','WEAPON_COMBATMG_MK2','WEAPON_HEAVYSNIPER','WEAPON_HEAVYSNIPER_MK2',
    'WEAPON_MARKSMANRIFLE','WEAPON_SNIPERRIFLE','WEAPON_PUMPSHOTGUN','WEAPON_SAWNOFFSHOTGUN',
    'WEAPON_BULLPUPSHOTGUN','WEAPON_ASSAULTSHOTGUN','WEAPON_HEAVYSHOTGUN','WEAPON_DBSHOTGUN',
    'WEAPON_RPG','WEAPON_GRENADELAUNCHER','WEAPON_MINIGUN','WEAPON_GRENADE','WEAPON_SMOKEGRENADE',
    'WEAPON_KNIFE','WEAPON_BAT','WEAPON_HAMMER','WEAPON_CROWBAR','WEAPON_NIGHTSTICK',
];

function openGiveWeaponModal(src, cid, name) {
    const opts = _weapons.map(function(w) { return '<option value="' + w + '">' + w.replace('WEAPON_','') + '</option>'; }).join('');
    openModal('Give Weapon — ' + name,
        '<div class="form-group"><label>Weapon</label><select class="select" id="gw-weapon">' + opts + '</select></div>'
        + '<div class="form-group"><label>Ammo</label><input class="input" id="gw-ammo" type="number" value="100" min="1" max="9999"></div>',
        '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'
        + '<button class="btn btn-primary" data-ca-action="doGiveWeapon"'
        + ' data-src="' + escNum(src) + '" data-cid="' + escAttr(cid) + '"'
        + ' data-name="' + escAttr(name || '') + '">Give</button>');
}

caAction('doGiveWeapon', (d) => doGiveWeapon(Number(d.src), d.cid, d.name));

function doGiveWeapon(src, cid, name) {
    const weapon = (document.getElementById('gw-weapon') || {}).value || 'WEAPON_PISTOL';
    const ammo   = parseInt((document.getElementById('gw-ammo') || {}).value) || 100;
    closeModal();
    playerAction('giveweapon', src, cid, name, { weapon: weapon, ammo: ammo });
}

function openDmModal(src, cid, name) {
    openModal('DM — ' + name,
        '<div class="form-group"><label>Message</label><input class="input" id="dm-inp" placeholder="Private message to player..."></div>',
        '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'
        + '<button class="btn btn-primary" data-ca-action="doDm"'
        + ' data-src="' + escNum(src) + '" data-cid="' + escAttr(cid) + '"'
        + ' data-name="' + escAttr(name || '') + '">Send</button>');
}

caAction('doDm', (d) => doDm(Number(d.src), d.cid, d.name));

function doDm(src, cid, name) {
    const msg = (document.getElementById('dm-inp') || {}).value || '';
    if (!msg.trim()) return;
    closeModal();
    playerAction('dm', src, cid, name, { message: msg.trim() });
}

function confirmSummonAll() {
    openModal('Summon All Players',
        '<p style="color:var(--text-secondary)">Teleport <strong style="color:var(--amber)">all online players</strong> to your current position? This affects everyone on the server.</p>',
        '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'
        + '<button class="btn btn-amber" onclick="doSummonAll()">Summon All</button>');
}

async function doSummonAll() {
    closeModal();
    const ok = await caFetch('cipher-admin:server:summonAll', {});
    if (ok) loadPlayers();
}

function openPlayerInventory(cid, name, src) {
    openInventoryFor(cid, name, src);
    switchPanel('inventory');
}

function openSpawnOnPlayer(src, name) {
    switchPanel('spawner');
    window._spawnTargetSrc  = src;
    window._spawnTargetName = name;
}

// Single dispatch point for every profile button. Values arrive as strings
// off the dataset, so anything numeric is converted here rather than at each
// call site.
caAction('selectPlayer', (d) => selectPlayer(Number(d.src)));

// These two were emitting onclick="setWarnReason('Spamming'" — the closing
// paren was missing from the template, so the attribute was a JS syntax error
// and every quick-reason preset in the Warn and Ban modals silently did
// nothing. Exactly the kind of defect that hides inside string-built handlers.
caAction('setWarnReason', (d) => setWarnReason(d.reason));
caAction('setBanReason',  (d) => setBanReason(d.reason));

caAction('doKick',       (d) => doKick(Number(d.src), d.cid, d.name));
caAction('doWarn',       (d) => doWarn(Number(d.src), d.cid, d.name));
caAction('doBan',        (d) => doBan(Number(d.src), d.cid, d.name));
caAction('doSetMoney',   (d) => doSetMoney(Number(d.src), d.cid, d.name));
caAction('doSetJob',     (d) => doSetJob(Number(d.src), d.cid, d.name));
caAction('addNote',      (d) => addNote(d.cid, d.name));
caAction('deleteWarning',(d) => deleteWarning(Number(d.id), d.cid, Number(d.src)));
caAction('openSetMoney', (d) => openSetMoneyModal(Number(d.src), d.cid, d.name, Number(d.cash), Number(d.bank)));
caAction('openSetJob',   (d) => openSetJobModal(Number(d.src), d.cid, d.name));

caAction('playerBtn', (d) => {
    const src = Number(d.src);
    const cid = d.cid;
    const name = d.name;

    if (d.kind === 'do') {
        const extra = d.state !== undefined ? { state: d.state === 'true' } : {};
        playerAction(d.act, src, cid, name, extra);
        return;
    }

    switch (d.act) {
        case 'spawnveh':   openSpawnOnPlayer(src, name); break;
        case 'inventory':  openPlayerInventory(cid, name, src); break;
        case 'watch':      startLiveWatch(src, name); break;
        case 'dm':         openDmModal(src, cid, name); break;
        case 'giveweapon': openGiveWeaponModal(src, cid, name); break;
        case 'warn':        openWarnModal(src, cid, name); break;
        case 'kick':        openKickModal(src, cid, name); break;
        case 'ban':         openBanModal(src, cid, name); break;
        case 'kill':        openKillModal(src, cid, name); break;
        case 'sethealth':   openSetHealthModal(src, cid, name); break;
        case 'eject':       openEjectModal(src, cid, name); break;
        case 'sendto':      openSendToModal(src, cid, name); break;
        case 'mute':        openMuteModal(src, cid, name); break;
        case 'identifiers': openIdentifiersModal(src, cid, name); break;
    }
});

// ── Mass actions ──────────────────────────────────────────────────────────────
// Freeze All skips other staff server-side, so an admin cannot lock out
// everyone who could undo it.
caAction('massAction', async (d) => {
    const res = await caFetch('cipher-admin:server:massAction', {
        action: d.act,
        state:  d.state === 'true',
        radius: 50.0,
    });
    if (!res || !res.success) return;

    const what = d.act === 'revivenearby'
        ? `Revived ${res.count} player${res.count === 1 ? '' : 's'} nearby`
        : `${d.state === 'true' ? 'Froze' : 'Unfroze'} ${res.count} player${res.count === 1 ? '' : 's'}`;

    openModal('Mass Action', `<p style="color:var(--text-secondary)">${esc(what)}.</p>`,
        '<button class="btn btn-ghost" onclick="closeModal()">OK</button>');
});

// ── Kill ──────────────────────────────────────────────────────────────────────
function openKillModal(src, cid, name) {
    openModal(`Kill — ${name}`,
        '<p style="color:var(--text-secondary)">This kills the player where they stand. '
        + 'They will need a revive or a respawn.</p>',
        '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'
        + '<button class="btn btn-danger" data-ca-action="doKill" data-src="' + escNum(src)
        + '" data-cid="' + escAttr(cid) + '" data-name="' + escAttr(name || '') + '">Kill</button>');
}

caAction('doKill', (d) => {
    closeModal();
    playerAction('kill', Number(d.src), d.cid, d.name);
});

// ── Set health / armour ───────────────────────────────────────────────────────
function openSetHealthModal(src, cid, name) {
    openModal(`Set Health — ${name}`,
        '<div class="form-group"><label>Health (1&ndash;200)</label>'
        + '<input class="input" id="sh-hp" type="number" min="1" max="200" value="200"></div>'
        + '<div class="form-group"><label>Armour (0&ndash;100)</label>'
        + '<input class="input" id="sh-armour" type="number" min="0" max="100" value="0"></div>'
        + '<div style="font-size:11px;color:var(--text-muted)">Health 0 is not allowed here &mdash; '
        + 'use Kill for that.</div>',
        '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'
        + '<button class="btn btn-primary" data-ca-action="doSetHealth" data-src="' + escNum(src)
        + '" data-cid="' + escAttr(cid) + '" data-name="' + escAttr(name || '') + '">Apply</button>');
}

caAction('doSetHealth', (d) => {
    const hp     = parseInt((document.getElementById('sh-hp') || {}).value) || 200;
    const armour = parseInt((document.getElementById('sh-armour') || {}).value) || 0;
    closeModal();
    playerAction('sethealth', Number(d.src), d.cid, d.name, { health: hp, armour: armour });
});

// ── Eject ─────────────────────────────────────────────────────────────────────
function openEjectModal(src, cid, name) {
    openModal(`Eject — ${name}`,
        '<p style="color:var(--text-secondary)">Remove this player from the vehicle they are in.</p>'
        + '<div class="form-group" style="margin-top:10px"><label>Also delete the vehicle</label> '
        + '<label class="toggle" style="display:inline-flex"><input type="checkbox" id="ej-del">'
        + '<div class="toggle-track"></div><div class="toggle-thumb"></div></label></div>',
        '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'
        + '<button class="btn btn-primary" data-ca-action="doEject" data-src="' + escNum(src)
        + '" data-cid="' + escAttr(cid) + '" data-name="' + escAttr(name || '') + '">Eject</button>');
}

caAction('doEject', (d) => {
    const del = document.getElementById('ej-del') ? document.getElementById('ej-del').checked : false;
    closeModal();
    playerAction('eject', Number(d.src), d.cid, d.name, { delete: del });
});

// ── Send to coordinates ───────────────────────────────────────────────────────
function openSendToModal(src, cid, name) {
    const marks = (CA.lists && CA.lists.landmarks) || SELF_LANDMARKS || [];
    const opts = marks.map((l, i) => `<option value="${i}">${esc(l.name)}</option>`).join('');

    openModal(`Send ${name} To`,
        '<div class="form-group"><label>Landmark</label>'
        + '<select class="select" id="st-landmark"><option value="">— custom coordinates —</option>'
        + opts + '</select></div>'
        + '<div class="form-group"><label>X</label><input class="input" id="st-x" type="number" step="0.01"></div>'
        + '<div class="form-group"><label>Y</label><input class="input" id="st-y" type="number" step="0.01"></div>'
        + '<div class="form-group"><label>Z</label><input class="input" id="st-z" type="number" step="0.01"></div>',
        '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'
        + '<button class="btn btn-primary" data-ca-action="doSendTo" data-src="' + escNum(src)
        + '" data-cid="' + escAttr(cid) + '" data-name="' + escAttr(name || '') + '">Send</button>');

    // Picking a landmark fills the coordinate fields rather than replacing them,
    // so it can be nudged before sending.
    const sel = document.getElementById('st-landmark');
    if (sel) sel.onchange = function () {
        const l = marks[Number(this.value)];
        if (!l) return;
        document.getElementById('st-x').value = l.x;
        document.getElementById('st-y').value = l.y;
        document.getElementById('st-z').value = l.z;
    };
}

caAction('doSendTo', (d) => {
    const g = (id) => parseFloat((document.getElementById(id) || {}).value);
    const x = g('st-x'), y = g('st-y'), z = g('st-z');
    if (isNaN(x) || isNaN(y) || isNaN(z)) return;
    closeModal();
    playerAction('sendto', Number(d.src), d.cid, d.name, { x: x, y: y, z: z });
});

// ── Mute ──────────────────────────────────────────────────────────────────────
function openMuteModal(src, cid, name) {
    const durations = [
        ['300', '5 minutes'], ['900', '15 minutes'], ['1800', '30 minutes'],
        ['3600', '1 hour'], ['86400', '24 hours'], ['0', 'Permanent'],
    ].map(d => `<option value="${d[0]}">${d[1]}</option>`).join('');

    openModal(`Mute — ${name}`,
        '<div class="form-group"><label>Reason</label>'
        + '<input class="input" id="mute-reason" placeholder="Enter reason..."></div>'
        + '<div class="form-group"><label>Duration</label>'
        + '<select class="select" id="mute-duration">' + durations + '</select></div>'
        + '<div style="font-size:11px;color:var(--text-muted)">Mutes chat. Voice is handled by your '
        + 'voice resource &mdash; see Config.MuteVoiceExport. Mutes survive restarts.</div>',
        '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'
        + '<button class="btn btn-success" data-ca-action="doUnmute" data-cid="' + escAttr(cid)
        + '" data-src="' + escNum(src) + '" data-name="' + escAttr(name || '') + '">Unmute</button>'
        + '<button class="btn btn-amber" data-ca-action="doMute" data-cid="' + escAttr(cid)
        + '" data-src="' + escNum(src) + '" data-name="' + escAttr(name || '') + '">Mute</button>');
}

caAction('doMute', async (d) => {
    const reason   = (document.getElementById('mute-reason') || {}).value || 'No reason given';
    const duration = parseInt((document.getElementById('mute-duration') || {}).value) || 0;
    closeModal();
    await caFetch('cipher-admin:server:mutePlayer', {
        citizenid: d.cid, targetSrc: Number(d.src), playerName: d.name,
        reason: reason, duration: duration,
    });
});

caAction('doUnmute', async (d) => {
    closeModal();
    await caFetch('cipher-admin:server:mutePlayer', {
        citizenid: d.cid, targetSrc: Number(d.src), playerName: d.name, unmute: true,
    });
});

// ── Identifiers ───────────────────────────────────────────────────────────────
async function openIdentifiersModal(src, cid, name) {
    openModal(`Identifiers — ${name}`,
        '<div class="empty-state"><div class="empty-text">Loading...</div></div>',
        '<button class="btn btn-ghost" onclick="closeModal()">Close</button>');

    const ids = await caFetch('cipher-admin:server:getPlayerIdentifiers', {
        targetSrc: src, targetCid: cid, targetName: name,
    });

    const body = document.querySelector('#ca-modal .modal-body');
    if (!body) return;

    if (!ids || !ids.length) {
        body.innerHTML = '<div class="empty-state"><div class="empty-text">No identifiers available</div></div>';
        return;
    }

    body.innerHTML = ids.map(i => `
        <div class="profile-row">
            <span class="profile-row-label">${esc(i.type)}</span>
            <span class="profile-row-value mono" style="user-select:all">${esc(i.value)}</span>
        </div>`).join('')
        + '<div style="font-size:11px;color:var(--text-muted);margin-top:8px">'
        + 'Select a value to copy. Viewing identifiers is written to the audit log.</div>';
}

window._profileButtons     = _profileButtons;
window.loadPlayers         = loadPlayers;
window.filterPlayers       = filterPlayers;
window.sortPlayers         = sortPlayers;
window.selectPlayer        = selectPlayer;
window.renderPlayerProfile = renderPlayerProfile;
window.playerAction        = playerAction;
window.openKickModal       = openKickModal;
window.doKick              = doKick;
window.deleteWarning       = deleteWarning;
window.openWarnModal       = openWarnModal;
window.setWarnReason       = setWarnReason;
window.doWarn              = doWarn;
window.openBanModal        = openBanModal;
window.setBanReason        = setBanReason;
window.doBan               = doBan;
window.openSetMoneyModal   = openSetMoneyModal;
window.doSetMoney          = doSetMoney;
window.openSetJobModal     = openSetJobModal;
window.doSetJob            = doSetJob;
window.addNote             = addNote;
window.openPlayerInventory = openPlayerInventory;
window.openSpawnOnPlayer   = openSpawnOnPlayer;
window.openDmModal         = openDmModal;
window.doDm                = doDm;
window.openGiveWeaponModal = openGiveWeaponModal;
window.doGiveWeapon        = doGiveWeapon;
window.confirmSummonAll    = confirmSummonAll;
window.doSummonAll         = doSummonAll;

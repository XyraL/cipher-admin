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
            ${hasPermission('summonall') ? `<button class="btn btn-amber btn-sm" onclick="confirmSummonAll()">⚡ Summon All</button>` : ''}
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
                    const notesTip = (p.notes && p.notes.length)
                        ? ` title="${p.notes.slice(0,3).map(n => n.note).join(' | ')}"`
                        : '';
                    const noteDot = (p.notes && p.notes.length)
                        ? `<span class="note-dot" title="${p.notes[0].note}">&#x1F4DD;</span>` : '';
                    return `<tr onclick="selectPlayer(${p.src})" class="${_selectedPlayer && _selectedPlayer.src === p.src ? 'selected-row' : ''}">
                        <td class="text-muted">${p.src}</td>
                        <td class="td-name">
                            <div class="flex items-center gap-4"${notesTip}>
                                <span class="status-dot online"></span>
                                ${p.name}
                                ${noteDot}
                                ${p.isAdmin ? `<span class="badge badge-accent" style="background:${p.adminColor}22;color:${p.adminColor}">${p.adminRole}</span>` : ''}
                            </div>
                        </td>
                        <td class="text-muted text-sm">${p.citizenid}</td>
                        <td>
                            <span class="badge badge-muted">${p.jobLabel || p.job || 'N/A'}</span>
                            ${p.onduty ? '<span class="badge badge-green" style="margin-left:4px">on duty</span>' : ''}
                        </td>
                        <td class="text-muted text-sm">${_fmtOnlineTime(p.onlineSeconds)}</td>
                        <td class="${pingClass(p.ping)}">${p.ping}ms</td>
                        <td>${p.warnings > 0 ? `<span class="badge badge-amber">${p.warnings}w</span>` : '<span class="text-muted">—</span>'}</td>
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
    var h = Math.floor(secs / 3600);
    var m = Math.floor((secs % 3600) / 60);
    if (h > 0) return h + 'h ' + m + 'm';
    return m + 'm';
}

// ── Player Profile ────────────────────────────────────────────────────────────
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

    const src = p.onlineSrc || p.src;

    document.getElementById('player-profile-inner').innerHTML = `
        <div class="profile-header">
            <div class="profile-avatar">👤</div>
            <div>
                <div class="profile-name">${p.name || (ci.firstname + ' ' + ci.lastname)}</div>
                <div class="profile-cid">${p.citizenid} · ID ${src || '?'}</div>
                ${p.isAdmin ? `<span class="badge badge-accent" style="margin-top:4px;background:${p.adminColor}22;color:${p.adminColor}">${p.adminRole}</span>` : ''}
            </div>
        </div>

        <!-- Actions -->
        <div class="profile-section">
            <div class="profile-section-title">Actions</div>
            <div class="profile-actions">
                ${canGoto      ? `<button class="btn btn-ghost btn-sm" onclick="playerAction('goto',${src},'${p.citizenid}','${p.name}')">📍 Goto</button>` : ''}
                ${canBring     ? `<button class="btn btn-ghost btn-sm" onclick="playerAction('bring',${src},'${p.citizenid}','${p.name}')">🔗 Bring</button>` : ''}
                ${canSpectate  ? `<button class="btn btn-ghost btn-sm" onclick="playerAction('spectate',${src},'${p.citizenid}','${p.name}')">👁 Spectate</button>` : ''}
                ${canFreeze    ? `<button class="btn btn-ghost btn-sm" onclick="playerAction('freeze',${src},'${p.citizenid}','${p.name}',{state:true})">🧊 Freeze</button>` : ''}
                ${canFreeze    ? `<button class="btn btn-ghost btn-sm" onclick="playerAction('freeze',${src},'${p.citizenid}','${p.name}',{state:false})">🔥 Unfreeze</button>` : ''}
                ${canRevive    ? `<button class="btn btn-ghost btn-sm" onclick="playerAction('revive',${src},'${p.citizenid}','${p.name}')">💚 Revive</button>` : ''}
                ${canHeal      ? `<button class="btn btn-ghost btn-sm" onclick="playerAction('heal',${src},'${p.citizenid}','${p.name}')">💊 Heal</button>` : ''}
                ${canSpawnVeh  ? `<button class="btn btn-ghost btn-sm" onclick="openSpawnOnPlayer(${src},'${p.name}')">🚗 Spawn Veh</button>` : ''}
                ${canDelVeh    ? `<button class="btn btn-ghost btn-sm" onclick="playerAction('deletevehicle',${src},'${p.citizenid}','${p.name}')">🗑 Del Veh</button>` : ''}
                ${canViewInv   ? `<button class="btn btn-ghost btn-sm" onclick="openPlayerInventory('${p.citizenid}','${p.name}',${src})">📦 Inventory</button>` : ''}
                ${canScreenshot? `<button class="btn btn-ghost btn-sm" onclick="playerAction('screenshot',${src},'${p.citizenid}','${p.name}')">📷 Screenshot</button>` : ''}
                ${canScreenshot? `<button class="btn btn-ghost btn-sm" onclick="startLiveWatch(${src},'${p.name}')">📹 Watch Live</button>` : ''}
                ${canSlap      ? `<button class="btn btn-ghost btn-sm" onclick="playerAction('slap',${src},'${p.citizenid}','${p.name}')">👋 Slap</button>` : ''}
                ${canResetPos  ? `<button class="btn btn-ghost btn-sm" onclick="playerAction('resetpos',${src},'${p.citizenid}','${p.name}')">📍 Reset Pos</button>` : ''}
                ${canDm          ? `<button class="btn btn-ghost btn-sm" onclick="openDmModal(${src},'${p.citizenid}','${p.name}')">✉️ DM</button>` : ''}
                ${canGiveWeapon  ? `<button class="btn btn-ghost btn-sm" onclick="openGiveWeaponModal(${src},'${p.citizenid}','${p.name}')">🔫 Give Weapon</button>` : ''}
            </div>
        </div>

        <!-- Moderation -->
        <div class="profile-section">
            <div class="profile-section-title">Moderation</div>
            <div class="profile-actions">
                ${canWarn    ? `<button class="btn btn-amber btn-sm" onclick="openWarnModal(${src},'${p.citizenid}','${p.name}')">⚠️ Warn</button>` : ''}
                ${canKick    ? `<button class="btn btn-ghost btn-sm" onclick="openKickModal(${src},'${p.citizenid}','${p.name}')">👢 Kick</button>` : ''}
                ${canTempBan ? `<button class="btn btn-danger btn-sm" onclick="openBanModal(${src},'${p.citizenid}','${p.name}')">🔨 Ban</button>` : ''}
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
            ${canSetCash ? `<button class="btn btn-ghost btn-sm w-full mt-8" onclick="openSetMoneyModal(${src},'${p.citizenid}','${p.name}',${mo.cash||0},${mo.bank||0})">Edit Money</button>` : ''}
            ${canSetJob  ? `<button class="btn btn-ghost btn-sm w-full mt-8" onclick="openSetJobModal(${src},'${p.citizenid}','${p.name}')">Change Job</button>` : ''}
        </div>

        <!-- Warnings -->
        <div class="profile-section">
            <div class="profile-section-title">Warnings (${(p.warnings || []).length})</div>
            ${(p.warnings && p.warnings.length) ? p.warnings.map(w => `
                <div class="activity-item" style="align-items:flex-start">
                    <div class="activity-icon">⚠️</div>
                    <div class="activity-body" style="flex:1">
                        <div class="activity-action">${w.reason}</div>
                        <div class="activity-detail">by ${w.admin_name} · ${formatDate(w.created_at)}</div>
                    </div>
                    ${canWarn ? `<button class="btn btn-ghost btn-xs" style="color:var(--red);flex-shrink:0" onclick="deleteWarning(${w.id},'${p.citizenid}',${src})">✕</button>` : ''}
                </div>
            `).join('') : '<div class="text-muted text-sm">No warnings</div>'}
        </div>

        <!-- Notes -->
        ${canViewNotes ? `
        <div class="profile-section">
            <div class="profile-section-title">Admin Notes</div>
            ${(p.notes && p.notes.length) ? p.notes.map(n => `
                <div class="activity-item">
                    <div class="activity-icon">📝</div>
                    <div class="activity-body">
                        <div class="activity-action">${n.note}</div>
                        <div class="activity-detail">by ${n.admin_name} · ${formatDate(n.created_at)}</div>
                    </div>
                </div>
            `).join('') : '<div class="text-muted text-sm">No notes</div>'}
            ${canAddNote ? `
            <div class="flex gap-4 mt-8">
                <input class="input" id="note-input-${p.citizenid}" placeholder="Add a note...">
                <button class="btn btn-primary btn-sm" onclick="addNote('${p.citizenid}','${p.name}')">Add</button>
            </div>` : ''}
        </div>` : ''}

        <button class="btn btn-ghost btn-sm w-full mt-8" onclick="closePlayerProfile()">✕ Close</button>
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
        <button class="btn btn-danger" onclick="doKick(${src},'${cid}','${name}')">Kick</button>
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
                    `<button class="btn btn-ghost btn-xs" onclick="setWarnReason('${r.replace(/'/g,"\\'")}'">${r}</button>`
                ).join('')}
            </div>
        </div>
    `, `
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-amber" onclick="doWarn(${src},'${cid}','${name}')">Warn</button>
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
                    `<button class="btn btn-ghost btn-xs" onclick="setBanReason('${r.replace(/'/g,"\\'")}'">${r}</button>`
                ).join('')}
            </div>
        </div>
    `, `
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-danger" onclick="doBan(${src},'${cid}','${name}')">Ban</button>
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
        <button class="btn btn-primary" onclick="doSetMoney(${src},'${cid}','${name}')">Save</button>
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
        <button class="btn btn-primary" onclick="doSetJob(${src},'${cid}','${name}')">Save</button>
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

var _weapons = [
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
    var opts = _weapons.map(function(w) { return '<option value="' + w + '">' + w.replace('WEAPON_','') + '</option>'; }).join('');
    openModal('Give Weapon — ' + name,
        '<div class="form-group"><label>Weapon</label><select class="select" id="gw-weapon">' + opts + '</select></div>'
        + '<div class="form-group"><label>Ammo</label><input class="input" id="gw-ammo" type="number" value="100" min="1" max="9999"></div>',
        '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'
        + '<button class="btn btn-primary" onclick="doGiveWeapon(' + src + ',\'' + cid + '\',\'' + name + '\')">Give</button>');
}

function doGiveWeapon(src, cid, name) {
    var weapon = (document.getElementById('gw-weapon') || {}).value || 'WEAPON_PISTOL';
    var ammo   = parseInt((document.getElementById('gw-ammo') || {}).value) || 100;
    closeModal();
    playerAction('giveweapon', src, cid, name, { weapon: weapon, ammo: ammo });
}

function openDmModal(src, cid, name) {
    openModal('DM — ' + name,
        '<div class="form-group"><label>Message</label><input class="input" id="dm-inp" placeholder="Private message to player..."></div>',
        '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'
        + '<button class="btn btn-primary" onclick="doDm(' + src + ',\'' + cid + '\',\'' + name + '\')">Send</button>');
}

function doDm(src, cid, name) {
    var msg = (document.getElementById('dm-inp') || {}).value || '';
    if (!msg.trim()) return;
    closeModal();
    playerAction('dm', src, cid, name, { message: msg.trim() });
}

function confirmSummonAll() {
    openModal('Summon All Players',
        '<p style="color:var(--text-secondary)">Teleport <strong style="color:var(--amber)">all online players</strong> to your current position? This affects everyone on the server.</p>',
        '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'
        + '<button class="btn btn-amber" onclick="doSummonAll()">&#x26A1; Summon All</button>');
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

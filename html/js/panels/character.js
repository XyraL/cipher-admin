// Cipher-Admin — Character Lookup Panel

// Character-panel action button. Same reasoning as _profileButtons in
// players.js: target details ride on data-* attributes so a name containing
// an apostrophe can't terminate a handler string early.
function _charBtn(show, act, ico, label, src, cid, name, cls) {
    if (!show) return '';
    return `<button class="btn ${cls || 'btn-ghost'} btn-sm"
        data-ca-action="charBtn"
        data-act="${escAttr(act)}"
        data-src="${escNum(src)}"
        data-cid="${escAttr(cid)}"
        data-name="${escAttr(name || '')}">${icon(ico)}<span>${esc(label)}</span></button>`;
}

caAction('charBtn', (d) => {
    const src = Number(d.src);
    switch (d.act) {
        // The online actions all sit inside the character profile modal, so
        // each closes it before opening whatever comes next.
        case 'goto':       closeModal(); playerAction('goto', src, d.cid, d.name); break;
        case 'bring':      closeModal(); playerAction('bring', src, d.cid, d.name); break;
        case 'warn':       closeModal(); openWarnModal(src, d.cid, d.name); break;
        case 'kick':       closeModal(); openKickModal(src, d.cid, d.name); break;
        case 'ban':        closeModal(); openBanModal(src, d.cid, d.name); break;
        case 'offlineban': openOfflineBanModal(d.cid, d.name); break;
        case 'deletechar': openDeleteCharModal(d.cid, d.name); break;
    }
});

caAction('openCharProfile', (d) => openCharProfile(d.cid));

function renderCharacterPanel() {
    document.getElementById('panel-character').innerHTML = `
        <div class="section-header">
            <div>
                <div class="section-title">Character Lookup</div>
                <div class="section-sub">Search offline and online players by name or citizenid</div>
            </div>
        </div>
        <div class="search-bar">
            <div class="search-wrap" style="flex:1">
                <span class="search-icon">⌕</span>
                <input class="input search-input" id="char-search-input" placeholder="Search by name or citizenid..." onkeydown="if(event.key==='Enter')searchCharacter()">
            </div>
            <button class="btn btn-primary" onclick="searchCharacter()">Search</button>
        </div>
        <div id="char-results"></div>
    `;
}

async function searchCharacter() {
    const _inp = document.getElementById('char-search-input');
    const q = _inp ? _inp.value.trim() : '';
    if (!q || q.length < 2) return;
    const res = document.getElementById('char-results');
    res.innerHTML = '<div class="empty-state"><div class="empty-icon">◎</div><div class="empty-text">Searching...</div></div>';

    const results = await caFetch('cipher-admin:server:searchCharacter', q);
    if (!results || !results.length) {
        res.innerHTML = '<div class="empty-state"><div class="empty-icon">◎</div><div class="empty-text">No characters found</div></div>';
        return;
    }

    res.innerHTML = `
        <div class="card">
            <div class="card-body" style="padding:0">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Citizenid</th>
                            <th>DOB</th>
                            <th>Job</th>
                            <th>Cash</th>
                            <th>Bank</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${results.map(p => `
                            <tr>
                                <td class="td-name">${esc(p.firstname)} ${esc(p.lastname)}</td>
                                <td class="text-muted text-sm">${esc(p.citizenid)}</td>
                                <td class="text-muted">${esc(p.dob || 'N/A')}</td>
                                <td><span class="badge badge-muted">${esc(p.job_label || p.job || 'N/A')}</span></td>
                                <td class="text-muted">${esc(formatMoney(p.cash))}</td>
                                <td class="text-muted">${esc(formatMoney(p.bank))}</td>
                                <td><button class="btn btn-ghost btn-xs" data-ca-action="openCharProfile" data-cid="${escAttr(p.citizenid)}">View</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

async function openCharProfile(citizenid) {
    const profile = await caFetch('cipher-admin:server:getCharacter', citizenid);
    if (!profile) return;

    const ci  = profile.charinfo || {};
    const job = profile.job      || {};
    const mo  = profile.money    || {};
    const name = (ci.firstname || '') + ' ' + (ci.lastname || '');

    const isOnline = profile.onlineSrc != null;

    openModal(`Character — ${name}`, `
        <div class="profile-section">
            <div class="profile-section-title">Identity</div>
            <div class="profile-row"><span class="profile-row-label">Full Name</span><span class="profile-row-value">${name}</span></div>
            <div class="profile-row"><span class="profile-row-label">Citizenid</span><span class="profile-row-value">${citizenid}</span></div>
            <div class="profile-row"><span class="profile-row-label">DOB</span><span class="profile-row-value">${ci.birthdate || 'N/A'}</span></div>
            <div class="profile-row"><span class="profile-row-label">Gender</span><span class="profile-row-value">${ci.gender === 0 ? 'Male' : 'Female'}</span></div>
            <div class="profile-row"><span class="profile-row-label">Phone</span><span class="profile-row-value">${ci.phone || 'N/A'}</span></div>
            <div class="profile-row"><span class="profile-row-label">Status</span><span class="profile-row-value"><span class="status-dot ${isOnline ? 'online' : 'offline'}"></span> ${isOnline ? 'Online (ID '+profile.onlineSrc+')' : 'Offline'}</span></div>
        </div>
        <div class="profile-section">
            <div class="profile-section-title">Job</div>
            <div class="profile-row"><span class="profile-row-label">Job</span><span class="profile-row-value">${esc(job.label || job.name || 'N/A')}</span></div>
            <div class="profile-row"><span class="profile-row-label">Grade</span><span class="profile-row-value">${esc(job.grade?.name || 'N/A')} (${job.grade?.level ?? 'N/A'})</span></div>
        </div>
        <div class="profile-section">
            <div class="profile-section-title">Economy</div>
            <div class="profile-row"><span class="profile-row-label">Cash</span><span class="profile-row-value">${formatMoney(mo.cash)}</span></div>
            <div class="profile-row"><span class="profile-row-label">Bank</span><span class="profile-row-value">${formatMoney(mo.bank)}</span></div>
        </div>
        <div class="profile-section">
            <div class="profile-section-title">Warnings (${(profile.warnings || []).length})</div>
            ${(profile.warnings || []).length ? profile.warnings.slice(0,3).map(w => `
                <div class="activity-item">
                    <div class="activity-icon">${icon('warn')}</div>
                    <div class="activity-body">
                        <div class="activity-action">${esc(w.reason)}</div>
                        <div class="activity-detail">by ${esc(w.admin_name)} · ${formatDate(w.created_at)}</div>
                    </div>
                </div>
            `).join('') : '<div class="text-muted text-sm">No warnings</div>'}
        </div>
        ${hasPermission('viewnotes') && profile.notes ? `
        <div class="profile-section">
            <div class="profile-section-title">Notes (${profile.notes.length})</div>
            ${profile.notes.length ? profile.notes.slice(0,3).map(n => `
                <div class="activity-item">
                    <div class="activity-icon">${icon('note')}</div>
                    <div class="activity-body">
                        <div class="activity-action">${n.note}</div>
                        <div class="activity-detail">by ${esc(n.admin_name)} · ${formatDate(n.created_at)}</div>
                    </div>
                </div>
            `).join('') : '<div class="text-muted text-sm">No notes</div>'}
        </div>` : ''}
        ${isOnline ? `
        <div class="profile-section">
            <div class="profile-section-title">Online Actions</div>
            <div class="flex gap-4" style="flex-wrap:wrap">
                ${_charBtn(hasPermission('teleport'), 'goto',  'goto',  'Goto',  profile.onlineSrc, citizenid, name)}
                ${_charBtn(hasPermission('bring'),    'bring', 'bring', 'Bring', profile.onlineSrc, citizenid, name)}
                ${_charBtn(hasPermission('warn'),     'warn',  'warn',  'Warn',  profile.onlineSrc, citizenid, name, 'btn-amber')}
                ${_charBtn(hasPermission('kick'),     'kick',  'kick',  'Kick',  profile.onlineSrc, citizenid, name)}
                ${_charBtn(hasPermission('tempban'),  'ban',   'bans',  'Ban',   profile.onlineSrc, citizenid, name, 'btn-danger')}
            </div>
        </div>` : `
        <div class="profile-section">
            <div class="profile-section-title">Offline Actions</div>
            <div class="flex gap-4">
                ${_charBtn(hasPermission('tempban'),    'offlineban', 'bans',  'Ban Offline',      null, citizenid, name, 'btn-danger')}
                ${_charBtn(hasPermission('deletechar'), 'deletechar', 'trash', 'Delete Character', null, citizenid, name, 'btn-danger')}
            </div>
        </div>`}
    `);
}

function openOfflineBanModal(cid, name) {
    closeModal();
    openModal(`Ban Offline — ${name}`, `
        <div class="form-group">
            <label>Reason</label>
            <input class="input" id="offban-reason" placeholder="Enter reason...">
        </div>
        <div class="form-group">
            <label>Duration</label>
            <select class="select" id="offban-duration">
                ${(CA.banPresets || []).map(p => `<option value="${escNum(p.seconds)}">${esc(p.label)}</option>`).join('')}
            </select>
        </div>
    `, `
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-danger" data-ca-action="doOfflineBan"
            data-cid="${escAttr(cid)}" data-name="${escAttr(name || '')}">Ban</button>
    `);
}

caAction('doOfflineBan', (d) => doOfflineBan(d.cid, d.name));

async function doOfflineBan(cid, name) {
    const reason   = document.getElementById('offban-reason').value.trim();
    const duration = parseInt(document.getElementById('offban-duration').value);
    if (!reason) return;
    await caFetch('cipher-admin:server:banPlayer', {
        targetCid: cid, targetName: name, reason, duration, permanent: duration === 0
    });
    closeModal();
}

function openDeleteCharModal(cid, name) {
    closeModal();
    openModal('Delete Character — ' + name,
        '<p style="color:var(--red);font-weight:600">This will permanently delete the character and all associated data from the database. This cannot be undone.</p>'
        + '<div class="profile-row"><span class="profile-row-label">Citizenid</span><span class="profile-row-value" style="font-family:monospace">' + esc(cid) + '</span></div>'
        + '<div class="profile-row"><span class="profile-row-label">Name</span><span class="profile-row-value">' + esc(name) + '</span></div>'
        + '<div class="form-group mt-12"><label>Type the citizenid to confirm</label><input class="input" id="del-confirm" placeholder="' + escAttr(cid) + '"></div>',
        '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'
        + '<button class="btn btn-danger" data-ca-action="doDeleteChar" data-cid="' + escAttr(cid) + '" data-name="' + escAttr(name || '') + '">Permanently Delete</button>');
}

caAction('doDeleteChar', (d) => doDeleteChar(d.cid, d.name));

async function doDeleteChar(cid, name) {
    const inp = document.getElementById('del-confirm');
    if (!inp || inp.value.trim() !== cid) {
        inp.style.borderColor = 'var(--red)';
        return;
    }
    const result = await caFetch('cipher-admin:server:deleteCharacter', { citizenid: cid, name: name });
    closeModal();
    if (result && result.success) {
        openModal('Character Deleted', '<p style="color:var(--green)">' + esc(name) + ' has been permanently removed from the database.</p>',
            '<button class="btn btn-ghost" onclick="closeModal()">OK</button>');
    } else {
        let reason = (result && result.reason) || 'Unknown error';
        openModal('Delete Failed', '<p style="color:var(--red)">' + esc(reason) + '</p>', '<button class="btn btn-ghost" onclick="closeModal()">OK</button>');
    }
}

window.renderCharacterPanel  = renderCharacterPanel;
window.searchCharacter       = searchCharacter;
window.openCharProfile       = openCharProfile;
window.openOfflineBanModal   = openOfflineBanModal;
window.doOfflineBan          = doOfflineBan;
window.openDeleteCharModal   = openDeleteCharModal;
window.doDeleteChar          = doDeleteChar;

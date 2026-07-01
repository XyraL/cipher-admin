// Cipher-Admin — Ban Manager Panel

let _banFilter = 'active';

async function loadBans() {
    const panel = document.getElementById('panel-bans');
    panel.innerHTML = `
        <div class="section-header mb-12">
            <div>
                <div class="section-title">Ban Manager</div>
                <div class="section-sub">Manage active bans and ban history</div>
            </div>
            <div class="flex gap-8">
                <input class="input" id="ban-search-input" placeholder="Search player..." style="width:200px" oninput="searchBans(this.value)">
                <select class="select" style="width:130px" onchange="setBanFilter(this.value)">
                    <option value="active">Active Only</option>
                    <option value="all">All Bans</option>
                </select>
                <button class="btn btn-ghost btn-sm" onclick="loadBans()">↻ Refresh</button>
            </div>
        </div>
        <div class="card">
            <div class="card-body" style="padding:0">
                <div id="bans-table-wrap">
                    <div class="empty-state"><div class="empty-icon">⊘</div><div class="empty-text">Loading bans...</div></div>
                </div>
            </div>
        </div>
    `;
    await fetchBans();
}

async function fetchBans(search = '') {
    const data = await caFetch('cipher-admin:server:getBans', {
        search,
        expired: _banFilter === 'all',
    });
    renderBansTable(data || []);
}

function setBanFilter(val) {
    _banFilter = val;
    fetchBans(document.getElementById('ban-search-input')?.value?.trim() || '');
}

function searchBans(q) { fetchBans(q); }

function renderBansTable(bans) {
    const wrap = document.getElementById('bans-table-wrap');
    if (!wrap) return;
    if (!bans.length) {
        wrap.innerHTML = '<div class="empty-state"><div class="empty-icon">⊘</div><div class="empty-text">No bans found</div></div>';
        return;
    }
    wrap.innerHTML = `
        <table class="data-table audit-table">
            <thead>
                <tr>
                    <th>Player</th>
                    <th>Reason</th>
                    <th>Admin</th>
                    <th>Expires</th>
                    <th>Type</th>
                    <th>Banned</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                ${bans.map(b => `
                    <tr class="ban-row" onclick="viewBan(${b.id},'${(b.player_name||'').replace(/'/g,"\\'")}','${(b.reason||'').replace(/'/g,"\\'")}','${b.admin_name||''}','${b.is_permanent?'Permanent':b.expires_at||'N/A'}','${b.citizenid||''}')">
                        <td class="td-name">${b.player_name}</td>
                        <td class="text-muted truncate" style="max-width:200px">${b.reason}</td>
                        <td class="text-muted">${b.admin_name}</td>
                        <td>${b.is_permanent ? '<span class="badge badge-red">Permanent</span>' : (b.expires_at ? formatDate(b.expires_at) : 'N/A')}</td>
                        <td>${b.is_permanent ? '<span class="badge badge-red">Perm</span>' : '<span class="badge badge-amber">Temp</span>'}</td>
                        <td class="text-muted text-sm">${formatDate(b.created_at)}</td>
                        <td>
                            ${b.is_active && hasPermission('unban') ? `<button class="btn btn-success btn-xs" onclick="event.stopPropagation();confirmUnban(${b.id},'${(b.player_name||'').replace(/'/g,"\\'")}')">Unban</button>` : ''}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function viewBan(id, name, reason, admin, expires, cid) {
    openModal(`Ban Details — ${name}`, `
        <div class="profile-row"><span class="profile-row-label">Player</span><span class="profile-row-value">${name}</span></div>
        <div class="profile-row"><span class="profile-row-label">Citizenid</span><span class="profile-row-value">${cid || 'N/A'}</span></div>
        <div class="profile-row"><span class="profile-row-label">Reason</span><span class="profile-row-value">${reason}</span></div>
        <div class="profile-row"><span class="profile-row-label">Banned by</span><span class="profile-row-value">${admin}</span></div>
        <div class="profile-row"><span class="profile-row-label">Expires</span><span class="profile-row-value">${expires}</span></div>
    `, hasPermission('unban') ? `
        <button class="btn btn-ghost" onclick="closeModal()">Close</button>
        <button class="btn btn-success" onclick="closeModal();confirmUnban(${id},'${name}')">Unban</button>
    ` : `<button class="btn btn-ghost" onclick="closeModal()">Close</button>`);
}

function confirmUnban(banId, name) {
    openModal(`Unban — ${name}`, `
        <p style="color:var(--text-secondary)">Are you sure you want to unban <strong style="color:var(--text-primary)">${name}</strong>?</p>
    `, `
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-success" onclick="doUnban(${banId},'${name}')">Confirm Unban</button>
    `);
}

async function doUnban(banId, name) {
    await caFetch('cipher-admin:server:unban', { banId, playerName: name });
    closeModal();
    loadBans();
}

window.loadBans      = loadBans;
window.setBanFilter  = setBanFilter;
window.searchBans    = searchBans;
window.viewBan       = viewBan;
window.confirmUnban  = confirmUnban;
window.doUnban       = doUnban;

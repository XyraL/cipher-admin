// Cipher-Admin — Permissions Panel

let _roles      = [];
let _staffList  = [];

const ALL_PERMS = [
    { key: 'kick',        label: 'Kick Players' },
    { key: 'warn',        label: 'Warn Players' },
    { key: 'tempban',     label: 'Temp Ban' },
    { key: 'permban',     label: 'Perm Ban' },
    { key: 'unban',       label: 'Unban' },
    { key: 'freeze',      label: 'Freeze Players' },
    { key: 'spectate',    label: 'Spectate' },
    { key: 'bring',       label: 'Bring Players' },
    { key: 'teleport',    label: 'Goto Player' },
    { key: 'revive',      label: 'Revive' },
    { key: 'heal',        label: 'Heal' },
    { key: 'noclip',      label: 'Noclip' },
    { key: 'invisible',   label: 'Invisible' },
    { key: 'godmode',     label: 'God Mode' },
    { key: 'clearwanted', label: 'Clear Wanted' },
    { key: 'setjob',      label: 'Set Job' },
    { key: 'setgrade',    label: 'Set Grade' },
    { key: 'setcash',     label: 'Set Cash' },
    { key: 'setbank',     label: 'Set Bank' },
    { key: 'viewinv',     label: 'View Inventory' },
    { key: 'editinv',     label: 'Edit Inventory' },
    { key: 'clearinv',    label: 'Clear Inventory' },
    { key: 'giveitem',    label: 'Give Items' },
    { key: 'spawnveh',    label: 'Spawn Vehicles' },
    { key: 'deleteveh',   label: 'Delete Vehicles' },
    { key: 'announcement',label: 'Announcements' },
    { key: 'weather',     label: 'Set Weather' },
    { key: 'time',        label: 'Set Time' },
    { key: 'viewnotes',   label: 'View Notes' },
    { key: 'addnote',     label: 'Add Notes' },
    { key: 'viewaudit',   label: 'View Audit Log' },
    { key: 'manageroles', label: 'Manage Roles' },
    { key: 'assignroles', label: 'Assign Roles' },
];

async function loadPermissions() {
    const panel = document.getElementById('panel-permissions');

    if (!hasPermission('manageroles') && !hasPermission('assignroles')) {
        panel.innerHTML = '<div class="empty-state"><div class="empty-icon">🔐</div><div class="empty-text">No permission to manage roles</div></div>';
        return;
    }

    panel.innerHTML = `
        <div class="section-header mb-12">
            <div>
                <div class="section-title">Permissions</div>
                <div class="section-sub">Manage role permissions and staff assignments</div>
            </div>
        </div>
        <div style="display:flex;gap:12px;margin-bottom:14px">
            <button class="btn btn-primary btn-sm" id="perm-tab-roles" onclick="showPermTab('roles')">Role Permissions</button>
            <button class="btn btn-ghost btn-sm" id="perm-tab-staff" onclick="showPermTab('staff')">Staff Assignments</button>
        </div>
        <div id="perm-roles-content"></div>
        <div id="perm-staff-content" class="hidden"></div>
    `;

    if (hasPermission('manageroles')) {
        _roles = await caFetch('cipher-admin:server:getRoles', {}) || [];
        renderRolePermissions();
    }

    if (hasPermission('assignroles')) {
        _staffList = await caFetch('cipher-admin:server:getStaff', {}) || [];
        renderStaffList();
    }
}

function showPermTab(tab) {
    document.getElementById('perm-roles-content').classList.toggle('hidden', tab !== 'roles');
    document.getElementById('perm-staff-content').classList.toggle('hidden', tab !== 'staff');
    document.getElementById('perm-tab-roles').className = tab === 'roles' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm';
    document.getElementById('perm-tab-staff').className = tab === 'staff' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm';
}

function renderRolePermissions() {
    const el = document.getElementById('perm-roles-content');
    if (!el) return;
    el.innerHTML = `
        <div class="perm-grid">
            ${_roles.map(role => `
                <div class="perm-role-card">
                    <div class="perm-role-header">
                        <div class="perm-role-dot" style="background:${role.color}"></div>
                        <span class="perm-role-label" style="color:${role.color}">${role.label}</span>
                        <button class="btn btn-primary btn-xs" style="margin-left:auto" onclick="saveRolePermissions('${role.name}')">Save</button>
                    </div>
                    <div class="perm-list">
                        ${ALL_PERMS.map(p => `
                            <div class="perm-row">
                                <span class="perm-name">${p.label}</span>
                                <label class="toggle">
                                    <input type="checkbox" id="perm_${role.name}_${p.key}" ${role.permissions[p.key] ? 'checked' : ''}>
                                    <div class="toggle-track"></div>
                                    <div class="toggle-thumb"></div>
                                </label>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

async function saveRolePermissions(roleName) {
    const perms = {};
    ALL_PERMS.forEach(p => {
        const el = document.getElementById(`perm_${roleName}_${p.key}`);
        if (el) perms[p.key] = el.checked;
    });
    const ok = await caFetch('cipher-admin:server:saveRolePermissions', { role: roleName, permissions: perms });
    if (ok) {
        // Update local cache
        const role = _roles.find(r => r.name === roleName);
        if (role) role.permissions = perms;
    }
}

function renderStaffList() {
    const el = document.getElementById('perm-staff-content');
    if (!el) return;
    el.innerHTML = `
        <div class="card mb-12">
            <div class="card-header">
                <span class="card-title">Assign Role</span>
            </div>
            <div class="card-body">
                <div class="flex gap-8">
                    <div class="search-wrap" style="flex:1">
                        <span class="search-icon">⌕</span>
                        <input class="input search-input" id="staff-search" placeholder="Search player by name..." onkeydown="if(event.key==='Enter')searchStaffPlayer()">
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="searchStaffPlayer()">Search</button>
                </div>
                <div id="staff-search-results" class="mt-8"></div>
            </div>
        </div>
        <div class="card">
            <div class="card-header">
                <span class="card-title">Current Staff (${_staffList.length})</span>
            </div>
            <div class="card-body" style="padding:0">
                ${_staffList.length ? `
                    <table class="data-table">
                        <thead>
                            <tr><th>Player</th><th>Role</th><th>Assigned By</th><th>Date</th><th></th></tr>
                        </thead>
                        <tbody>
                            ${_staffList.map(s => `
                                <tr>
                                    <td class="td-name">${s.player_name}</td>
                                    <td><span class="badge" style="background:${s.role_color}22;color:${s.role_color}">${s.role_label || s.role}</span></td>
                                    <td class="text-muted">${s.assigned_by}</td>
                                    <td class="text-muted text-sm">${formatDate(s.created_at)}</td>
                                    <td><button class="btn btn-danger btn-xs" onclick="removeStaffRole('${s.citizenid}','${s.player_name}')">Remove</button></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : '<div class="empty-state"><div class="empty-icon">🔐</div><div class="empty-text">No staff assigned</div></div>'}
            </div>
        </div>
    `;
}

async function searchStaffPlayer() {
    const q = document.getElementById('staff-search')?.value?.trim();
    if (!q) return;
    const results = await caFetch('cipher-admin:server:searchCharacter', q);
    const el = document.getElementById('staff-search-results');
    if (!el) return;
    if (!results || !results.length) {
        el.innerHTML = '<div class="text-muted text-sm">No players found</div>';
        return;
    }
    const roles = _roles.length ? _roles : await caFetch('cipher-admin:server:getRoles', {}) || [];
    el.innerHTML = results.map(p => `
        <div class="flex items-center gap-8 mb-8">
            <span class="flex-1 font-bold">${p.firstname} ${p.lastname} <span class="text-muted text-sm">${p.citizenid}</span></span>
            <select class="select" style="width:130px" id="assign-role-${p.citizenid}">
                ${roles.map(r => `<option value="${r.name}" style="color:${r.color}">${r.label}</option>`).join('')}
            </select>
            <button class="btn btn-primary btn-sm" onclick="assignRole('${p.citizenid}','${p.firstname} ${p.lastname}')">Assign</button>
        </div>
    `).join('');
}

async function assignRole(cid, name) {
    const role = document.getElementById('assign-role-' + cid)?.value;
    if (!role) return;
    await caFetch('cipher-admin:server:assignRole', { citizenid: cid, playerName: name, role });
    _staffList = await caFetch('cipher-admin:server:getStaff', {}) || [];
    renderStaffList();
    showPermTab('staff');
}

async function removeStaffRole(cid, name) {
    await caFetch('cipher-admin:server:removeRole', { citizenid: cid, playerName: name });
    _staffList = _staffList.filter(s => s.citizenid !== cid);
    renderStaffList();
    showPermTab('staff');
}

window.loadPermissions       = loadPermissions;
window.showPermTab           = showPermTab;
window.saveRolePermissions   = saveRolePermissions;
window.searchStaffPlayer     = searchStaffPlayer;
window.assignRole            = assignRole;
window.removeStaffRole       = removeStaffRole;

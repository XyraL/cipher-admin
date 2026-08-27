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
    { key: 'killplayer',  label: 'Kill Player' },
    { key: 'sethealth',   label: 'Set Health / Armour' },
    { key: 'eject',       label: 'Eject From Vehicle' },
    { key: 'mute',        label: 'Mute Players' },
    { key: 'massactions', label: 'Mass Actions' },
    { key: 'viewids',     label: 'View Identifiers' },
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

    // These were declared in config.lua and enforced on the server, but had no
    // toggle here — so the only way to change them was editing the database by
    // hand. The list had fallen 13 behind: ten from the 1.1.0 feature batch and
    // three added with threat detection in 1.2.0.
    { key: 'screenshot',      label: 'Screenshot Players' },
    { key: 'slap',            label: 'Slap Players' },
    { key: 'resetpos',        label: 'Reset Position' },
    { key: 'dm',              label: 'Direct Message' },
    { key: 'summonall',       label: 'Summon All Players' },
    { key: 'giveweapon',      label: 'Give Weapons' },
    { key: 'viewentities',    label: 'Entity Inspector' },
    { key: 'reports',         label: 'Handle Reports' },
    { key: 'restartresource', label: 'Restart Resources' },
    { key: 'deletechar',      label: 'Delete Characters' },
    { key: 'viewthreats',     label: 'View Threat Panel' },
    { key: 'managethreats',   label: 'Resolve Threat Flags' },
    { key: 'viewlinked',      label: 'View Linked Accounts' },
];

async function loadPermissions() {
    const panel = document.getElementById('panel-permissions');

    if (!hasPermission('manageroles') && !hasPermission('assignroles')) {
        panel.innerHTML = emptyState('lock', 'No permission to manage roles');
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
                        <div class="perm-role-dot" style="background:${_safeColor(role.color)}"></div>
                        <span class="perm-role-label" style="color:${_safeColor(role.color)}">${esc(role.label)}</span>
                        <button class="btn btn-primary btn-xs" style="margin-left:auto" data-ca-action="saveRolePerms" data-role="${escAttr(role.name)}">Save</button>
                    </div>
                    <div class="perm-list">
                        ${ALL_PERMS.map(p => `
                            <div class="perm-row">
                                <span class="perm-name">${esc(p.label)}</span>
                                <label class="toggle">
                                    <input type="checkbox" id="perm_${esc(role.name)}_${p.key}" ${(role.permissions || {})[p.key] ? 'checked' : ''}>
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
                                    <td class="td-name">${esc(s.player_name)}</td>
                                    <td><span class="badge" style="background:${_safeColor(s.role_color)}22;color:${_safeColor(s.role_color)}">${esc(s.role_label || s.role)}</span></td>
                                    <td class="text-muted">${esc(s.assigned_by)}</td>
                                    <td class="text-muted text-sm">${esc(formatDate(s.created_at))}</td>
                                    <td><button class="btn btn-danger btn-xs" data-ca-action="removeStaffRole" data-cid="${escAttr(s.citizenid)}" data-name="${escAttr(s.player_name || '')}">Remove</button></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : emptyState('permissions', 'No staff assigned')}
            </div>
        </div>
    `;
}

// Role colours come from config and land inside style attributes, where
// escaping alone wouldn't stop a value like "red;position:fixed" from
// restyling the panel — so they're whitelisted to a hex literal instead.
function _safeColor(c) {
    return /^#[0-9a-fA-F]{3,8}$/.test(c || '') ? c : 'var(--accent)';
}

caAction('saveRolePerms',  (d) => saveRolePermissions(d.role));
caAction('removeStaffRole', (d) => removeStaffRole(d.cid, d.name));
caAction('assignRole',     (d) => assignRole(d.cid, d.name));

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
            <span class="flex-1 font-bold">${esc(p.firstname)} ${esc(p.lastname)} <span class="text-muted text-sm">${esc(p.citizenid)}</span></span>
            <select class="select" style="width:130px" id="assign-role-${escAttr(p.citizenid)}">
                ${roles.map(r => `<option value="${escAttr(r.name)}" style="color:${_safeColor(r.color)}">${esc(r.label)}</option>`).join('')}
            </select>
            <button class="btn btn-primary btn-sm" data-ca-action="assignRole"
                data-cid="${escAttr(p.citizenid)}" data-name="${escAttr(p.firstname + ' ' + p.lastname)}">Assign</button>
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

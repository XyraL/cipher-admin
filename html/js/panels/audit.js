// Cipher-Admin — Audit Log Panel

const AUDIT_ACTIONS = [
    'KICK','WARN','TEMPBAN','PERMBAN','UNBAN',
    'FREEZE','UNFREEZE','REVIVE','HEAL','GOTO','BRING','SPECTATE',
    'GIVE_ITEM','REMOVE_ITEM','CLEAR_INVENTORY',
    'SPAWN_VEHICLE','DELETE_VEHICLE',
    'SET_JOB','SET_CASH','SET_BANK',
    'ANNOUNCEMENT','SET_WEATHER','SET_TIME',
    'ADD_NOTE','ASSIGN_ROLE','REMOVE_ROLE','EDIT_ROLE',
    'STRIP_WEAPONS',
];

const AUDIT_ICONS = {
    KICK:'👢', WARN:'⚠️', TEMPBAN:'⏱', PERMBAN:'🔨', UNBAN:'✅',
    FREEZE:'🧊', UNFREEZE:'🔥', REVIVE:'💚', HEAL:'💊',
    GOTO:'📍', BRING:'🔗', SPECTATE:'👁',
    GIVE_ITEM:'📦', REMOVE_ITEM:'📤', CLEAR_INVENTORY:'🗑',
    SPAWN_VEHICLE:'🚗', DELETE_VEHICLE:'💥',
    SET_JOB:'💼', SET_CASH:'💵', SET_BANK:'🏦',
    ANNOUNCEMENT:'📢', SET_WEATHER:'🌤', SET_TIME:'🕐',
    ADD_NOTE:'📝', ASSIGN_ROLE:'🔐', REMOVE_ROLE:'🗑', EDIT_ROLE:'✏️',
    STRIP_WEAPONS:'🔫',
};

async function loadAudit() {
    const panel = document.getElementById('panel-audit');

    if (!hasPermission('viewaudit')) {
        panel.innerHTML = '<div class="empty-state"><div class="empty-icon">🔒</div><div class="empty-text">No permission to view audit log</div></div>';
        return;
    }

    panel.innerHTML = `
        <div class="section-header mb-12">
            <div>
                <div class="section-title">Audit Log</div>
                <div class="section-sub">Full record of all admin actions</div>
            </div>
            <button class="btn btn-ghost btn-sm" onclick="loadAudit()">↻ Refresh</button>
        </div>
        <div class="card mb-12">
            <div class="card-body">
                <div class="flex gap-8" style="flex-wrap:wrap">
                    <select class="select" style="width:180px" id="audit-action-filter">
                        <option value="">All Actions</option>
                        ${AUDIT_ACTIONS.map(a => `<option value="${a}">${AUDIT_ICONS[a]||''} ${a.replace(/_/g,' ')}</option>`).join('')}
                    </select>
                    <input class="input" style="width:160px" id="audit-admin-filter" placeholder="Filter by admin...">
                    <input class="input" type="date" id="audit-from" style="width:145px">
                    <input class="input" type="date" id="audit-to" style="width:145px">
                    <button class="btn btn-primary btn-sm" onclick="runAuditSearch()">Search</button>
                    <button class="btn btn-ghost btn-sm" onclick="clearAuditSearch()">Clear</button>
                </div>
            </div>
        </div>
        <div class="card">
            <div class="card-body" style="padding:0">
                <div id="audit-results">
                    <div class="empty-state"><div class="empty-icon">≡</div><div class="empty-text">Loading...</div></div>
                </div>
            </div>
        </div>
    `;
    await runAuditSearch();
}

async function runAuditSearch() {
    const action   = document.getElementById('audit-action-filter')?.value || '';
    const admin    = document.getElementById('audit-admin-filter')?.value?.trim() || '';
    const dateFrom = document.getElementById('audit-from')?.value || '';
    const dateTo   = document.getElementById('audit-to')?.value   || '';

    const rows = await caFetch('cipher-admin:server:getAudit', { action, admin, dateFrom, dateTo });
    renderAuditTable(rows || []);
}

function clearAuditSearch() {
    const fields = ['audit-action-filter','audit-admin-filter','audit-from','audit-to'];
    fields.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    runAuditSearch();
}

function renderAuditTable(rows) {
    const el = document.getElementById('audit-results');
    if (!el) return;
    if (!rows.length) {
        el.innerHTML = '<div class="empty-state"><div class="empty-icon">≡</div><div class="empty-text">No entries found</div></div>';
        return;
    }
    el.innerHTML = `
        <table class="data-table audit-table">
            <thead>
                <tr>
                    <th style="width:32px"></th>
                    <th>Action</th>
                    <th>Admin</th>
                    <th>Target</th>
                    <th>Details</th>
                    <th>Time</th>
                </tr>
            </thead>
            <tbody>
                ${rows.map(r => `
                    <tr>
                        <td style="font-size:15px;text-align:center">${AUDIT_ICONS[r.action] || '◈'}</td>
                        <td class="td-action">${r.action.replace(/_/g,' ')}</td>
                        <td style="color:var(--accent);font-weight:600">${r.admin_name}</td>
                        <td class="text-muted">${r.target_name || '—'}</td>
                        <td class="text-muted truncate" style="max-width:200px">${r.details || '—'}</td>
                        <td class="text-muted text-sm" title="${r.created_at}">${timeAgo(r.created_at)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

window.loadAudit        = loadAudit;
window.runAuditSearch   = runAuditSearch;
window.clearAuditSearch = clearAuditSearch;

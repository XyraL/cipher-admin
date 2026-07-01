// Cipher-Admin — Dashboard Panel

function loadDashboard(data) {
    const panel = document.getElementById('panel-dashboard');

    const perms = CA.admin && CA.admin.permissions || {};
    const isOwnerOrSA = CA.admin && (CA.admin.isOwner || CA.admin.role === 'senioradmin');

    panel.innerHTML = `
        <div class="stat-grid">
            <div class="stat-card">
                <div class="stat-label">Players Online</div>
                <div class="stat-value green">${data.playerCount}</div>
                <div class="stat-change">${data.onlineAdmins} admin${data.onlineAdmins !== 1 ? 's' : ''} online</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Active Bans</div>
                <div class="stat-value red">${data.activeBans}</div>
                <div class="stat-change">${data.bansToday} issued today</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Warnings Today</div>
                <div class="stat-value amber">${data.warnToday}</div>
                <div class="stat-change">across all players</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">My Role</div>
                <div class="stat-value accent" style="font-size:18px;line-height:1.4">${CA.admin.roleLabel || 'Owner'}</div>
                <div class="stat-change" style="color:${CA.admin.roleColor}">${CA.admin.isOwner ? 'Full Access' : 'Permission-based'}</div>
            </div>
        </div>

        <div class="dash-grid">
            <div class="card">
                <div class="card-header">
                    <span class="card-title">Quick Actions</span>
                </div>
                <div class="card-body">
                    <div class="quick-actions">
                        ${hasPermission('announcement') ? `<button class="quick-btn" onclick="openAnnouncementModal()"><span class="qb-icon">📢</span> Announce</button>` : ''}
                        ${hasPermission('weather')      ? `<button class="quick-btn" onclick="openWeatherModal()"><span class="qb-icon">🌤</span> Weather</button>` : ''}
                        ${hasPermission('time')         ? `<button class="quick-btn" onclick="openTimeModal()"><span class="qb-icon">🕐</span> Set Time</button>` : ''}
                        ${hasPermission('noclip')       ? `<button class="quick-btn" onclick="toggleNoclip()"><span class="qb-icon">🚀</span> Noclip</button>` : ''}
                        ${hasPermission('invisible')    ? `<button class="quick-btn" onclick="toggleInvisible()"><span class="qb-icon">👻</span> Invisible</button>` : ''}
                        <button class="quick-btn" onclick="switchPanel('players')"><span class="qb-icon">👥</span> Players</button>
                        <button class="quick-btn" onclick="switchPanel('spawner')"><span class="qb-icon">🚗</span> Spawner</button>
                        <button class="quick-btn" onclick="switchPanel('bans')"><span class="qb-icon">⊘</span> Bans</button>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <span class="card-title">Recent Activity</span>
                    <button class="btn btn-ghost btn-sm" onclick="switchPanel('audit')">View All</button>
                </div>
                <div class="card-body" id="dash-activity">
                    <div class="empty-state"><div class="empty-icon">≡</div><div class="empty-text">Loading activity...</div></div>
                </div>
            </div>
        </div>
    `;

    loadRecentActivity();
}

async function loadRecentActivity() {
    if (!hasPermission('viewaudit')) {
        document.getElementById('dash-activity').innerHTML = '<div class="empty-state"><div class="empty-icon">🔒</div><div class="empty-text">No audit access</div></div>';
        return;
    }
    const rows = await caFetch('cipher-admin:server:getAudit', {});
    const el   = document.getElementById('dash-activity');
    if (!el) return;
    if (!rows || !rows.length) {
        el.innerHTML = '<div class="empty-state"><div class="empty-icon">≡</div><div class="empty-text">No activity yet</div></div>';
        return;
    }
    const ICONS = {
        KICK: '👢', PERMBAN: '🔨', TEMPBAN: '⏱', UNBAN: '✅',
        WARN: '⚠️', FREEZE: '🧊', REVIVE: '💚', HEAL: '💊',
        GOTO: '📍', BRING: '🔗', SPECTATE: '👁', GIVE_ITEM: '📦',
        SPAWN_VEHICLE: '🚗', SET_JOB: '💼', ANNOUNCEMENT: '📢',
        SET_WEATHER: '🌤', SET_TIME: '🕐', ADD_NOTE: '📝',
        ASSIGN_ROLE: '🔐', REMOVE_ROLE: '🗑',
    };
    el.innerHTML = rows.slice(0, 12).map(r => `
        <div class="activity-item">
            <div class="activity-icon">${ICONS[r.action] || '◈'}</div>
            <div class="activity-body">
                <div class="activity-action">${r.action.replace(/_/g,' ')}</div>
                <div class="activity-detail">${r.admin_name}${r.target_name ? ' → ' + r.target_name : ''}${r.details ? ' · ' + r.details : ''}</div>
            </div>
            <div class="activity-time">${timeAgo(r.created_at)}</div>
        </div>
    `).join('');
}

// ── Announcement modal ────────────────────────────────────────────────────────
function openAnnouncementModal() {
    openModal('Server Announcement', `
        <div class="form-group">
            <label>Message</label>
            <textarea class="input" id="ann-msg" rows="4" placeholder="Type your announcement..." style="resize:vertical"></textarea>
        </div>
        <div class="form-group">
            <label>Type</label>
            <select class="select" id="ann-type">
                <option value="inform">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Alert</option>
            </select>
        </div>
    `, `
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="sendAnnouncement()">Send</button>
    `);
}

async function sendAnnouncement() {
    const msg  = document.getElementById('ann-msg').value.trim();
    const type = document.getElementById('ann-type').value;
    if (!msg) return;
    await caFetch('cipher-admin:server:announce', { message: msg, type });
    closeModal();
}

// ── Weather modal ─────────────────────────────────────────────────────────────
function openWeatherModal() {
    const weathers = ['CLEAR','EXTRASUNNY','CLOUDS','OVERCAST','RAIN','CLEARING','THUNDER','SMOG','FOGGY','XMAS','SNOWLIGHT','BLIZZARD','NEUTRAL'];
    openModal('Set Weather', `
        <div class="form-group">
            <label>Weather Type</label>
            <select class="select" id="weather-type">
                ${weathers.map(w => `<option value="${w}">${w}</option>`).join('')}
            </select>
        </div>
    `, `
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="setWeather()">Apply</button>
    `);
}

async function setWeather() {
    const weather = document.getElementById('weather-type').value;
    await caFetch('cipher-admin:server:setWeather', { weather });
    closeModal();
}

// ── Time modal ────────────────────────────────────────────────────────────────
function openTimeModal() {
    openModal('Set Time', `
        <div class="flex gap-8">
            <div class="form-group w-full">
                <label>Hour (0-23)</label>
                <input class="input" type="number" id="time-hour" min="0" max="23" value="12">
            </div>
            <div class="form-group w-full">
                <label>Minute (0-59)</label>
                <input class="input" type="number" id="time-min" min="0" max="59" value="0">
            </div>
        </div>
        <div class="flex gap-8 mt-8">
            ${[6,8,12,18,20,0].map(h => `<button class="btn btn-ghost btn-sm" onclick="setTimePreset(${h})">${String(h).padStart(2,'0')}:00</button>`).join('')}
        </div>
    `, `
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="setTime()">Apply</button>
    `);
}

function setTimePreset(h) {
    document.getElementById('time-hour').value = h;
    document.getElementById('time-min').value  = 0;
}

async function setTime() {
    const hour   = parseInt(document.getElementById('time-hour').value) || 0;
    const minute = parseInt(document.getElementById('time-min').value)  || 0;
    await caFetch('cipher-admin:server:setTime', { hour, minute });
    closeModal();
}

// ── Self actions ──────────────────────────────────────────────────────────────
function toggleNoclip() {
    fetch('https://cipher-admin/playerAction', {
        method: 'POST', body: JSON.stringify({ action: 'noclip' })
    });
}

function toggleInvisible() {
    fetch('https://cipher-admin/playerAction', {
        method: 'POST', body: JSON.stringify({ action: 'invisible' })
    });
}

window.loadDashboard        = loadDashboard;
window.openAnnouncementModal = openAnnouncementModal;
window.sendAnnouncement     = sendAnnouncement;
window.openWeatherModal     = openWeatherModal;
window.setWeather           = setWeather;
window.openTimeModal        = openTimeModal;
window.setTimePreset        = setTimePreset;
window.setTime              = setTime;
window.toggleNoclip         = toggleNoclip;
window.toggleInvisible      = toggleInvisible;

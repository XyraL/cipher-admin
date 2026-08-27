// Cipher-Admin — Dashboard Panel

function loadDashboard(data) {
    const panel = document.getElementById('panel-dashboard');

    const perms = CA.admin && CA.admin.permissions || {};
    const isOwnerOrSA = CA.admin && (CA.admin.isOwner || CA.admin.role === 'senioradmin');

    const cap  = data.maxPlayers || 64;
    const pct  = Math.min(100, Math.round((data.playerCount / cap) * 100));
    const hour = new Date().getHours();
    const greet = hour < 5 ? 'Late shift' : hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';

    panel.innerHTML = `
        <div class="dash-hero">
            <div>
                <div class="dash-greet">${esc(greet)}, ${esc((CA.admin.name || 'Admin').split(' ')[0])}</div>
                <div class="dash-server">${esc(CA.serverName || 'Server')}</div>
            </div>
            <div class="dash-hero-right">
                <div class="dash-capacity">
                    <div class="dash-capacity-top">
                        <span>${escNum(data.playerCount)} / ${escNum(cap)}</span>
                        <span class="text-muted">${escNum(pct)}%</span>
                    </div>
                    <div class="capacity-bar"><div class="capacity-fill" style="width:${escNum(pct)}%"></div></div>
                </div>
            </div>
        </div>

        <div class="stat-grid">
            <div class="stat-card stat-clickable" onclick="switchPanel('players')">
                <div class="stat-label">Players Online</div>
                <div class="stat-value green">${escNum(data.playerCount)}</div>
                <div class="stat-change">${escNum(data.onlineAdmins)} admin${data.onlineAdmins !== 1 ? 's' : ''} online</div>
            </div>
            <div class="stat-card stat-clickable" onclick="switchPanel('threats')">
                <div class="stat-label">Unresolved Threats</div>
                <div class="stat-value" id="dash-threat-value">—</div>
                <div class="stat-change" id="dash-threat-sub">checking...</div>
            </div>
            <div class="stat-card stat-clickable" onclick="switchPanel('bans')">
                <div class="stat-label">Active Bans</div>
                <div class="stat-value red">${escNum(data.activeBans)}</div>
                <div class="stat-change">${escNum(data.bansToday)} issued today</div>
            </div>
            <div class="stat-card stat-clickable" onclick="switchPanel('reports')">
                <div class="stat-label">Open Reports</div>
                <div class="stat-value amber" id="dash-report-value">—</div>
                <div class="stat-change">${escNum(data.warnToday)} warnings today</div>
            </div>
        </div>

        <div id="dash-duty-section" class="card mb-12">
            <div class="card-header">
                <span class="card-title">On-Duty Staff</span>
                <span id="dash-duty-count" class="badge badge-muted">loading...</span>
            </div>
            <div class="card-body" id="dash-duty-list" style="padding:8px 12px">
                <div class="text-muted text-sm">Loading...</div>
            </div>
        </div>

        <div class="dash-grid">
            <div class="card">
                <div class="card-header">
                    <span class="card-title">Quick Actions</span>
                </div>
                <div class="card-body">
                    <div class="quick-actions">
                        ${hasPermission('announcement') ? `<button class="quick-btn" onclick="openAnnouncementModal()">${icon('adminchat', 'qb-icon')} Announce</button>` : ''}
                        ${hasPermission('weather')      ? `<button class="quick-btn" onclick="openWeatherModal()">${icon('weather', 'qb-icon')} Weather</button>` : ''}
                        ${hasPermission('time')         ? `<button class="quick-btn" onclick="openTimeModal()">${icon('clock', 'qb-icon')} Set Time</button>` : ''}
                        ${hasPermission('noclip')       ? `<button class="quick-btn" onclick="toggleNoclip()">${icon('entities', 'qb-icon')} Noclip</button>` : ''}
                        ${hasPermission('invisible')    ? `<button class="quick-btn" onclick="toggleInvisible()">${icon('spectate', 'qb-icon')} Invisible</button>` : ''}
                        <button class="quick-btn" onclick="switchPanel('players')">${icon('players', 'qb-icon')} Players</button>
                        <button class="quick-btn" onclick="switchPanel('spawner')">${icon('spawner', 'qb-icon')} Spawner</button>
                        <button class="quick-btn" onclick="switchPanel('bans')">${icon('bans', 'qb-icon')} Bans</button>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <span class="card-title">Recent Activity</span>
                    <button class="btn btn-ghost btn-sm" onclick="switchPanel('audit')">View All</button>
                </div>
                <div class="card-body" id="dash-activity">
                    <div class="empty-state"><div class="empty-text">Loading activity...</div></div>
                </div>
            </div>
        </div>
    `;

    loadRecentActivity();
    loadDutyAdmins();
    loadDashLive();
}

// The two tiles that need their own round trip. Both fail quiet: a dashboard
// that renders with a dash in one tile is better than one that does not render.
async function loadDashLive() {
    if (hasPermission('viewthreats')) {
        const t = await caFetch('cipher-admin:server:getThreats', { unhandled: true });
        const v = document.getElementById('dash-threat-value');
        const s = document.getElementById('dash-threat-sub');
        if (v && t) {
            v.textContent = t.unhandled || 0;
            v.className = 'stat-value ' + (t.unhandled > 0 ? 'red' : 'green');
            if (s) s.textContent = `${t.last24 || 0} in the last 24h`;
        } else if (v) {
            v.textContent = '0';
            v.className = 'stat-value green';
            if (s) s.textContent = 'nothing flagged';
        }
    } else {
        const v = document.getElementById('dash-threat-value');
        const s = document.getElementById('dash-threat-sub');
        if (v) v.textContent = '—';
        if (s) s.textContent = 'no access';
    }

    const reports = await caFetch('cipher-admin:server:getReports', { status: 'open' });
    const rv = document.getElementById('dash-report-value');
    if (rv) rv.textContent = Array.isArray(reports) ? reports.length : 0;
}

async function loadRecentActivity() {
    if (!hasPermission('viewaudit')) {
        document.getElementById('dash-activity').innerHTML = emptyState('lock', 'No audit access');
        return;
    }
    const rows = await caFetch('cipher-admin:server:getAudit', {});
    const el   = document.getElementById('dash-activity');
    if (!el) return;
    if (!rows || !rows.length) {
        el.innerHTML = emptyState('list', 'No activity yet');
        return;
    }
    el.innerHTML = rows.slice(0, 12).map(r => `
        <div class="activity-item">
            <div class="activity-icon">${actionIcon(r.action)}</div>
            <div class="activity-body">
                <div class="activity-action">${r.action.replace(/_/g,' ')}</div>
                <div class="activity-detail">${esc(r.admin_name)}${r.target_name ? ' → ' + r.target_name : ''}${r.details ? ' · ' + r.details : ''}</div>
            </div>
            <div class="activity-time">${timeAgo(r.created_at)}</div>
        </div>
    `).join('');
}

async function loadDutyAdmins() {
    const list  = document.getElementById('dash-duty-list');
    const count = document.getElementById('dash-duty-count');
    if (!list) return;
    const duty = await caFetch('cipher-admin:server:getDutyAdmins', {}) || {};
    CA.dutyAdmins = duty;
    const entries = Object.entries(duty);
    if (count) count.textContent = entries.length + ' online';
    if (!entries.length) {
        list.innerHTML = '<div class="text-muted text-sm">No staff on duty</div>';
        return;
    }
    list.innerHTML = entries.map(([cid, a]) => {
        const mins = Math.floor((Date.now() / 1000 - (a.since || 0)) / 60);
        const dur  = mins < 60 ? mins + 'm' : Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm';
        return `<div class="flex items-center gap-8" style="padding:4px 0;border-bottom:1px solid var(--border)">
            <span class="status-dot online"></span>
            <span style="flex:1;font-size:13px">${esc(a.name)}</span>
            <span class="badge badge-muted" style="background:${a.roleColor}22;color:${a.roleColor}">${a.roleLabel}</span>
            <span class="text-muted text-sm">${dur}</span>
        </div>`;
    }).join('');
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
window.loadDutyAdmins       = loadDutyAdmins;
window.openAnnouncementModal = openAnnouncementModal;
window.sendAnnouncement     = sendAnnouncement;
window.openWeatherModal     = openWeatherModal;
window.setWeather           = setWeather;
window.openTimeModal        = openTimeModal;
window.setTimePreset        = setTimePreset;
window.setTime              = setTime;
window.toggleNoclip         = toggleNoclip;
window.toggleInvisible      = toggleInvisible;

// Cipher-Admin — Server Stats Panel

function loadStats() {
    const panel = document.getElementById('panel-stats');
    if (!panel) return;

    panel.innerHTML = '<div class="empty-state"><div class="empty-icon">&#x23F3;</div><div class="empty-text">Loading stats...</div></div>';

    caFetch('cipher-admin:server:getStats', {}).then(function(d) {
        if (!d || typeof d !== 'object') {
            panel.innerHTML = '<div class="empty-state"><div class="empty-icon">&#x26A0;</div><div class="empty-text">No response from server — check server console</div></div>';
            return;
        }
        if (d.error) {
            panel.innerHTML = '<div class="empty-state"><div class="empty-icon">&#x26A0;</div><div class="empty-text">Error: ' + d.error + '</div></div>';
            return;
        }
        renderStats(panel, d);
    }).catch(function(e) {
        panel.innerHTML = '<div class="empty-state"><div class="empty-icon">&#x26A0;</div><div class="empty-text">Fetch error: ' + e + '</div></div>';
    });
}

function renderStats(panel, d) {
    const uptime  = _fmtUptime(d.uptimeSeconds || 0);
    const players  = d.playerCount   || 0;
    const maxPlayers = d.maxPlayers  || 32;
    const fillPct = Math.min(Math.round((players / Math.max(maxPlayers, 1)) * 100), 100);
    const started = d.resourcesStarted || 0;
    const total   = d.resourceCount    || 1;
    const resPct  = Math.round((started / Math.max(total, 1)) * 100);

    panel.innerHTML =
        '<div class="section-header mb-12">'
        + '<div><div class="section-title">Server Stats</div>'
        + '<div class="section-sub">' + esc(d.serverName || 'Unknown') + '</div></div>'
        + '<button class="btn btn-ghost btn-sm" onclick="loadStats()">&#x21BB; Refresh</button>'
        + '</div>'

        + '<div class="stats-grid">'
        + _statCard('&#x1F465;', 'Players', players + ' / ' + maxPlayers, fillPct + '% capacity', _barHtml(fillPct, 'var(--accent)'))
        + _statCard('&#x23F1;', 'Uptime', uptime, 'Since last restart', null)
        + _statCard('&#x25A6;', 'Resources', started + ' running', (d.resourcesStopped || 0) + ' stopped', _barHtml(resPct, 'var(--green)'))
        + _statCard('&#x1F310;', 'OneSync', d.onesync || 'off', 'Networking mode', null)
        + '</div>'

        + '<div class="self-section-title" style="margin-top:16px">Player Capacity</div>'
        + '<div class="card mb-12"><div class="card-body">'
        + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">'
        + '<div style="flex:1;height:12px;background:var(--bg-elevated);border-radius:6px;overflow:hidden">'
        + '<div style="width:' + fillPct + '%;height:100%;background:var(--accent);border-radius:6px"></div>'
        + '</div>'
        + '<span class="text-sm text-muted">' + players + ' / ' + maxPlayers + '</span>'
        + '</div>'
        + '<div class="profile-row"><span class="profile-row-label">Online</span><span class="profile-row-value">' + players + '</span></div>'
        + '<div class="profile-row"><span class="profile-row-label">Slots free</span><span class="profile-row-value">' + (maxPlayers - players) + '</span></div>'
        + '</div></div>'

        + '<div class="self-section-title">Resources</div>'
        + '<div class="card"><div class="card-body">'
        + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">'
        + '<div style="flex:1;height:12px;background:var(--bg-elevated);border-radius:6px;overflow:hidden">'
        + '<div style="width:' + resPct + '%;height:100%;background:var(--green);border-radius:6px"></div>'
        + '</div>'
        + '<span class="text-sm text-muted">' + started + ' / ' + total + '</span>'
        + '</div>'
        + '<div class="profile-row"><span class="profile-row-label">Total</span><span class="profile-row-value">' + total + '</span></div>'
        + '<div class="profile-row"><span class="profile-row-label"><span style="color:var(--green)">&#x25CF;</span> Started</span><span class="profile-row-value">' + started + '</span></div>'
        + '<div class="profile-row"><span class="profile-row-label"><span style="color:var(--text-muted)">&#x25CF;</span> Stopped</span><span class="profile-row-value">' + (d.resourcesStopped || 0) + '</span></div>'
        + (d.resourcesOther > 0 ? '<div class="profile-row"><span class="profile-row-label"><span style="color:var(--amber)">&#x25CF;</span> Other</span><span class="profile-row-value">' + d.resourcesOther + '</span></div>' : '')
        + '</div></div>';
}

function _statCard(icon, label, value, sub, extra) {
    return '<div class="card"><div class="card-body">'
        + '<div style="font-size:22px;margin-bottom:6px">' + icon + '</div>'
        + '<div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.07em">' + label + '</div>'
        + '<div style="font-size:17px;font-weight:700;color:var(--text-primary);margin:4px 0">' + value + '</div>'
        + '<div style="font-size:11px;color:var(--text-muted)">' + sub + '</div>'
        + (extra || '')
        + '</div></div>';
}

function _barHtml(pct, color) {
    return '<div style="margin-top:8px;height:4px;background:var(--bg-elevated);border-radius:2px;overflow:hidden">'
        + '<div style="width:' + pct + '%;height:100%;background:' + color + ';border-radius:2px"></div></div>';
}

function _fmtUptime(secs) {
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (d > 0) return d + 'd ' + h + 'h ' + m + 'm';
    if (h > 0) return h + 'h ' + m + 'm';
    return m + 'm';
}


window.loadStats = loadStats;

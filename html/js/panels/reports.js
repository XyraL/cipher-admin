// Cipher-Admin — Reports Panel

let _reports      = [];
let _reportStatus = 'open';

function loadReports() {
    caFetch('cipher-admin:server:getReports', { status: _reportStatus }).then(function(data) {
        _reports = data || [];
        renderReports();
    });
}

function renderReports() {
    const panel = document.getElementById('panel-reports');
    if (!panel) return;

    const statusBtns = ['open', 'claimed', 'responded', 'closed', 'all'].map(function (s) {
        return '<button class="btn ' + (_reportStatus === s ? 'btn-primary' : 'btn-ghost') + ' btn-sm"'
             + ' data-ca-action="reportStatus" data-status="' + escAttr(s) + '">'
             + s.charAt(0).toUpperCase() + s.slice(1) + '</button>';
    }).join('');

    let rows = '';
    for (let i = 0; i < _reports.length; i++) {
        const r = _reports[i];
        const statusColor = { open: 'var(--amber)', claimed: 'var(--blue)', responded: 'var(--green)', closed: 'var(--text-muted)' }[r.status] || 'var(--text-muted)';
        rows += '<tr>'
              + '<td class="text-muted">#' + escNum(r.id) + '</td>'
              + '<td class="td-name">' + esc(r.player_name || 'Unknown') + '</td>'
              + '<td style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(r.message || '') + '</td>'
              + '<td><span style="color:' + statusColor + '">' + esc(r.status || 'open') + '</span>'
              + (r.assigned_to ? ' <span class="text-muted text-sm">&#x2192; ' + esc(r.assigned_to) + '</span>' : '') + '</td>'
              + '<td class="text-muted text-sm">' + esc(_fmtReportTime(r.created_at)) + '</td>'
              + '<td style="text-align:right">'
              + (r.status !== 'closed'
                  ? '<button class="btn btn-ghost btn-xs" data-ca-action="reportManage" data-id="' + escNum(r.id) + '">Manage</button>'
                  : '<span class="text-muted text-sm">Closed</span>')
              + '</td>'
              + '</tr>';
    }

    panel.innerHTML = '<div class="section-header mb-12">'
        + '<div><div class="section-title">Player Reports</div>'
        + '<div class="section-sub">Player-submitted reports — /report in-game</div></div>'
        + '<button class="btn btn-ghost btn-sm" onclick="loadReports()">&#x21BB; Refresh</button>'
        + '</div>'
        + '<div class="flex gap-4 mb-12" style="flex-wrap:wrap">' + statusBtns + '</div>'
        + '<div class="card"><div class="card-body" style="padding:0">'
        + (rows ? '<table class="data-table"><thead><tr><th>#</th><th>Player</th><th>Message</th><th>Status</th><th>Time</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>'
               : '<div class="empty-state"><div class="empty-icon">'+icon('reports')+'</div><div class="empty-text">No reports</div></div>')
        + '</div></div>';
}

// Reports are looked up by id from the last-rendered list rather than having
// the whole record — including a player-written message — marshalled through
// an HTML attribute as JSON and parsed back out.
function _findReport(id) {
    return (_reports || []).find((r) => String(r.id) === String(id)) || null;
}

function openReportActions(r) {
    if (!r) return;
    let opts = '';
    if (r.status === 'open' || r.status === 'responded') {
        opts += '<button class="btn btn-primary btn-sm" data-ca-action="reportClaim" data-id="' + escNum(r.id) + '">Claim</button> ';
    }
    opts += '<button class="btn btn-ghost btn-sm" data-ca-action="reportRespond" data-id="' + escNum(r.id) + '">Respond</button> ';
    opts += '<button class="btn btn-danger btn-sm" data-ca-action="reportClose" data-id="' + escNum(r.id) + '">Close</button>';

    openModal('Report #' + r.id + ' — ' + (r.player_name || '?'),
        '<div class="profile-section">'
        + '<div class="profile-row"><span class="profile-row-label">Player</span><span class="profile-row-value">' + esc(r.player_name || '?') + '</span></div>'
        + '<div class="profile-row"><span class="profile-row-label">Status</span><span class="profile-row-value">' + esc(r.status || 'open') + (r.assigned_to ? ' (' + esc(r.assigned_to) + ')' : '') + '</span></div>'
        + '<div class="profile-row"><span class="profile-row-label">Time</span><span class="profile-row-value">' + esc(_fmtReportTime(r.created_at)) + '</span></div>'
        + '</div>'
        + '<div class="form-group"><label>Message</label><div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 12px;color:var(--text-primary)">' + esc(r.message || '') + '</div></div>'
        + (r.response ? '<div class="form-group"><label>Previous Response</label><div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 12px;color:var(--green)">' + esc(r.response) + '</div></div>' : ''),
        '<button class="btn btn-ghost" onclick="closeModal()">Close</button> ' + opts);
}

function doClaimReport(id) {
    closeModal();
    caFetch('cipher-admin:server:claimReport', { id: id }).then(loadReports);
}

function openRespondModal(r) {
    if (!r) return;
    closeModal();
    openModal('Respond to Report #' + r.id,
        '<div class="form-group"><label>Message</label><div class="text-muted text-sm mb-8">' + esc(r.message || '') + '</div></div>'
        + '<div class="form-group"><label>Response</label><textarea class="input" id="report-resp" rows="3" placeholder="Type your response..." style="resize:vertical;min-height:80px"></textarea></div>',
        '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'
        + '<button class="btn btn-primary" data-ca-action="reportSend" data-id="' + escNum(r.id) + '">Send</button>');
}

caAction('reportStatus',  (d) => { _reportStatus = d.status; loadReports(); });
caAction('reportManage',  (d) => openReportActions(_findReport(d.id)));
caAction('reportClaim',   (d) => doClaimReport(Number(d.id)));
caAction('reportRespond', (d) => openRespondModal(_findReport(d.id)));
caAction('reportClose',   (d) => doCloseReport(Number(d.id)));
caAction('reportSend',    (d) => doRespondReport(_findReport(d.id)));

function doRespondReport(r) {
    if (!r) return;
    const resp = (document.getElementById('report-resp') || {}).value || '';
    if (!resp.trim()) return;
    closeModal();
    caFetch('cipher-admin:server:respondReport', { id: r.id, citizenid: r.citizenid, player_name: r.player_name, response: resp.trim() }).then(loadReports);
}

function doCloseReport(id) {
    closeModal();
    caFetch('cipher-admin:server:closeReport', { id: id }).then(loadReports);
}

function _fmtReportTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}


window.loadReports       = loadReports;
window.renderReports     = renderReports;
window.openReportActions = openReportActions;
window.doClaimReport     = doClaimReport;
window.openRespondModal  = openRespondModal;
window.doRespondReport   = doRespondReport;
window.doCloseReport     = doCloseReport;

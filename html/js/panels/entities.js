// Cipher-Admin — Entity Inspector Panel

var _entityRadius = 150;

function loadEntities() {
    var panel = document.getElementById('panel-entities');
    if (!panel) return;

    panel.innerHTML = '<div class="empty-state"><div class="empty-icon">&#x23F3;</div><div class="empty-text">Scanning nearby entities...</div></div>';

    fetch('https://cipher-admin/ca_getEntities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ radius: _entityRadius }),
    }).then(function(r) { return r.text(); }).then(function(t) {
        if (!t || !t.trim() || t.trim() === 'null' || t.trim() === 'false') {
            panel.innerHTML = _entHeader() + '<div class="empty-state"><div class="empty-icon">&#x26A0;</div><div class="empty-text">No response — ensure resource is loaded</div></div>';
            return;
        }
        var data = JSON.parse(t);
        renderEntities(panel, data);
    }).catch(function(e) {
        panel.innerHTML = _entHeader() + '<div class="empty-state"><div class="empty-icon">&#x26A0;</div><div class="empty-text">Error: ' + e + '</div></div>';
    });
}

function _entHeader() {
    return '<div class="section-header mb-12">'
        + '<div><div class="section-title">Entity Inspector</div>'
        + '<div class="section-sub">Nearby vehicles and NPCs</div></div>'
        + '<div class="flex gap-4">'
        + '<select class="select" style="width:100px" onchange="_entityRadius=parseInt(this.value);loadEntities()">'
        + [50,100,150,250].map(function(r){ return '<option value="'+r+'"'+(r===_entityRadius?' selected':'')+'>'+r+'m</option>'; }).join('')
        + '</select>'
        + '<button class="btn btn-ghost btn-sm" onclick="loadEntities()">&#x21BB; Refresh</button>'
        + '</div></div>';
}

function renderEntities(panel, data) {
    var vehs = Array.isArray(data.vehicles) ? data.vehicles : [];
    var peds = Array.isArray(data.peds)     ? data.peds     : [];

    var vehRows = vehs.map(function(v) {
        return '<tr>'
            + '<td><span style="font-family:monospace;font-size:11px">' + (v.model || '?') + '</span></td>'
            + '<td class="text-muted text-sm">' + (v.plate || '') + '</td>'
            + '<td style="white-space:nowrap"><div class="hp-bar"><div class="hp-fill" style="width:' + Math.min(v.hp||0,100) + '%;background:' + _hpColor(v.hp) + '"></div></div><span class="text-sm text-muted">' + (v.hp||0) + '%</span></td>'
            + '<td class="text-muted text-sm">' + (v.dist||0) + 'm</td>'
            + '<td style="text-align:right"><button class="btn btn-danger btn-xs" onclick="deleteEntityByNet(' + (v.netId||0) + ')">&#x1F5D1;</button></td>'
            + '</tr>';
    }).join('');

    var pedRows = peds.map(function(p) {
        return '<tr>'
            + '<td class="text-muted text-sm" style="font-family:monospace;font-size:11px">' + (p.model||'?') + '</td>'
            + '<td></td>'
            + '<td style="white-space:nowrap"><div class="hp-bar"><div class="hp-fill" style="width:' + Math.min(p.hp||0,100) + '%;background:' + _hpColor(p.hp) + '"></div></div><span class="text-sm text-muted">' + (p.hp||0) + '%</span></td>'
            + '<td class="text-muted text-sm">' + (p.dist||0) + 'm</td>'
            + '<td style="text-align:right"><button class="btn btn-danger btn-xs" onclick="deleteEntityByNet(' + (p.netId||0) + ')">&#x1F5D1;</button></td>'
            + '</tr>';
    }).join('');

    var vehSection = vehs.length
        ? '<div class="self-section-title">Vehicles (' + vehs.length + ')</div>'
          + '<div class="card mb-12"><div class="card-body" style="padding:0"><table class="data-table"><thead><tr><th>Model</th><th>Plate</th><th>HP</th><th>Dist</th><th></th></tr></thead>'
          + '<tbody>' + vehRows + '</tbody></table></div></div>'
        : '<div class="self-section-title">Vehicles</div><div class="empty-state" style="margin-bottom:12px"><div class="empty-text">None nearby</div></div>';

    var pedSection = peds.length
        ? '<div class="self-section-title">NPCs (' + peds.length + ')</div>'
          + '<div class="card"><div class="card-body" style="padding:0"><table class="data-table"><thead><tr><th>Model</th><th></th><th>HP</th><th>Dist</th><th></th></tr></thead>'
          + '<tbody>' + pedRows + '</tbody></table></div></div>'
        : '<div class="self-section-title">NPCs</div><div class="empty-state"><div class="empty-text">None nearby</div></div>';

    panel.innerHTML = _entHeader() + vehSection + pedSection;
}

function deleteEntityByNet(netId) {
    if (!netId || netId === 0) return;
    fetch('https://cipher-admin/ca_deleteEntityByNet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ netId: netId }),
    }).then(function() {
        setTimeout(loadEntities, 400);
    });
}

function _hpColor(hp) {
    if (hp >= 60) return 'var(--green)';
    if (hp >= 30) return 'var(--amber)';
    return 'var(--red)';
}

window.loadEntities      = loadEntities;
window.renderEntities    = renderEntities;
window.deleteEntityByNet = deleteEntityByNet;

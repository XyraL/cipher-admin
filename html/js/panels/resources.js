// Cipher-Admin — Resource Manager Panel

let _resourceFilter = '';
let _resourceList   = [];

function loadResources() {
    const panel = document.getElementById('panel-resources');
    if (!panel) return;

    caFetch('cipher-admin:server:getResources', {}).then(function(data) {
        _resourceList = data || [];
        renderResourcesTable();
    });
}

function renderResourcesTable() {
    const panel = document.getElementById('panel-resources');
    if (!panel) return;

    let list = _resourceList;
    if (_resourceFilter) {
        const q = _resourceFilter.toLowerCase();
        list = list.filter(function(r) { return r.name.toLowerCase().indexOf(q) !== -1; });
    }

    const stateColor = { started: 'var(--green)', stopped: 'var(--red)', starting: 'var(--amber)', stopping: 'var(--amber)', uninitialized: 'var(--text-muted)', missing: 'var(--red)' };

    let rows = '';
    for (let i = 0; i < list.length; i++) {
        const r = list[i];
        const color = stateColor[r.state] || 'var(--text-muted)';
        const canRestart = hasPermission('restartresource') && r.state === 'started';
        rows += '<tr>'
              + '<td><span class="mono">' + esc(r.name) + '</span></td>'
              + '<td><span class="res-state-dot" style="background:' + color + '"></span><span style="color:' + color + '">' + esc(r.state) + '</span></td>'
              + '<td style="text-align:right">'
              + (canRestart
                  ? '<button class="btn btn-ghost btn-xs" data-ca-action="resRestart" data-name="' + escAttr(r.name) + '">&#x21BA; Restart</button>'
                  : '')
              + '</td>'
              + '</tr>';
    }

    panel.innerHTML = '<div class="section-header mb-12">'
        + '<div><div class="section-title">Resource Manager</div>'
        + '<div class="section-sub">View and restart server resources</div></div>'
        + '<button class="btn btn-ghost btn-sm" onclick="loadResources()">&#x21BB; Refresh</button>'
        + '</div>'
        + '<div class="search-bar mb-12">'
        + '<div class="search-wrap" style="flex:1"><span class="search-icon">&#x2315;</span>'
        + '<input class="input search-input" placeholder="Filter resources..." oninput="_resourceFilter=this.value;renderResourcesTable()" value="' + _resourceFilter + '">'
        + '</div>'
        + '<span class="text-muted text-sm" style="align-self:center">' + list.length + ' / ' + _resourceList.length + '</span>'
        + '</div>'
        + '<div class="card"><div class="card-body" style="padding:0">'
        + (rows ? '<table class="data-table"><thead><tr><th>Resource</th><th>State</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>'
               : '<div class="empty-state"><div class="empty-icon">&#x25A6;</div><div class="empty-text">No resources found</div></div>')
        + '</div></div>';
}

function confirmRestartResource(name) {
    openModal('Restart Resource',
        '<p style="color:var(--text-secondary)">Restart <strong style="color:var(--text-primary)">' + esc(name) + '</strong>? Players using this resource may be affected.</p>',
        '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'
        + '<button class="btn btn-amber" data-ca-action="resDoRestart" data-name="' + escAttr(name) + '">&#x21BA; Restart</button>');
}

caAction('resRestart',   (d) => confirmRestartResource(d.name));
caAction('resDoRestart', (d) => doRestartResource(d.name));

function doRestartResource(name) {
    closeModal();
    caFetch('cipher-admin:server:restartResource', { name: name }).then(function(ok) {
        if (ok) {
            setTimeout(loadResources, 2500);
        }
    });
}

window.loadResources          = loadResources;
window.renderResourcesTable   = renderResourcesTable;
window.confirmRestartResource = confirmRestartResource;
window.doRestartResource      = doRestartResource;

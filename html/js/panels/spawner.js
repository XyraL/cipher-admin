// Cipher-Admin — Vehicle Spawner Panel

let _vehicleList     = {};
let _activeCategory  = null;
let _spawnerSearch   = '';
let _vehicleSource   = '';

async function loadSpawner() {
    const panel = document.getElementById('panel-spawner');
    panel.innerHTML = `
        <div class="section-header mb-12">
            <div>
                <div class="section-title">Vehicle Spawner</div>
                <div class="section-sub">${window._spawnTargetName ? 'Spawning for: ' + window._spawnTargetName : 'Spawning for yourself'}</div>
            </div>
            ${window._spawnTargetName ? `<button class="btn btn-ghost btn-sm" onclick="clearSpawnTarget()">✕ Clear Target</button>` : ''}
        </div>
        <div class="search-bar mb-12">
            <div class="search-wrap" style="flex:1">
                <span class="search-icon">⌕</span>
                <input class="input search-input" id="spawner-search" placeholder="Search vehicles..." oninput="filterSpawner(this.value)">
            </div>
        </div>
        <div class="spawner-layout">
            <div class="spawner-categories" id="spawner-cats">Loading...</div>
            <div class="spawner-vehicles" id="spawner-veh-wrap">
                <div class="empty-state"><div class="empty-text">Select a category</div></div>
            </div>
        </div>
    `;

    if (Object.keys(_vehicleList).length === 0) {
        const data = await caFetch('cipher-admin:server:getVehicleList', {});
        // The server groups and labels; the panel renders what it is given.
        _vehicleList   = (data && data.categories) || {};
        _vehicleSource = (data && data.source) || '';
    }
    renderCategories();
    if (_activeCategory) renderVehicles(_activeCategory);
}

function renderCategories() {
    const cats = document.getElementById('spawner-cats');
    if (!cats) return;
    cats.innerHTML = Object.keys(_vehicleList).map(cat => `
        <button class="category-btn ${_activeCategory === cat ? 'active' : ''}" data-ca-action="selectCategory" data-cat="${escAttr(cat)}">${esc(cat)} <span class="text-muted text-sm">(${escNum(_vehicleList[cat].length)})</span></button>
    `).join('');
}

caAction('selectCategory', (d) => selectCategory(d.cat));
caAction('spawnVehicle',   (d) => spawnVehicle(d.model));

function selectCategory(cat) {
    _activeCategory = cat;
    _spawnerSearch  = '';
    const si = document.getElementById('spawner-search');
    if (si) si.value = '';
    renderCategories();
    renderVehicles(cat);
}

function filterSpawner(q) {
    _spawnerSearch = q.toLowerCase();
    if (_spawnerSearch) {
        // Search hits the readable label as well as the spawn name, so "sultan"
        // and "Karin" both find the same car.
        const all = Object.values(_vehicleList).flat();
        renderVehicleList(all.filter(v =>
            v.model.toLowerCase().includes(_spawnerSearch) ||
            (v.label || '').toLowerCase().includes(_spawnerSearch)));
    } else if (_activeCategory) {
        renderVehicles(_activeCategory);
    }
}

function renderVehicles(cat) {
    renderVehicleList(_vehicleList[cat] || []);
}

function renderVehicleList(list) {
    const wrap = document.getElementById('spawner-veh-wrap');
    if (!wrap) return;
    if (!list.length) {
        wrap.innerHTML = emptyState('spawner', 'No vehicles found');
        return;
    }
    // Renamed off `icon` — core.js exports a global icon() and a local const
    // of the same name would shadow it inside this function.
    const vehIcon = icon('spawner');
    wrap.innerHTML = `<div class="vehicle-grid">
        ${list.map(v => `
            <div class="vehicle-card" data-ca-action="spawnVehicle" data-model="${escAttr(v.model)}" data-tip="${escAttr(v.model)}">
                <div class="veh-icon">${vehIcon}</div>
                <div class="veh-name">${esc(v.label || v.model)}</div>
                ${v.label && v.label !== v.model ? `<div class="veh-model">${esc(v.model)}</div>` : ''}
            </div>
        `).join('')}
    </div>`;
}

let _spawnCooldown = false;
function spawnVehicle(model) {
    if (_spawnCooldown) return;
    _spawnCooldown = true;
    setTimeout(() => { _spawnCooldown = false; }, 3000);

    const targetSrc  = window._spawnTargetSrc  || null;
    const targetName = window._spawnTargetName || null;
    fetch('https://cipher-admin/playerAction', {
        method: 'POST',
        body: JSON.stringify({ action: 'spawnveh', targetSrc, targetName, model }),
    });
}

function clearSpawnTarget() {
    window._spawnTargetSrc  = null;
    window._spawnTargetName = null;
    loadSpawner();
}

window.loadSpawner      = loadSpawner;
window.selectCategory   = selectCategory;
window.filterSpawner    = filterSpawner;
window.spawnVehicle     = spawnVehicle;
window.clearSpawnTarget = clearSpawnTarget;

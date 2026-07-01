// Cipher-Admin — Inventory Viewer Panel

var _invTarget     = null;
var _invTargetName = '';
var _invTargetSrc  = null;
var _itemList      = [];
var _invMode       = 'single'; // 'single' | 'compare'

function renderInventoryPanel() {
    document.getElementById('panel-inventory').innerHTML =
        '<div class="section-header mb-12">'
        + '<div><div class="section-title">Inventory Viewer</div>'
        + '<div class="section-sub">View, edit and transfer items</div></div>'
        + '<div class="flex gap-4">'
        + '<button class="btn btn-ghost btn-sm" id="inv-mode-btn" onclick="invToggleMode()" style="display:none">⇄ Compare Mode</button>'
        + '</div></div>'
        + '<div class="search-bar mb-12">'
        + '<div class="search-wrap" style="flex:1"><span class="search-icon">⌕</span>'
        + '<input class="input search-input" id="inv-search" placeholder="Name (online) or Citizenid..." onkeydown="if(event.key===\'Enter\')loadInventoryFromInput()">'
        + '</div>'
        + '<button class="btn btn-primary" onclick="loadInventoryFromInput()">Load</button>'
        + '</div>'
        + '<div id="inv-content">'
        + (_invTarget ? '' : '<div class="empty-state"><div class="empty-icon">▦</div><div class="empty-text">Enter a player name or CitizenID to load their inventory</div></div>')
        + '</div>';

    if (_invTarget) _renderInventoryContent();
}

function invToggleMode() {
    _invMode = _invMode === 'single' ? 'compare' : 'single';
    var btn = document.getElementById('inv-mode-btn');
    if (btn) btn.textContent = _invMode === 'compare' ? '▦ Single View' : '⇄ Compare Mode';
    _renderInventoryContent();
}

function openInventoryFor(cid, name, src) {
    _invTarget     = cid;
    _invTargetName = name;
    _invTargetSrc  = src != null ? src : null;
    _invMode       = 'single';
}

async function loadInventoryFromInput() {
    var val = (document.getElementById('inv-search') || {}).value || '';
    val = val.trim();
    if (!val) return;
    _invTarget     = val;
    _invTargetName = val;
    _invTargetSrc  = null;
    _invMode       = 'single';
    await _renderInventoryContent();
}

async function loadInventory(invId, label, src) {
    _invTarget     = invId;
    _invTargetName = label;
    _invTargetSrc  = src != null ? src : null;
    await _renderInventoryContent();
}

async function _renderInventoryContent() {
    var el = document.getElementById('inv-content');
    if (!el) return;

    el.innerHTML = '<div class="empty-state"><div class="empty-icon">▦</div><div class="empty-text">Loading...</div></div>';

    // Show/hide compare button
    var modeBtn = document.getElementById('inv-mode-btn');
    if (modeBtn) modeBtn.style.display = _invTarget ? 'inline-flex' : 'none';

    var targetData = await caFetch('cipher-admin:server:getInventory', {
        invId: _invTarget, targetCid: _invTarget, targetSrc: _invTargetSrc,
        targetName: _invTargetName,
    });

    if (!targetData) {
        el.innerHTML = '<div class="empty-state"><div class="empty-icon">▦</div><div class="empty-text">Inventory not found</div></div>';
        return;
    }

    var canEdit  = hasPermission('editinv');
    var canGive  = hasPermission('giveitem');
    var canClear = hasPermission('clearinv');

    if (_invMode === 'compare') {
        var adminData = await caFetch('cipher-admin:server:getAdminInventory', {});
        if (!adminData) {
            el.innerHTML = '<div class="empty-state"><div class="empty-icon">▦</div><div class="empty-text">Could not load your inventory (ox_inventory only)</div></div>';
            return;
        }
        el.innerHTML = _renderComparePanes(adminData, targetData, canEdit);
    } else {
        el.innerHTML = _renderSinglePane(targetData, canEdit, canGive, canClear);
    }
}

// ── Single pane ───────────────────────────────────────────────────────────────
function _renderSinglePane(data, canEdit, canGive, canClear) {
    var items = data.items || [];
    var header = '<div class="card-header">'
        + '<span class="card-title">📦 ' + _esc(data.label || _invTargetName) + '</span>'
        + '<div class="flex gap-4">'
        + (canGive  ? '<button class="btn btn-primary btn-sm" onclick="openGiveItemModal()">+ Give Item</button>' : '')
        + (canClear ? '<button class="btn btn-danger btn-sm" onclick="confirmClearInventory()">Clear All</button>' : '')
        + '</div></div>';

    var body;
    if (items.length) {
        body = '<div class="inv-filter" style="padding:10px 12px;border-bottom:1px solid var(--border)">'
            + '<input class="input" style="max-width:240px" placeholder="Filter items..." oninput="filterInvItems(this.value)">'
            + '</div>'
            + '<div class="inv-grid" id="inv-items-grid">' + _renderSlots(items, canEdit, 'target') + '</div>';
    } else {
        body = '<div class="empty-state"><div class="empty-icon">▦</div><div class="empty-text">Inventory is empty</div></div>';
    }

    window._currentInvItems = items;
    return '<div class="card"><div class="card-body" style="padding:0">' + header + body + '</div></div>';
}

// ── Compare pane ──────────────────────────────────────────────────────────────
function _renderComparePanes(adminData, targetData, canEdit) {
    var adminItems  = adminData.items  || [];
    var targetItems = targetData.items || [];

    var adminHtml = _renderTransferList(adminItems, 'admin', canEdit);
    var targetHtml = _renderTransferList(targetItems, 'target', canEdit);

    return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
        + '<div class="card"><div class="card-header"><span class="card-title">🎒 Your Inventory</span></div>'
        + '<div class="card-body" style="padding:0;max-height:480px;overflow-y:auto">' + adminHtml + '</div></div>'
        + '<div class="card"><div class="card-header">'
        + '<span class="card-title">📦 ' + _esc(_invTargetName) + '</span>'
        + (canEdit ? '<button class="btn btn-danger btn-xs" onclick="confirmClearInventory()">Clear All</button>' : '')
        + '</div>'
        + '<div class="card-body" style="padding:0;max-height:480px;overflow-y:auto">' + targetHtml + '</div></div>'
        + '</div>';
}

function _renderTransferList(items, side, canEdit) {
    if (!items.length) return '<div class="empty-state" style="padding:24px"><div class="empty-text">Empty</div></div>';
    return '<table class="data-table">'
        + '<thead><tr><th>Item</th><th style="text-align:center">Qty</th>' + (canEdit ? '<th></th>' : '') + '</tr></thead>'
        + '<tbody>'
        + items.map(function(item) {
            var arrow = side === 'admin' ? '→ Give' : '← Take';
            var dir   = side === 'admin' ? 'toTarget' : 'toAdmin';
            var btn   = canEdit
                ? '<button class="btn btn-ghost btn-xs" onclick="openTransferModal(\'' + _esc(item.name) + '\',\'' + _esc(item.label||item.name) + '\',' + (item.count||1) + ',\'' + dir + '\')">' + arrow + '</button>'
                : '';
            return '<tr>'
                + '<td><span style="font-size:12px">' + _esc(item.label||item.name) + '</span>'
                + '<div style="font-size:10px;color:var(--text-muted);font-family:monospace">' + _esc(item.name) + '</div></td>'
                + '<td style="text-align:center;font-weight:600">x' + (item.count||1) + '</td>'
                + (canEdit ? '<td style="text-align:right">' + btn + '</td>' : '')
                + '</tr>';
        }).join('')
        + '</tbody></table>';
}

function _renderSlots(items, canEdit, side) {
    var ICONS = { weapon:'🔫', bread:'🍞', water:'💧', phone:'📱', money:'💵', lockpick:'🔑', bandage:'🩹', drug:'💊' };
    return items.map(function(item) {
        var icon = '📦';
        for (var k in ICONS) { if (item.name.includes(k)) { icon = ICONS[k]; break; } }
        return '<div class="inv-slot" onclick="' + (canEdit ? 'openItemActions(\'' + _esc(item.name) + '\',\'' + _esc(item.label||item.name) + '\',' + (item.count||1) + ')' : '') + '">'
            + '<div class="inv-item-icon">' + icon + '</div>'
            + '<div class="inv-item-name">' + _esc(item.label||item.name) + '</div>'
            + '<div class="inv-item-count">x' + (item.count||1) + '</div>'
            + '</div>';
    }).join('');
}

function _esc(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ── Filter (single view) ──────────────────────────────────────────────────────
function filterInvItems(q) {
    var grid = document.getElementById('inv-items-grid');
    if (!grid) return;
    var items = window._currentInvItems || [];
    var filtered = q ? items.filter(function(i) {
        return i.name.includes(q.toLowerCase()) || (i.label||'').toLowerCase().includes(q.toLowerCase());
    }) : items;
    grid.innerHTML = _renderSlots(filtered, hasPermission('editinv'), 'target');
}

// ── Remove (single view) ──────────────────────────────────────────────────────
function openItemActions(name, label, count) {
    openModal('Item — ' + label,
        '<div class="profile-row"><span class="profile-row-label">Item</span><span class="profile-row-value">' + name + '</span></div>'
        + '<div class="profile-row"><span class="profile-row-label">Count</span><span class="profile-row-value">' + count + '</span></div>'
        + '<div class="form-group mt-12"><label>Amount to remove</label>'
        + '<input class="input" id="rem-count" type="number" value="' + count + '" min="1" max="' + count + '"></div>',
        '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'
        + (hasPermission('editinv') ? '<button class="btn btn-danger" onclick="doRemoveItem(\'' + name + '\',\'' + label + '\')">Remove</button>' : ''));
}

async function doRemoveItem(name, label) {
    var count = parseInt((document.getElementById('rem-count') || {}).value) || 1;
    closeModal();
    await caFetch('cipher-admin:server:removeItem', {
        targetSrc: _invTargetSrc, targetCid: _invTarget, invId: _invTarget,
        targetName: _invTargetName, item: name, count: count,
    });
    await _renderInventoryContent();
}

// ── Transfer (compare view) ───────────────────────────────────────────────────
function openTransferModal(name, label, maxCount, direction) {
    var dirLabel = direction === 'toAdmin' ? 'Take from player' : 'Give to player';
    openModal(dirLabel + ' — ' + label,
        '<div class="form-group"><label>Amount (max ' + maxCount + ')</label>'
        + '<input class="input" id="xfer-count" type="number" value="1" min="1" max="' + maxCount + '"></div>',
        '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'
        + '<button class="btn btn-primary" onclick="doTransfer(\'' + name + '\',\'' + direction + '\')">Confirm</button>');
}

async function doTransfer(name, direction) {
    var count = parseInt((document.getElementById('xfer-count') || {}).value) || 1;
    closeModal();
    var ok = await caFetch('cipher-admin:server:transferItem', {
        targetSrc: _invTargetSrc, targetCid: _invTarget, invId: _invTarget,
        targetName: _invTargetName, item: name, count: count, direction: direction,
    });
    if (!ok) { openModal('Transfer Failed', '<p>Could not transfer item — check the source inventory has enough stock.</p>', '<button class="btn btn-ghost" onclick="closeModal()">OK</button>'); return; }
    await _renderInventoryContent();
}

// ── Give item ─────────────────────────────────────────────────────────────────
async function openGiveItemModal() {
    if (!_itemList.length) {
        _itemList = await caFetch('cipher-admin:server:getItemList', {}) || [];
    }
    openModal('Give Item',
        '<div class="form-group"><label>Search Item</label>'
        + '<input class="input" id="give-item-search" placeholder="Search items..." oninput="filterGiveItems(this.value)"></div>'
        + '<div id="give-item-list" style="max-height:200px;overflow-y:auto;margin-bottom:12px">' + _renderGiveItemList(_itemList.slice(0, 50)) + '</div>'
        + '<div class="form-group"><label>Selected</label><input class="input" id="give-item-selected" placeholder="Item name..." readonly></div>'
        + '<div class="form-group"><label>Count</label><input class="input" id="give-item-count" type="number" value="1" min="1"></div>',
        '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'
        + '<button class="btn btn-primary" onclick="doGiveItem()">Give</button>');
}

function _renderGiveItemList(items) {
    return items.map(function(i) {
        return '<div class="profile-row" style="cursor:pointer" onclick="selectGiveItem(\'' + _esc(i.name) + '\')">'
            + '<span class="profile-row-label">' + _esc(i.label||i.name) + '</span>'
            + '<span class="text-muted text-sm">' + _esc(i.name) + '</span></div>';
    }).join('') || '<div class="text-muted text-sm">No items found</div>';
}

function filterGiveItems(q) {
    var el = document.getElementById('give-item-list');
    if (!el) return;
    var filtered = q ? _itemList.filter(function(i) {
        return i.name.includes(q.toLowerCase()) || (i.label||'').toLowerCase().includes(q.toLowerCase());
    }) : _itemList.slice(0, 50);
    el.innerHTML = _renderGiveItemList(filtered);
}

function selectGiveItem(name) {
    var el = document.getElementById('give-item-selected');
    if (el) el.value = name;
}

async function doGiveItem() {
    var item  = ((document.getElementById('give-item-selected') || {}).value || '').trim();
    var count = parseInt((document.getElementById('give-item-count') || {}).value) || 1;
    if (!item) return;
    closeModal();
    await caFetch('cipher-admin:server:giveItem', {
        targetSrc: _invTargetSrc, targetCid: _invTarget, invId: _invTarget,
        targetName: _invTargetName, item: item, count: count,
    });
    await _renderInventoryContent();
}

// ── Clear ─────────────────────────────────────────────────────────────────────
function confirmClearInventory() {
    openModal('Confirm Clear',
        '<p style="color:var(--text-secondary)">Clear <strong style="color:var(--text-primary)">' + _esc(_invTargetName) + '</strong>\'s entire inventory? This cannot be undone.</p>',
        '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>'
        + '<button class="btn btn-danger" onclick="doClearInventory()">Clear</button>');
}

async function doClearInventory() {
    closeModal();
    await caFetch('cipher-admin:server:clearInventory', {
        targetSrc: _invTargetSrc, targetCid: _invTarget, invId: _invTarget, targetName: _invTargetName,
    });
    await _renderInventoryContent();
}

// ── Exports ───────────────────────────────────────────────────────────────────
window.renderInventoryPanel   = renderInventoryPanel;
window.loadInventoryFromInput = loadInventoryFromInput;
window.openInventoryFor       = openInventoryFor;
window.loadInventory          = loadInventory;
window.invToggleMode          = invToggleMode;
window.openItemActions        = openItemActions;
window.doRemoveItem           = doRemoveItem;
window.openTransferModal      = openTransferModal;
window.doTransfer             = doTransfer;
window.openGiveItemModal      = openGiveItemModal;
window.filterGiveItems        = filterGiveItems;
window.selectGiveItem         = selectGiveItem;
window.doGiveItem             = doGiveItem;
window.confirmClearInventory  = confirmClearInventory;
window.doClearInventory       = doClearInventory;
window.filterInvItems         = filterInvItems;

// Cipher-Admin — Item Spawner Panel
//
// Browses the server's real item list rather than a table in this resource, so
// it shows whatever the server actually installed. Reuses the existing
// giveItem callback — this is a better way into it, not a second path.

let _items          = [];
let _itemFilter     = '';
let _itemTargetSrc  = null;
let _itemTargetName = '';

async function renderItemsPanel() {
    const panel = document.getElementById('panel-items');
    if (!panel) return;

    panel.innerHTML = `
        <div class="section-header mb-12">
            <div>
                <div class="section-title">Item Spawner</div>
                <div class="section-sub" id="items-sub">Loading the server's item list...</div>
            </div>
            <div class="flex gap-8">
                <input class="input" id="items-search" placeholder="Search items..." style="width:220px">
                <button class="btn btn-ghost btn-sm" data-ca-action="itemsRefresh">↻ Refresh</button>
            </div>
        </div>

        <div class="card mb-12">
            <div class="card-body" style="padding:12px 14px">
                <div class="flex gap-8 items-center" style="flex-wrap:wrap">
                    <span class="text-muted text-sm">Give to</span>
                    <button class="btn btn-sm" id="items-target-self" data-ca-action="itemsTargetSelf">Myself</button>
                    <button class="btn btn-ghost btn-sm" data-ca-action="itemsPickTarget">Choose player…</button>
                    <span class="text-muted text-sm" style="margin-left:auto">Quantity</span>
                    <input class="input" id="items-count" type="number" value="1" min="1" max="1000" style="width:90px">
                </div>
            </div>
        </div>

        <div class="card">
            <div class="card-body" style="padding:0">
                <div id="items-grid-wrap">
                    <div class="empty-state"><div class="empty-text">Loading...</div></div>
                </div>
            </div>
        </div>
    `;

    const search = document.getElementById('items-search');
    if (search) search.oninput = function () { _itemFilter = this.value.toLowerCase(); _renderItemGrid(); };

    if (!_items.length) {
        const data = await caFetch('cipher-admin:server:getItemList', {});
        _items = data || [];
    }

    _updateItemsSub();
    _updateItemTargetButtons();
    _renderItemGrid();
}

function _updateItemsSub() {
    const sub = document.getElementById('items-sub');
    if (!sub) return;
    sub.textContent = _items.length
        ? `${_items.length} items from the server's item list`
        : 'No item list available — check your inventory resource';
}

function _updateItemTargetButtons() {
    const selfBtn = document.getElementById('items-target-self');
    if (!selfBtn) return;
    const onSelf = _itemTargetSrc === null;
    selfBtn.className = onSelf ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm';
    selfBtn.textContent = onSelf ? 'Myself' : (_itemTargetName || 'Myself');

    const sub = document.getElementById('items-sub');
    if (sub && !onSelf) sub.textContent = `Giving to ${_itemTargetName}`;
    else _updateItemsSub();
}

function _renderItemGrid() {
    const wrap = document.getElementById('items-grid-wrap');
    if (!wrap) return;

    if (!_items.length) {
        wrap.innerHTML = emptyState('inventory', 'No items available');
        return;
    }

    const matches = _itemFilter
        ? _items.filter(i => i.name.toLowerCase().includes(_itemFilter)
                          || (i.label || '').toLowerCase().includes(_itemFilter))
        : _items;

    if (!matches.length) {
        wrap.innerHTML = emptyState('search', 'No item matches that');
        return;
    }

    // Capped for the same reason the weapon picker is: a full server item list
    // runs to thousands, and rendering all of them janks the panel open.
    const shown = matches.slice(0, 300);

    wrap.innerHTML = `<div class="inv-grid">${shown.map(i => `
        <div class="inv-slot" data-ca-action="itemGive"
             data-name="${escAttr(i.name)}" data-label="${escAttr(i.label || i.name)}">
            <div class="inv-item-icon">${_itemIcon(i.name)}</div>
            <div class="inv-item-name">${esc(i.label || i.name)}</div>
            <div class="inv-item-sub mono">${esc(i.name)}</div>
        </div>`).join('')}</div>`
        + (matches.length > shown.length
            ? `<div class="picker-empty">${escNum(matches.length - shown.length)} more — keep typing to narrow</div>`
            : '');
}

function _itemIcon(name) {
    if (name.startsWith('weapon_')) return icon('weapon');
    if (name.includes('money') || name.includes('cash')) return icon('money');
    return icon('inventory');
}

caAction('itemsRefresh', async () => {
    _items = [];
    await renderItemsPanel();
});

caAction('itemsTargetSelf', () => {
    _itemTargetSrc  = null;
    _itemTargetName = '';
    _updateItemTargetButtons();
});

caAction('itemsPickTarget', async () => {
    const players = await caFetch('cipher-admin:server:getPlayers', {}) || [];
    if (!players.length) {
        openModal('No players online', '<p class="text-muted">Nobody to give items to.</p>',
            '<button class="btn btn-ghost" onclick="closeModal()">OK</button>');
        return;
    }

    openModal('Give items to',
        '<div class="picker-list">'
        + players.map(p => `
            <div class="picker-row" data-ca-action="itemsSetTarget"
                 data-src="${escNum(p.src)}" data-name="${escAttr(p.name)}">
                <span class="picker-label">${esc(p.name)}</span>
                <span class="picker-sub mono">${escNum(p.src)} · ${esc(p.citizenid || '')}</span>
            </div>`).join('')
        + '</div>',
        '<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>');
});

caAction('itemsSetTarget', (d) => {
    _itemTargetSrc  = Number(d.src);
    _itemTargetName = d.name;
    closeModal();
    _updateItemTargetButtons();
});

caAction('itemGive', async (d) => {
    const count = Math.max(1, parseInt((document.getElementById('items-count') || {}).value) || 1);

    const ok = await caFetch('cipher-admin:server:giveItem', {
        item:       d.name,
        count:      count,
        targetSrc:  _itemTargetSrc,
        targetName: _itemTargetName || null,
    });

    // A brief confirmation on the tile itself rather than a modal — spawning
    // items is repetitive and a dialog every time would be in the way.
    const tile = document.querySelector(`[data-ca-action="itemGive"][data-name="${CSS.escape(d.name)}"]`);
    if (tile) {
        tile.classList.add(ok ? 'inv-slot-ok' : 'inv-slot-fail');
        setTimeout(() => tile.classList.remove('inv-slot-ok', 'inv-slot-fail'), 900);
    }
});

window.renderItemsPanel = renderItemsPanel;

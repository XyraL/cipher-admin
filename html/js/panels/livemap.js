/* Live map.
 *
 * Every player as a dot on the San Andreas render, polled from the server
 * while the tab is open. Same Leaflet + tile pyramid as the MDT's map — the
 * tiles were built once and both scripts carry them.
 *
 * Clicking a dot opens the actions that matter from a map: watch them, go to
 * them, bring them, or open their full profile. All four run through the same
 * playerAction path as the player list, so the server checks the same
 * permissions either way. */

const LIVEMAP = {
    imageW: 4096,
    imageH: 6144,
    tileSize: 512,
    nativeZoom: 4,
    maxZoom: 6,

    // The GTA world rectangle the render covers. If dots sit slightly off,
    // nudge these — stand somewhere recognisable and adjust until the dot
    // lands on you.
    world: { minX: -3900, maxX: 4300, minY: -4500, maxY: 8100 },

    pollMs: 4000,
};

let _lm = null;
let _lmLayer = null;
let _lmMarkers = {};
let _lmTimer = null;

function lmWorldToLatLng(wx, wy) {
    const W = LIVEMAP.world;
    const px = ((wx - W.minX) / (W.maxX - W.minX)) * LIVEMAP.imageW;
    const py = ((W.maxY - wy) / (W.maxY - W.minY)) * LIVEMAP.imageH;
    return _lm.unproject([px, py], LIVEMAP.nativeZoom);
}

function initLiveMap() {
    const el = document.getElementById('livemap-canvas');
    if (!el || _lm) return;

    if (typeof L === 'undefined') {
        el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted);">Leaflet did not load — check the vendor files are in the resource.</div>';
        return;
    }

    _lm = L.map(el, {
        crs: L.CRS.Simple,
        minZoom: 1,
        maxZoom: LIVEMAP.maxZoom,
        zoomControl: true,
        attributionControl: false,
        zoomSnap: 0.25,
        wheelPxPerZoomLevel: 90,
    });

    const sw = _lm.unproject([0, LIVEMAP.imageH], LIVEMAP.nativeZoom);
    const ne = _lm.unproject([LIVEMAP.imageW, 0], LIVEMAP.nativeZoom);
    const bounds = new L.LatLngBounds(sw, ne);

    L.tileLayer('assets/maps/tiles/{z}_{x}_{y}.webp', {
        tileSize: LIVEMAP.tileSize,
        minZoom: 0,
        maxZoom: LIVEMAP.maxZoom,
        maxNativeZoom: LIVEMAP.nativeZoom,
        noWrap: true,
        bounds,
    }).addTo(_lm);

    _lm.setMaxBounds(bounds.pad(0.1));
    _lm.fitBounds(bounds);

    _lmLayer = L.layerGroup().addTo(_lm);
}

function lmDot(p) {
    // Dead players grey out rather than disappear — an admin looking for a
    // body wants to find it.
    const color = p.dead ? '#6b7280' : (p.vehicle ? '#f5a524' : '#4c9aff');
    return L.divIcon({
        className: '',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};` +
              `border:2px solid rgba(255,255,255,.85);box-shadow:0 0 6px ${color};"></div>`,
    });
}

function lmPopup(p) {
    const cid = p.cid || '';
    const shown = p.charName
        ? `${esc(p.charName)} <span style="color:var(--text-muted)">(${esc(p.name)})</span>`
        : esc(p.name);

    return `
        <div style="min-width:190px;font-family:inherit;">
            <div style="font-weight:700;margin-bottom:2px;">${shown}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;">
                ID ${p.src}${cid ? ' · ' + esc(cid) : ''}${p.vehicle ? ' · in vehicle' : ''}${p.dead ? ' · down' : ''}
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;">
                <button class="btn btn-ghost btn-sm" onclick="playerAction('spectate', ${p.src}, '${esc(cid)}', '${esc(p.name)}')">👁 Spectate</button>
                <button class="btn btn-ghost btn-sm" onclick="playerAction('goto', ${p.src}, '${esc(cid)}', '${esc(p.name)}')">➜ Go To</button>
                <button class="btn btn-ghost btn-sm" onclick="playerAction('bring', ${p.src}, '${esc(cid)}', '${esc(p.name)}')">⇤ Bring</button>
                <button class="btn btn-ghost btn-sm" onclick="switchPanel('players')">👤 Player List</button>
            </div>
        </div>`;
}

async function refreshLiveMap() {
    if (!_lm) return;

    const players = await caFetch('cipher-admin:server:getLiveMap', {});
    if (!Array.isArray(players)) return;

    const count = document.getElementById('livemap-count');
    if (count) count.textContent = players.length;

    const seen = {};
    for (const p of players) {
        seen[p.src] = true;
        const pos = lmWorldToLatLng(p.x, p.y);
        const existing = _lmMarkers[p.src];

        if (existing) {
            existing.setLatLng(pos);
            existing.setIcon(lmDot(p));
            existing.getPopup().setContent(lmPopup(p));
        } else {
            const m = L.marker(pos, { icon: lmDot(p) })
                .bindTooltip(p.charName || p.name, { direction: 'top', offset: [0, -8] })
                .bindPopup(lmPopup(p));
            m.addTo(_lmLayer);
            _lmMarkers[p.src] = m;
        }
    }

    // Whoever logged off comes off the map.
    for (const src of Object.keys(_lmMarkers)) {
        if (!seen[src]) {
            _lmLayer.removeLayer(_lmMarkers[src]);
            delete _lmMarkers[src];
        }
    }
}

function startLiveMap() {
    initLiveMap();
    // The container was display:none when Leaflet measured it.
    if (_lm) setTimeout(() => _lm.invalidateSize(), 60);

    refreshLiveMap();
    clearInterval(_lmTimer);
    _lmTimer = setInterval(refreshLiveMap, LIVEMAP.pollMs);
}

// Polling a map nobody is looking at is pure waste.
function stopLiveMap() {
    clearInterval(_lmTimer);
    _lmTimer = null;
}

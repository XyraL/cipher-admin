// Cipher-Admin — Core primitives
//
// Output escaping, the icon set and click delegation: needed by every panel,
// owned by none of them.
//
// This panel renders player-controlled data — names, ban reasons, report text
// — into a session holding every admin permission on the server, so escaping
// is not optional. Panels emit data-* attributes and a delegated listener
// dispatches them, rather than interpolating values into inline handlers where
// an apostrophe breaks the row and a crafted name does worse.

// ── Escaping ────────────────────────────────────────────────────────────────

// For text nodes.
function esc(v) {
    if (v === null || v === undefined) return '';
    return String(v)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// For attribute values. Same output as esc(); a separate name so intent is
// visible at the call site and the two can diverge later.
function escAttr(v) {
    return esc(v);
}

// Returns 0 rather than NaN so a bad value cannot render as "NaN" or break a
// calc().
function escNum(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

window.esc = esc;
window.escAttr = escAttr;
window.escNum = escNum;

// ── Icons ───────────────────────────────────────────────────────────────────
// Inline SVG, stroked with currentColor, on a shared 24x24 grid. Emoji ignore
// colour and font-weight entirely, so a panel mixing the two always reads as
// unfinished however good the rest of the styling is.
const CA_ICONS = {
    dashboard:  '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    players:    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    character:  '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/><path d="M11 8v6"/><path d="M8 11h6"/>',
    spawner:    '<path d="M5 17h14M6 17l-1.5-5.5A2 2 0 0 1 6.4 9h11.2a2 2 0 0 1 1.9 2.5L18 17"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/><path d="M7 9V6h10v3"/>',
    inventory:  '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M3 11h18"/><path d="M8 7V4h8v3"/><path d="M12 11v10"/>',
    bans:       '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
    permissions:'<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.5" r="1.3"/>',
    audit:      '<path d="M4 5h16"/><path d="M4 10h16"/><path d="M4 15h10"/><path d="M4 20h7"/>',
    reports:    '<path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v5h5"/><path d="M12 11v4"/><circle cx="12" cy="18" r=".6"/>',
    resources:  '<rect x="3" y="4" width="18" height="6" rx="1.5"/><rect x="3" y="14" width="18" height="6" rx="1.5"/><circle cx="7" cy="7" r=".8"/><circle cx="7" cy="17" r=".8"/>',
    entities:   '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18Z"/>',
    stats:      '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>',
    self:       '<path d="m12 3 2.6 5.6 6.1.8-4.5 4.2 1.2 6.1L12 16.8 6.6 19.7l1.2-6.1L3.3 9.4l6.1-.8Z"/>',
    adminchat:  '<path d="M21 15a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2Z"/>',
    threats:    '<path d="M12 2.5 4.5 5.8v5.6c0 4.6 3.2 8.6 7.5 10 4.3-1.4 7.5-5.4 7.5-10V5.8Z"/><path d="M12 8.5v4"/><circle cx="12" cy="15.6" r=".6"/>',
    link:       '<path d="M9 15h-2a4 4 0 0 1 0-8h2"/><path d="M15 7h2a4 4 0 0 1 0 8h-2"/><path d="M8.5 11h7"/>',
    weapon:     '<path d="M3 8h13l3 3h2v3h-4l-2 3h-3l-1-3H7v2H4a1 1 0 0 1-1-1Z"/><path d="M9 14v3"/>',
    map:        '<path d="m9 4-6 2.5v13L9 17l6 2.5 6-2.5v-13L15 6.5Z"/><path d="M9 4v13"/><path d="M15 6.5v13"/>',
    tag:        '<path d="M12 3a6 6 0 0 0-6 6c0 4.2 6 12 6 12s6-7.8 6-12a6 6 0 0 0-6-6Z"/><path d="M9.5 9h5"/>',

    close:      '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    search:     '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/>',
    goto:       '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z"/><circle cx="12" cy="10" r="2.4"/>',
    bring:      '<path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 0 1 0 10h-2"/><path d="M8 12h8"/>',
    spectate:   '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="2.6"/>',
    freeze:     '<path d="M12 2v20"/><path d="m4.5 7 15 10"/><path d="m19.5 7-15 10"/>',
    revive:     '<path d="M20.8 5.6a5.4 5.4 0 0 0-7.7 0L12 6.7l-1.1-1.1a5.4 5.4 0 0 0-7.7 7.7L12 22l8.8-8.7a5.4 5.4 0 0 0 0-7.7Z"/>',
    heal:       '<path d="M12 5v14"/><path d="M5 12h14"/>',
    trash:      '<path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/><path d="M9 7V4h6v3"/>',
    camera:     '<path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="3.4"/>',
    warn:       '<path d="M10.3 3.9 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><circle cx="12" cy="17" r=".6"/>',
    kick:       '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    note:       '<path d="M5 4h11l4 4v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"/><path d="M15 4v5h5"/><path d="M8 13h8"/><path d="M8 17h5"/>',
    refresh:    '<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/>',
    check:      '<path d="m4 12 5.5 5.5L20 7"/>',
    chevron:    '<path d="m9 6 6 6-6 6"/>',
    money:      '<circle cx="12" cy="12" r="9"/><path d="M12 7v10"/><path d="M14.6 9.6A2.6 2.6 0 0 0 12 8.5c-1.7 0-2.6.8-2.6 2s1 1.7 2.6 2 2.6.8 2.6 2-1 2-2.6 2a2.6 2.6 0 0 1-2.6-1.1"/>',
    clock:      '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
    shield:     '<path d="M12 2.5 4.5 5.8v5.6c0 4.6 3.2 8.6 7.5 10 4.3-1.4 7.5-5.4 7.5-10V5.8Z"/>',
    server:     '<rect x="3" y="4" width="18" height="7" rx="1.5"/><rect x="3" y="13" width="18" height="7" rx="1.5"/><path d="M7 7.5h.01"/><path d="M7 16.5h.01"/>',
    weather:    '<circle cx="9" cy="8.5" r="3.2"/><path d="M9 2.6v1.4M9 13v1.4M3.4 8.5h1.4M13.2 8.5h1.4M5 4.5l1 1M12 11.5l1 1M12 5.5l1-1M5 12.5l1-1"/><path d="M17.5 20H8.8a3.3 3.3 0 0 1 0-6.6 4.4 4.4 0 0 1 8.4 1.1 2.8 2.8 0 0 1 .3 5.5Z"/>',
    job:        '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/>',
    lock:       '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    settings:   '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"/>',
    list:       '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3.5 6h.01"/><path d="M3.5 12h.01"/><path d="M3.5 18h.01"/>',
};

// Audit action -> icon name. Was two separate emoji maps in audit.js and
// dashboard.js that had drifted nine actions apart.
const CA_ACTION_ICONS = {
    KICK: 'kick',                WARN: 'warn',
    TEMPBAN: 'clock',            PERMBAN: 'bans',
    UNBAN: 'check',              AUTO_TEMPBAN: 'threats',
    AUTO_PERMBAN: 'threats',     RESOLVE_THREATS: 'threats',
    FREEZE: 'freeze',            UNFREEZE: 'refresh',
    REVIVE: 'revive',            HEAL: 'heal',
    GOTO: 'goto',                BRING: 'bring',
    SPECTATE: 'spectate',        SCREENSHOT: 'camera',
    SLAP: 'warn',                DM: 'adminchat',
    GIVE_ITEM: 'inventory',      REMOVE_ITEM: 'trash',
    CLEAR_INVENTORY: 'trash',    STRIP_WEAPONS: 'weapon',
    GIVE_WEAPON: 'weapon',       SPAWN_VEHICLE: 'spawner',
    DELETE_VEHICLE: 'trash',     SET_JOB: 'job',
    SET_CASH: 'money',           SET_BANK: 'money',
    ANNOUNCEMENT: 'adminchat',   MASS_ANNOUNCE: 'adminchat',
    SET_WEATHER: 'weather',      SET_TIME: 'clock',
    ADD_NOTE: 'note',            ASSIGN_ROLE: 'permissions',
    REMOVE_ROLE: 'trash',        EDIT_ROLE: 'permissions',
    DELETE_CHARACTER: 'trash',   SUMMON_ALL: 'players',
};

function actionIcon(action, cls) {
    return icon(CA_ACTION_ICONS[action] || 'audit', cls);
}

// `cls` lands on the <svg> so a caller can size one instance without a rule.
function icon(name, cls) {
    const body = CA_ICONS[name];
    if (!body) return '';
    return `<svg class="ca-icon ${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

// Every panel was hand-rolling this markup with a different emoji in it.
function emptyState(iconName, text) {
    return `<div class="empty-state"><div class="empty-icon">${icon(iconName)}</div>`
         + `<div class="empty-text">${esc(text)}</div></div>`;
}

window.icon        = icon;
window.actionIcon  = actionIcon;
window.emptyState  = emptyState;
window.CA_ICONS    = CA_ICONS;

// ── Click delegation ────────────────────────────────────────────────────────
// Markup declares intent:
//   <button data-ca-action="playerAction" data-act="goto" data-src="3">
// and behaviour registers here:
//   caAction('playerAction', (d) => playerAction(d.act, Number(d.src)));
//
// One document listener serves every panel, so re-rendering a panel's
// innerHTML never orphans a handler.
const CA_ACTIONS = {};

function caAction(name, handler) {
    CA_ACTIONS[name] = handler;
}

document.addEventListener('click', function (e) {
    const el = e.target.closest('[data-ca-action]');
    if (!el) return;

    const handler = CA_ACTIONS[el.dataset.caAction];
    if (!handler) return;

    // Stops a row handler also firing when a button inside it was clicked.
    e.stopPropagation();
    handler(el.dataset, el, e);
});

window.caAction = caAction;

// Sidebar markup carries data-icon names, so the set stays defined in one
// place. Safe to call again after any markup change.
function hydrateIcons(root) {
    (root || document).querySelectorAll('[data-icon]').forEach((el) => {
        const name = el.dataset.icon;
        if (!name || el.dataset.iconDone === '1') return;
        el.innerHTML = icon(name);
        el.dataset.iconDone = '1';
    });
}

window.hydrateIcons = hydrateIcons;
document.addEventListener('DOMContentLoaded', () => hydrateIcons());

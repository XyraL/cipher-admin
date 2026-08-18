// Cipher-Admin — Settings Panel
//
// Per-admin interface preferences, layered over the server's Config.Theme.
//
// These are deliberately LOCAL, not stored server-side. Config.Theme is the
// owner's decision about how the panel looks by default; this is one member of
// staff deciding they want it on the left, or dimmer, or in a colour they can
// actually distinguish. Storing it per-admin in the database would make one
// person's preference everyone's problem.

const CA_SETTINGS_KEY = 'ca_settings';

const ACCENT_PRESETS = [
    { name: 'Cipher Red', hex: '#e5484d' },
    { name: 'Amber',      hex: '#f5a524' },
    { name: 'Green',      hex: '#30d158' },
    { name: 'Cyan',       hex: '#22d3ee' },
    { name: 'Blue',       hex: '#3b82f6' },
    { name: 'Indigo',     hex: '#6366f1' },
    { name: 'Violet',     hex: '#a855f7' },
    { name: 'Magenta',    hex: '#ec4899' },
];

function caLoadSettings() {
    try {
        return JSON.parse(localStorage.getItem(CA_SETTINGS_KEY) || '{}') || {};
    } catch (e) {
        return {};
    }
}

function caSaveSettings(s) {
    try { localStorage.setItem(CA_SETTINGS_KEY, JSON.stringify(s)); } catch (e) {}
}

// Server theme with the admin's overrides on top. Called on open and after
// every change, so the panel restyles as you touch a control rather than
// needing a reopen.
function caApplyEffectiveTheme() {
    const base = CA.serverTheme || {};
    const mine = caLoadSettings();
    applyTheme({
        Accent:    mine.accent    || base.Accent,
        Side:      mine.side      || base.Side,
        Width:     mine.width     || base.Width,
        MaxWidth:  base.MaxWidth,
        Scanlines: mine.scanlines !== undefined ? mine.scanlines : base.Scanlines,
        Dim:       mine.dim       !== undefined ? mine.dim       : base.Dim,
    });
}

function renderSettingsPanel() {
    const panel = document.getElementById('panel-settings');
    if (!panel) return;

    const s    = caLoadSettings();
    const base = CA.serverTheme || {};
    const accent = s.accent || base.Accent || '#e5484d';
    const side   = s.side   || base.Side   || 'right';
    const dim    = s.dim    !== undefined ? s.dim    : (base.Dim !== undefined ? base.Dim : 0.45);
    const scan   = s.scanlines !== undefined ? s.scanlines : base.Scanlines !== false;
    const width  = s.width  || base.Width  || '80vw';

    const panels = [
        ['dashboard', 'Dashboard'], ['players', 'Players'], ['threats', 'Threats'],
        ['bans', 'Ban Manager'], ['reports', 'Reports'], ['self', 'Self Actions'],
        ['items', 'Item Spawner'], ['spawner', 'Vehicle Spawner'],
    ];
    const defaultPanel = s.defaultPanel || '';

    panel.innerHTML = `
        <div class="section-header mb-12">
            <div>
                <div class="section-title">Settings</div>
                <div class="section-sub">Your interface only &mdash; these are stored on this machine, not on the server</div>
            </div>
            <button class="btn btn-ghost btn-sm" data-ca-action="settingsReset">Reset to server defaults</button>
        </div>

        <div class="settings-grid">
            <div class="card">
                <div class="card-header"><span class="card-title">Accent</span></div>
                <div class="card-body">
                    <div class="swatch-row">
                        ${ACCENT_PRESETS.map(p => `
                            <button class="swatch ${accent.toLowerCase() === p.hex.toLowerCase() ? 'is-active' : ''}"
                                    style="--sw:${p.hex}" title="${escAttr(p.name)}"
                                    data-ca-action="settingsAccent" data-hex="${escAttr(p.hex)}"></button>`).join('')}
                    </div>
                    <div class="form-group mt-12">
                        <label>Custom hex</label>
                        <div class="flex gap-8">
                            <input class="input mono" id="set-accent" value="${escAttr(accent)}" maxlength="7" style="width:120px">
                            <button class="btn btn-ghost btn-sm" data-ca-action="settingsAccentCustom">Apply</button>
                        </div>
                        <div class="text-muted" style="font-size:11px;margin-top:6px">
                            Ban and Delete stay red whatever you pick &mdash; a filled red button
                            always means something is about to be destroyed.
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><span class="card-title">Layout</span></div>
                <div class="card-body">
                    <div class="form-group">
                        <label>Panel opens from</label>
                        <div class="flex gap-8">
                            <button class="btn ${side === 'left' ? 'btn-primary' : 'btn-ghost'} btn-sm"
                                    data-ca-action="settingsSide" data-side="left">Left</button>
                            <button class="btn ${side === 'right' ? 'btn-primary' : 'btn-ghost'} btn-sm"
                                    data-ca-action="settingsSide" data-side="right">Right</button>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Width &mdash; <span id="set-width-val">${esc(width)}</span></label>
                        <input type="range" class="range" id="set-width" min="50" max="100" step="5"
                               value="${escNum(parseInt(width) || 80)}">
                    </div>

                    <div class="form-group">
                        <label>Background dim &mdash; <span id="set-dim-val">${escNum(Math.round(dim * 100))}%</span></label>
                        <input type="range" class="range" id="set-dim" min="0" max="90" step="5"
                               value="${escNum(Math.round(dim * 100))}">
                    </div>

                    <div class="form-group">
                        <label>Scanline texture</label>
                        <label class="toggle" style="display:inline-flex">
                            <input type="checkbox" id="set-scan" ${scan ? 'checked' : ''}>
                            <div class="toggle-track"></div><div class="toggle-thumb"></div>
                        </label>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><span class="card-title">Behaviour</span></div>
                <div class="card-body">
                    <div class="form-group">
                        <label>Panel to open on</label>
                        <select class="select" id="set-default">
                            <option value="">Server default</option>
                            ${panels.map(p => `<option value="${escAttr(p[0])}" ${defaultPanel === p[0] ? 'selected' : ''}>${esc(p[1])}</option>`).join('')}
                        </select>
                    </div>
                    <div class="text-muted" style="font-size:11px">
                        Stored in this browser profile. Clearing FiveM's cache resets it.
                    </div>
                </div>
            </div>
        </div>
    `;

    // Ranges and selects update live rather than behind a Save button — you can
    // see what a setting does while you are dragging it.
    const width$ = document.getElementById('set-width');
    if (width$) width$.oninput = function () {
        const v = this.value + 'vw';
        document.getElementById('set-width-val').textContent = v;
        _settingsPatch({ width: v });
    };

    const dim$ = document.getElementById('set-dim');
    if (dim$) dim$.oninput = function () {
        document.getElementById('set-dim-val').textContent = this.value + '%';
        _settingsPatch({ dim: Number(this.value) / 100 });
    };

    const scan$ = document.getElementById('set-scan');
    if (scan$) scan$.onchange = function () { _settingsPatch({ scanlines: this.checked }); };

    const def$ = document.getElementById('set-default');
    if (def$) def$.onchange = function () { _settingsPatch({ defaultPanel: this.value || undefined }); };
}

function _settingsPatch(patch) {
    const s = caLoadSettings();
    Object.keys(patch).forEach(k => {
        if (patch[k] === undefined) delete s[k]; else s[k] = patch[k];
    });
    caSaveSettings(s);
    caApplyEffectiveTheme();
}

caAction('settingsAccent', (d) => {
    _settingsPatch({ accent: d.hex });
    renderSettingsPanel();
});

caAction('settingsAccentCustom', () => {
    const v = ((document.getElementById('set-accent') || {}).value || '').trim();
    // Same whitelist the theme applier uses — this ends up in an inline style
    // property, where an arbitrary string is a CSS injection.
    if (!/^#[0-9a-fA-F]{6}$/.test(v)) {
        openModal('Invalid colour',
            '<p style="color:var(--text-secondary)">Enter a 6-digit hex colour, for example <code>#e5484d</code>.</p>',
            '<button class="btn btn-ghost" onclick="closeModal()">OK</button>');
        return;
    }
    _settingsPatch({ accent: v });
    renderSettingsPanel();
});

caAction('settingsSide', (d) => {
    _settingsPatch({ side: d.side });
    renderSettingsPanel();
});

caAction('settingsReset', () => {
    try { localStorage.removeItem(CA_SETTINGS_KEY); } catch (e) {}
    caApplyEffectiveTheme();
    renderSettingsPanel();
});

window.renderSettingsPanel   = renderSettingsPanel;
window.caLoadSettings        = caLoadSettings;
window.caApplyEffectiveTheme = caApplyEffectiveTheme;

-- Cipher-Admin Server — Identity, Ban Matching & Alt Linking
--
-- A ban used to store three columns (license, ip, discord) and check each in
-- turn, which is defeated by changing one of them — and offline bans usually
-- had none of them populated.
--
-- Now every identifier a player presents is recorded on connect, anchored to
-- their license, and a ban attaches all of them. A ban placed on a Discord
-- account still catches that person on a new license.
--
-- Hardware tokens survive an account change, making them the strongest signal
-- available here; Config.BanEvasion.StoreTokens turns them off.
--
-- IP is recorded and shown as a link but does not deny by default — households,
-- hotspots and campuses share one. For the same reason a clean account linked
-- to a banned one raises a flag rather than a denial.

local IsAdmin       = function(src) return exports['cipher-admin']:IsAdmin(src) end
local HasPermission = function(src, p) return exports['cipher-admin']:HasPermission(src, p) end
local AcFlag        = function(...) pcall(function(...) exports['cipher-admin']:AcFlag(...) end, ...) end

-- Load marker for the boot self-check in server/main.lua.
CipherAdminIdentity = true

local BE = Config.BanEvasion or { Enabled = false, MatchOn = {} }

-- Anything outside this list is ignored rather than stored.
local KNOWN_TYPES = {
    license = true, license2 = true, discord = true, steam = true,
    xbl = true, live = true, fivem = true, ip = true, token = true,
}

-- Recording is broader than matching on purpose: an identifier you never
-- recorded cannot be enabled later, one you recorded and ignored can.
local function MatchTypes()
    local t = {}
    for k, v in pairs(BE.MatchOn or {}) do
        if v == true and KNOWN_TYPES[k] then t[k] = true end
    end
    return t
end

-- ── Collecting ────────────────────────────────────────────────────────────────

-- Returns { { type = 'license', value = 'license:abc' }, ... }
local function CollectIdentifiers(src)
    local out, seen = {}, {}

    local okN, count = pcall(GetNumPlayerIdentifiers, src)
    if okN and count then
        for i = 0, count - 1 do
            local ok, id = pcall(GetPlayerIdentifier, src, i)
            if ok and id then
                local t = id:match('^([^:]+):')
                if t and KNOWN_TYPES[t] and not seen[id] then
                    seen[id] = true
                    out[#out + 1] = { type = t, value = id }
                end
            end
        end
    end

    local okE, endpoint = pcall(GetPlayerEndpoint, src)
    if okE and endpoint and endpoint ~= '' and not seen[endpoint] then
        seen[endpoint] = true
        out[#out + 1] = { type = 'ip', value = endpoint }
    end

    if BE.StoreTokens ~= false then
        local okT, tokenCount = pcall(GetNumPlayerTokens, src)
        if okT and tokenCount then
            for i = 0, tokenCount - 1 do
                local ok, tok = pcall(GetPlayerToken, src, i)
                if ok and tok and tok ~= '' then
                    tok = string.sub(tok, 1, 190)
                    if not seen[tok] then
                        seen[tok] = true
                        out[#out + 1] = { type = 'token', value = tok }
                    end
                end
            end
        end
    end

    return out
end

local function LicenseOf(ids)
    for _, i in ipairs(ids) do
        if i.type == 'license' then return i.value end
    end
    return nil
end

local function RecordIdentifiers(license, ids, playerName)
    if not license then return end
    for _, i in ipairs(ids) do
        MySQL.insert('INSERT INTO admin_identifiers (license, id_type, id_value, player_name) VALUES (?,?,?,?) '
            .. 'ON DUPLICATE KEY UPDATE last_seen = CURRENT_TIMESTAMP, player_name = VALUES(player_name)', {
            license, i.type, i.value, playerName,
        })
    end
end

-- ── Matching ──────────────────────────────────────────────────────────────────

-- Values still go through parameters; only punctuation is interpolated.
local function Placeholders(n)
    local parts = {}
    for i = 1, n do parts[i] = '?' end
    return table.concat(parts, ',')
end

-- Any active ban attached to any of these identifiers.
local function FindBan(ids)
    local allowed = MatchTypes()
    local values = {}
    for _, i in ipairs(ids) do
        if allowed[i.type] then values[#values + 1] = i.value end
    end
    if #values == 0 then return nil end

    return MySQL.single.await(([[
        SELECT b.*, bi.id_type AS matched_type
        FROM admin_ban_identifiers bi
        JOIN admin_bans b ON b.id = bi.ban_id
        WHERE bi.id_value IN (%s)
          AND b.is_active = 1
          AND (b.is_permanent = 1 OR b.expires_at IS NULL OR b.expires_at > NOW())
        ORDER BY b.created_at DESC
        LIMIT 1
    ]]):format(Placeholders(#values)), values)
end

-- Other licenses that have ever presented one of these identifiers.
-- Returns { { license, shared_types, last_seen, player_name } }
local function FindLinkedLicenses(license, ids)
    if not license then return {} end

    local values, types = {}, {}
    -- Matching a license against itself tells us nothing.
    for _, i in ipairs(ids) do
        if i.type ~= 'license' then
            values[#values + 1] = i.value
            types[#types + 1]   = i.type
        end
    end
    if #values == 0 then return {} end

    local params = {}
    for _, v in ipairs(values) do params[#params + 1] = v end
    params[#params + 1] = license

    return MySQL.query.await(([[
        SELECT license,
               GROUP_CONCAT(DISTINCT id_type) AS shared_types,
               MAX(last_seen)  AS last_seen,
               MAX(player_name) AS player_name
        FROM admin_identifiers
        WHERE id_value IN (%s) AND license <> ?
        GROUP BY license
        ORDER BY last_seen DESC
        LIMIT 25
    ]]):format(Placeholders(#values)), params) or {}
end

local function ActiveBanForLicense(license)
    return MySQL.single.await([[
        SELECT b.* FROM admin_bans b
        JOIN admin_ban_identifiers bi ON bi.ban_id = b.id
        WHERE bi.id_type = 'license' AND bi.id_value = ?
          AND b.is_active = 1
          AND (b.is_permanent = 1 OR b.expires_at IS NULL OR b.expires_at > NOW())
        LIMIT 1
    ]], { license })
end

-- ── Attaching identifiers to a ban ────────────────────────────────────────────

-- Online: read identifiers off the connected player. Offline: look up
-- everything recorded for that license — which is the point of the table.
local function AttachBanIdentifiers(banId, src, license)
    if not banId then return 0 end

    local ids = {}

    if src then
        ids = CollectIdentifiers(src)
        if not license then license = LicenseOf(ids) end
    end

    if #ids == 0 and license then
        local rows = MySQL.query.await('SELECT id_type, id_value FROM admin_identifiers WHERE license = ?', { license }) or {}
        for _, r in ipairs(rows) do
            ids[#ids + 1] = { type = r.id_type, value = r.id_value }
        end
        local hasLicense = false
        for _, i in ipairs(ids) do if i.type == 'license' then hasLicense = true break end end
        if not hasLicense then ids[#ids + 1] = { type = 'license', value = license } end
    end

    for _, i in ipairs(ids) do
        MySQL.insert('INSERT IGNORE INTO admin_ban_identifiers (ban_id, id_type, id_value) VALUES (?,?,?)', {
            banId, i.type, i.value,
        })
    end

    return #ids
end

-- Both QBox and QBCore keep a `license` column on `players`, so this needs no
-- framework-specific branch.
local function LicenseForCitizenId(cid)
    if not cid then return nil end
    local ok, row = pcall(function()
        return MySQL.single.await('SELECT license FROM players WHERE citizenid = ? LIMIT 1', { cid })
    end)
    if ok and row and row.license then return row.license end
    return nil
end

-- ── Connect check ─────────────────────────────────────────────────────────────
-- The only playerConnecting handler here that touches deferrals — two handlers
-- both calling deferrals.done() on one connection is a race with no winner.

AddEventHandler('playerConnecting', function(playerName, _, deferrals)
    local src = source

    deferrals.defer()
    Wait(0)

    if not BE.Enabled then
        deferrals.done()
        return
    end

    deferrals.update('Checking your account...')
    Wait(0)

    local ok, result = pcall(function()
        local ids = CollectIdentifiers(src)
        local license = LicenseOf(ids)

        RecordIdentifiers(license, ids, playerName)

        -- 1. Is this player themselves banned, on any identifier?
        local ban = FindBan(ids)
        if ban then
            local expiry = ban.is_permanent == 1 and 'Permanent'
                or (ban.expires_at and tostring(ban.expires_at) or 'Unknown')
            local msg = string.format(Config.BanMessage, ban.reason or 'No reason given', expiry)
            return { deny = true, message = ('%s\n\nBan ID: #%d (matched on %s)')
                :format(msg, ban.id, ban.matched_type or 'identifier') }
        end

        -- 2. Are they linked to an account that is?
        local linked = FindLinkedLicenses(license, ids)
        for _, l in ipairs(linked) do
            local lban = ActiveBanForLicense(l.license)
            if lban then
                local detail = ('Linked to banned account "%s" via %s (ban #%d: %s)'):format(
                    l.player_name or 'unknown', l.shared_types or '?', lban.id, lban.reason or '')

                AcFlag(nil, 'evasion', detail, {
                    playerName = playerName,
                    license    = license,
                    linkedBan  = lban.id,
                })

                if BE.LinkedAccountAction == 'deny' then
                    return { deny = true, message = BE.EvasionMessage or 'This account is linked to a banned account.' }
                end
                break
            end
        end

        return { deny = false }
    end)

    -- A database hiccup must not silently become a whitelist in reverse: on
    -- error the player gets in and the console says why.
    if not ok then
        print(('^1[cipher-admin]^0 connect check errored, allowing connection: %s'):format(tostring(result)))
        deferrals.done()
        return
    end

    if result and result.deny then
        deferrals.done(result.message)
    else
        deferrals.done()
    end
end)

-- ── Startup: schema + backfill ───────────────────────────────────────────────

AddEventHandler('onResourceStart', function(res)
    if res ~= GetCurrentResourceName() then return end

    MySQL.query.await([[
        CREATE TABLE IF NOT EXISTS `admin_identifiers` (
            `id`          INT AUTO_INCREMENT PRIMARY KEY,
            `license`     VARCHAR(60)  NOT NULL,
            `id_type`     VARCHAR(20)  NOT NULL,
            `id_value`    VARCHAR(190) NOT NULL,
            `player_name` VARCHAR(100) DEFAULT NULL,
            `first_seen`  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
            `last_seen`   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY `uk_ident` (`license`, `id_type`, `id_value`),
            KEY `idx_value`   (`id_value`),
            KEY `idx_license` (`license`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ]])

    MySQL.query.await([[
        CREATE TABLE IF NOT EXISTS `admin_ban_identifiers` (
            `id`       INT AUTO_INCREMENT PRIMARY KEY,
            `ban_id`   INT          NOT NULL,
            `id_type`  VARCHAR(20)  NOT NULL,
            `id_value` VARCHAR(190) NOT NULL,
            UNIQUE KEY `uk_ban_ident` (`ban_id`, `id_type`, `id_value`),
            KEY `idx_value`  (`id_value`),
            KEY `idx_ban`    (`ban_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ]])

    -- Without this, upgrading would silently un-enforce every existing ban:
    -- the new connect check only reads admin_ban_identifiers.
    local backfilled = 0
    for _, t in ipairs({ 'license', 'ip', 'discord' }) do
        local r = MySQL.update.await(([[
            INSERT IGNORE INTO admin_ban_identifiers (ban_id, id_type, id_value)
            SELECT b.id, '%s', b.%s
            FROM admin_bans b
            WHERE b.%s IS NOT NULL AND b.%s <> ''
        ]]):format(t, t, t, t))
        backfilled = backfilled + (tonumber(r) or 0)
    end

    if backfilled > 0 then
        print(('[Cipher-Admin] Ban evasion: backfilled %d identifier(s) from existing bans.'):format(backfilled))
    end
    print('[Cipher-Admin] Ban evasion: ' .. (BE.Enabled and 'active.' or 'disabled in config.'))
end)

-- ── NUI callbacks ─────────────────────────────────────────────────────────────

-- Takes a citizenid (character profile) or a license (ban record).
lib.callback.register('cipher-admin:server:getLinkedAccounts', function(src, data)
    if not IsAdmin(src) then return nil end
    if not HasPermission(src, 'viewlinked') then return nil end

    data = data or {}
    local license = data.license or LicenseForCitizenId(data.citizenid)
    if not license then return { license = nil, linked = {}, identifiers = {} } end

    local idRows = MySQL.query.await(
        'SELECT id_type, id_value, first_seen, last_seen FROM admin_identifiers WHERE license = ? ORDER BY id_type', { license }) or {}

    local ids = {}
    for _, r in ipairs(idRows) do
        ids[#ids + 1] = { type = r.id_type, value = r.id_value }
    end

    local linked = FindLinkedLicenses(license, ids)

    for _, l in ipairs(linked) do
        local ban = ActiveBanForLicense(l.license)
        l.banned     = ban ~= nil
        l.ban_reason = ban and ban.reason or nil
        l.ban_id     = ban and ban.id or nil

        local chars = MySQL.query.await([[
            SELECT citizenid,
                   JSON_UNQUOTE(JSON_EXTRACT(charinfo,'$.firstname')) AS firstname,
                   JSON_UNQUOTE(JSON_EXTRACT(charinfo,'$.lastname'))  AS lastname
            FROM players WHERE license = ? LIMIT 5
        ]], { l.license }) or {}
        l.characters = chars
    end

    -- Staff need to know two accounts share a token, not what the token is.
    local shown = {}
    for _, r in ipairs(idRows) do
        local v = r.id_value or ''
        if r.id_type == 'token' or r.id_type == 'ip' then
            v = string.sub(v, 1, 6) .. '…' .. string.sub(v, -4)
        end
        shown[#shown + 1] = { id_type = r.id_type, id_value = v, first_seen = r.first_seen, last_seen = r.last_seen }
    end

    return { license = license, linked = linked, identifiers = shown }
end)

-- Recent evasion activity for the Threats panel's second tab.
lib.callback.register('cipher-admin:server:getEvasionHits', function(src)
    if not IsAdmin(src) then return nil end
    if not HasPermission(src, 'viewlinked') then return nil end

    return MySQL.query.await([[
        SELECT id, player_name, license, detail, created_at, handled
        FROM admin_flags
        WHERE detection = 'evasion'
        ORDER BY created_at DESC
        LIMIT 100
    ]]) or {}
end)

-- ── Exports ───────────────────────────────────────────────────────────────────

exports('AttachBanIdentifiers', AttachBanIdentifiers)
exports('CollectIdentifiers',   CollectIdentifiers)
exports('LicenseForCitizenId',  LicenseForCitizenId)

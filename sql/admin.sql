-- Cipher-Admin Database Schema
-- Run once before starting the resource

CREATE TABLE IF NOT EXISTS `admin_roles` (
    `id`          INT AUTO_INCREMENT PRIMARY KEY,
    `name`        VARCHAR(50)  NOT NULL UNIQUE,
    `label`       VARCHAR(100) NOT NULL,
    `color`       VARCHAR(20)  DEFAULT '#6366f1',
    `permissions` JSON         NOT NULL DEFAULT '{}',
    `created_at`  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `admin_assignments` (
    `id`          INT AUTO_INCREMENT PRIMARY KEY,
    `citizenid`   VARCHAR(50)  NOT NULL,
    `player_name` VARCHAR(100) NOT NULL,
    `role`        VARCHAR(50)  NOT NULL,
    `assigned_by` VARCHAR(100) NOT NULL,
    `created_at`  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_citizenid` (`citizenid`),
    KEY `idx_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `admin_bans` (
    `id`               INT AUTO_INCREMENT PRIMARY KEY,
    `citizenid`        VARCHAR(50)  DEFAULT NULL,
    `player_name`      VARCHAR(100) NOT NULL,
    `license`          VARCHAR(100) DEFAULT NULL,
    `ip`               VARCHAR(50)  DEFAULT NULL,
    `discord`          VARCHAR(100) DEFAULT NULL,
    `reason`           TEXT         NOT NULL,
    `admin_name`       VARCHAR(100) NOT NULL,
    `admin_citizenid`  VARCHAR(50)  NOT NULL,
    `expires_at`       DATETIME     DEFAULT NULL,
    `is_permanent`     TINYINT(1)   DEFAULT 0,
    `is_active`        TINYINT(1)   DEFAULT 1,
    `unbanned_by`      VARCHAR(100) DEFAULT NULL,
    `created_at`       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    KEY `idx_license`  (`license`),
    KEY `idx_ip`       (`ip`),
    KEY `idx_active`   (`is_active`),
    KEY `idx_citizenid`(`citizenid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `admin_warnings` (
    `id`              INT AUTO_INCREMENT PRIMARY KEY,
    `citizenid`       VARCHAR(50)  NOT NULL,
    `player_name`     VARCHAR(100) NOT NULL,
    `reason`          TEXT         NOT NULL,
    `admin_name`      VARCHAR(100) NOT NULL,
    `admin_citizenid` VARCHAR(50)  NOT NULL,
    `created_at`      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    KEY `idx_citizenid` (`citizenid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `admin_audit` (
    `id`               INT AUTO_INCREMENT PRIMARY KEY,
    `action`           VARCHAR(100) NOT NULL,
    `admin_name`       VARCHAR(100) NOT NULL,
    `admin_citizenid`  VARCHAR(50)  NOT NULL,
    `target_name`      VARCHAR(100) DEFAULT NULL,
    `target_citizenid` VARCHAR(50)  DEFAULT NULL,
    `details`          TEXT         DEFAULT NULL,
    `created_at`       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    KEY `idx_admin`   (`admin_citizenid`),
    KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `admin_notes` (
    `id`              INT AUTO_INCREMENT PRIMARY KEY,
    `citizenid`       VARCHAR(50)  NOT NULL,
    `note`            TEXT         NOT NULL,
    `admin_name`      VARCHAR(100) NOT NULL,
    `admin_citizenid` VARCHAR(50)  NOT NULL,
    `created_at`      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    KEY `idx_citizenid` (`citizenid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 1.2.0: Threat detection & ban evasion ────────────────────────────────────
-- These three are also created automatically on resource start, so an existing
-- install does not need to re-import this file. They are listed here so a
-- fresh install gets the whole schema in one place.

CREATE TABLE IF NOT EXISTS `admin_flags` (
    `id`          INT AUTO_INCREMENT PRIMARY KEY,
    `citizenid`   VARCHAR(50)  DEFAULT NULL,
    `license`     VARCHAR(100) DEFAULT NULL,
    `player_name` VARCHAR(100) DEFAULT NULL,
    `detection`   VARCHAR(40)  NOT NULL,
    `severity`    VARCHAR(10)  DEFAULT 'medium',
    `detail`      TEXT         DEFAULT NULL,
    `meta`        TEXT         DEFAULT NULL,
    `handled`     TINYINT(1)   DEFAULT 0,
    `handled_by`  VARCHAR(100) DEFAULT NULL,
    `created_at`  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    KEY `idx_detection` (`detection`),
    KEY `idx_created`   (`created_at`),
    KEY `idx_license`   (`license`),
    KEY `idx_handled`   (`handled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Every identifier a player has ever presented, anchored to their license.
-- This is what makes an offline ban able to attach a Discord account, and what
-- makes alt detection possible at all.
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

-- Every identifier attached to a ban. The connect check reads this, not the
-- license/ip/discord columns on admin_bans — those are kept for display and are
-- backfilled into this table on first start after upgrading.
CREATE TABLE IF NOT EXISTS `admin_ban_identifiers` (
    `id`       INT AUTO_INCREMENT PRIMARY KEY,
    `ban_id`   INT          NOT NULL,
    `id_type`  VARCHAR(20)  NOT NULL,
    `id_value` VARCHAR(190) NOT NULL,
    UNIQUE KEY `uk_ban_ident` (`ban_id`, `id_type`, `id_value`),
    KEY `idx_value` (`id_value`),
    KEY `idx_ban`   (`ban_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

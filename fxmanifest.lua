fx_version 'cerulean'
game 'gta5'

name        'Cipher-Admin'
description 'Advanced Admin Suite for QBox / QBCore'
version     '1.1.1'
author      'XyraL'

shared_scripts {
    '@ox_lib/init.lua',
    'config.lua',
}

-- qbx_core is NOT listed as a hard dependency: this resource supports QBox
-- OR QBCore and bridge/framework.lua detects which is present. Naming one
-- here would refuse to start on a perfectly valid server running the other.
dependencies {
    'ox_lib',
    'oxmysql',
}

client_scripts {
    'bridge/framework.lua',
    'client/main.lua',
    'client/reports.lua',
}

server_scripts {
    '@oxmysql/lib/MySQL.lua',
    'config.lua',
    'bridge/framework.lua',
    'server/main.lua',
    'server/players.lua',
    'server/bans.lua',
    'server/inventory.lua',
    'server/vehicles.lua',
    'server/resources.lua',
    'server/reports.lua',
}

ui_page 'html/index.html'

files {
    'html/index.html',
    'html/css/style.css',
    'html/js/core.js',
    'html/js/app.js',
    'html/js/panels/dashboard.js',
    'html/js/panels/players.js',
    'html/js/panels/character.js',
    'html/js/panels/spawner.js',
    'html/js/panels/inventory.js',
    'html/js/panels/bans.js',
    'html/js/panels/permissions.js',
    'html/js/panels/audit.js',
    'html/js/panels/self.js',
    'html/js/panels/adminchat.js',
    'html/js/panels/resources.js',
    'html/js/panels/reports.js',
    'html/js/panels/entities.js',
    'html/js/panels/stats.js',
}

lua54 'yes'

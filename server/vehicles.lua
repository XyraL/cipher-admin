-- Cipher-Admin Server — Vehicle Spawner

local IsAdmin       = function(src) return exports['cipher-admin']:IsAdmin(src) end
local HasPermission = function(src, p) return exports['cipher-admin']:HasPermission(src, p) end
local Audit         = function(...) exports['cipher-admin']:Audit(...) end

-- ── Vehicle categories and models ─────────────────────────────────────────────
-- Full list — servers can override in config
local VEHICLES = {
    ['Sedans'] = {
        'asea','asea2','asterope','camper','club','cognoscenti','cognoscenti2',
        'emperor','emperor2','emperor3','fugitive','glendale','ingot','intruder',
        'premier','primo','primo2','regina','stanier','stratum','sultan','sultan2',
        'surge','tailgater','tailgater2','warrener','washington',
    },
    ['Sports'] = {
        'adder','banshee','banshee2','bestiagts','blista','blista2','blista3',
        'buffalo','buffalo2','buffalo3','carbonizzare','comet2','comet3','comet4',
        'comet5','comet6','coquette','coquette2','coquette3','deviant','elegy',
        'elegy2','feltzer2','feltzer3','flashgt','furoregt','fusilade','futo',
        'futo2','issi2','issi3','issi4','issi5','issi6','issi7','jester',
        'jester2','jester3','jester4','kuruma','kuruma2','lynx','mamba',
        'ninef','ninef2','omnis','omnis2','pariah','penumbra','penumbra2',
        'raiden','rapidgt','rapidgt2','revolter','ruston','schafter2','schafter3',
        'schafter4','schafter5','schafter6','schwarzer','sentinel','sentinel2',
        'sentinel3','specter','specter2','streiter','sugoi','surano','tampa',
        'tropos','zion','zion2','zion3',
    },
    ['Super'] = {
        'autarch','bullet','cheetah','cheetah2','cyclone','cyclone2','entity2',
        'entityxf','fmj','gp1','infernus','italigtb','italigtb2','le7b',
        'nero','nero2','osiris','pfister811','reaper','sc1','sultanrs','t20',
        'taipan','tempesta','thrax','tigon','torero','torero2','turismo2',
        'tyrant','tyrus','vacca','vagner','vigilante','visione','voltic',
        'voltic2','xa21','zentorno',
    },
    ['SUVs'] = {
        'baller','baller2','baller3','baller4','baller5','baller6','bjxl',
        'cavalcade','cavalcade2','fq2','granger','gresley','habanero','huntley',
        'landstalker','landstalker2','mesa','mesa2','mesa3','novak','patriot',
        'patriot2','patriot3','radi','rebla','rocoto','seminole','seminole2',
        'serrano','toros','xls','xls2',
    },
    ['Muscle'] = {
        'blade','buccaneer','buccaneer2','chino','chino2','clique','coquette4',
        'deviant','dominator','dominator2','dominator3','dominator4','dominator5',
        'dominator6','dominator7','dominator8','gauntlet','gauntlet2','gauntlet3',
        'gauntlet4','gauntlet5','hotknife','impaler','impaler2','impaler3',
        'impaler4','indiana','lurcher','manana','manana2','moonbeam','moonbeam2',
        'orel','phoenix','picador','rat-loader','rat-truck','ruiner','ruiner2',
        'sabre2','slamvan','slamvan2','slamvan3','slamvan4','slamvan5','slamvan6',
        'stallion','tampa2','tampa3','tahoma','vamos','vigero','vigero2','virgo',
        'virgo2','virgo3','voodoo','voodoo2','yosemite','yosemite2','yosemite3',
    },
    ['Motorcycles'] = {
        'akuma','avarus','bagger','bati','bati2','bf400','carbonrs','chimera',
        'cliffhanger','daemon','daemon2','defiler','diablous','diablous2',
        'double','esskey','faggio','faggio2','faggio3','fcr','fcr2','gargoyle',
        'hakuchou','hakuchou2','hauler2','hexer','innovation','lectro','manchez',
        'manchez2','manchez3','michelli','nemesis','nightblade','operator',
        'pcj','ratbike','reever','ruffian','sanchez','sanchez2','sanctus',
        'shotaro','sovereign','stryder','thrust','vader','vindicator','vortex',
        'wolfsbane','zombie','zombie2',
    },
    ['Emergency'] = {
        'ambulance','fbi','fbi2','firetruk','lguard','police','police2','police3',
        'police4','policeb','policet','polmav','pranger','riot','riot2','sheriff',
        'sheriff2','sheriffb','sheriffbe','swatvan','taxi','ems','ambulance',
    },
    ['Vans'] = {
        'bison','bison2','bison3','bobcatxl','boxville','boxville2','boxville3',
        'boxville4','boxville5','burrito','burrito2','burrito3','burrito4',
        'burrito5','festival','gburrito','gburrito2','minivan','minivan2',
        'pony','pony2','rumpo','rumpo2','rumpo3','speedo','speedo2','speedo4',
        'surfer','surfer2','taco','youga','youga2','youga3',
    },
    ['Boats'] = {
        'dinghy','dinghy2','dinghy3','dinghy4','dinghy5','jetmax','longfin',
        'marquis','seashark','seashark2','seashark3','speeder','speeder2',
        'squalo','submersible','submersible2','suntrap','toro','toro2',
        'tropic','tropic2','tug','kosatka',
    },
    ['Helicopters'] = {
        'akula','annihilator','annihilator2','buzzard','buzzard2','cargobob',
        'cargobob2','cargobob3','cargobob4','cayoperico','frogger','frogger2',
        'havok','hunter','maverick','militaryheliab','police3','polmav',
        'savage','seasparrow','seasparrow2','seasparrow3','skylift','squirrel',
        'supervolito','supervolito2','swift','swift2','valkyrie','valkyrie2',
        'volatus',
    },
    ['Planes'] = {
        'alphaz1','avenger','avenger2','besra','bombushka','cargo','cargoplane',
        'cuban800','dodo','duster','howard','hydra','jet','lazer','luxor',
        'luxor2','mammatus','miljet','nimbus','nokota','pyro','rogue','shamal',
        'starling','strikeforce','titan','tula','ultralight','velum','velum2',
        'vestra','volatol',
    },
}

-- The framework's own vehicle list, grouped into the categories the spawner
-- renders. Cached because building it walks every vehicle on the server and
-- the answer only changes on restart.
local _cache = nil

local function BuildVehicleList()
    if _cache then return _cache end

    local ok, vehicles = pcall(function() return Framework.GetVehicles() end)
    if not ok or not vehicles then
        -- No framework list — fall back to the built-in models, normalised into
        -- the same { model, label } shape so the panel never sees two formats.
        local fallback, n = {}, 0
        for cat, models in pairs(VEHICLES) do
            fallback[cat] = {}
            for _, m in ipairs(models) do
                fallback[cat][#fallback[cat] + 1] = { model = m, label = m }
                n = n + 1
            end
        end
        _cache = { list = fallback, source = 'built-in', count = n }
        return _cache
    end

    -- Group by category, and carry the label so the card can show "Sultan RS"
    -- rather than "sultan2".
    local grouped, count = {}, 0
    for spawn, v in pairs(vehicles) do
        local cat = v.category or 'Uncategorised'
        -- Categories arrive lowercase from both frameworks; the panel headings
        -- read better capitalised.
        cat = cat:sub(1, 1):upper() .. cat:sub(2)
        grouped[cat] = grouped[cat] or {}
        grouped[cat][#grouped[cat] + 1] = {
            model = spawn,
            label = v.brand and (v.brand .. ' ' .. (v.label or spawn)) or (v.label or spawn),
        }
        count = count + 1
    end

    for _, models in pairs(grouped) do
        table.sort(models, function(a, b) return a.label < b.label end)
    end

    _cache = { list = grouped, source = 'framework', count = count }
    return _cache
end

-- Keys for resources whose API lives on the server. qbx_vehiclekeys exposes
-- GiveKeys(source, vehicle) here and nowhere on the client, which is why
-- calling it client-side reported "could not give keys".
RegisterNetEvent('cipher-admin:server:giveVehicleKeys')
AddEventHandler('cipher-admin:server:giveVehicleKeys', function(netId, plate)
    local src = source
    if not IsAdmin(src) then return end

    local veh = NetworkGetEntityFromNetworkId(netId)
    if not veh or veh == 0 or not DoesEntityExist(veh) then return end

    local res = Config.VehicleKeysResource

    local ok, err = pcall(function()
        if res == 'qbx_vehiclekeys' then
            exports.qbx_vehiclekeys:GiveKeys(src, veh, true)
        elseif res == 'mk_vehiclekeys' then
            TriggerEvent('mk_vehiclekeys:server:addKey', src, plate)
        elseif res == 'custom' then
            if Config.CustomGiveKeysEvent and Config.CustomGiveKeysEvent ~= '' then
                TriggerEvent(Config.CustomGiveKeysEvent, src, plate, netId)
            else
                error('CustomGiveKeysEvent is empty')
            end
        end
    end)

    if not ok then
        print(('^3[cipher-admin]^0 keys via "%s" failed: %s'):format(tostring(res), tostring(err)))
    end
end)

lib.callback.register('cipher-admin:server:getVehicleList', function(src)
    if not IsAdmin(src) then return nil end
    local built = BuildVehicleList()
    return { categories = built.list, source = built.source, count = built.count }
end)

AddEventHandler('onResourceStart', function(res)
    if res ~= GetCurrentResourceName() then return end
    CreateThread(function()
        -- The framework has to be up before its vehicle table can be read.
        Wait(3000)
        local built = BuildVehicleList()
        if built.source == 'framework' then
            print(('[Cipher-Admin] Vehicle spawner: %d vehicles from the framework.'):format(built.count))
        else
            print('[Cipher-Admin] Vehicle spawner: framework list unavailable, using the built-in models.')
        end
    end)
end)

-- Spawn relay: admin requests spawn → target client spawns
RegisterNetEvent('cipher-admin:client:getSpawnCoords')
AddEventHandler('cipher-admin:client:getSpawnCoords', function(model, adminSrc)
    -- This fires on client via TriggerClientEvent; handled there
end)

RegisterNetEvent('cipher-admin:server:spawnVehCoords')
AddEventHandler('cipher-admin:server:spawnVehCoords', function(adminSrc, model, coords)
    TriggerClientEvent('cipher-admin:client:spawnVehicle', tonumber(adminSrc), model, coords)
end)

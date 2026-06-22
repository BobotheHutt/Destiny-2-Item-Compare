// ===================== CONSTANTS =====================
const BUNGIE_CLIENT_ID  = '51779';
const BUNGIE_API_KEY    = '65dad06c7ac04b90ba4096ecf0c9f6f5';
const BUNGIE_REDIRECT_URL = 'https://bobothehutt.github.io/Destiny-2-Item-Compare';
const BUNGIE_AUTH_URL = 'https://www.bungie.net/en/OAuth/Authorize';
const BUNGIE_TOKEN_URL = 'https://www.bungie.net/Platform/App/OAuth/Token/';
const CLASS_NAMES  = {0:'Titan',1:'Hunter',2:'Warlock'};
const CLASS_KEYS   = {0:'titan',1:'hunter',2:'warlock'};
const RACE_NAMES   = {0:'Human',1:'Awoken',2:'Exo'};
const GENDER_NAMES = {0:'Male',1:'Female'};
const PLATFORMS    = {1:'Xbox',2:'PlayStation',3:'Steam',5:'Stadia',6:'Epic Games',254:'Bungie.net'};
const RARITY       = {6:'exotic',5:'legendary',4:'rare',3:'uncommon',2:'common'};

const WEAPON_BUCKET_NAMES = {1498876634:'Kinetic',2465295065:'Energy',953998645:'Heavy'};
const ARMOR_BUCKET_NAMES  = {3448274439:'Helmet',3551918588:'Gauntlets',14239492:'Chest',20886954:'Legs',1585787867:'Class Item'};
const GENERAL_BUCKETS     = new Set([4023194814,284967655,2025709351]); // Ghost, Ship, Sparrow
const WEAPON_BUCKETS      = new Set([1498876634,2465295065,953998645]);
const ARMOR_BUCKETS       = new Set([3448274439,3551918588,14239492,20886954,1585787867]);
const VAULT_BUCKET        = 138197802;
const POSTMASTER_BUCKET   = 215593132; // Lost Items — items here need the same manifest-lookup fallback as Vault items

const WEAPON_STAT_HASHES = [4284893193,2961396640,155624089,943549884,1240592695,2762071195,3614673599,3871231066,2715839340];
const WEAPON_STAT_NAMES  = {4284893193:'Impact',2961396640:'Range',155624089:'Stability',943549884:'Handling',1240592695:'Reload Speed',2762071195:'Rounds/Min',3614673599:'Magazine',3871231066:'Aim Assist',2715839340:'Recoil'};
const ARMOR_STAT_HASHES  = [392767087,4244567218,1735777505,144602215,1943323491,2996146975];
const ARMOR_STAT_NAMES   = {2996146975:'Weapons',392767087:'Health',1943323491:'Class',1735777505:'Grenade',144602215:'Super',4244567218:'Melee'};

// ===================== STATE =====================
let manifestItems = {};
let manifestStats = {};
let manifestPerks = {};
let manifestPlugSets = {};
let manifestSetDefs = {};
// Static armor set table (name + item hashes per set), extracted once from Bungie's
// DestinyEquipableItemSetDefinition manifest table. Baked in here instead of fetched live every
// session, since this data only changes when Bungie ships new armor sets — update by re-running
// the export and pasting the new list in if that ever happens.
const STATIC_ARMOR_SETS = [{"name":"Triumphal Anthem","items":[3153400267,4071845509,2727863512,3855332578,374648029,571839605,2324823787,1064523906,3470352892,2147961687,2414602118,350102826,986920507,2480734911,1973631360]},{"name":"Seventh Seraph","items":[2251396699,618725557,3611287432,1826620274,701436877,3640316102,3571299690,4208117371,3706448895,3623802816,1296681495,1673892193,2880957884,1899944006,2680862009]},{"name":"Techsec","items":[3129990424,4150538093,503854896,2292070913,1589715538,2709760314,2719854935,2401760398,517096395,95722356,489126477,1963424554,4052965875,2082858804,1159925519]},{"name":"Oryx's Memory","items":[1965763230,402458066,2892249111,2385145720,1039275747,2766419210,804869182,1265664091,1805631268,558850503,418390881,3912717495,662286992,1913339475,1746069510]},{"name":"Iron Panoply Set","items":[1800556337,2195844199,2911341942,4193009504,1631809155,3578811197,4126332611,3408036410,3631616612,1649469535,717101494,3053825914,2702279243,2898513455,1929483792]},{"name":"Resonant Fury","items":[2771790736,4246884536,2642378837,3300005657,3130426090,1333378716,1962502788,2706229721,680713005,336306726,2971305787,1461764245,159255784,2504952530,1379769261]},{"name":"Reverie Dawn","items":[257978235,966839765,88788776,4086489106,3002985709,1924293735,2178430353,78892972,720200086,677099433,1402155924,1144358828,3843014113,663055813,1265437086]},{"name":"Luminopotent","items":[2835120910,2883433250,2107326067,593554567,1047792392,3654657240,3307308272,2192886829,2816737729,1689821714,3737830979,3345056013,1924898304,1966593658,1829877749]},{"name":"Kentarch 3","items":[968831388,1078817668,1822544601,316165677,4266726694,1009804448,1743776488,3445873861,3218395433,3999711322,1563546587,440521013,3433082888,1138770162,13586765]},{"name":"Great Hunt","items":[1424596150,411363450,59816779,3606008111,2636978448,798548386,2245795974,2988244847,3305541779,3308728284,1669070837,4274862443,3014562562,272616828,3245192919]},{"name":"Atheon's Memory","items":[4105572261,2245093627,601809810,656307180,157934631,2556214161,3352305223,4067802966,695173568,1962906467,1371860250,3391112046,4133560887,3091179819,3094263124]},{"name":"Cruel Electrum","items":[4134167063,2719275361,3926341052,442462278,1223380281,2196855059,381670717,1885235312,2149717194,1931809125,164616118,3740518778,3388972107,2346028079,1376998416]},{"name":"Legacy's Oath","items":[726855135,1657654553,3013397204,3572161646,3943072673,3763941291,3046896869,1702811704,129329474,943612349,2654264556,3001197620,4210958601,4191732605,3299996694]},{"name":"AION Adapter","items":[1629686472,2725736573,3798581184,3013134961,2306671522,1764010530,3374948591,2632499718,4271003923,4274190428,1828890675,119770768,2528292701,2247786986,1563741445]},{"name":"Collective Psyche","items":[2565439347,3858892752,2396904861,2559878186,2300393285,1004271921,4131269494,3415771751,3396725088,835524739,285521900,3090407945,1880646964,1822989949,931254038]},{"name":"Bushido","items":[81786728,464665629,1154629600,1465235089,1183125954,2195895938,2517367247,2199272806,407922163,4281618492,970712027,743956488,2046361909,545935602,3715719501]},{"name":"AION Renewal","items":[94775422,3389206211,3218422834,1021364471,938718424,1148225208,3070333453,3718617552,351882401,3478460146,3406093957,1643127154,2903426907,4251796172,3328966151]},{"name":"Techeun's Regalia","items":[1106068818,2438408214,4263497347,1507307244,1768035391,2367623270,950387978,2009401631,1926755680,1587205659,3466245347,826300973,1228973722,1092257813,3235179552]},{"name":"Apostate's Blade","items":[306365328,2817890488,1213384789,834580249,665000682,280416716,3622930836,496251113,1393530461,926252150,3549765533,2621477411,1903284250,3602570948,1195966527]},{"name":"CODA","items":[1059495350,3599596410,3248049739,3240907311,2271877648,487819442,688405494,442490015,4111282147,1313515212,3979088145,3392386759,4107884502,2118047552,3385780451]},{"name":"Yearning Echo","items":[2457568303,3276657033,761993028,3229172222,2607610961,3521164091,4011328661,2708820200,3054810834,1929627565,583828678,167514474,804332155,649961471,567315392]},{"name":"TM Custom","items":[3540897637,3388177083,50055852,3463666663,2169453906,1778905881,1639070591,2431571592,376021003,3310583438,1803327524,4209729564,3127484245,3733973454,1625156497]},{"name":"Deep Explorer","items":[3991113631,2800738009,244497300,2965807150,2912260705,625929843,2458622621,3920610512,620368682,360883781,1943628306,579470806,4204065279,1272123715,2344969900]},{"name":"Taken King","items":[484598250,1923008030,3278707259,3818777476,1252635175,1676164222,567982130,2602753271,2520107224,738765507,3091154407,2124362257,1887060758,1843960105,24824876]},{"name":"First Ascent","items":[1738534735,3211013545,696349540,2468561950,2313034993,1974157643,3430954245,2086972248,2676089954,3490372701,1608373876,3555622028,1493379009,869273765,1896112510]},{"name":"Dark Age","items":[3286183036,4149732324,1023052601,2633620365,2289110918,2948225904,818195096,3508656821,3434864121,3265284426,3112219725,302622707,2508048682,410984756,3783018767]},{"name":"Iron Battalion Set","items":[1115024653,832474547,3037900522,2242619636,1785823695,3350720177,1994130151,2709627894,1448206048,3181972995,3672778310,1621183978,2258001659,3738911103,3656265024]},{"name":"Cyberserpent Null","items":[672962726,3805392714,3976176219,697518687,190415264,1388789482,1239854366,569481511,4182898491,428001412,1955241651,4055612125,1647090192,2374137962,1690092421]},{"name":"Circuit","items":[911145047,3783353505,270891260,1897185158,2719679865,3514115395,3381988877,1961831168,1742878074,1606162165,1580760688,3780494232,2175988661,2067398905,1897819210]},{"name":"New Demotic","items":[3676598776,4096683536,3023838797,2838679265,1711866418,3990156004,2195018204,3480851793,1019345429,1201273998,1971091137,4154731415,1988083558,2214884208,3041479219]},{"name":"Thriving Survivor","items":[2419726011,365930261,3358389096,1953372754,828189485,3917237407,3093390809,537150100,2891930926,2838384481,690430270,3781374706,123224963,1616916151,1109812632]},{"name":"Dreambane","items":[3418320358,1327035786,1963853467,3060098719,2977452768,2296158778,3224065934,3542160471,103494859,3977088116,1892366441,469791215,1716949886,1428562840,2184308283]},{"name":"Wild Anthem","items":[361848666,217940910,536035447,2039591531,1618320532,225063086,1644825026,1334855187,2278464039,2732598696,2394455241,2134373071,3805886046,1930651768,2686397083]},{"name":"Pantheos Resplendent","items":[2429332885,751380107,3827624354,1074455580,176521975,2609656681,1774949103,3022107774,2145853080,2901598523,2235536812,2089000948,2832830921,3773004861,3305726422]},{"name":"Swordmaster","items":[2697887125,1604556427,385833378,1343009820,445076215,2347181257,262826703,1934339678,1883377784,2639123099,4172973116,1504698788,2248528889,3520307277,3558781766]},{"name":"Wayward Psyche Set","items":[1575226736,1550311576,4240773301,2061864953,1892285258,3110734908,2919430564,3663260665,2458069069,2496543558,2578879401,1182916911,2896109758,2115178968,2404890235]},{"name":"Eutechnology","items":[2270938588,726639044,1936503321,1152238701,1232186726,591555944,433193440,4038196765,1975004305,1692895170,1851922001,2897411591,4078840342,4285848704,1683071779]},{"name":"Veritas","items":[1193572528,905917400,4020836597,1297433145,1552207754,293997844,3380735020,1784423009,3849865029,157279006,437403069,3006725699,2288429498,490208484,2803028703]},{"name":"Wildwood","items":[1552647844,4117549980,1532976913,2876804565,3483293774,3306445147,601487797,3594049672,2881668722,1756485325,2374991792,276510936,3391430133,2478852409,2733627018]},{"name":"Nezarec's Nightmare","items":[3552360921,155603519,4205026632,2149579211,1402762062,2862524208,3128778747,1020854508,522481959,1485494930,2659095794,3461374774,1563030563,3060334092,2832578527]},{"name":"Per Audacia","items":[43450237,3913444611,2812267642,479136420,2367602335,2837409129,3364872431,317063806,2373605528,3129350971,1001635962,107146958,849595799,2679378699,2682565300]},{"name":"Crota's Memory","items":[1232699955,2781601117,373079184,1651596266,967550725,1091402463,2541339673,3897082324,3936708974,12652705,1136719236,3423597948,414567409,2502349621,2684381358]},{"name":"Promised","items":[668401898,2981434142,2311061287,3462510907,4002581124,2330310558,1286143186,1922960867,3256796439,2749693048,3365555057,3543048103,387932854,1504514464,3196704707]},{"name":"Smoke Jumper Set","items":[2280816555,1003997240,2348082405,2941172034,3755454909,589006711,4129998876,3347493825,1575046822,2397541401,986078848,1619647653,3788059976,3577550601,63899322]},{"name":"Shrewd Survivor","items":[1722491869,3531425635,2430248538,2158178052,4046540927,1849147777,2629237079,462589222,2051364144,3343993331,938861252,3475188156,932088625,2263018101,2869507310]},{"name":"Disaster Corps Set","items":[517814638,3957372883,438409602,2571112423,2600892776,250597586,2757996223,3428369046,3408026115,651836012,2557300061,1703017178,2804194275,2992986244,586381823]},{"name":"Crystocrene","items":[4134659289,2893611839,4140770382,492357704,2731877579,1356732989,1982012355,1263716154,1409538404,3722358623,2382720962,4143953830,591435279,128816179,131899516]},{"name":"Exodus Down","items":[3043860795,636661397,3629120232,2577507538,1452324269,1303083975,3333520369,1192406156,99093622,55889673,3574967478,3722582138,3371035467,1461412143,492382480]},{"name":"Last Discipline","items":[1172384181,1109145282,2752429099,4112577340,2748506263,4079706495,2773786868,1459620921,2629942414,3000956609,2403923088,420604757,2025110456,2932138009,2762558442]},{"name":"Twofold Crown","items":[2116325413,4241698066,1590014587,2962027628,2463655079,2534133191,3384001164,1230148081,1330142838,1286938889,3453853118,3533586691,2896769138,85371703,3873235480]},{"name":"Thunderhead","items":[2362752274,1982705366,1691247683,2764093868,1312332543,2534916982,3434538298,4250191599,3747196112,2658534155,4284293055,1271409273,3259089614,3205543169,3010135860]},{"name":"Spacewalk","items":[2563228825,2041120767,3712633614,3215894536,1160343947,1280635717,1756488475,113307954,2084761228,1627862215,2215074684,1989796068,3158083641,1562512013,1218002566]},{"name":"Flain","items":[204173504,1881459336,3583556837,2795645257,3194080506,2357217708,3881761780,330624457,3894685757,3427407318,1148938453,283174091,2934857698,4047554908,2725060663]},{"name":"Ferropotent","items":[4199055647,2849508185,293267476,3173749166,3120202721,2370945771,3554497829,2676446840,3031404418,3462703357,4037429988,4066564572,1057430865,1066619413,1248547982]},{"name":"Lustrous","items":[3446591075,3643047597,1756958880,1209319450,1072603541,2739996165,2901472731,1641172978,3585698380,2662868359,1806024532,1809917548,213708705,1025347717,2052186462]},{"name":"Sage Protector","items":[2354448750,1867581826,1091577811,112779239,142559592,919358834,279565494,3945736543,4118260899,1320597132,2249815529,640369263,1887527934,1786011928,2541757371]}];
let itemHashToSetName = {}; // reverse lookup built once from STATIC_ARMOR_SETS: item hash -> set display name
STATIC_ARMOR_SETS.forEach(set => { set.items.forEach(h => { itemHashToSetName[h] = set.name; }); });
function getArmorSetName(itemHash) { return itemHashToSetName[itemHash] || null; }
let allItems      = []; // all weapon+armor items across chars+vault
let profileLoaded = false;
let isPreviewMode = false;
let inGameLockState = {}; // instanceId -> bool (true = locked in game)
let instanceData  = {};
let socketData    = {};
let statsData     = {};
let reusablePlugsData = {};
let marks         = JSON.parse(localStorage.getItem('d2marks') || '{}');
let oauthToken    = localStorage.getItem('d2oauth_token') || null;
let oauthExpiry   = Number(localStorage.getItem('d2oauth_expiry') || 0);
let profileInfo   = {};

let weaponFilter  = {exotic:false, legendary:true, dupes:false, locked:false};
let armorFilter   = {exotic:false, legendary:true, locked:false, dupes:false};
let armorSetFilter = ''; // selected armor set name to filter by, '' = no filter (all sets)
let hideCraftedWeapons = localStorage.getItem('d2hidecrafted') === '1';
let activeWeaponCategory = null;
let activeWeaponType     = null;
let activeWeaponBHash    = null;
let activeArmorClass     = null;
let activeArmorSlot      = null;
let compareSort          = 'power';

// ===================== UTILS =====================

// Class-based themes: shift accent color and background glow per class
const CLASS_THEMES = {
  0: { accent:'#c8a84b', accent2:'#e8c96a', glow:'rgba(200,168,75,0.38)',  line:'rgba(200,168,75,0.16)'  }, // Titan - gold
  1: { accent:'#4a9fd4', accent2:'#6abde8', glow:'rgba(74,159,212,0.38)',  line:'rgba(74,159,212,0.16)' }, // Hunter - blue
  2: { accent:'#9b6fc4', accent2:'#b88de0', glow:'rgba(155,111,196,0.38)', line:'rgba(155,111,196,0.16)'}, // Warlock - purple
};
function applyClassTheme(classType) {
  const theme = CLASS_THEMES[classType] || CLASS_THEMES[0];
  const root = document.documentElement;
  root.style.setProperty('--accent',      theme.accent);
  root.style.setProperty('--accent2',     theme.accent2);
  root.style.setProperty('--theme-glow',  theme.glow);
  root.style.setProperty('--theme-line',  theme.line);
}

function saveMark(instanceId, mark) {
  const prevMark = marks[instanceId] || null;
  if (mark === null) { delete marks[instanceId]; } else { marks[instanceId] = mark; }
  localStorage.setItem('d2marks', JSON.stringify(marks));
  // Lock status changed (either direction) — schedule a reactive auto-sync check
  if (mark === 'fav' || prevMark === 'fav') scheduleLockAutoSync();
}
function getMark(instanceId) { return marks[instanceId] || null; }

// Reactive lock auto-sync — debounced so rapid toggles batch into one sync, and only actually
// calls Bungie if there's a real mismatch between app marks and in-game lock state. No polling.
let lockAutoSyncTimer = null;
function scheduleLockAutoSync() {
  clearTimeout(lockAutoSyncTimer);
  lockAutoSyncTimer = setTimeout(async () => {
    if (!profileLoaded || isPreviewMode) return;
    const mismatched = allItems.some(i => {
      if (!i.itemInstanceId) return false;
      const appLocked = getMark(i.itemInstanceId) === 'fav';
      const gameLocked = inGameLockState[i.itemInstanceId] || false;
      return appLocked !== gameLocked;
    });
    if (mismatched) await syncLocksToGame();
  }, 1500);
}

// Favorites — completely independent of marks (Locked/Junk/Infuse). Pure personal bookmark,
// no game sync, no interaction with anything else. Can coexist with any mark, including Locked.
let favorites = JSON.parse(localStorage.getItem('d2favorites') || '{}');
function isFavorite(instanceId) { return !!favorites[instanceId]; }
function toggleFavorite(instanceId) {
  if (favorites[instanceId]) delete favorites[instanceId];
  else favorites[instanceId] = true;
  localStorage.setItem('d2favorites', JSON.stringify(favorites));
}
function favoriteIconInline(size, color) {
  const s = size||15;
  const c = color||'#3fe06a'; // defaults to Work Mode's green badge color
  return `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="${c}" title="Favorite">
    <path d="M12 21s-7.5-4.9-10.2-9.3C.2 8.8 1.4 5 5 4c2.2-.6 4.3.4 5.6 2.2L12 8l1.4-1.8C14.7 4.4 16.8 3.4 19 4c3.6 1 4.8 4.8 3.2 7.7C19.5 16.1 12 21 12 21z"/>
  </svg>`;
}

// 3-state lock button class:
// '' = unlocked (not in app, not in game)
// 'active' = locked in app AND matches game (synced)
// 'pending' = locked in app but NOT matching game (needs sync)
function getLockBtnClass(instanceId) {
  const appLocked = getMark(instanceId) === 'fav';
  const gameLocked = inGameLockState[instanceId] || false;
  if (!appLocked && !gameLocked) return '';        // unlocked both
  if (appLocked && gameLocked) return 'active';    // synced
  return 'pending';                                // pending change
}

// Lock button tooltip
function getLockBtnTitle(instanceId) {
  const appLocked = getMark(instanceId) === 'fav';
  const gameLocked = inGameLockState[instanceId] || false;
  if (appLocked && gameLocked) return 'Locked — synced with game';
  if (appLocked && !gameLocked) return 'Locked — pending sync to game';
  if (!appLocked && gameLocked) return 'Unlocked in app — pending sync (will unlock in game)';
  return 'Unlocked';
}

async function syncLocksToGame() {
  const btn = document.getElementById('syncLocksBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Syncing…'; }
  const headers = await ensureAuthHeaders();
  if (!headers) { if (btn) { btn.disabled = false; btn.textContent = 'Sync to Game'; } return; }
  const {membershipType} = profileInfo;

  // Find all items that need syncing
  const toSync = allItems.filter(i => {
    if (!i.itemInstanceId) return false;
    const appLocked = getMark(i.itemInstanceId) === 'fav';
    const gameLocked = inGameLockState[i.itemInstanceId] || false;
    return appLocked !== gameLocked;
  });

  if (!toSync.length) {
    if (btn) { btn.disabled = false; btn.textContent = '✓ Already in sync'; }
    setTimeout(()=>{ if(btn){ btn.disabled=false; btn.textContent='Sync to Game'; } }, 2000);
    return;
  }

  let success = 0, failed = 0;
  for (const item of toSync) {
    const appLocked = getMark(item.itemInstanceId) === 'fav';
    // Need characterId - vault items use first character
    const characterId = item.characterId || profileInfo.characterIds?.[0] || '';
    try {
      const resp = await fetch('https://www.bungie.net/Platform/Destiny2/Actions/Items/SetLockState/', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          state: appLocked,
          itemId: item.itemInstanceId,
          characterId: characterId,
          membershipType
        })
      });
      const data = await resp.json();
      if (data.ErrorCode === 1) {
        inGameLockState[item.itemInstanceId] = appLocked;
        success++;
      } else {
        failed++;
      }
    } catch(e) { failed++; }
    // Small delay to avoid rate limit
    await new Promise(r => setTimeout(r, 150));
  }

  if (btn) {
    btn.disabled = false;
    btn.textContent = failed ? `Synced ${success}, ${failed} failed` : `✓ Synced ${success} items`;
    setTimeout(()=>{ if(btn) btn.textContent='Sync to Game'; }, 3000);
  }
  const reopenIid = interactiveTooltipIid, reopenPos = interactiveTooltipPos; // capture before the renders below wipe them
  if (document.getElementById('panel-trashmode')?.classList.contains('active')) renderTrashMode();
  if (reopenIid && reopenPos) showItemTooltip({clientX:reopenPos.x, clientY:reopenPos.y}, reopenIid, true);
}

function getItemDef(hash) { return manifestItems[hash] || manifestItems[hash>>>0] || null; }
function getStatDef(hash) { return manifestStats[hash] || manifestStats[hash>>>0] || null; }
function getPerkDef(hash) { return manifestPerks[hash] || manifestPerks[hash>>>0] || null; }
// Returns {name, tiers:[{count, desc}]} for an item's armor set, or null
function getSetBonuses(itemHash) {
  const setName = itemHashToSetName[itemHash] || itemHashToSetName[itemHash>>>0];
  if (!setName) return null;
  // Find the set definition that contains this item hash
  for (const def of Object.values(manifestSetDefs)) {
    const items = def.itemList || [];
    if (items.some(e => e.itemHash === itemHash || e.itemHash === (itemHash>>>0))) {
      const tiers = (def.setTiers || []).map(t => ({count: t.tierCount || 0, desc: t.tierDescription || ''})).filter(t => t.desc);
      if (tiers.length) return {name: setName, tiers};
    }
  }
  return null;
}

// Damage/ammo icons pulled from manifest at runtime (populated after manifest loads)
let manifestDamageTypes = {}; // damageTypeEnum -> icon path
let manifestEnergyTypes = {}; // energyTypeHash -> icon path

function buildDamageIconMap() {
  // DestinyDamageTypeDefinition: keyed by hash, has .damageTypeEnumValue and .displayProperties.icon
  // We also check DestinyEnergyTypeDefinition for ammo type icons via item.equippingBlock.ammoType
  // Fallback: use known Bungie CDN paths per enum value
  const FALLBACK_DMG = {
    1: '/img/destiny_content/damage_types/destiny2/kinetic.png',
    2: '/img/destiny_content/damage_types/destiny2/arc.png',
    3: '/img/destiny_content/damage_types/destiny2/thermal.png',
    4: '/img/destiny_content/damage_types/destiny2/void.png',
    6: '/img/destiny_content/damage_types/destiny2/stasis.png',
    7: '/img/destiny_content/damage_types/destiny2/strand.png',
  };
  const FALLBACK_AMMO = {
    1: '/img/destiny_content/damage_types/destiny2/kinetic_ammo.png',
    2: '/img/destiny_content/damage_types/destiny2/special_ammo.png',
    3: '/img/destiny_content/damage_types/destiny2/heavy_ammo.png',
  };
  // Try to pull from manifest items - find a sample weapon per damage type to get real icon
  // Use the item's defaultDamageTypeHash -> look up in DestinyDamageTypeDefinition if available
  // For now use fallbacks but look for icons in manifestItems definitions
  manifestDamageTypes = FALLBACK_DMG;
  manifestEnergyTypes = FALLBACK_AMMO;
}

function damageIcon(def, size) {
  if (!def) return '';
  const dt = def.defaultDamageType;
  if (!dt || dt === 0) return '';
  const path = manifestDamageTypes[dt];
  if (!path) return '';
  const s = size||14;
  return `<img src="https://www.bungie.net${path}" style="width:${s}px;height:${s}px;vertical-align:middle;opacity:0.95;filter:drop-shadow(0 0 1px rgba(0,0,0,0.9));" onerror="this.style.display='none'" />`;
}
function ammoIcon(def) {
  if (!def) return '';
  const at = def.equippingBlock?.ammoType;
  if (!at || at === 0) return '';
  const path = manifestEnergyTypes[at];
  if (!path) return '';
  return `<img src="https://www.bungie.net${path}" style="width:14px;height:14px;vertical-align:middle;opacity:0.9;" onerror="this.style.display='none'" />`;
}
function itemRarity(def) { return def?.inventory?.tierType || 0; }
function rarityKey(def)  { return RARITY[itemRarity(def)] || 'common'; }

// Masterwork detection — state bit 2 (value 4)
function isMasterworked(itemInstanceId) {
  const raw = allItems.find(i=>i.itemInstanceId===itemInstanceId);
  return raw ? !!(raw.state & 4) : false;
}
// Crafted detection — state bit 3 (value 8)
function isCrafted(itemInstanceId) {
  const raw = allItems.find(i=>i.itemInstanceId===itemInstanceId);
  return raw ? !!(raw.state & 8) : false;
}
// Gear Tier (Edge of Fate, 1-5) — lives directly on instance data. Older/legacy
// gear and untiered items simply don't have it, so 0/undefined means "no pips".
function gearTierOf(iid) {
  const inst = instanceData[iid];
  return inst?.gearTier || 0;
}
// Bare crafted icon — red, no positioning. Caller places it (used inline inside the bottom info bar).
function craftedIconInline(size) {
  const s = size||13;
  return `<svg viewBox="0 0 16 16" width="${s}" height="${s}" title="Crafted" style="filter:drop-shadow(0 0 1px rgba(0,0,0,0.9));">
    <rect x="0" y="0" width="4.5" height="4.5" fill="#e0473e"/>
    <rect x="11.5" y="0" width="4.5" height="4.5" fill="#e0473e"/>
    <rect x="0" y="11.5" width="4.5" height="4.5" fill="#e0473e"/>
    <rect x="11.5" y="11.5" width="4.5" height="4.5" fill="#e0473e"/>
    <rect x="6.7" y="3" width="2.6" height="10" fill="#e0473e"/>
    <rect x="3" y="6.7" width="10" height="2.6" fill="#e0473e"/>
  </svg>`;
}
// Work Mode mark-status badge — small, green, shape varies by mark type. 'fav'=lock, 'junk'=trash can, 'infuse'=bolt.
function markIconSvg(mark, size, color) {
  const s = size||15;
  const c = color||'#3fe06a'; // defaults to Work Mode's green badge color
  if (mark === 'fav') {
    return `<svg viewBox="0 0 24 24" width="${s}" height="${s}" title="Locked">
      <path d="M8 11V7a4 4 0 0 1 8 0v4" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round"></path>
      <rect x="5" y="11" width="14" height="9" rx="2" fill="${c}"></rect>
    </svg>`;
  }
  if (mark === 'infuse') {
    return `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="${c}" title="Infuse">
      <polygon points="13 2 4 14 11 14 10 22 20 9 13 9"></polygon>
    </svg>`;
  }
  // junk — solid trash-can silhouette
  return `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="${c}" title="Marked as junk">
    <rect x="4" y="7" width="16" height="2" rx="1"></rect>
    <rect x="9" y="3" width="6" height="3" rx="1"></rect>
    <path d="M6 9.5h12l-1.2 11a2 2 0 0 1-2 1.8H9.2a2 2 0 0 1-2-1.8L6 9.5z"></path>
  </svg>`;
}
// Lock icon with live sync-status: solid fill when locked AND confirmed synced to the game,
// outline-only when locked in the app but not yet confirmed in-game (pending), neutral when not locked.
function lockSyncIconSvg(instanceId, size) {
  const s = size||15;
  const appLocked = getMark(instanceId) === 'fav';
  const gameLocked = inGameLockState[instanceId] || false;
  if (!appLocked) {
    return `<svg viewBox="0 0 24 24" width="${s}" height="${s}" title="Lock">
      <path d="M8 11V7a4 4 0 0 1 8 0v4" fill="none" stroke="var(--text-muted)" stroke-width="2.2" stroke-linecap="round"></path>
      <rect x="5" y="11" width="14" height="9" rx="2" fill="none" stroke="var(--text-muted)" stroke-width="1.6"></rect>
    </svg>`;
  }
  const synced = appLocked === gameLocked;
  return `<svg viewBox="0 0 24 24" width="${s}" height="${s}" title="${synced?'Locked — synced with game':'Locked — pending sync to game'}">
    <path d="M8 11V7a4 4 0 0 1 8 0v4" fill="none" stroke="#3fe06a" stroke-width="2.2" stroke-linecap="round"></path>
    <rect x="5" y="11" width="14" height="9" rx="2" fill="${synced?'#3fe06a':'none'}" stroke="${synced?'none':'#3fe06a'}" stroke-width="${synced?'0':'2'}"></rect>
  </svg>`;
}
// Work Mode-specific left-edge strip — combines gear tier pips (upper) and crafted indicator (pinned to
// the bottom of the same strip), since Work Mode icons no longer have a separate bottom info bar.
function tmLeftEdgeBadge(tier, crafted) {
  if (!tier && !crafted) return '';
  const pipsHtml = tier>0 ? `<div style="display:flex;flex-direction:column;gap:2px;">${
    Array.from({length:Math.min(tier,5)}).map(()=>`<div style="width:5px;height:5px;background:#3fe0c8;border-radius:1px;"></div>`).join('')
  }</div>` : '';
  const craftedHtml = crafted ? craftedIconInline(12) : '';
  const justify = (tier>0 && crafted) ? 'space-between' : tier>0 ? 'center' : 'flex-end';
  return `<div style="position:absolute;left:2px;top:2px;bottom:2px;display:flex;flex-direction:column;align-items:flex-start;justify-content:${justify};z-index:2;filter:drop-shadow(0 0 1.5px rgba(0,0,0,0.95));" title="${tier>0?`Gear Tier ${tier}`:''}${tier>0&&crafted?' · ':''}${crafted?'Crafted':''}">
    ${pipsHtml}${craftedHtml}
  </div>`;
}
// Vertical gear-tier pip stack, docked to the left edge of an icon. sizeKey: 'lg' (48-72px icons) or 'sm' (32-36px icons).
function tierPipsSvg(tier, sizeKey) {
  if (!tier || tier<=0) return '';
  const big = sizeKey!=='sm';
  const w = big?5:3, h = big?5:3, gap = big?2:1;
  const barH = big?16:12; // must match iconBottomBar's barH so pips stop above the bar instead of overlapping it
  const pips = Array.from({length:Math.min(tier,5)}).map(()=>`<div style="width:${w}px;height:${h}px;background:#3fe0c8;border-radius:1px;"></div>`).join('');
  return `<div style="position:absolute;left:2px;top:0;bottom:${barH}px;display:flex;flex-direction:column;justify-content:center;gap:${gap}px;z-index:2;filter:drop-shadow(0 0 1.5px rgba(0,0,0,0.95));" title="Gear Tier ${tier}">${pips}</div>`;
}
// Unified bottom info bar — crafted icon (left, if applicable) + damage type + power (right). sizeKey: 'lg' or 'sm'.
function iconBottomBar(def, power, crafted, sizeKey) {
  const big = sizeKey!=='sm';
  const barH = big?16:12;
  const fontSize = big?10:8;
  const dmgSize = big?13:10;
  const dmg = damageIcon(def, dmgSize);
  if (!crafted && !dmg && !power) return '';
  return `<div style="position:absolute;left:0;right:0;bottom:0;height:${barH}px;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:space-between;padding:0 3px;z-index:2;">
    <span style="display:flex;align-items:center;line-height:0;">${crafted?craftedIconInline(big?13:9):''}</span>
    <span style="display:flex;align-items:center;gap:2px;line-height:0;">${dmg}<span style="font-family:'Barlow Condensed',sans-serif;font-size:${fontSize}px;font-weight:700;color:#fff;line-height:1;">${power||''}</span></span>
  </div>`;
}
// Small colored location badge — class color for character items, neutral hexagon for vault.
// Used only in the hover tooltip now; item icons elsewhere show location via context/position instead.
function locBadgeSvg(item) {
  if (item.loc === 'Vault') {
    return `<svg width="14" height="11" viewBox="0 0 14 11" title="Vault">
      <rect width="14" height="11" rx="2" fill="#0a0c0f" stroke="#3a3f4a" stroke-width="1"/>
      <text x="7" y="8.4" text-anchor="middle" font-family="'Barlow Condensed',sans-serif" font-weight="700" font-size="8" fill="#fff">V</text>
    </svg>`;
  }
  const classColorVar = {Titan:'var(--titan)', Hunter:'var(--hunter)', Warlock:'var(--warlock)'}[item.loc] || '#6b7785';
  const letter = item.inPostmaster ? 'P' : (item.loc?.[0] || '?');
  const title = item.inPostmaster ? `${item.loc} · Postmaster` : (item.loc||'');
  // Postmaster items get a white outline so they visually stand out from regular character-located items
  const strokeAttr = item.inPostmaster ? `stroke="#fff" stroke-width="1.2"` : '';
  const rectAttrs = item.inPostmaster ? `x="0.6" y="0.6" width="12.8" height="9.8"` : `width="14" height="11"`;
  return `<svg width="14" height="11" viewBox="0 0 14 11" title="${title}">
    <rect ${rectAttrs} rx="2" fill="${classColorVar}" ${strokeAttr}/>
    <text x="7" y="8.4" text-anchor="middle" font-family="'Barlow Condensed',sans-serif" font-weight="700" font-size="8" fill="#0a0c0f">${letter}</text>
  </svg>`;
}
function masterworkBorder(itemInstanceId) {
  return isMasterworked(itemInstanceId) ? '2px solid var(--exotic-col)' : '1px solid var(--border2)';
}


// Refresh state
let refreshCooldown = 0;
let refreshInterval = null;

function refreshProfile() {
  if (refreshCooldown > 0) return;
  if (!profileLoaded) return;
  searchPlayer();
  startRefreshCooldown();
}

function startRefreshCooldown(seconds=30) {
  refreshCooldown = seconds;
  const btn = document.getElementById('refreshBtn');
  if (btn) btn.disabled = true;
  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(()=>{
    refreshCooldown--;
    const label = document.getElementById('refreshLabel');
    if (label) label.textContent = refreshCooldown > 0 ? `${refreshCooldown}s` : 'Refresh';
    if (refreshCooldown <= 0) {
      clearInterval(refreshInterval);
      refreshInterval = null;
      if (btn) { btn.disabled = false; btn.style.color=''; btn.style.borderColor=''; }
    } else {
      if (btn) { btn.style.color='var(--text-dim)'; btn.style.borderColor='var(--border)'; }
    }
  }, 1000);
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
}

function setLoading(t) { document.getElementById('loadingText').textContent=t; document.getElementById('loading').style.display='block'; }
function hideLoading()  { document.getElementById('loading').style.display='none'; }
function showError(m)   { const e=document.getElementById('error'); e.textContent=m; e.style.display='block'; }
function clearError()   { document.getElementById('error').style.display='none'; }

function switchMain(tab) {
  document.querySelectorAll('.main-tab').forEach((t,i)=>t.classList.toggle('active',['characters','weapons','armor','trashmode'][i]===tab));
  document.querySelectorAll('.main-panel').forEach(p=>p.classList.toggle('active',p.id==='panel-'+tab));
  if (tab==='trashmode') renderTrashMode();
}

// ===================== OAUTH =====================
function oauthLogin() {
  const state = Math.random().toString(36).substring(2);
  localStorage.setItem('d2oauth_state', state);
  const url = `${BUNGIE_AUTH_URL}?client_id=${BUNGIE_CLIENT_ID}&response_type=code&state=${state}`;
  window.location.href = url;
}

async function handleOAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  const code  = params.get('code');
  const state = params.get('state');
  if (!code) return false;

  const savedState = localStorage.getItem('d2oauth_state');
  if (state !== savedState) { showError('OAuth state mismatch — please try again.'); return false; }

  const apiKey = BUNGIE_API_KEY;
  setLoading('Completing login…');

  try {
    const resp = await fetch(BUNGIE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-API-Key': apiKey },
      body: `grant_type=authorization_code&code=${code}&client_id=${BUNGIE_CLIENT_ID}&redirect_uri=${encodeURIComponent(BUNGIE_REDIRECT_URL)}`
    });
    const data = await resp.json();
    if (data.access_token) {
      oauthToken  = data.access_token;
      oauthExpiry = Date.now() + (data.expires_in * 1000);
      localStorage.setItem('d2oauth_token',  oauthToken);
      localStorage.setItem('d2oauth_expiry', String(oauthExpiry));
      if (data.refresh_token) {
        localStorage.setItem('d2oauth_refresh', data.refresh_token);
        localStorage.setItem('d2oauth_refresh_expiry', String(Date.now() + (data.refresh_expires_in * 1000)));
      }
      window.history.replaceState({}, document.title, window.location.pathname);
      hideLoading();
      updateOAuthStatus();
      return true;
    } else {
      throw new Error('Token exchange failed: ' + JSON.stringify(data));
    }
  } catch(e) {
    hideLoading();
    showError('OAuth error: ' + e.message);
    return false;
  }
}

// Returns 'ok' on success, 'expired' if refresh token is gone/expired, 'error' on transient failure
async function refreshOAuthToken() {
  const refreshToken  = localStorage.getItem('d2oauth_refresh');
  const refreshExpiry = Number(localStorage.getItem('d2oauth_refresh_expiry') || 0);
  if (!refreshToken || Date.now() > refreshExpiry) return 'expired';

  const MAX_RETRIES = 3;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const resp = await fetch(BUNGIE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-API-Key': BUNGIE_API_KEY },
        body: `grant_type=refresh_token&refresh_token=${refreshToken}&client_id=${BUNGIE_CLIENT_ID}`
      });
      if (!resp.ok) {
        // 401/400 = token actually revoked/invalid — no point retrying
        if (resp.status === 401 || resp.status === 400) return 'expired';
        // 429/5xx = transient — retry
        if (attempt < MAX_RETRIES) { await new Promise(r => setTimeout(r, 1000 * attempt)); continue; }
        return 'error';
      }
      const data = await resp.json();
      if (data.access_token) {
        oauthToken  = data.access_token;
        oauthExpiry = Date.now() + (data.expires_in * 1000);
        localStorage.setItem('d2oauth_token',  oauthToken);
        localStorage.setItem('d2oauth_expiry', String(oauthExpiry));
        if (data.refresh_token) {
          localStorage.setItem('d2oauth_refresh', data.refresh_token);
          localStorage.setItem('d2oauth_refresh_expiry', String(Date.now() + (data.refresh_expires_in * 1000)));
        }
        updateOAuthStatus();
        return 'ok';
      }
      // Got a 200 but no access_token — treat as expired
      return 'expired';
    } catch(e) {
      console.warn(`Token refresh attempt ${attempt}/${MAX_RETRIES} failed:`, e);
      if (attempt < MAX_RETRIES) { await new Promise(r => setTimeout(r, 1000 * attempt)); continue; }
    }
  }
  return 'error';
}

function isOAuthValid() {
  return oauthToken && Date.now() < oauthExpiry;
}

// Every function that calls a Bungie endpoint requiring auth should await this first,
// instead of building headers from oauthToken directly. Handles the case where the access
// token went stale while the tab sat idle — silently refreshes using the longer-lived
// refresh token (same as DIM does) rather than failing and looking like a forced logout.
async function ensureAuthHeaders() {
  if (!isOAuthValid()) {
    const result = await refreshOAuthToken();
    if (result === 'expired') {
      showError('Your session expired — please log in with Bungie again.');
      return null;
    }
    if (result === 'error') {
      showError('Bungie\'s servers didn\'t respond — your session is still valid. Try refreshing the page.');
      return null;
    }
  }
  return {'X-API-Key': BUNGIE_API_KEY, 'Authorization': `Bearer ${oauthToken}`, 'Content-Type': 'application/json'};
}

function oauthLogout() {
  oauthToken = null; oauthExpiry = 0;
  localStorage.removeItem('d2oauth_token');
  localStorage.removeItem('d2oauth_expiry');
  localStorage.removeItem('d2oauth_refresh');
  localStorage.removeItem('d2oauth_refresh_expiry');
  updateOAuthStatus();
}

function updateOAuthStatus() {
  const el = document.getElementById('oauthStatus');
  const previewRow = document.getElementById('previewRow');
  const refreshBtn = document.getElementById('refreshBtn');
  if (!el) return;
  if (isPreviewMode) {
    el.innerHTML = `<span style="color:var(--text-muted);">👁 Previewing <b style="color:var(--text);">${profileInfo.name}#${profileInfo.code}</b></span>
      <button onclick="exitPreview()" style="background:none;border:1px solid var(--border2);color:var(--text-dim);font-size:11px;padding:4px 10px;cursor:pointer;margin-left:8px;">Exit Preview</button>`;
    if (previewRow) previewRow.style.display='none';
    if (refreshBtn) refreshBtn.style.display='flex';
  } else if (isOAuthValid()) {
    const loadBtn = profileLoaded ? '' : `<button onclick="searchPlayer()" style="background:var(--accent);color:#0a0c0f;border:none;font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:5px 16px;cursor:pointer;margin-left:12px;">Load My Guardian</button>`;
    el.innerHTML = `<span style="color:var(--fav);">✓ Logged in via Bungie</span>${loadBtn}<button onclick="oauthLogout()" style="background:none;border:1px solid var(--border2);color:var(--text-dim);font-size:11px;padding:4px 10px;cursor:pointer;margin-left:8px;">Log out</button>`;
    if (previewRow) previewRow.style.display='none';
    if (refreshBtn) refreshBtn.style.display = profileLoaded ? 'flex' : 'none';
  } else {
    el.innerHTML = `<button onclick="oauthLogin()" style="background:var(--accent);color:#0a0c0f;border:none;font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:8px 24px;cursor:pointer;">Login with Bungie</button>
      <span style="color:var(--text-dim);font-size:12px;margin-left:12px;">Sign in for full access</span>`;
    if (previewRow) previewRow.style.display='flex';
    if (refreshBtn) refreshBtn.style.display='none';
  }
}

// ===================== FETCH =====================
async function previewPlayer() {
  const rawId = document.getElementById('previewId')?.value?.trim();
  if (!rawId) { showError('Enter a Bungie ID (e.g. Wood#5589)'); return; }
  const parts = rawId.split('#');
  if (parts.length!==2||!parts[1]) { showError('Format must be Name#Code'); return; }
  const displayName=parts[0], displayNameCode=parseInt(parts[1]);
  clearError();
  document.getElementById('app').style.display='none';
  setLoading('Looking up guardian…');
  try {
    const headers={'X-API-Key':BUNGIE_API_KEY,'Content-Type':'application/json'};
    const sr = await fetch('https://www.bungie.net/Platform/Destiny2/SearchDestinyPlayerByBungieName/-1/',
      {method:'POST',headers,body:JSON.stringify({displayName,displayNameCode})});
    if (!sr.ok) throw new Error(`Search error ${sr.status}`);
    const sd = await sr.json();
    if (!sd.Response?.length) throw new Error('Guardian not found.');
    const {membershipType,membershipId,bungieGlobalDisplayName,bungieGlobalDisplayNameCode} = sd.Response[0];
    profileInfo = {membershipType,membershipId,name:bungieGlobalDisplayName||displayName,code:bungieGlobalDisplayNameCode||displayNameCode,platform:PLATFORMS[membershipType]||`Type ${membershipType}`,characterIds:[]};
    isPreviewMode = true;

    setLoading('Loading profile…');
    if (Object.keys(manifestItems).length===0) {
      setLoading('Loading manifest…');
      const mr = await fetch('https://www.bungie.net/Platform/Destiny2/Manifest/',{headers:{'X-API-Key':BUNGIE_API_KEY}});
      const md = await mr.json();
      const base = md.Response.jsonWorldComponentContentPaths.en;
      setLoading('Downloading definitions…');
      const [items,stats,perks,plugSets,damageTypes,setDefs] = await Promise.all([
        fetch('https://www.bungie.net'+base.DestinyInventoryItemDefinition).then(r=>r.json()),
        fetch('https://www.bungie.net'+base.DestinyStatDefinition).then(r=>r.json()),
        fetch('https://www.bungie.net'+base.DestinySandboxPerkDefinition).then(r=>r.json()),
        fetch('https://www.bungie.net'+base.DestinyPlugSetDefinition).then(r=>r.json()),
        fetch('https://www.bungie.net'+base.DestinyDamageTypeDefinition).then(r=>r.json()),
        fetch('https://www.bungie.net'+base.DestinyEquipableItemSetDefinition).then(r=>r.json()),
      ]);
      manifestItems=items; manifestStats=stats; manifestPerks=perks; manifestPlugSets=plugSets; manifestSetDefs=setDefs;
      Object.values(damageTypes).forEach(dt=>{ if(dt.enumValue&&dt.displayProperties?.hasIcon) manifestDamageTypes[dt.enumValue]=dt.displayProperties.icon; });
    }

    // Preview uses public components only (no OAuth)
    const components = '100,102,200,201,205,300,304,305';
    const pr = await fetch(`https://www.bungie.net/Platform/Destiny2/${membershipType}/Profile/${membershipId}/?components=${components}`,{headers});
    if (!pr.ok) throw new Error(`Profile error ${pr.status}`);
    const pd = await pr.json();

    // Process same as searchPlayer but without OAuth data
    const profile    = pd.Response?.profile?.data;
    const characters = Object.values(pd.Response?.characters?.data||{});
    const charEquip  = pd.Response?.characterEquipment?.data||{};
    const charInv    = pd.Response?.characterInventories?.data||{};
    const profileInv2= pd.Response?.profileInventory?.data?.items||[];
    instanceData = pd.Response?.itemComponents?.instances?.data||{};
    socketData   = pd.Response?.itemComponents?.sockets?.data||{};
    statsData    = pd.Response?.itemComponents?.stats?.data||{};
    reusablePlugsData = new Set();
    inGameLockState = {};

    function normItem(i) { return {...i, bucketHash:Number(i.bucketHash), itemHash:Number(i.itemHash)}; }
    allItems = [];
    characters.sort((a,b)=>new Date(b.dateLastPlayed)-new Date(a.dateLastPlayed));
    profileInfo.characterIds = characters.map(c=>c.characterId);
    profileInfo.characterClasses = Object.fromEntries(characters.map(c=>[c.characterId, c.classType]));
    characters.forEach(c=>{
      const loc=CLASS_NAMES[c.classType]||'Character';
      (charEquip[c.characterId]?.items||[]).forEach(i=>allItems.push({...normItem(i),loc,equipped:true,characterId:c.characterId}));
      (charInv[c.characterId]?.items||[]).forEach(i=>allItems.push({...normItem(i),loc,equipped:false,characterId:c.characterId,inPostmaster:Number(i.bucketHash)===POSTMASTER_BUCKET}));
    });
    profileInv2.forEach(i=>allItems.push({...normItem(i),loc:'Vault',equipped:false,characterId:null}));

    // Seed seen items for preview (treat all as seen)
    const previewIds = new Set(allItems.filter(i=>i.itemInstanceId).map(i=>i.itemInstanceId));
    if (!localStorage.getItem('d2seenitems')) {
      seenItems = new Set(previewIds);
      localStorage.setItem('d2seenitems', JSON.stringify([...seenItems]));
    }

    hideLoading();
    renderCharacters(characters, charEquip, profile);
    renderWeaponsTab();
    renderArmorTab();
    document.getElementById('app').style.display='block';
    profileLoaded = true;
    updateOAuthStatus();
    updateNewItemBadge();
    window._lastCharClass = characters[0]?.classType;
    applyTheme(currentTheme, currentAccent);
  } catch(err) {
    hideLoading();
    isPreviewMode = false;
    showError(err.message||'Preview failed.');
  }
}

function exitPreview() {
  isPreviewMode = false;
  profileLoaded = false;
  allItems = [];
  profileInfo = {};
  document.getElementById('app').style.display='none';
  updateOAuthStatus();
}

async function searchPlayer() {
  clearError();
  document.getElementById('app').style.display='none';
  const headers = await ensureAuthHeaders();
  if (!headers) return;

  try {
    setLoading('Loading your profile…');
    // Get current user's membership info from OAuth token
    const meResp = await fetch('https://www.bungie.net/Platform/User/GetMembershipsForCurrentUser/', {headers});
    if (!meResp.ok) throw new Error(`Profile lookup error ${meResp.status}`);
    const meData = await meResp.json();
    const destinyMemberships = meData.Response?.destinyMemberships||[];
    if (!destinyMemberships.length) throw new Error('No Destiny memberships found for this account.');
    // Prefer the primary membership or the first one
    const primary = meData.Response?.primaryMembershipId;
    const membership = destinyMemberships.find(m=>m.membershipId===primary) || destinyMemberships[0];
    const {membershipType,membershipId,bungieGlobalDisplayName,bungieGlobalDisplayNameCode} = membership;
    profileInfo = {membershipType,membershipId,name:bungieGlobalDisplayName||meData.Response?.bungieNetUser?.displayName||'Guardian',code:bungieGlobalDisplayNameCode||0,platform:PLATFORMS[membershipType]||`Type ${membershipType}`,characterIds:[]};

    setLoading('Loading inventory…');
    const components = '100,102,200,201,205,300,304,305,307,308,309,310';
    const pr = await fetch(
      `https://www.bungie.net/Platform/Destiny2/${membershipType}/Profile/${membershipId}/?components=${components}`,
      {headers});
    if (!pr.ok) throw new Error(`Profile error ${pr.status}`);
    const pd = await pr.json();

    if (Object.keys(manifestItems).length===0) {
      setLoading('Loading manifest (first time only)…');
      const mr = await fetch('https://www.bungie.net/Platform/Destiny2/Manifest/',{headers:{'X-API-Key':BUNGIE_API_KEY}});
      const md = await mr.json();
      const base = md.Response.jsonWorldComponentContentPaths.en;
      setLoading('Downloading item definitions…');
      const [items,stats,perks,plugSets,damageTypes,setDefs] = await Promise.all([
        fetch('https://www.bungie.net'+base.DestinyInventoryItemDefinition).then(r=>r.json()),
        fetch('https://www.bungie.net'+base.DestinyStatDefinition).then(r=>r.json()),
        fetch('https://www.bungie.net'+base.DestinySandboxPerkDefinition).then(r=>r.json()),
        fetch('https://www.bungie.net'+base.DestinyPlugSetDefinition).then(r=>r.json()),
        fetch('https://www.bungie.net'+base.DestinyDamageTypeDefinition).then(r=>r.json()),
        fetch('https://www.bungie.net'+base.DestinyEquipableItemSetDefinition).then(r=>r.json()),
      ]);
      manifestItems = items; manifestStats = stats; manifestPerks = perks; manifestPlugSets = plugSets; manifestSetDefs = setDefs;
      // Build damage type icon map from manifest
      Object.values(damageTypes).forEach(dt => {
        const enumVal = dt.enumValue;
        const icon = dt.displayProperties?.hasIcon ? dt.displayProperties.icon : null;
        if (enumVal && icon) manifestDamageTypes[enumVal] = icon;
      });
    }

    hideLoading();


    const profile     = pd.Response?.profile?.data;
    const characters  = Object.values(pd.Response?.characters?.data||{});
    const charEquip   = pd.Response?.characterEquipment?.data||{};
    const charInv     = pd.Response?.characterInventories?.data||{};
    const profileInv2 = pd.Response?.profileInventory?.data?.items||[];
    instanceData      = pd.Response?.itemComponents?.instances?.data||{};
    socketData        = pd.Response?.itemComponents?.sockets?.data||{};
    statsData         = pd.Response?.itemComponents?.stats?.data||{};
    // Component 306 (reusablePlugs) gives exact per-item rolled perks when authenticated via OAuth
    const comp306 = pd.Response?.itemComponents?.reusablePlugs?.data || pd.Response?.itemComponents?.plugStates?.data || {};
    const hasComp306 = Object.keys(comp306).length > 0;
    // Log raw 306 data for first item if available
    if (hasComp306) {
      const firstKey = Object.keys(comp306)[0];
    } else {
      // Log raw itemComponents to see what's there
      // Check if reusablePlugs exists under different key
    }

    if (hasComp306) {
      // Store as instanceId -> socketIndex -> Set of plugItemHashes
      // API returns: {instanceId: {plugs: {socketIndex: [{plugItemHash, canInsert, enabled}]}}}
      reusablePlugsData = {_perItem: true};
      Object.entries(comp306).forEach(([iid, data])=>{
        reusablePlugsData[iid] = {};
        Object.entries(data.plugs||{}).forEach(([sockIdx, plugArr])=>{
          reusablePlugsData[iid][String(sockIdx)] = new Set(
            (plugArr||[]).filter(p=>p.canInsert||p.enabled).map(p=>p.plugItemHash)
          );
          reusablePlugsData[iid][Number(sockIdx)] = reusablePlugsData[iid][String(sockIdx)];
        });
      });
    } else {
      // Fallback: flat set of all available plugs from profilePlugSets
      const profilePlugs = pd.Response?.profilePlugSets?.data?.plugs || {};
      const charPlugSetsAll = pd.Response?.characterPlugSets?.data || {};
      const availablePlugsFlat = new Set();
      function collectPlugs(plugsObj) {
        Object.values(plugsObj||{}).forEach(arr=>{
          (arr||[]).forEach(p=>{ if(p.canInsert||p.enabled) availablePlugsFlat.add(p.plugItemHash); });
        });
      }
      collectPlugs(profilePlugs);
      Object.values(charPlugSetsAll).forEach(cd=>collectPlugs(cd?.plugs));
      reusablePlugsData = availablePlugsFlat;
    }

    // Collect all items with location tag
    // Normalize bucket hashes to numbers
    function normItem(i) { return {...i, bucketHash: Number(i.bucketHash), itemHash: Number(i.itemHash)}; }
    allItems = [];
    characters.sort((a,b)=>new Date(b.dateLastPlayed)-new Date(a.dateLastPlayed));
    profileInfo.characterIds = characters.map(c=>c.characterId);
    profileInfo.characterClasses = Object.fromEntries(characters.map(c=>[c.characterId, c.classType]));
    characters.forEach(c=>{
      const loc = CLASS_NAMES[c.classType]||'Character';
      (charEquip[c.characterId]?.items||[]).forEach(i=>allItems.push({...normItem(i),loc,equipped:true,characterId:c.characterId}));
      (charInv[c.characterId]?.items||[]).forEach(i=>allItems.push({...normItem(i),loc,equipped:false,characterId:c.characterId,inPostmaster:Number(i.bucketHash)===POSTMASTER_BUCKET}));
    });
    profileInv2.forEach(i=>allItems.push({...normItem(i),loc:'Vault',equipped:false,characterId:null}));

    // Read in-game lock state (state bitmask bit 1 = locked/favorited)
    // Store in-game lock state separately so we can detect pending changes
    inGameLockState = {};
    let marksChanged = false;
    allItems.forEach(i=>{
      if (!i.itemInstanceId) return;
      const locked = !!(i.state & 1);
      inGameLockState[i.itemInstanceId] = locked;
      // Sync in-game lock state to marks:
      // If locked in game and not already marked fav -> set fav
      if (locked && marks[i.itemInstanceId] !== 'fav') {
        marks[i.itemInstanceId] = 'fav';
        marksChanged = true;
      }
      // If NOT locked in game and marked fav only because of previous auto-populate
      // (don't remove user-set marks — only remove if the iid was never manually set)
      // We leave user-set fav marks alone; sync button handles pushing them to game
    });
    if (marksChanged) localStorage.setItem('d2marks', JSON.stringify(marks));

    // Seed seen-items on first use (so existing inventory isn't falsely "new")
    // On subsequent loads, prune to current inventory to prevent unbounded growth
    const currentIds = new Set(allItems.filter(i=>i.itemInstanceId).map(i=>i.itemInstanceId));
    if (!localStorage.getItem('d2seenitems')) {
      seenItems = new Set(currentIds);
      localStorage.setItem('d2seenitems', JSON.stringify([...seenItems]));
    } else {
      // Prune: drop IDs no longer in inventory
      seenItems = new Set([...seenItems].filter(id => currentIds.has(id)));
      localStorage.setItem('d2seenitems', JSON.stringify([...seenItems]));
    }

    renderCharacters(characters, charEquip, profile);
    renderWeaponsTab();
    renderArmorTab();
    renderTrashMode();
    document.getElementById('app').style.display='block';
    profileLoaded = true;
    updateOAuthStatus(); // hide "Load My Guardian" button now that we're loaded
    updateNewItemBadge();

  } catch(err) {
    hideLoading();

    showError(err.message||'Something went wrong.');
  }
}

// ===================== COMPARE =====================

// Armor compare sort: up to 3 levels
let armorSort = [{stat:'power', dir:-1},{stat:'none', dir:-1},{stat:'none', dir:-1}];
// Weapon stats toggle (per compare session)
let showWeaponStats = false;
// Armor base-only toggle
let showBaseStats = localStorage.getItem('d2showbasestats') === '1';

// "New item" tracking — items the user hasn't viewed yet
let seenItems = new Set(JSON.parse(localStorage.getItem('d2seenitems') || '[]'));
function isNewItem(instanceId) { return instanceId && !seenItems.has(instanceId); }
function markItemSeen(instanceId) {
  if (!instanceId || seenItems.has(instanceId)) return;
  seenItems.add(instanceId);
  localStorage.setItem('d2seenitems', JSON.stringify([...seenItems]));
}
function markAllSeen() {
  allItems.forEach(i => { if (i.itemInstanceId) seenItems.add(i.itemInstanceId); });
  localStorage.setItem('d2seenitems', JSON.stringify([...seenItems]));
  // Re-render active tabs
  renderWeaponsTab();
  renderArmorTab();
  updateNewItemBadge();
}
function updateNewItemBadge() {
  const btn = document.getElementById('markReadBtn');
  if (!btn) return;
  const hasNew = allItems.some(i => isNewItem(i.itemInstanceId));
  btn.style.display = hasNew ? 'flex' : 'none';
}
// Armor god roll state
let armorGodRollInstanceIds = [];
let armorGodRollStats = [
  {hash: null, weight: 10},
  {hash: null, weight: 8},
  {hash: null, weight: 5},
];

// Plug column label mapping
const PLUG_COL_ORDER = ['barrels','magazines','perks','traits'];
const PLUG_COL_LABELS = {
  barrels:'Barrel', magazines:'Magazine',
  perks:'Perk 1', traits:'Perk'
};
// Excluded slot types (same for all rolls, not useful to compare)
const PLUG_COL_EXCLUDE = ['intrinsics','origins','masterworks','mods','catalysts','trackers'];
function plugColLabel(identifier) {
  for (const key of PLUG_COL_ORDER) {
    if (identifier.includes(key)) return PLUG_COL_LABELS[key]||key;
  }
  return null;
}
function plugColKey(identifier) {
  // Exclude non-useful columns
  for (const ex of PLUG_COL_EXCLUDE) {
    if (identifier.includes(ex)) return null;
  }
  for (const key of PLUG_COL_ORDER) {
    if (identifier.includes(key)) return key;
  }
  return null;
}


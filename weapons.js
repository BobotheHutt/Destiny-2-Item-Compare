// ===================== WEAPONS TAB =====================
function renderWeaponsTab() {
  const el = document.getElementById('panel-weapons');
  el.innerHTML = `
    <div class="inv-controls">
      <div class="toggle-group">
        <button class="toggle-btn exotic ${weaponFilter.exotic?'active':''}" onclick="toggleWeaponFilter('exotic',this)">Exotic</button>
        <button class="toggle-btn legendary ${weaponFilter.legendary?'active':''}" onclick="toggleWeaponFilter('legendary',this)">Legendary</button>
        <button class="toggle-btn ${weaponFilter.dupes?'active':''}" onclick="toggleWeaponFilter('dupes',this)" style="${weaponFilter.dupes?'background:var(--accent);color:#0a0c0f;border-color:var(--accent);':'border-color:var(--accent);color:var(--accent);'}">Dupes Only</button>
        <button class="toggle-btn ${weaponFilter.locked?'active':''}" onclick="toggleWeaponFilter('locked',this)" style="${weaponFilter.locked?'background:var(--fav);color:#0a0c0f;border-color:var(--fav);':'border-color:var(--fav);color:var(--fav);'}">🔒 Locked</button>
      </div>
      <button onclick="toggleHideCrafted()" style="margin-left:auto;background:${hideCraftedWeapons?'var(--accent)':'var(--surface)'};border:1px solid ${hideCraftedWeapons?'var(--accent)':'var(--border2)'};color:${hideCraftedWeapons?'#0a0c0f':'var(--text-muted)'};font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:4px 10px;cursor:pointer;border-radius:var(--radius-sm);">Hide Crafted</button>
    </div>
    <div id="weaponAccordions"></div>
    <div id="weaponTypeSection"></div>
    <div id="weaponItemGrid"></div>`;
  buildWeaponAccordions();
}

function toggleHideCrafted() {
  hideCraftedWeapons = !hideCraftedWeapons;
  localStorage.setItem('d2hidecrafted', hideCraftedWeapons ? '1' : '0');
  renderWeaponsTab();
  if (activeWeaponBHash && activeWeaponType) {
    selectWeaponType(activeWeaponBHash, activeWeaponType);
  }
}

function toggleWeaponFilter(type, btn) {
  weaponFilter[type] = !weaponFilter[type];
  // Re-render weapons tab so button styles update correctly
  renderWeaponsTab();
  if (activeWeaponBHash && activeWeaponType) {
    selectWeaponType(activeWeaponBHash, activeWeaponType);
  }
}

function getEffectiveBucketHash(item) {
  if (item.bucketHash === VAULT_BUCKET || item.bucketHash === POSTMASTER_BUCKET) {
    const def = getItemDef(item.itemHash);
    return Number(def?.inventory?.bucketTypeHash) || item.bucketHash;
  }
  return item.bucketHash;
}

function getFilteredWeapons() {
  const base = allItems.filter(i=>{
    if (!WEAPON_BUCKETS.has(getEffectiveBucketHash(i))) return false;
    const def = getItemDef(i.itemHash);
    if (!def) return false;
    const tier = def.inventory?.tierType;
    if (tier===6 && !weaponFilter.exotic) return false;
    if (tier===5 && !weaponFilter.legendary) return false;
    if (tier<5) return false;
    if (hideCraftedWeapons && isCrafted(i.itemInstanceId)) return false;
    return true;
  });
  // Locked filter
  const lockedBase = weaponFilter.locked ? base.filter(i=>getMark(i.itemInstanceId)==='fav') : base;
  if (!weaponFilter.dupes) return lockedBase;
  // Dupes only: keep items whose name appears 2+ times
  const nameCounts = {};
  lockedBase.forEach(i=>{
    const n = getItemDef(i.itemHash)?.displayProperties?.name||'';
    nameCounts[n] = (nameCounts[n]||0)+1;
  });
  return lockedBase.filter(i=>{
    const n = getItemDef(i.itemHash)?.displayProperties?.name||'';
    return nameCounts[n] >= 2;
  });
}

function buildWeaponAccordions() {
  const weapons = getFilteredWeapons();
  const cats = [1498876634,2465295065,953998645];
  const html = cats.map(bHash=>{
    const label = WEAPON_BUCKET_NAMES[bHash];
    const bucketWeapons = weapons.filter(w=>getEffectiveBucketHash(w)===bHash);
    let countLabel;
    if (weaponFilter.dupes) {
      // Count unique names (each = one dupe group)
      const uniqueNames = new Set(bucketWeapons.map(w=>getItemDef(w.itemHash)?.displayProperties?.name||''));
      countLabel = `${uniqueNames.size} dupe group${uniqueNames.size!==1?'s':''}`;
    } else {
      countLabel = `${bucketWeapons.length} items`;
    }
    const count = bucketWeapons.length;
    const isOpen = activeWeaponCategory===bHash;
    return `<div class="accordion">
      <div class="accordion-header ${isOpen?'open':''}" onclick="toggleWeaponCat(${bHash},this)">
        <span class="accordion-title">${label}</span>
        <span style="display:flex;align-items:center;gap:8px;">
          <span class="accordion-count">${countLabel}</span>
          <span class="accordion-arrow">▼</span>
        </span>
      </div>
      <div class="accordion-body ${isOpen?'open':''}" id="weaponCat-${bHash}">
        ${isOpen?buildWeaponTypes(bHash):''}
      </div>
    </div>`;
  }).join('');
  document.getElementById('weaponAccordions').innerHTML=html;
}

function toggleWeaponCat(bHash, headerEl) {
  bHash = Number(bHash);
  const wasOpen = activeWeaponCategory===bHash;
  activeWeaponCategory = wasOpen?null:bHash;
  activeWeaponType = null;
  document.getElementById('weaponTypeSection').innerHTML='';
  document.getElementById('weaponItemGrid').innerHTML='';
  buildWeaponAccordions();
}

function buildWeaponTypes(bHash) {
  const weapons = getFilteredWeapons().filter(w=>getEffectiveBucketHash(w)===bHash);
  const typeMap = {};
  weapons.forEach(w=>{
    const def = getItemDef(w.itemHash);
    const type = def?.itemTypeDisplayName||'Unknown';
    const name = def?.displayProperties?.name||'';
    if (!typeMap[type]) typeMap[type]={items:0, names:new Set()};
    typeMap[type].items++;
    typeMap[type].names.add(name);
  });
  if (!Object.keys(typeMap).length) return '<div class="no-items">No items found.</div>';
  return `<div class="type-grid">${Object.entries(typeMap).sort((a,b)=>b[1].items-a[1].items).map(([type,data])=>{
    const pillCount = weaponFilter.dupes ? data.names.size : data.items;
    const pillLabel = weaponFilter.dupes ? `${pillCount} group${pillCount!==1?'s':''}` : pillCount;
    return `<div class="type-pill ${activeWeaponType===type?'active':''}" onclick="selectWeaponType('${bHash}','${type.replace(/'/g,"\\'")}')">
      ${type} <span class="pill-count">${pillLabel}</span>
    </div>`;
  }).join('')}</div>`;
}

// Global click map — avoids inline JSON/quote issues
const gridClickMap = {};

function selectWeaponType(bHash, type) {
  bHash = Number(bHash);
  activeWeaponType = type;
  activeWeaponBHash = bHash;
  const weapons = getFilteredWeapons().filter(w=>getEffectiveBucketHash(w)===bHash);
  const ofType  = weapons.filter(w=>(getItemDef(w.itemHash)?.itemTypeDisplayName||'Unknown')===type);
  const nameMap = {};
  ofType.forEach(w=>{
    const def = getItemDef(w.itemHash);
    const name = def?.displayProperties.name||`Item ${w.itemHash}`;
    if (!nameMap[name]) nameMap[name]=[];
    nameMap[name].push(w);
  });
  // If dupes filter on, only show names with 2+ copies
  const filteredNameMap = weaponFilter.dupes
    ? Object.fromEntries(Object.entries(nameMap).filter(([,items])=>items.length>=2))
    : nameMap;
  let keyIdx = Date.now(); // unique keys each render
  const gridHtml = Object.entries(filteredNameMap).map(([name,items])=>{
    const def = getItemDef(items[0].itemHash);
    const icon = def?.displayProperties?.hasIcon?`<img src="https://www.bungie.net${def.displayProperties.icon}" />`:'';
    const rk = rarityKey(def);
    const hasDupes = items.length>1;
    const hasNew = items.some(it => isNewItem(it.itemInstanceId));
    const newDot = hasNew ? `<div class="mark-indicator" style="background:var(--accent);"></div>` : '';
    const key = 'wg_'+(keyIdx++);
    gridClickMap[key] = {instanceIds: items.map(i=>i.itemInstanceId), type:'weapon'};
    return `<div class="grid-item ${hasDupes?'has-dupes':''}" data-gkey="${key}">
      <div class="grid-item-icon">${icon}${newDot}
        ${hasDupes?`<div class="dupe-badge">${items.length}</div>`:''}
      </div>
      <div class="grid-item-name">${name}</div>
    </div>`;
  }).join('');
  const gridEl = document.getElementById('weaponItemGrid');
  gridEl.innerHTML = `
    <div class="item-grid-section">
      <div class="item-grid-title">${type} <span style="color:var(--text-dim);font-size:10px;margin-left:4px;">${weaponFilter.dupes ? Object.keys(filteredNameMap).length + ' dupe groups' : ofType.length + ' items · ' + Object.keys(filteredNameMap).length + ' unique'}</span></div>
      <div class="item-grid">${gridHtml}</div>
    </div>`;
  gridEl.querySelectorAll('.grid-item').forEach(node=>{
    node.addEventListener('click', ()=>{
      const entry = gridClickMap[node.dataset.gkey];
      if (entry) {
        if (entry.type==='weapon') openWeaponCompare(entry.instanceIds);
        else openCompare(entry.instanceIds, entry.type);
      }
    });
  });
  // Rebuild accordions AFTER grid so it doesn't interfere
  buildWeaponAccordions();
}

// ===================== GOD ROLL MODAL =====================
// State is keyed by position (col1-col4) rather than literal labels, since different
// weapon types use different column names (Barrel/Blade/Bowstring, Magazine/Guard/Arrow, etc.)
let weaponCompareIds = [];
let weaponCompareWeights = {col1:5, col2:5, col3:10, col4:10};
let weaponCompareSelected = {col1:new Set(), col2:new Set(), col3:new Set(), col4:new Set()};
let weaponCompareExact = false;

// Per-weapon perk filter persistence — keyed by weapon name, so reopening the same weapon later
// restores your previous checkbox selections, point weights, and Exact Match setting.
function getWeaponPrefsKey(instanceIds) {
  const hash = allItems.find(i=>i.itemInstanceId===instanceIds[0])?.itemHash;
  return getItemDef(hash)?.displayProperties?.name || null;
}
function loadWeaponPrefs(weaponName) {
  if (!weaponName) return null;
  try {
    const all = JSON.parse(localStorage.getItem('d2godrollprefs')||'{}');
    return all[weaponName] || null;
  } catch(e) { return null; }
}
function saveWeaponPrefs() {
  const weaponName = getWeaponPrefsKey(weaponCompareIds);
  if (!weaponName) return;
  try {
    const all = JSON.parse(localStorage.getItem('d2godrollprefs')||'{}');
    all[weaponName] = {
      weights: weaponCompareWeights,
      selected: {col1:[...weaponCompareSelected.col1], col2:[...weaponCompareSelected.col2], col3:[...weaponCompareSelected.col3], col4:[...weaponCompareSelected.col4]},
      exactOnly: weaponCompareExact,
    };
    localStorage.setItem('d2godrollprefs', JSON.stringify(all));
  } catch(e) { /* localStorage unavailable — non-fatal, prefs just won't persist */ }
}

function buildLightggLinks(instanceIds) {
  // Collect distinct item hashes among the copies (covers reissued/season variants sharing the same name)
  const hashes = [...new Set(instanceIds.map(iid => allItems.find(i=>i.itemInstanceId===iid)?.itemHash).filter(Boolean))];
  // Sort newest-first using manifest index as a recency proxy (Bungie appends newer content with higher index)
  hashes.sort((a,b) => (getItemDef(b)?.index||0) - (getItemDef(a)?.index||0));
  return hashes.map((h,i) => `<a href="https://www.light.gg/db/items/${h}" target="_blank" rel="noopener noreferrer" title="View on light.gg${hashes.length>1?(i===0?' (newest)':' (older variant)'):''}" style="display:flex;align-items:center;justify-content:center;width:20px;height:20px;opacity:.75;flex-shrink:0;">
    <img src="https://www.google.com/s2/favicons?domain=light.gg&sz=32" style="width:16px;height:16px;display:block;border-radius:3px;" />
  </a>`).join('');
}

function openWeaponCompare(instanceIds) {
  weaponCompareIds = instanceIds;
  const saved = loadWeaponPrefs(getWeaponPrefsKey(instanceIds));
  if (saved) {
    weaponCompareWeights = {...saved.weights};
    weaponCompareSelected = {
      col1: new Set(saved.selected?.col1||[]),
      col2: new Set(saved.selected?.col2||[]),
      col3: new Set(saved.selected?.col3||[]),
      col4: new Set(saved.selected?.col4||[]),
    };
    weaponCompareExact = !!saved.exactOnly;
  } else {
    // No saved prefs for this weapon — reset to defaults
    weaponCompareSelected = {col1:new Set(), col2:new Set(), col3:new Set(), col4:new Set()};
    weaponCompareWeights = {col1:5, col2:5, col3:10, col4:10};
    weaponCompareExact = false;
  }
  renderWeaponCompare();
  document.getElementById('compareOverlay').classList.add('open');
}

function getWeaponRolls(instanceIds) {
  // Returns positional pools (col1-col4) across all copies, plus per-item roll data,
  // plus the real labels (Barrel/Blade/Bowstring, Magazine/Guard/Arrow, etc.) for this weapon
  const poolByCol = {col1:new Map(), col2:new Map(), col3:new Map(), col4:new Map()};
  const colLabels = {col1:'Barrel', col2:'Magazine', col3:'Perk 1', col4:'Perk 2'}; // fallback if nothing matched
  const itemRolls = []; // [{iid, name, power, item, inst, cols}]

  instanceIds.forEach(iid => {
    const item = allItems.find(i=>i.itemInstanceId===iid);
    if (!item) return;
    const inst = instanceData[iid];
    const sockets = socketData[iid];
    if (!sockets?.sockets) return;

    const cols = extractWeaponCols(item, iid, sockets);
    // cols = [{colKey, label, hashes:[]}]

    // Add to pool + record this weapon's real column labels
    cols.forEach(col => {
      colLabels[col.colKey] = col.label;
      col.hashes.forEach(h => {
        const d = getItemDef(h);
        const n = d?.displayProperties?.name||'';
        if (n) poolByCol[col.colKey].set(n, h);
      });
    });

    itemRolls.push({iid, item, inst, cols});
  });

  return {poolByCol, itemRolls, colLabels};
}

// Column 1 equivalents across weapon types — Barrel, Blade (swords), Bowstring (bows),
// Launcher Barrel (grenade/rocket launchers), Scope, Sight
function classifyPrimarySocket(ident) {
  if (ident.includes('launcherbarrels')) return 'Launcher Barrel';
  if (ident.includes('barrels')) return 'Barrel';
  if (ident.includes('tubes')) return 'Launch Tube';
  if (ident.includes('blades')) return 'Blade';
  if (ident.includes('rails')) return 'Rail';
  if (ident.includes('bowstrings')) return 'Bowstring';
  if (ident.includes('scopes')) return 'Scope';
  if (ident.includes('sights')) return 'Sight';
  return null;
}
// Column 2 equivalents — Magazine, Battery (fusion/linear fusion/glaive), Guard (swords), Arrow (bows), Bolt (heavy crossbow)
function classifySecondarySocket(ident) {
  if (ident.includes('bolts')) return 'Bolt';
  if (ident.includes('arrows')) return 'Arrow';
  if (ident.includes('batteries')) return 'Battery';
  if (ident.includes('guards')) return 'Guard';
  if (ident.includes('magazines')) return 'Magazine';
  return null;
}

function extractWeaponCols(item, iid, sockets) {
  const cols = [];
  let gotCol1 = false, gotCol2 = false, perkCount = 0;
  sockets.sockets.forEach((s, sockIdx) => {
    if (!s.plugHash) return;
    const equippedDef = getItemDef(s.plugHash);
    if (!equippedDef) return;
    const ident = equippedDef.plug?.plugCategoryIdentifier||'';
    const excluded = ['intrinsics','origins','masterworks','mods','catalysts','trackers','shader','ornaments','ghosts','holster','auras','finishers','emotes','tier','memento','skins','deepsight','crafting','cosmetic','mod_empty','mod_guns'];
    if (excluded.some(ex=>ident.includes(ex))) return;
    if (sockIdx === 0) return;

    let colKey = null, colLabel = null;
    if (!gotCol1 && (colLabel = classifyPrimarySocket(ident))) { colKey = 'col1'; gotCol1 = true; }
    else if (!gotCol2 && (colLabel = classifySecondarySocket(ident))) { colKey = 'col2'; gotCol2 = true; }
    else if (ident.includes('traits')||ident.includes('perks')||ident.includes('frames')) {
      perkCount++;
      colKey = perkCount===1 ? 'col3' : 'col4';
      colLabel = perkCount===1 ? 'Perk 1' : 'Perk 2';
    }
    else {
      // Don't recognize this socket type — log it so we can see the real identifier
      // (this is how Grenade/Rocket Launcher barrel-equivalent sockets, if still empty, will get diagnosed)
      console.warn('[socket-debug] unclassified socket on', getItemDef(item.itemHash)?.displayProperties?.name, '— plugCategoryIdentifier:', ident);
      return;
    }

    // Get rolled hashes
    const itemDefLookup = getItemDef(item.itemHash);
    const sockEntry = itemDefLookup?.sockets?.socketEntries?.[sockIdx];
    const randHash = sockEntry?.randomizedPlugSetHash;
    const reuseHash = sockEntry?.reusablePlugSetHash;
    const possibleHashes = [];
    [randHash, reuseHash].forEach(psHash => {
      if (!psHash) return;
      const ps = manifestPlugSets[psHash]||manifestPlugSets[psHash>>>0]||manifestPlugSets[String(psHash)];
      if (ps?.reusablePlugItems) ps.reusablePlugItems.forEach(p=>{ if (!possibleHashes.includes(p.plugItemHash)) possibleHashes.push(p.plugItemHash); });
    });

    let rolledHashes;
    if (reusablePlugsData._perItem) {
      const itemPlugs = reusablePlugsData[iid];
      const sockSet = itemPlugs?.[String(sockIdx)]||itemPlugs?.[sockIdx]||new Set();
      rolledHashes = possibleHashes.filter(h=>h===s.plugHash||sockSet.has(h));
    } else {
      rolledHashes = possibleHashes.filter(h=>h===s.plugHash||reusablePlugsData.has(h));
    }
    if (!rolledHashes.length) rolledHashes = [s.plugHash];

    const validHashes = rolledHashes.filter(h=>{
      const d=getItemDef(h); if(!d) return false;
      const n=d.displayProperties?.name||'';
      return n&&!n.toLowerCase().includes('empty')&&!n.toLowerCase().includes('default');
    });
    if (!validHashes.length) return;
    cols.push({colKey, label: colLabel, equippedHash: s.plugHash, hashes: validHashes});
  });

  return cols;
}

function scoreWeapon(itemRollCols) {
  // itemRollCols = [{label, hashes:[]}]
  let score = 0;
  let maxScore = 0;
  const COL_KEYS = ['col1','col2','col3','col4'];
  COL_KEYS.forEach(key => {
    const w = weaponCompareWeights[key]||0;
    maxScore += w;
    const wanted = weaponCompareSelected[key];
    if (!wanted||!wanted.size) { score += w; return; } // no selection = full points
    const colData = itemRollCols.find(c=>c.colKey===key);
    if (!colData) return;
    const hasMatch = colData.hashes.some(h=>{
      const n = getItemDef(h)?.displayProperties?.name||'';
      return wanted.has(n);
    });
    if (hasMatch) score += w;
  });
  return {score, maxScore};
}

function renderWeaponCompare() {
  const COL_KEYS = ['col1','col2','col3','col4'];
  const {poolByCol, itemRolls, colLabels} = getWeaponRolls(weaponCompareIds);

  const def0 = getItemDef(allItems.find(i=>i.itemInstanceId===weaponCompareIds[0])?.itemHash);
  const weaponName = def0?.displayProperties?.name||'Weapon';

  const anySelected = COL_KEYS.some(c=>weaponCompareSelected[c]?.size>0);

  // Score + sort items
  const scored = itemRolls.map(r=>{
    const {score, maxScore} = scoreWeapon(r.cols);
    return {...r, score, maxScore};
  }).filter(r=>!weaponCompareExact||r.score===r.maxScore)
    .sort((a,b)=>b.score-a.score);

  // Build perk pool columns — label is whatever this weapon type actually uses
  // (Barrel/Blade/Bowstring, Magazine/Guard/Arrow, etc.), looked up via colLabels
  const poolHtml = COL_KEYS.map(key=>{
    const pool = poolByCol[key];
    const w = weaponCompareWeights[key]||0;
    const label = colLabels[key];
    const entries = [...pool.keys()].sort();
    return `<div style="background:var(--surface);border:1px solid var(--border2);padding:10px 8px;border-radius:var(--radius-sm);display:flex;flex-direction:column;gap:0;">
      <div style="font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);margin-bottom:6px;border-bottom:1px solid var(--border);padding-bottom:5px;display:flex;align-items:center;justify-content:space-between;">
        <span>${label}</span>
        <span style="display:flex;align-items:center;gap:4px;">
          <span style="font-size:9px;color:var(--text-dim);">pts</span>
          <input type="number" class="gr-weight" data-col="${key}" value="${w}" min="0" max="99"
            style="width:38px;background:var(--surface2);border:1px solid var(--border2);color:var(--accent);font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:700;text-align:center;padding:2px 4px;outline:none;" />
        </span>
      </div>
      ${entries.length ? entries.map(name=>{
        const sel = weaponCompareSelected[key]?.has(name);
        const perkHash = pool.get(name);
        const perkDef = perkHash ? getItemDef(perkHash) : null;
        const perkDesc = perkDef?.displayProperties?.description || '';
        const isEnhanced = perkDef?.inventory?.tierType === 3;
        return `<label style="display:flex;align-items:center;gap:6px;padding:4px 2px;cursor:pointer;border-radius:2px;${sel?'background:rgba(200,168,75,0.1);':''}" title="${perkDesc.replace(/"/g,'&quot;')}">
          <input type="checkbox" class="gr-perk-check" data-col="${key}" data-name="${name}" ${sel?'checked':''} style="accent-color:var(--accent);cursor:pointer;width:13px;height:13px;flex-shrink:0;" />
          <span style="font-size:12px;color:${sel?'var(--accent)':'var(--text)'};font-weight:${sel?600:400};line-height:1.3;">${name}${isEnhanced?'<span style="color:var(--accent);margin-left:2px;" title="Enhanced">✦</span>':''}</span>
        </label>`;
      }).join('') : `<span style="font-size:11px;color:var(--text-dim);font-style:italic;">No rolls found</span>`}
    </div>`;
  }).join('');

  // Build ranked weapon list
  const rankedHtml = scored.length ? scored.map((r,idx)=>{
    const def = getItemDef(r.item.itemHash);
    const name = def?.displayProperties?.name||'Item';
    const icon = def?.displayProperties?.hasIcon?`<img src="https://www.bungie.net${def.displayProperties.icon}" style="width:100%;height:100%;object-fit:cover;display:block;" />`:'';
    const power = r.inst?.primaryStat?.value||'—';
    const iid = r.iid;
    const mark = getMark(iid);
    const loc = r.item.loc||'';
    const pct = r.maxScore>0 ? Math.round(r.score/r.maxScore*100) : 100;
    const scoreColor = pct===100?'var(--fav)':pct>=75?'var(--accent)':pct>=50?'var(--text)':'var(--text-muted)';

    const colsHtml = r.cols.map(col=>{
      const wanted = weaponCompareSelected[col.colKey];
      return `<div style="flex:1;min-width:0;">
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:9px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--text-dim);margin-bottom:3px;">${col.label}</div>
        ${col.hashes.map(h=>{
          const d=getItemDef(h); const pn=d?.displayProperties?.name||'';
          const isWanted = wanted?.size>0 && wanted.has(pn);
          const isEquipped = h===col.equippedHash;
          const isEnhanced = d?.inventory?.tierType === 3;
          const enhStar = isEnhanced ? ' <span style="color:var(--accent);">✦</span>' : '';
          const dot = isEquipped ? '<span style="position:absolute;left:-8px;top:50%;transform:translateY(-50%);width:4px;height:4px;border-radius:50%;background:#fff;"></span>' : '';
          return `<div style="position:relative;font-size:11px;line-height:1.4;padding:1px 0;color:${isWanted?'var(--fav)':'var(--text-muted)'};font-weight:${isWanted?600:400};">${dot}${pn}${enhStar}</div>`;
        }).join('')}
      </div>`;
    }).join('');

    const itemIsNew = isNewItem(iid);
    const newBadge = itemIsNew ? `<div class="new-badge" style="position:absolute;top:0;left:0;background:var(--fav);color:#0a0c0f;font-family:'Barlow Condensed',sans-serif;font-size:9px;font-weight:700;letter-spacing:.06em;padding:1px 6px;text-transform:uppercase;border-radius:0 0 var(--radius-sm) 0;z-index:2;">New</div>` : '';

    return `<div style="position:relative;background:var(--surface);border:1px solid ${pct===100?'var(--fav)':pct>=75?'var(--accent)':'var(--border2)'};padding:12px;margin-bottom:6px;border-radius:var(--radius-sm);" id="citem-${iid}" ${itemIsNew?`onmouseenter="markItemSeen('${iid}');this.querySelector('.new-badge')?.remove()"`:''}>${newBadge}
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;">
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:700;color:${scoreColor};width:32px;text-align:center;flex-shrink:0;line-height:1;">${idx+1}</div>
        <div style="width:48px;height:48px;background:var(--surface2);overflow:hidden;flex-shrink:0;position:relative;cursor:pointer;${isMasterworked(iid)?'outline:2px solid var(--exotic-col);outline-offset:-2px;':''}" onmouseenter="startHoverTimer(event,'${iid}')" onmouseleave="clearHoverTimer()">${icon}
          ${tierPipsSvg(gearTierOf(iid),'lg')}
          ${iconBottomBar(def, r.inst?.primaryStat?.value, isCrafted(iid), 'lg')}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:700;color:var(--text);">${name}</div>
          <div style="font-size:11px;color:var(--text-muted);">${damageIcon(def)} ${def?.itemTypeAndTierDisplayName||''} <span class="loc-badge">${loc}${r.item.equipped?' · Equipped':''}</span></div>
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:700;color:var(--accent);">${power}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;">
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:700;color:${scoreColor};">${anySelected?pct+'%':''}</div>
          <div class="mark-row" data-iid="${iid}" data-type="weapon" style="display:flex;gap:3px;">
            <button class="fav-heart-btn" onclick="toggleFavorite('${iid}');renderWeaponCompare();" style="flex:0 0 50px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:5px 0;font-family:'Barlow Condensed',sans-serif;font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;border-radius:var(--radius-sm);background:${isFavorite(iid)?'var(--favorite)':'var(--surface)'};color:${isFavorite(iid)?'#0a0c0f':'var(--text-muted)'};border:1px solid var(--favorite);line-height:0;">${favoriteIconInline(14, isFavorite(iid)?'#0a0c0f':'var(--favorite)')}<span style="line-height:1;margin-top:1px;">Fav</span></button>
            <button class="mark-btn fav ${getLockBtnClass(iid)}" data-mark="fav" style="flex:0 0 50px;padding:5px 0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-size:9px;" title="${getLockBtnTitle(iid)}"><span>🔒</span><span>Lock</span></button>
            <button class="mark-btn junk ${mark==='junk'?'active':''}" data-mark="junk" style="flex:0 0 50px;padding:5px 0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-size:9px;line-height:0;">${markIconSvg('junk',14,mark==='junk'?'#fff':'var(--junk)')}<span style="line-height:1;margin-top:1px;">Junk</span></button>
            <button class="mark-btn infuse ${mark==='infuse'?'active':''}" data-mark="infuse" style="flex:0 0 50px;padding:5px 0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-size:9px;line-height:0;">${markIconSvg('infuse',14,mark==='infuse'?'#0a0c0f':'var(--infuse)')}<span style="line-height:1;margin-top:1px;">Infuse</span></button>
          </div>
        </div>
      </div>
      <div style="display:flex;gap:8px;">${colsHtml}</div>
    </div>`;
  }).join('') : `<div style="color:var(--text-muted);font-size:13px;padding:20px;text-align:center;">No weapons match your exact roll filter.</div>`;

  document.getElementById('compareContent').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;padding-right:40px;">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <div class="compare-title" style="margin-bottom:0;">${weaponName} — ${weaponCompareIds.length} ${weaponCompareIds.length===1?'copy':'copies'}</div>
        <div style="display:flex;align-items:center;gap:6px;">${buildLightggLinks(weaponCompareIds)}</div>
      </div>
      <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-muted);cursor:pointer;">
        <input type="checkbox" id="grExactOnly" ${weaponCompareExact?'checked':''} style="accent-color:var(--accent);cursor:pointer;" />
        Exact match only
      </label>
    </div>
    <div style="margin-bottom:14px;">
      <div style="font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--text-dim);margin-bottom:6px;">God Roll Builder — select your desired perks, set point values per column</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;">${poolHtml}</div>
    </div>
    <div style="font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--text-dim);margin-bottom:8px;">
      ${anySelected ? 'Ranked by God Roll Score' : 'Your Copies — select perks above to rank'}
    </div>
    ${rankedHtml}`;

  // Wire up checkboxes
  document.querySelectorAll('#compareContent .gr-perk-check').forEach(cb=>{
    cb.addEventListener('change', ()=>{
      const col = cb.dataset.col;
      const name = cb.dataset.name;
      if (cb.checked) weaponCompareSelected[col].add(name);
      else weaponCompareSelected[col].delete(name);
      saveWeaponPrefs();
      renderWeaponCompare();
    });
  });

  // Wire up weight inputs
  document.querySelectorAll('#compareContent .gr-weight').forEach(inp=>{
    inp.addEventListener('change', ()=>{
      weaponCompareWeights[inp.dataset.col] = Number(inp.value)||0;
      saveWeaponPrefs();
      renderWeaponCompare();
    });
  });

  // Exact match toggle
  const exactEl = document.getElementById('grExactOnly');
  if (exactEl) exactEl.addEventListener('change', ()=>{ weaponCompareExact=exactEl.checked; saveWeaponPrefs(); renderWeaponCompare(); });

  // Mark buttons
  document.querySelectorAll('#compareContent .mark-row').forEach(row=>{
    const iid = row.dataset.iid;
    row.querySelectorAll('.mark-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const m = btn.dataset.mark;
        const current = getMark(iid);
        setMark(iid, current===m?null:m, 'weapon', weaponCompareIds);
        renderWeaponCompare();
      });
    });
  });
}


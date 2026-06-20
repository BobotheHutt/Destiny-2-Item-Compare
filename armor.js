// ===================== ARMOR TAB =====================
function renderArmorTab() {
  const el = document.getElementById('panel-armor');
  const ownedSets = getOwnedArmorSetNames();
  const setOptionsHtml = `<option value="">All Sets</option>` + ownedSets.map(n=>`<option value="${n}" ${armorSetFilter===n?'selected':''}>${n}</option>`).join('');
  el.innerHTML = `
    <div class="inv-controls">
      <div class="toggle-group">
        <button class="toggle-btn exotic ${armorFilter.exotic?'active':''}" onclick="toggleArmorFilter('exotic',this)">Exotic</button>
        <button class="toggle-btn legendary ${armorFilter.legendary?'active':''}" onclick="toggleArmorFilter('legendary',this)">Legendary</button>
        <button class="toggle-btn ${armorFilter.dupes?'active':''}" onclick="toggleArmorFilter('dupes',this)" style="${armorFilter.dupes?'background:var(--accent);color:#0a0c0f;border-color:var(--accent);':'border-color:var(--accent);color:var(--accent);'}">Dupes Only</button>
        <button class="toggle-btn ${armorFilter.locked?'active':''}" onclick="toggleArmorFilter('locked',this)" style="${armorFilter.locked?'background:var(--fav);color:#0a0c0f;border-color:var(--fav);':'border-color:var(--fav);color:var(--fav);'}">🔒 Locked</button>
      </div>
      <select onchange="selectArmorSetFilter(this.value)" style="margin-left:auto;background:var(--surface);border:1px solid ${armorSetFilter?'var(--accent)':'var(--border2)'};color:${armorSetFilter?'var(--accent)':'var(--text-muted)'};font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:5px 8px;cursor:pointer;border-radius:var(--radius-sm);">${setOptionsHtml}</select>
    </div>
    <div id="armorAccordions"></div>
    <div id="armorSlotSection"></div>
    <div id="armorItemGrid"></div>`;
  buildArmorAccordions();
}

function toggleArmorFilter(type, btn) {
  armorFilter[type] = !armorFilter[type];
  // Re-render armor tab so button styles update correctly
  renderArmorTab();
  if (activeArmorClass !== null && activeArmorSlot) {
    selectArmorSlot(activeArmorClass, activeArmorSlot);
  }
}

function getOwnedArmorSetNames() {
  const names = new Set();
  allItems.forEach(i=>{
    if (!ARMOR_BUCKETS.has(getEffectiveBucketHash(i))) return;
    const setName = getArmorSetName(i.itemHash);
    if (setName) names.add(setName);
  });
  return [...names].sort();
}

function selectArmorSetFilter(value) {
  armorSetFilter = value;
  renderArmorTab();
  if (activeArmorClass!==null && activeArmorSlot) selectArmorSlot(activeArmorClass, activeArmorSlot);
}

function getFilteredArmor() {
  const base = allItems.filter(i=>{
    if (!ARMOR_BUCKETS.has(getEffectiveBucketHash(i))) return false;
    const def = getItemDef(i.itemHash);
    if (!def) return false;
    const tier = def.inventory?.tierType;
    if (tier===6 && !armorFilter.exotic) return false;
    if (tier===5 && !armorFilter.legendary) return false;
    if (tier<5) return false;
    if (armorFilter.locked && getMark(i.itemInstanceId)!=='fav') return false;
    if (showNewArmorOnly && !isNewArmor(i)) return false;
    if (armorSetFilter && getArmorSetName(i.itemHash) !== armorSetFilter) return false;
    return true;
  });
  if (!armorFilter.dupes) return base;
  const nameCounts = {};
  base.forEach(i=>{
    const n = getItemDef(i.itemHash)?.displayProperties?.name||'';
    nameCounts[n] = (nameCounts[n]||0)+1;
  });
  return base.filter(i=>{
    const n = getItemDef(i.itemHash)?.displayProperties?.name||'';
    return nameCounts[n] >= 2;
  });
}

function buildArmorAccordions() {
  const armor = getFilteredArmor();
  const classes = [0,1,2];
  const html = classes.map(classType=>{
    const label = CLASS_NAMES[classType];
    const classArmor = armor.filter(a=>{
      const def = getItemDef(a.itemHash);
      return def?.classType===classType || def?.classType===3;
    });
    let countLabel;
    if (armorFilter.dupes) {
      const uniqueNames = new Set(classArmor.map(a=>getItemDef(a.itemHash)?.displayProperties?.name||''));
      countLabel = `${uniqueNames.size} dupe group${uniqueNames.size!==1?'s':''}`;
    } else {
      countLabel = `${classArmor.length} items`;
    }
    const isOpen = activeArmorClass===classType;
    return `<div class="accordion">
      <div class="accordion-header ${isOpen?'open':''}" onclick="toggleArmorClass(${classType},this)">
        <span class="accordion-title">${label}</span>
        <span style="display:flex;align-items:center;gap:8px;">
          <span class="accordion-count">${countLabel}</span>
          <span class="accordion-arrow">▼</span>
        </span>
      </div>
      <div class="accordion-body ${isOpen?'open':''}" id="armorClass-${classType}">
        ${isOpen?buildArmorSlots(classType):''}
      </div>
    </div>`;
  }).join('');
  document.getElementById('armorAccordions').innerHTML=html;
}

function toggleArmorClass(classType, headerEl) {
  const wasOpen = activeArmorClass===classType;
  activeArmorClass = wasOpen?null:classType;
  activeArmorSlot = null;
  document.getElementById('armorSlotSection').innerHTML='';
  document.getElementById('armorItemGrid').innerHTML='';
  buildArmorAccordions();
}

function buildArmorSlots(classType) {
  const armor = getFilteredArmor().filter(a=>{
    const def = getItemDef(a.itemHash);
    return def?.classType===classType || def?.classType===3;
  });
  const slotMap = {};
  armor.forEach(a=>{
    const slot = ARMOR_BUCKET_NAMES[getEffectiveBucketHash(a)]||'Unknown';
    if (!slotMap[slot]) slotMap[slot]=0;
    slotMap[slot]++;
  });
  const slotOrder = ['Helmet','Gauntlets','Chest','Legs','Class Item'];
  return `<div class="type-grid">${slotOrder.filter(s=>slotMap[s]).map(slot=>
    `<div class="type-pill ${activeArmorSlot===slot&&activeArmorClass===classType?'active':''}" onclick="selectArmorSlot(${classType},'${slot}')">
      ${slot} <span class="pill-count">${slotMap[slot]}</span>
    </div>`).join('')}</div>`;
}

function selectArmorSlot(classType, slot) {
  activeArmorClass=classType; activeArmorSlot=slot;
  buildArmorAccordions();
  const bucketHash = Number(Object.entries(ARMOR_BUCKET_NAMES).find(([k,v])=>v===slot)?.[0]);
  const armor = getFilteredArmor().filter(a=>{
    const def = getItemDef(a.itemHash);
    return (def?.classType===classType||def?.classType===3) && getEffectiveBucketHash(a)===bucketHash;
  });
  // Show each armor piece individually; clicking opens compare with ALL items in slot
  const allSlotIds = armor.map(a=>a.itemInstanceId);
  let aKeyIdx = 0;
  const gridHtml = armor.map(a=>{
    const def = getItemDef(a.itemHash);
    const name = def?.displayProperties.name||'Item';
    const icon = def?.displayProperties?.hasIcon?`<img src="https://www.bungie.net${def.displayProperties.icon}" />`:'';
    const m = getMark(a.itemInstanceId);
    const markDot = m?`<div class="mark-indicator mark-${m}"></div>`:'';
    const key = 'ag_'+(aKeyIdx++);
    gridClickMap[key] = {instanceIds: allSlotIds, type:'armor', scrollTo: a.itemInstanceId};
    const aMwOutline = isMasterworked(a.itemInstanceId) ? 'outline:2px solid var(--exotic-col);outline-offset:-2px;' : '';
    const tier = gearTierOf(a.itemInstanceId);
    const power = instanceData[a.itemInstanceId]?.primaryStat?.value||0;
    return `<div class="grid-item" data-gkey="${key}" onmouseenter="startHoverTimer(event,'${a.itemInstanceId}')" onmouseleave="clearHoverTimer()">
      <div class="grid-item-icon" style="${aMwOutline}">${icon}${markDot}
        ${tierPipsSvg(tier,'lg')}
        ${iconBottomBar(def, power, false, 'lg')}
      </div>
      <div class="grid-item-name">${name}</div>
    </div>`;
  }).join('');
  const armorGridEl = document.getElementById('armorItemGrid');
  armorGridEl.innerHTML = `
    <div class="item-grid-section">
      <div class="item-grid-title">${slot} <span style="color:var(--text-dim);font-size:10px;margin-left:4px;">${armor.length} items</span>
        <button style="margin-left:12px;background:var(--accent);color:#0a0c0f;border:none;font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:3px 10px;cursor:pointer;" id="compareAllArmorBtn">Compare All</button>
      </div>
      <div class="item-grid">${gridHtml}</div>
    </div>`;
  armorGridEl.querySelectorAll('.grid-item').forEach(el=>{
    el.addEventListener('click', ()=>{
      const entry = gridClickMap[el.dataset.gkey];
      openArmorGodRoll(entry.instanceIds);
    });
  });
  armorGridEl.querySelector('#compareAllArmorBtn')?.addEventListener('click', ()=>{
    openArmorGodRoll(allSlotIds);
  });
}

// ===================== ARMOR GOD ROLL RANKER =====================
function openArmorGodRoll(instanceIds) {
  armorGodRollInstanceIds = instanceIds;
  armorGodRollStats = [
    {hash: null, weight: 10},
    {hash: null, weight: 8},
    {hash: null, weight: 5},
  ];
  renderArmorGodRoll();
  document.getElementById('compareOverlay').classList.add('open');
}

function renderArmorGodRoll() {
  const instanceIds = armorGodRollInstanceIds;
  const items = instanceIds.map(id=>{
    const item = allItems.find(i=>i.itemInstanceId===id);
    return {item, inst:instanceData[id], stats:statsData[id]};
  }).filter(x=>x.item && (!showNewArmorOnly || isNewArmor(x.item)));
  if (!items.length) return;

  const def0 = getItemDef(items[0].item.itemHash);
  const slotName = ARMOR_BUCKET_NAMES[getEffectiveBucketHash(items[0].item)] || 'Armor';

  // Build stat options
  const statOptions = ARMOR_STAT_HASHES.map(h=>({hash:h, name:ARMOR_STAT_NAMES[h]}));

  // Score each item
  function scoreArmor(stats) {
    let score = 0;
    armorGodRollStats.forEach(({hash, weight}) => {
      if (!hash || !weight) return;
      const val = showBaseStats ? getBaseStat(items.find(x=>x.stats===stats)?.item, hash)
                                : (stats?.stats?.[hash]?.value || 0);
      score += val * weight;
    });
    return score;
  }

  // Score + sort
  const scored = items.map(({item, inst, stats}) => {
    let score = 0;
    armorGodRollStats.forEach(({hash, weight}) => {
      if (!hash || !weight) return;
      const val = showBaseStats ? getBaseStat(item, hash) : (stats?.stats?.[hash]?.value || 0);
      score += val * weight;
    });
    return {item, inst, stats, score};
  }).sort((a,b) => b.score - a.score);

  const anyStatSelected = armorGodRollStats.some(s => s.hash);

  // Stat selector row
  const selectorHtml = armorGodRollStats.map((s, idx) => {
    const opts = [
      `<option value="">— Stat ${idx+1} —</option>`,
      ...statOptions.map(o => `<option value="${o.hash}" ${s.hash===o.hash?'selected':''}>${o.name}</option>`)
    ].join('');
    return `<div style="display:flex;flex-direction:column;gap:4px;flex:1;">
      <div style="font-family:'Barlow Condensed',sans-serif;font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);">Stat ${idx+1}</div>
      <select class="agr-stat-sel" data-idx="${idx}"
        style="background:var(--surface2);border:1px solid var(--border2);color:var(--text);font-family:'Barlow',sans-serif;font-size:12px;padding:5px 8px;outline:none;width:100%;">
        ${opts}
      </select>
      <div style="display:flex;align-items:center;gap:6px;margin-top:2px;">
        <span style="font-size:10px;color:var(--text-dim);">Weight</span>
        <input type="number" class="agr-weight" data-idx="${idx}" value="${s.weight}" min="0" max="99"
          style="width:50px;background:var(--surface2);border:1px solid var(--border2);color:var(--accent);font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:700;text-align:center;padding:3px 4px;outline:none;" />
      </div>
    </div>`;
  }).join('');

  // Base stats toggle
  const baseToggle = `<div style="display:flex;align-items:center;gap:14px;">
    <label style="display:flex;align-items:center;gap:5px;font-size:12px;color:var(--text-muted);cursor:pointer;">
      <input type="checkbox" id="agrBaseStats" ${showBaseStats?'checked':''} style="accent-color:var(--accent);cursor:pointer;" />
      Base stats only
    </label>
    <label style="display:flex;align-items:center;gap:5px;font-size:12px;color:var(--text-muted);cursor:pointer;">
      <input type="checkbox" id="agrNewOnly" ${showNewArmorOnly?'checked':''} style="accent-color:var(--accent);cursor:pointer;" />
      New armor only
    </label>
  </div>`;

  // Ranked armor list
  const rankedHtml = scored.map((r, idx) => {
    const def = getItemDef(r.item.itemHash);
    const name = def?.displayProperties?.name || 'Item';
    const icon = def?.displayProperties?.hasIcon ? `<img src="https://www.bungie.net${def.displayProperties.icon}" style="width:100%;height:100%;object-fit:cover;display:block;" />` : '';
    const power = r.inst?.primaryStat?.value || '—';
    const iid = r.item.itemInstanceId;
    const mark = getMark(iid);
    const loc = r.item.loc || '';

    // Stat bars
    const statRowsHtml = ARMOR_STAT_HASHES.map(h => {
      const val = showBaseStats ? getBaseStat(r.item, h) : (r.stats?.stats?.[h]?.value || 0);
      const isSelected = armorGodRollStats.some(s => s.hash === h);
      // Find best value across all items for this stat
      const bestVal = Math.max(...scored.map(x => showBaseStats ? getBaseStat(x.item, h) : (x.stats?.stats?.[h]?.value || 0)));
      const isBest = val === bestVal && val > 0 && scored.length > 1;
      return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
        <div style="font-size:10px;color:${isSelected?'var(--accent)':isBest?'var(--fav)':'var(--text-muted)'};width:60px;flex-shrink:0;font-weight:${isSelected||isBest?600:400};">${ARMOR_STAT_NAMES[h]}</div>
        <div style="flex:1;height:4px;background:var(--surface2);border-radius:2px;">
          <div style="height:4px;width:${Math.min(val,100)}%;background:${isSelected?'var(--accent)':isBest?'var(--fav)':'var(--border2)'};border-radius:2px;"></div>
        </div>
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:${isSelected||isBest?700:400};color:${isSelected?'var(--accent)':isBest?'var(--fav)':'var(--text)'};width:24px;text-align:right;">${val||'—'}</div>
      </div>`;
    }).join('');

    const totalVal = ARMOR_STAT_HASHES.reduce((sum,h) => sum + (showBaseStats ? getBaseStat(r.item,h) : (r.stats?.stats?.[h]?.value||0)), 0);
    const scoreDisplay = anyStatSelected ? `<div style="font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:700;color:var(--accent);">${Math.round(r.score)}</div><div style="font-size:9px;color:var(--text-dim);text-align:right;">score</div>` : '';

    return `<div style="background:var(--surface);border:1px solid ${idx===0&&anyStatSelected?'var(--fav)':'var(--border2)'};padding:12px;margin-bottom:6px;border-radius:var(--radius-sm);" id="citem-${iid}">
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;">
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:700;color:${idx===0&&anyStatSelected?'var(--fav)':'var(--text-dim)'};width:28px;text-align:center;flex-shrink:0;">${idx+1}</div>
        <div style="width:48px;height:48px;background:var(--surface2);overflow:hidden;flex-shrink:0;position:relative;">${icon}
          ${tierPipsSvg(gearTierOf(iid),'lg')}
          ${iconBottomBar(def, r.inst?.primaryStat?.value, false, 'lg')}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:700;color:var(--text);">${name}</div>
          <div style="font-size:11px;color:var(--text-muted);">${def?.itemTypeAndTierDisplayName||''} <span class="loc-badge">${loc}${r.item.equipped?' · Equipped':''}</span></div>
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:700;color:var(--accent);">${power}</div>
            <div style="font-size:11px;color:var(--text-dim);">Total: ${totalVal}</div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;">
          ${scoreDisplay}
          <div class="mark-row" data-iid="${iid}" data-type="armor" style="display:flex;gap:3px;">
            <button class="fav-heart-btn" onclick="toggleFavorite('${iid}');renderArmorGodRoll();" style="flex:0 0 50px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:5px 0;font-family:'Barlow Condensed',sans-serif;font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;border-radius:var(--radius-sm);background:${isFavorite(iid)?'var(--favorite)':'var(--surface)'};color:${isFavorite(iid)?'#0a0c0f':'var(--text-muted)'};border:1px solid var(--favorite);line-height:0;">${favoriteIconInline(14, isFavorite(iid)?'#0a0c0f':'var(--favorite)')}<span style="line-height:1;margin-top:1px;">Fav</span></button>
            <button class="mark-btn fav ${getLockBtnClass(iid)}" data-mark="fav" style="flex:0 0 50px;padding:5px 0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-size:9px;" title="${getLockBtnTitle(iid)}"><span>🔒</span><span>Lock</span></button>
            <button class="mark-btn junk ${mark==='junk'?'active':''}" data-mark="junk" style="flex:0 0 50px;padding:5px 0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-size:9px;line-height:0;">${markIconSvg('junk',14,mark==='junk'?'#fff':'var(--junk)')}<span style="line-height:1;margin-top:1px;">Junk</span></button>
            <button class="mark-btn infuse ${mark==='infuse'?'active':''}" data-mark="infuse" style="flex:0 0 50px;padding:5px 0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-size:9px;line-height:0;">${markIconSvg('infuse',14,mark==='infuse'?'#0a0c0f':'var(--infuse)')}<span style="line-height:1;margin-top:1px;">Infuse</span></button>
          </div>
        </div>
      </div>
      <div>${statRowsHtml}</div>
    </div>`;
  }).join('');

  document.getElementById('compareContent').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;padding-right:40px;">
      <div class="compare-title" style="margin-bottom:0;">${slotName} — ${items.length} pieces</div>
      ${baseToggle}
    </div>
    <div style="margin-bottom:14px;">
      <div style="font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--text-dim);margin-bottom:8px;">Stat Ranker — pick up to 3 stats and set their weights</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;background:var(--surface);border:1px solid var(--border2);padding:12px;">
        ${selectorHtml}
      </div>
    </div>
    <div style="font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--text-dim);margin-bottom:8px;">
      ${anyStatSelected ? 'Ranked by Weighted Score' : 'All Pieces — select stats above to rank'}
    </div>
    ${rankedHtml}`;

  // Wire stat selects
  document.querySelectorAll('#compareContent .agr-stat-sel').forEach(sel => {
    sel.addEventListener('change', () => {
      armorGodRollStats[Number(sel.dataset.idx)].hash = sel.value ? Number(sel.value) : null;
      renderArmorGodRoll();
    });
  });

  // Wire weight inputs
  document.querySelectorAll('#compareContent .agr-weight').forEach(inp => {
    inp.addEventListener('change', () => {
      armorGodRollStats[Number(inp.dataset.idx)].weight = Number(inp.value) || 0;
      renderArmorGodRoll();
    });
  });

  // Base stats toggle
  const baseEl = document.getElementById('agrBaseStats');
  if (baseEl) baseEl.addEventListener('change', () => { showBaseStats = baseEl.checked; renderArmorGodRoll(); });
  const newOnlyEl = document.getElementById('agrNewOnly');
  if (newOnlyEl) newOnlyEl.addEventListener('change', () => { showNewArmorOnly = newOnlyEl.checked; renderArmorGodRoll(); });

  // Mark buttons
  document.querySelectorAll('#compareContent .mark-row').forEach(row => {
    const iid = row.dataset.iid;
    row.querySelectorAll('.mark-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const m = btn.dataset.mark;
        const current = getMark(iid);
        saveMark(iid, current===m?null:m);
        renderArmorGodRoll();
        if (activeArmorClass!==null && activeArmorSlot) selectArmorSlot(activeArmorClass, activeArmorSlot);
      });
    });
  });
}

function openCompare(instanceIds, type) {
  if (type==='armor') armorSort = [{stat:'power',dir:-1},{stat:'none',dir:-1},{stat:'none',dir:-1}];
  showWeaponStats = false;
  showBaseStats = false;
  renderCompare(instanceIds, type);
  document.getElementById('compareOverlay').classList.add('open');
}

function closeCompare() {
  document.getElementById('compareOverlay').classList.remove('open');
}

function sortedItems(items, type) {
  return [...items].sort((a,b)=>{
    if (type==='armor') {
      for (const s of armorSort) {
        if (s.stat==='none') continue;
        let av,bv;
        if (s.stat==='power') { av=a.inst?.primaryStat?.value||0; bv=b.inst?.primaryStat?.value||0; }
        else {
          const h=Number(s.stat);
          if (showBaseStats) {
            av=getBaseStat(a.item,h); bv=getBaseStat(b.item,h);
          } else {
            av=a.stats?.stats?.[h]?.value||0; bv=b.stats?.stats?.[h]?.value||0;
          }
        }
        if (av!==bv) return (bv-av)*s.dir;
      }
      return 0;
    } else {
      return (b.inst?.primaryStat?.value||0)-(a.inst?.primaryStat?.value||0);
    }
  });
}

// Get base armor stat: live stat minus masterwork (+2 per stat) and mod bonuses
// Mods are socketed plugs that have investmentStats — we subtract each one
// Detect new armor (3.0) vs old armor (1.0/2.0)
// New armor has a traitId ending in '.core', old armor ends in '.season'
function isNewArmor(item) {
  if (!item) return false;
  const def = getItemDef(item.itemHash);
  if (!def?.traitIds) return false;
  return def.traitIds.some(t => t.startsWith('releases.') && t.endsWith('.core'));
}

function getModStatBonus(iid, statHash) {
  const socks = socketData[iid];
  if (!socks?.sockets) return 0;
  const item = allItems.find(i=>i.itemInstanceId===iid);
  const def = item ? getItemDef(item.itemHash) : null;
  let bonus = 0;
  socks.sockets.forEach((s, sockIdx) => {
    if (!s.plugHash) return;
    const plugDef = getItemDef(s.plugHash);
    if (!plugDef) return;
    const ident = plugDef.plug?.plugCategoryIdentifier || '';
    // Only count actual mod enhancement sockets — these have specific v2 identifiers
    // Intrinsic stat rolls use different identifiers and should NOT be counted
    const isMod = ident.match(/^enhancements\.v2_(general|head|arms|chest|legs|class_item)$/);
    if (!isMod) return;
    if (plugDef.investmentStats) {
      plugDef.investmentStats.forEach(is => {
        if ((is.statTypeHash === statHash || is.statTypeHash === Number(statHash)) && is.value > 0) bonus += is.value;
      });
    }
  });
  return bonus;
}

function getBaseStat(item, statHash) {
  if (!item) return 0;
  const iid = item.itemInstanceId;
  const statsObj = statsData[iid]?.stats;
  if (!statsObj) return 0;
  // API may return stat keys as strings or numbers — check both
  const liveVal = statsObj[statHash]?.value ?? statsObj[String(statHash)]?.value;
  if (liveVal === undefined || liveVal === null) return 0;

  if (!isNewArmor(item)) {
    // Old armor: stats are fixed, no mods/masterwork to subtract
    return liveVal;
  }

  // New armor: subtract masterwork bonus (+2 per stat if masterworked, state bit 2)
  const rawItem = allItems.find(i=>i.itemInstanceId===iid);
  const isMasterworked = rawItem ? !!(rawItem.state & 4) : false;
  const mwBonus = isMasterworked ? 2 : 0;
  // Subtract mod bonuses
  const modBonus = getModStatBonus(iid, statHash);
  return Math.max(0, liveVal - mwBonus - modBonus);
}

function getBaseStatTotal(item) {
  if (!item) return 0;
  return ARMOR_STAT_HASHES.reduce((sum,h)=>sum+getBaseStat(item,h),0);
}

function renderCompare(instanceIds, type) {
  const items = instanceIds.map(id=>{
    const item = allItems.find(i=>i.itemInstanceId===id);
    return {item, inst:instanceData[id], sockets:socketData[id], stats:statsData[id]};
  }).filter(x=>x.item && (type!=='armor' || !showNewArmorOnly || isNewArmor(x.item)));
  if (!items.length) return;

  const def0  = getItemDef(items[0].item.itemHash);
  const name0 = def0?.displayProperties.name||'Item';
  const sorted = sortedItems(items, type);
  const gridStyle = `grid-template-columns:1fr`;

  // ---- ARMOR SORT UI ----
  let controlsHtml = '';
  if (type==='armor') {
    const statOptions = [
      {val:'none', label:'—'},
      {val:'power', label:'Power'},
      ...ARMOR_STAT_HASHES.map(h=>({val:String(h), label:ARMOR_STAT_NAMES[h]}))
    ];
    const makeSelect = (idx) => {
      const cur = armorSort[idx].stat;
      const opts = statOptions.map(o=>`<option value="${o.val}" ${cur===o.val?'selected':''}>${o.label}</option>`).join('');
      const dir  = armorSort[idx].dir;
      return `<select class="armor-sort-sel" data-idx="${idx}" style="background:var(--surface);border:1px solid var(--border2);color:var(--text);font-family:'Barlow',sans-serif;font-size:12px;padding:4px 8px;outline:none;">${opts}</select>
        <button class="sort-dir-btn" data-idx="${idx}" style="background:var(--surface);border:1px solid var(--border2);color:var(--accent);font-size:11px;padding:4px 8px;cursor:pointer;">${dir===1?'↑':'↓'}</button>`;
    };
    const baseToggle = `<div style="display:flex;align-items:center;gap:14px;margin-left:auto;">
      <label style="display:flex;align-items:center;gap:5px;font-size:12px;color:var(--text-muted);cursor:pointer;">
        <input type="checkbox" id="baseStatsToggle" ${showBaseStats?'checked':''} style="accent-color:var(--accent);cursor:pointer;" />
        Base stats only
      </label>
      <label style="display:flex;align-items:center;gap:5px;font-size:12px;color:var(--text-muted);cursor:pointer;">
        <input type="checkbox" id="newArmorToggle" ${showNewArmorOnly?'checked':''} style="accent-color:var(--accent);cursor:pointer;" />
        New armor only
      </label>
    </div>`;
    controlsHtml = `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:1rem;padding:10px 12px;background:var(--surface);border:1px solid var(--border2);">
      <span style="font-family:'Barlow Condensed',sans-serif;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--text-dim);">Sort 1</span>${makeSelect(0)}
      <span style="font-family:'Barlow Condensed',sans-serif;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--text-dim);margin-left:6px;">Sort 2</span>${makeSelect(1)}
      <span style="font-family:'Barlow Condensed',sans-serif;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--text-dim);margin-left:6px;">Sort 3</span>${makeSelect(2)}
      ${baseToggle}
    </div>`;
  } else {
    // Weapon stats toggle
    controlsHtml = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:1rem;padding:8px 12px;background:var(--surface);border:1px solid var(--border2);">
      <label style="display:flex;align-items:center;gap:5px;font-size:12px;color:var(--text-muted);cursor:pointer;">
        <input type="checkbox" id="weaponStatsToggle" ${showWeaponStats?'checked':''} style="accent-color:var(--accent);cursor:pointer;" />
        Show base stats
      </label>
    </div>`;
  }

  // ---- PER-ITEM CARDS ----
  const itemsHtml = sorted.map(({item,inst,sockets,stats})=>{
    const def   = getItemDef(item.itemHash);
    const name  = def?.displayProperties.name||'Item';
    const icon  = def?.displayProperties?.hasIcon?`<img src="https://www.bungie.net${def.displayProperties.icon}" />`:'';
    const power = inst?.primaryStat?.value||'—';
    const iid   = item.itemInstanceId;
    const mark  = getMark(iid);
    const loc   = item.loc||'';

    // ---- WEAPON PERKS BY COLUMN ----
    let perksHtml = '';
    if (type==='weapon' && sockets?.sockets) {
      // DEBUG: log first weapon's socket data
      if (sorted.indexOf(sorted.find(x=>x.item.itemInstanceId===iid)) === 0) {
        // Dump raw socket objects for barrel and trait sockets
        const itemDefDbg = getItemDef(item.itemHash);
        sockets.sockets.forEach((s,i)=>{
          const pd = getItemDef(s.plugHash);
          const se = itemDefDbg?.sockets?.socketEntries?.[i];
          const psHash = se?.randomizedPlugSetHash || se?.reusablePlugSetHash || 'none';
          const ps = psHash!=='none' ? (manifestPlugSets[psHash]||manifestPlugSets[psHash>>>0]) : null;
          const psCount = ps?.reusablePlugItems?.length || 0;
          const seDbg = itemDefDbg?.sockets?.socketEntries?.[i];
          const randH = seDbg?.randomizedPlugSetHash||'none';
          const reuseH = seDbg?.reusablePlugSetHash||'none';
          const avail = reusablePlugsData;
          const psDbg = randH!=='none'?(manifestPlugSets[randH]||manifestPlugSets[randH>>>0]):null;
          const possible = psDbg?.reusablePlugItems?.length||0;
          const available = psDbg?.reusablePlugItems?.filter(p=>avail instanceof Set ? avail.has(p.plugItemHash)||p.plugItemHash===s.plugHash : false).length||0;
        });
      }
      const cols = [];
      // Use socket index to preserve column order; trait slots get separate columns
      sockets.sockets.forEach((s, sockIdx)=>{
        if (!s.plugHash) return;
        const equippedDef = getItemDef(s.plugHash);
        if (!equippedDef) return;
        const ident = equippedDef.plug?.plugCategoryIdentifier||'';

        // Skip excluded slot types
        const excluded = ['intrinsics','origins','masterworks','mods','catalysts','trackers','shader','ornaments','ghosts','holster','auras','finishers','emotes'];
        if (excluded.some(ex=>ident.includes(ex))) return;

        // Determine column type
        let colLabel = null;
        if (sockIdx === 0) return; // socket 0 is always the archetype frame, skip
        if (ident.includes('barrels')) colLabel = 'Barrel';
        else if (ident.includes('magazines') || ident.includes('batteries') || ident.includes('guards')) colLabel = 'Magazine';
        else if (ident.includes('traits')) colLabel = 'Perk';
        else if (ident.includes('perks')) colLabel = 'Perk';
        else if (ident.includes('frames')) colLabel = 'Perk'; // frames after socket 0 = trait perk
        else return; // skip anything else

        // Collect rolled options for this specific item instance
        // Component 308 (reusablePlugs) gives exactly the perks this item rolled with
        const allHashes = [];
        const seen = new Set();
        // Equipped first
        if (!seen.has(s.plugHash)) { seen.add(s.plugHash); allHashes.push(s.plugHash); }

        // Get all possible plugs for this socket from manifest
        const itemDefLookup = getItemDef(item.itemHash);
        const sockEntry = itemDefLookup?.sockets?.socketEntries?.[sockIdx];
        const randHash = sockEntry?.randomizedPlugSetHash;
        const reuseHash = sockEntry?.reusablePlugSetHash;

        const possibleHashes = [];
        [randHash, reuseHash].forEach(psHash=>{
          if (!psHash) return;
          const ps = manifestPlugSets[psHash] || manifestPlugSets[psHash>>>0] || manifestPlugSets[String(psHash)];
          if (ps?.reusablePlugItems) {
            ps.reusablePlugItems.forEach(p=>{
              if (!possibleHashes.includes(p.plugItemHash)) possibleHashes.push(p.plugItemHash);
            });
          }
        });

        // Filter based on available data:
        // - If OAuth + component 306: use exact per-item rolls
        // - Otherwise: use flat profile plugs set (less accurate)
        let rolledHashes;
        if (reusablePlugsData._perItem) {
          // Per-item exact rolls from component 309
          const itemPlugs = reusablePlugsData[iid];
          const sockSet = itemPlugs?.[String(sockIdx)] || itemPlugs?.[sockIdx] || new Set();

          rolledHashes = possibleHashes.filter(h => h===s.plugHash || sockSet.has(h));
        } else {
          // Flat fallback
          rolledHashes = possibleHashes.filter(h => h===s.plugHash || reusablePlugsData.has(h));
        }

        if (rolledHashes.length > 1) {
          rolledHashes.forEach(h=>{
            if (!seen.has(h)) { seen.add(h); allHashes.push(h); }
          });
        } else {
          // Fallback: just show equipped + reusablePlugHashes
          if (!seen.has(s.plugHash)) { seen.add(s.plugHash); allHashes.push(s.plugHash); }
          (s.reusablePlugHashes||[]).forEach(h=>{
            if (!seen.has(h)) { seen.add(h); allHashes.push(h); }
          });
        }

        // Only include hashes that have valid defs with actual names
        const validHashes = allHashes.filter(h=>{
          const d = getItemDef(h);
          if (!d) return false;
          const n = d.displayProperties?.name||'';
          if (!n || n.toLowerCase().includes('empty') || n.toLowerCase().includes('default')) return false;
          return true;
        });

        if (validHashes.length === 0) return;
        cols.push({label: colLabel, equippedHash: s.plugHash, hashes: validHashes});
      });

      // Rename duplicate "Perk" columns to Perk 1, Perk 2, etc.
      let perkNum = 0;
      cols.forEach(c=>{ if(c.label==='Perk') { perkNum++; if(perkNum>1) c.label=`Perk ${perkNum}`; else c.label='Perk 1'; } });

      if (cols.length) {
        perksHtml = `<div class="perks-section" style="margin-top:8px;">
          <div style="display:grid;grid-template-columns:repeat(${cols.length},1fr);gap:6px;">
            ${cols.map(col=>`
              <div style="background:var(--surface2);border:1px solid var(--border);padding:8px 6px;">
                <div style="font-family:'Barlow Condensed',sans-serif;font-size:9px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin-bottom:6px;border-bottom:1px solid var(--border);padding-bottom:4px;">${col.label}</div>
                ${col.hashes.map(h=>{
                  const pd = getItemDef(h);
                  const pname = pd?.displayProperties?.name||'';
                  const isEquipped = h===col.equippedHash;
                  return `<div style="padding:3px 0;background:${isEquipped?'rgba(200,168,75,0.08)':'transparent'};border-left:${isEquipped?'2px solid var(--accent)':'2px solid transparent'};padding-left:5px;margin-bottom:2px;">
                    <span style="font-size:${isEquipped?12:11}px;color:${isEquipped?'var(--accent)':'var(--text)'};font-weight:${isEquipped?600:400};line-height:1.4;display:block;">${pname}</span>
                  </div>`;
                }).join('')}
              </div>`).join('')}
          </div>
        </div>`;
      }
    }

    // ---- STATS ----
    let statsHtml = '';
    if (type==='weapon' && showWeaponStats && stats?.stats) {
      const entries = WEAPON_STAT_HASHES
        .map(h=>({hash:h,name:WEAPON_STAT_NAMES[h],val:stats.stats[h]?.value}))
        .filter(s=>s.val!==undefined&&s.val>0);
      if (entries.length) {
        statsHtml = `<div class="stats-section" style="margin-top:8px;">
          <div class="perks-label">Base Stats</div>
          ${entries.map(s=>`<div class="stat-row">
            <div class="stat-row-label">${s.name}</div>
            <div class="stat-bar-wrap"><div class="stat-bar-fill" style="width:${Math.min(s.val,100)}%"></div></div>
            <div class="stat-row-val">${s.val}</div>
          </div>`).join('')}
        </div>`;
      }
    } else if (type==='armor') {
      const maxPerStat = {};
      items.forEach(({item:it,stats:st})=>{
        ARMOR_STAT_HASHES.forEach(h=>{
          const v = showBaseStats ? getBaseStat(it,h) : (st?.stats?.[h]?.value||0);
          if (!maxPerStat[h]||v>maxPerStat[h]) maxPerStat[h]=v;
        });
      });
      const entries = ARMOR_STAT_HASHES.map(h=>{
        const val = showBaseStats ? getBaseStat(item,h) : (stats?.stats?.[h]?.value||0);
        return {hash:h, name:ARMOR_STAT_NAMES[h], val};
      }).filter(s=>s.val>0);
      const total = showBaseStats ? getBaseStatTotal(item) : entries.reduce((a,s)=>a+s.val,0);
      if (entries.length) {
        statsHtml = `<div class="stats-section">
          <div class="perks-label">Stats${showBaseStats?' <span style="font-size:10px;color:var(--text-dim)">(base)</span>':''} <span style="color:var(--accent);font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:700;margin-left:8px;">Total: ${total}</span></div>
          ${entries.map(s=>{
            const isBest = maxPerStat[s.hash]===s.val && items.length>1 && s.val>0;
            return `<div class="stat-row">
              <div class="stat-row-label" style="${isBest?'color:var(--fav);':''}">${s.name}${isBest?' ★':''}</div>
              <div class="stat-bar-wrap"><div class="stat-bar-fill" style="width:${Math.min(s.val,100)}%;${isBest?'background:var(--fav);':''}"></div></div>
              <div class="stat-row-val" style="${isBest?'color:var(--fav);':''}">${s.val}</div>
            </div>`;
          }).join('')}
        </div>`;
      }
    }

    return `<div class="compare-item" id="citem-${iid}">
      <div class="compare-item-header" style="display:flex;align-items:flex-start;gap:12px;">
        <div class="compare-item-icon" style="${isMasterworked(iid)?'outline:2px solid var(--exotic-col);outline-offset:-2px;':''}">${icon}</div>
        <div style="flex:1;min-width:0;">
          <div class="compare-item-name">${name}</div>
          <div class="compare-item-meta">${damageIcon(def)} ${def?.itemTypeAndTierDisplayName||''} <span class="loc-badge">${loc}${item.equipped?' · Equipped':''}</span></div>
          <div class="compare-item-power">${power}</div>
        </div>
        <div class="mark-row" data-iid="${iid}" data-type="${type}" style="flex-shrink:0;display:flex;flex-direction:column;gap:4px;align-items:flex-end;">
          <div style="display:flex;gap:3px;">
            <button class="mark-btn fav ${getLockBtnClass(iid)}" data-mark="fav" style="padding:4px 8px;font-size:11px;" title="${getLockBtnTitle(iid)}">🔒 Lock</button>
            <button class="mark-btn junk ${mark==='junk'?'active':''}" data-mark="junk" style="padding:4px 8px;font-size:11px;">Junk</button>
            <button class="mark-btn infuse ${mark==='infuse'?'active':''}" data-mark="infuse" style="padding:4px 8px;font-size:11px;">Infuse</button>
            <button class="mark-btn clear-btn" data-mark="clear" style="padding:4px 8px;font-size:11px;">✕</button>
          </div>
        </div>
      </div>
      ${perksHtml}
      ${statsHtml}
    </div>`;
  }).join('');

  document.getElementById('compareContent').innerHTML = `
    <div class="compare-title">${name0} — ${items.length > 1 ? items.length + ' copies' : 'Item Detail'}</div>
    ${controlsHtml}
    <div class="compare-grid" style="${gridStyle}">${itemsHtml}</div>`;

  // Armor sort selects
  document.querySelectorAll('#compareContent .armor-sort-sel').forEach(sel=>{
    sel.addEventListener('change', ()=>{
      const idx = Number(sel.dataset.idx);
      armorSort[idx].stat = sel.value;
      renderCompare(instanceIds, type);
    });
  });
  document.querySelectorAll('#compareContent .sort-dir-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const idx = Number(btn.dataset.idx);
      armorSort[idx].dir *= -1;
      renderCompare(instanceIds, type);
    });
  });

  // Base stats toggle
  const baseToggleEl = document.getElementById('baseStatsToggle');
  if (baseToggleEl) baseToggleEl.addEventListener('change', ()=>{
    showBaseStats = baseToggleEl.checked;
    renderCompare(instanceIds, type);
  });
  const newArmorToggleEl = document.getElementById('newArmorToggle');
  if (newArmorToggleEl) newArmorToggleEl.addEventListener('change', ()=>{
    showNewArmorOnly = newArmorToggleEl.checked;
    renderCompare(instanceIds, type);
  });

  // Weapon stats toggle
  const weaponStatsEl = document.getElementById('weaponStatsToggle');
  if (weaponStatsEl) weaponStatsEl.addEventListener('change', ()=>{
    showWeaponStats = weaponStatsEl.checked;
    renderCompare(instanceIds, type);
  });

  // Mark buttons
  document.querySelectorAll('#compareContent .mark-row').forEach(row=>{
    const iid = row.dataset.iid;
    const t   = row.dataset.type;
    row.querySelectorAll('.mark-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const m = btn.dataset.mark;
        setMark(iid, m==='clear'?null:m, t, instanceIds);
      });
    });
  });
}

function setMark(instanceId, mark, type, instanceIds) {
  saveMark(instanceId, mark);
  if (type!=='weapon') renderCompare(instanceIds, type);
  if (type==='weapon' && activeWeaponBHash && activeWeaponType) {
    selectWeaponType(activeWeaponBHash, activeWeaponType);
  } else if (type==='armor' && activeArmorClass!==null && activeArmorSlot) {
    selectArmorSlot(activeArmorClass, activeArmorSlot);
  }
}

function resortCompare(sort, instanceIds, type) {
  compareSort = sort;
  renderCompare(instanceIds, type);
}


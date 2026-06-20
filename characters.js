// ===================== CHARACTERS TAB =====================

// Calculate max possible power for a character (best-in-slot average)
function calcMaxPower(classType) {
  const WEAPON_SLOTS = [1498876634, 2465295065, 953998645]; // Kinetic, Energy, Heavy
  const ARMOR_SLOTS  = [3448274439, 3551918588, 14239492, 20886954, 1585787867]; // Helmet, Gauntlets, Chest, Legs, Class

  let total = 0, count = 0;

  // Weapons: best across ALL items regardless of character
  WEAPON_SLOTS.forEach(bucket => {
    let best = 0;
    allItems.forEach(i => {
      if (getEffectiveBucketHash(i) !== bucket) return;
      const def = getItemDef(i.itemHash);
      if (!def) return;
      const power = instanceData[i.itemInstanceId]?.primaryStat?.value || 0;
      if (power > best) best = power;
    });
    if (best > 0) { total += best; count++; }
  });

  // Armor: best for this class (classType matches or classType===3 = class-neutral)
  ARMOR_SLOTS.forEach(bucket => {
    let best = 0;
    allItems.forEach(i => {
      if (getEffectiveBucketHash(i) !== bucket) return;
      const def = getItemDef(i.itemHash);
      if (!def) return;
      // Check class compatibility: 3 = Any class
      const itemClass = def.classType;
      if (itemClass !== classType && itemClass !== 3) return;
      const power = instanceData[i.itemInstanceId]?.primaryStat?.value || 0;
      if (power > best) best = power;
    });
    if (best > 0) { total += best; count++; }
  });

  return count === 8 ? Math.floor(total / 8) : Math.floor(total / count) || 0;
}

function renderCharacters(characters, charEquip, profile) {
  const totalHours = Math.round(characters.reduce((a,c)=>a+(parseInt(c.minutesPlayedTotal)||0),0)/60);
  // Use last-played character's emblem as avatar
  const lastChar = characters[0]; // already sorted by dateLastPlayed
  const emblemPath = lastChar?.emblemPath;
  const emblemBgPath = lastChar?.emblemBackgroundPath;
  const avatarHtml = emblemPath
    ? `<img src="https://www.bungie.net${emblemPath}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'" />`
    : profileInfo.name[0].toUpperCase();

  // Apply class-based theme
  const lastClass = lastChar?.classType;
  window._lastCharClass = lastClass;
  // If user hasn't picked a theme yet, auto-select their class
  if (!localStorage.getItem('d2theme') && lastClass !== undefined) {
    currentTheme = `class-${lastClass}`;
  }
  // Re-apply full theme so accent auto-detect uses loaded inventory
  applyTheme(currentTheme, currentAccent);

  const charsHtml = characters.map((c,i)=>{
    const ck = CLASS_KEYS[c.classType]||'unknown';
    const hrs = Math.round((parseInt(c.minutesPlayedTotal)||0)/60);
    const equipped = charEquip[c.characterId]?.items||[];
    const weapons = equipped.filter(i=>WEAPON_BUCKETS.has(i.bucketHash));
    const armor   = equipped.filter(i=>ARMOR_BUCKETS.has(i.bucketHash));
    const general = equipped.filter(i=>GENERAL_BUCKETS.has(i.bucketHash));
    const eqSection = (items,label) => items.length===0?'':
      `<div class="eq-title">${label}</div>${items.map(it=>renderItemRow(it)).join('')}`;
    return `<div class="char-card ${ck}">
      <div class="char-class">${CLASS_NAMES[c.classType]||'Unknown'}${i===0?` <span class="recent-badge">Most Recent</span>`:''}</div>
      <div class="char-race">${RACE_NAMES[c.raceType]||''} ${GENDER_NAMES[c.genderType]||''}</div>
      <div class="char-power">${c.light||'—'}</div>
      <div class="char-power-label">Power Level &nbsp;·&nbsp; <span style="color:var(--accent);">Max: ${calcMaxPower(c.classType)||'—'}</span></div>
      <div class="char-time">${hrs.toLocaleString()} hrs · Last played ${formatDate(c.dateLastPlayed)}</div>
      <div class="equipped-section">
        ${eqSection(weapons,'Weapons')}${eqSection(armor,'Armor')}${eqSection(general,'General')}
      </div>
    </div>`;
  }).join('');

  document.getElementById('panel-characters').innerHTML = `
    <div class="profile-header">
      <div class="avatar" style="width:64px;height:64px;">${avatarHtml}</div>
      <div>
        <div class="profile-name">${profileInfo.name}<span>#${profileInfo.code}</span>
          <span class="platform-badge">${profileInfo.platform}</span></div>
      </div>
    </div>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">Most Played</div><div class="stat-value" style="font-size:15px;">${CLASS_NAMES[characters.reduce((a,b)=>(parseInt(b.minutesPlayedTotal)||0)>(parseInt(a.minutesPlayedTotal)||0)?b:a).classType]||'—'}</div></div>
      <div class="stat-card"><div class="stat-label">Total Hours</div><div class="stat-value">${totalHours.toLocaleString()}</div></div>
      <div class="stat-card"><div class="stat-label">Max Power</div><div class="stat-value">${Math.max(...characters.map(c=>calcMaxPower(c.classType)))||'—'}</div></div>
    </div>
    <div class="chars-grid">${charsHtml}</div>`;
}

function renderItemRow(item) {
  const def = getItemDef(item.itemHash);
  const name = def?def.displayProperties.name:`Item`;
  const typeLabel = def?(def.itemTypeDisplayName||''):'';
  const tier = def?def.inventory?.tierType:0;
  const rk = RARITY[tier]||'common';
  const inst = item.itemInstanceId?instanceData[item.itemInstanceId]:null;
  const power = inst?.primaryStat?.value||null;
  const iconPath = def?.displayProperties?.hasIcon?def.displayProperties.icon:null;
  const isWeapon = WEAPON_BUCKETS.has(getEffectiveBucketHash(item));
  const dmgIcon = isWeapon ? damageIcon(def) : '';
  const mwStyle = item.itemInstanceId && isMasterworked(item.itemInstanceId) ? 'outline:2px solid var(--exotic-col);outline-offset:-2px;' : '';
  if (!iconPath) console.warn('[icon-debug] no icon for', name, '— itemHash:', item.itemHash, 'def found:', !!def, 'hasIcon flag:', def?.displayProperties?.hasIcon);
  return `<div class="item-row" onmouseenter="startHoverTimer(event,'${item.itemInstanceId}')" onmouseleave="clearHoverTimer()">
    <div class="rarity-bar rarity-${rk}"></div>
    <div class="item-icon" style="${mwStyle}">${iconPath?`<img src="https://www.bungie.net${iconPath}" />`:`<div class="item-icon-ph">?</div>`}</div>
    <div class="item-info"><div class="item-name">${name}</div><div class="item-type">${dmgIcon}${dmgIcon?' ':''}${typeLabel}</div></div>
    ${power?`<div class="item-power">${power}</div>`:''}
  </div>`;
}


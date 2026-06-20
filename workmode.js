// ===================== WORK MODE =====================
// Preferences persist across sessions via localStorage so they don't reset every visit
let _wmPrefs = {};
try { _wmPrefs = JSON.parse(localStorage.getItem('d2workmodeprefs')||'{}'); } catch(e) { _wmPrefs = {}; }
function saveWorkModePrefs() {
  try {
    localStorage.setItem('d2workmodeprefs', JSON.stringify({
      filters: [...trashModeFilters],
      category: trashModeCategory,
      classOnly: trashModeClassOnly,
      showAll: trashModeShowAll,
      sort: trashModeSort,
    }));
  } catch(e) { /* localStorage unavailable — non-fatal, prefs just won't persist */ }
}

let trashModeCharId = null;
let trashModeDragItem = null;
let trashModeFilters = new Set(_wmPrefs.filters || ['junk']); // which mark type(s) the right-side list shows — multi-select, any combo of 'fav'/'junk'/'infuse'
let trashModeCategory = _wmPrefs.category || 'weapon'; // 'weapon' or 'armor' — only that category's slots are processed/rendered
let trashModeClassOnly = _wmPrefs.classOnly !== undefined ? _wmPrefs.classOnly : true; // armor only — restrict the right-side list to the selected character's class
let trashModeShowAll = _wmPrefs.showAll || false; // 'All' button — bypasses mark filtering entirely, shows every item in the slot regardless of mark
let trashModeSort = _wmPrefs.sort || 'default'; // 'default' (alphabetical), 'power', 'type' (weapon archetype, weapons only), or 'location'
let hoverTimer = null;
let hoverTooltip = null;

const MARK_FILTERS = [
  {key:'favorite',label:'Favorite', color:'var(--favorite)'},
  {key:'fav',     label:'Locked',   color:'var(--fav)'},
  {key:'junk',    label:'Junk',     color:'var(--junk)'},
  {key:'infuse',  label:'Infuse',   color:'var(--infuse)'},
];

// Location grouping key for Work Mode's Location sort — Postmaster items from ANY character
// group together as their own section, rather than being nested inside that character's location.
function locationGroupKey(item) {
  return item.inPostmaster ? 'Postmaster' : (item.loc || 'Unknown');
}

const SLOT_ORDER = [
  {name:'Kinetic',    bucket:1498876634, type:'weapon'},
  {name:'Energy',     bucket:2465295065, type:'weapon'},
  {name:'Heavy',      bucket:953998645,  type:'weapon'},
  {name:'Helmet',     bucket:3448274439, type:'armor'},
  {name:'Gauntlets',  bucket:3551918588, type:'armor'},
  {name:'Chest',      bucket:14239492,   type:'armor'},
  {name:'Legs',       bucket:20886954,   type:'armor'},
  {name:'Class Item', bucket:1585787867, type:'armor'},
];

function renderTrashMode() {
  clearHoverTimer(); // clear any stale tooltip when re-rendering
  const panel = document.getElementById('panel-trashmode');
  if (!panel) return;

  const characters = Object.values(allItems.reduce((acc,i)=>{
    if (i.characterId && i.characterId !== 'null') acc[i.characterId]=i.characterId;
    return acc;
  },{}));

  // Get characters from profileInfo
  const chars = profileInfo.characterIds || [];
  if (!chars.length) {
    panel.innerHTML = `<div class="no-junk">Load your guardian first.</div>`;
    return;
  }
  if (!trashModeCharId || !chars.includes(trashModeCharId)) trashModeCharId = chars[0];

  // Vault capacity
  const vaultItems = allItems.filter(i=>i.loc==='Vault' && (WEAPON_BUCKETS.has(getEffectiveBucketHash(i))||ARMOR_BUCKETS.has(getEffectiveBucketHash(i))));
  const vaultCount = vaultItems.length;
  const vaultMax = 1300;
  const vaultPct = Math.min(100, Math.round(vaultCount/vaultMax*100));
  const nearFull = vaultCount >= vaultMax - 10;
  const vaultColor = nearFull ? 'var(--junk)' : 'var(--fav)';

  // Character selector
  const charSelHtml = chars.map(cid=>{
    const classType = profileInfo.characterClasses?.[cid] ?? 0;
    const className = CLASS_NAMES[classType]||`Character`;
    const isActive = cid===trashModeCharId;
    return `<button onclick="selectTrashChar('${cid}')" style="font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:6px 14px;background:${isActive?'var(--accent)':'var(--surface)'};color:${isActive?'#0a0c0f':'var(--text-muted)'};border:1px solid ${isActive?'var(--accent)':'var(--border2)'};cursor:pointer;border-radius:var(--radius-sm);">${className}</button>`;
  }).join('');

  // Mark-type filter selector — "All" shows every item regardless of mark; Locked/Junk/Infuse are
  // a multi-select that only applies when "All" is off.
  const allBtnHtml = `<button onclick="selectAllTrashFilters()" style="font-family:'Barlow Condensed',sans-serif;font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:3px 9px;background:${trashModeShowAll?'var(--accent)':'var(--surface)'};color:${trashModeShowAll?'#0a0c0f':'var(--text-muted)'};border:1px solid ${trashModeShowAll?'var(--accent)':'var(--border2)'};cursor:pointer;border-radius:var(--radius-sm);">All</button>`;
  const filterSelHtmlSmall = allBtnHtml + MARK_FILTERS.map(f=>{
    const isActive = !trashModeShowAll && trashModeFilters.has(f.key);
    return `<button onclick="toggleTrashFilter('${f.key}')" style="font-family:'Barlow Condensed',sans-serif;font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:3px 9px;background:${isActive?f.color:'var(--surface)'};color:${isActive?'#0a0c0f':'var(--text-muted)'};border:1px solid ${isActive?f.color:'var(--border2)'};cursor:pointer;border-radius:var(--radius-sm);">${f.label}</button>`;
  }).join('');

  // Sort selector — Default/Power/Location apply to both weapons and armor; Type is weapon-only,
  // Set is armor-only (built from the static STATIC_ARMOR_SETS table).
  const SORT_OPTIONS = trashModeCategory === 'armor'
    ? [{key:'default', label:'Default'}, {key:'power', label:'Power'}, {key:'set', label:'Set'}, {key:'location', label:'Location'}]
    : [{key:'default', label:'Default'}, {key:'power', label:'Power'}, {key:'type', label:'Type'}, {key:'location', label:'Location'}];
  const sortSelHtmlSmall = SORT_OPTIONS.map(s=>{
    const isActive = s.key===trashModeSort;
    return `<button onclick="selectTrashSort('${s.key}')" style="font-family:'Barlow Condensed',sans-serif;font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:3px 9px;background:${isActive?'var(--accent)':'var(--surface)'};color:${isActive?'#0a0c0f':'var(--text-muted)'};border:1px solid ${isActive?'var(--accent)':'var(--border2)'};cursor:pointer;border-radius:var(--radius-sm);">${s.label}</button>`;
  }).join('');
  // Class Only toggle (armor only) — restricts the right-side list to armor matching the selected
  // character's class, since wrong-class armor can never be worn by them anyway. Default on; flip off
  // to see all classes' armor at once (useful when cleaning out junk across your whole account).
  const classOnlyHtml = trashModeCategory==='armor' ? `<div style="display:flex;align-items:center;gap:8px;">
    <span style="font-family:'Barlow Condensed',sans-serif;font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);">Show all class gear</span>
    <button onclick="toggleTrashClassOnly()" title="Show all class gear" style="position:relative;width:34px;height:19px;border-radius:10px;cursor:pointer;padding:0;flex-shrink:0;background:${!trashModeClassOnly?'var(--accent)':'var(--surface2)'};border:1px solid ${!trashModeClassOnly?'var(--accent)':'var(--border2)'};transition:background .15s;">
      <div style="position:absolute;top:1px;left:${!trashModeClassOnly?'16px':'1px'};width:15px;height:15px;border-radius:50%;background:#fff;transition:left .15s;box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>
    </button>
  </div>` : '';

  // Category toggle — Weapons or Armor. Only the active category's slots get processed below,
  // which is the actual point: less looping/rendering work per refresh, not fewer Bungie requests.
  const CATEGORIES = [{key:'weapon', label:'Weapons'}, {key:'armor', label:'Armor'}];
  const categorySelHtml = CATEGORIES.map(c=>{
    const isActive = c.key===trashModeCategory;
    return `<button onclick="selectTrashCategory('${c.key}')" style="font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:4px 12px;background:${isActive?'var(--accent)':'var(--surface)'};color:${isActive?'#0a0c0f':'var(--text-muted)'};border:1px solid ${isActive?'var(--accent)':'var(--border2)'};cursor:pointer;border-radius:var(--radius-sm);">${c.label}</button>`;
  }).join('');

  // Build slot rows — only the active category's slots are processed at all
  const activeSlots = SLOT_ORDER.filter(s=>s.type===trashModeCategory);
  const slotsHtml = activeSlots.map((slot, slotIdx)=>{
    // Left: character items for this slot — postmaster items excluded, since they aren't really
    // "in inventory" yet and belong on the right side instead (see below), even for this character.
    const charItems = allItems.filter(i=>{
      if (i.characterId !== trashModeCharId) return false;
      if (i.inPostmaster) return false;
      return getEffectiveBucketHash(i) === slot.bucket;
    });
    // Right: items NOT on selected character (except that character's own postmaster items, which
    // still belong here since they aren't truly "available" until pulled). When "All" is active,
    // every item in the slot shows regardless of mark; otherwise items matching one of the selected
    // mark filters OR favorited (Favorite is a separate boolean, checked independently and OR'd in).
    const selectedClassType = profileInfo.characterClasses?.[trashModeCharId];
    const junkItems = allItems.filter(i=>{
      if (!trashModeShowAll) {
        const m = getMark(i.itemInstanceId);
        const matchesMark = m && trashModeFilters.has(m);
        const matchesFav = trashModeFilters.has('favorite') && isFavorite(i.itemInstanceId);
        if (!matchesMark && !matchesFav) return false;
      }
      if (i.characterId === trashModeCharId && !i.inPostmaster) return false; // already on this char, shows on left
      if (slot.type==='armor' && trashModeClassOnly && selectedClassType!==undefined) {
        const itemClass = getItemDef(i.itemHash)?.classType;
        if (itemClass !== selectedClassType && itemClass !== 3) return false;
      }
      return getEffectiveBucketHash(i) === slot.bucket;
    });
    // Sort the right-side list per the active sort preference
    if (trashModeSort === 'power') {
      junkItems.sort((a,b)=> (instanceData[b.itemInstanceId]?.primaryStat?.value||0) - (instanceData[a.itemInstanceId]?.primaryStat?.value||0));
    } else if (trashModeSort === 'type' && slot.type === 'weapon') {
      junkItems.sort((a,b)=> (getItemDef(a.itemHash)?.itemTypeDisplayName||'').localeCompare(getItemDef(b.itemHash)?.itemTypeDisplayName||''));
    } else if (trashModeSort === 'set' && slot.type === 'armor') {
      // Items belonging to a named set group together; items with no set (most older/non-set gear) sort last.
      junkItems.sort((a,b)=> {
        const sa = getArmorSetName(a.itemHash), sb = getArmorSetName(b.itemHash);
        const ra = sa ? 0 : 1, rb = sb ? 0 : 1;
        if (ra !== rb) return ra - rb;
        if (sa !== sb) return (sa||'').localeCompare(sb||'');
        return (getItemDef(a.itemHash)?.displayProperties?.name||'').localeCompare(getItemDef(b.itemHash)?.displayProperties?.name||'');
      });
    } else if (trashModeSort === 'location') {
      // Order: Postmaster (all characters combined) first, then Vault, then the classes.
      const groupRank = k => k==='Postmaster' ? 0 : k==='Vault' ? 1 : 2;
      junkItems.sort((a,b)=> {
        const ka = locationGroupKey(a), kb = locationGroupKey(b);
        const ra = groupRank(ka), rb = groupRank(kb);
        if (ra !== rb) return ra - rb;
        if (ka !== kb) return ka.localeCompare(kb);
        return (getItemDef(a.itemHash)?.displayProperties?.name||'').localeCompare(getItemDef(b.itemHash)?.displayProperties?.name||'');
      });
    } else {
      junkItems.sort((a,b)=> (getItemDef(a.itemHash)?.displayProperties?.name||'').localeCompare(getItemDef(b.itemHash)?.displayProperties?.name||''));
    }

    // renderIcon — uniform 48px, masterwork=gold border, small mark-status badge, combined info+transfer bar below
    const renderIcon = (item, side) => {
      const def = getItemDef(item.itemHash);
      const icon = def?.displayProperties?.hasIcon ? `https://www.bungie.net${def.displayProperties.icon}` : '';
      const inst = instanceData[item.itemInstanceId];
      const power = inst?.primaryStat?.value||'';
      const mw = isMasterworked(item.itemInstanceId);
      const mark = getMark(item.itemInstanceId);
      const isCraftedItem = isCrafted(item.itemInstanceId);
      const tier = gearTierOf(item.itemInstanceId);
      const border = mw ? '2px solid var(--exotic-col)' : '1px solid var(--border2)';
      const isFav = isFavorite(item.itemInstanceId);
      // Mark-status indicator: Junk gets the big centered circle-slash (as it was before); Infuse
      // gets a small solid badge; Locked uses the live sync-status icon (outline=pending, solid=
      // synced) since this badge is visible at all times — it's the one that should reflect reality.
      // Favorite is fully independent of marks and sits in that same bottom-right corner, to the
      // left of the mark badge when both are present.
      const markIconHtml = mark === 'fav' ? lockSyncIconSvg(item.itemInstanceId,15) : mark === 'infuse' ? markIconSvg(mark,15) : '';
      const favIconHtml = isFav ? favoriteIconInline(15) : '';
      const bottomRightBadge = (markIconHtml || favIconHtml)
        ? `<div style="position:absolute;bottom:1px;right:1px;z-index:2;display:flex;align-items:center;gap:2px;filter:drop-shadow(0 0 1.5px rgba(0,0,0,0.95));">${favIconHtml}${markIconHtml}</div>`
        : '';
      const junkOverlay = mark === 'junk' ? `<div style="position:absolute;left:0;top:0;width:48px;height:48px;pointer-events:none;z-index:2;" title="Marked as junk">
        <svg viewBox="0 0 48 48" width="48" height="48" style="position:absolute;left:0;top:0;filter:drop-shadow(0 0 1.5px rgba(0,0,0,0.95));">
          <circle cx="24" cy="24" r="10" fill="none" stroke="#3fe06a" stroke-width="3" stroke-linecap="round"/>
          <line x1="17" y1="31" x2="31" y2="17" stroke="#3fe06a" stroke-width="3" stroke-linecap="round"/>
        </svg>
      </div>` : '';
      // Location only matters on the right side — top-right now, clear of the tier pips on the left edge
      const locBadge = side==='junk' ? `<div style="position:absolute;top:1px;right:1px;line-height:0;z-index:2;">${locBadgeSvg(item)}</div>` : '';
      const dmg = damageIcon(def, 12);
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:0;flex-shrink:0;">
        <div class="tm-icon"
          data-iid="${item.itemInstanceId}"
          data-side="${side}"
          data-slot="${slot.bucket}"
          draggable="true"
          style="position:relative;width:48px;height:48px;background:var(--surface2);border:${border};cursor:pointer;"
          onmouseenter="startHoverTimer(event,'${item.itemInstanceId}')"
          onmouseleave="onIconMouseLeave()"
          oncontextmenu="showInteractiveTooltip(event,'${item.itemInstanceId}')"
          ondragstart="onTMDragStart(event,'${item.itemInstanceId}','${side}','${slot.bucket}')"
          onclick="transferItem('${item.itemInstanceId}','${side}','${slot.bucket}')">
          ${icon?`<img src="${icon}" style="width:100%;height:100%;object-fit:cover;display:block;" />`:''}
          ${tmLeftEdgeBadge(tier,isCraftedItem)}
          ${locBadge}
          ${bottomRightBadge}
          ${junkOverlay}
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;width:48px;background:var(--surface);border:1px solid var(--border2);border-top:none;padding:2px 4px;cursor:pointer;"
          onclick="transferItem('${item.itemInstanceId}','${side}','${slot.bucket}')">
          <span style="display:flex;align-items:center;gap:2px;line-height:0;pointer-events:none;">${dmg}<span style="font-family:'Barlow Condensed',sans-serif;font-size:9px;font-weight:700;color:var(--text-muted);">${power}</span></span>
          <span style="color:var(--text-muted);font-size:11px;line-height:1;pointer-events:none;">⇄</span>
        </div>
      </div>`;
    };

    // Left side: equipped alone, 3x3 inventory grid beside it, all same size
    const equippedItem = charItems.find(i=>i.equipped);
    const invItems = charItems.filter(i=>!i.equipped);
    const equippedHtml = equippedItem
      ? renderIcon(equippedItem,'char')
      : `<div style="width:48px;height:48px;background:var(--surface2);border:1px dashed var(--border2);opacity:0.4;flex-shrink:0;"></div>`;
    const invGridHtml = `<div style="display:grid;grid-template-columns:repeat(3,48px);gap:3px;">${
      Array.from({length:9}).map((_,idx)=> invItems[idx] ? renderIcon(invItems[idx],'char') : `<div style="width:48px;height:48px;background:var(--surface2);border:1px dashed var(--border);opacity:0.2;"></div>`).join('')
    }</div>`;

    // Right side: items matching the active filter. When sorted by a grouping field (Type/Location),
    // insert a labeled divider wherever the group changes, so boundaries are easy to spot.
    const groupKeyFn = trashModeSort==='type' && slot.type==='weapon' ? (i=>getItemDef(i.itemHash)?.itemTypeDisplayName||'Unknown')
      : trashModeSort==='set' && slot.type==='armor' ? (i=>getArmorSetName(i.itemHash)||'No Set')
      : trashModeSort==='location' ? locationGroupKey
      : null;
    let junkIcons = '';
    let lastGroupKey = undefined;
    junkItems.forEach(i=>{
      if (groupKeyFn) {
        const gk = groupKeyFn(i);
        if (gk !== lastGroupKey) {
          junkIcons += `<div style="flex-basis:100%;display:flex;align-items:center;gap:6px;margin:${lastGroupKey===undefined?'0':'4px'} 0 1px 0;">
            <span style="font-family:'Barlow Condensed',sans-serif;font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text-dim);white-space:nowrap;">${gk}</span>
            <span style="flex:1;height:1px;background:var(--border2);"></span>
          </div>`;
          lastGroupKey = gk;
        }
      }
      junkIcons += renderIcon(i,'junk');
    });

    return `<div class="tm-slot-row" style="display:flex;gap:10px;margin-bottom:18px;align-items:flex-start;">
      <div class="tm-drop-zone" data-zone="char" data-slot="${slot.bucket}"
        style="position:relative;background:var(--surface);border:1px solid color-mix(in srgb, var(--accent) 40%, transparent);padding:8px;display:flex;flex-direction:column;gap:6px;transition:border-color .15s,background .15s;min-width:180px;">
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-family:'Barlow Condensed',sans-serif;font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--text-dim);white-space:nowrap;">${slot.name}</span>
          <span style="flex:1;height:1px;background:var(--border2);"></span>
        </div>
        <div style="display:flex;gap:8px;align-items:flex-start;">
          ${equippedHtml}
          ${invGridHtml}
        </div>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;gap:0;">
        <div class="tm-drop-zone" data-zone="junk" data-slot="${slot.bucket}"
          style="position:relative;min-height:60px;background:var(--surface);border:1px solid color-mix(in srgb, var(--accent) 40%, transparent);padding:8px;display:flex;flex-wrap:wrap;gap:3px;transition:border-color .15s,background .15s;">
          ${junkIcons||`<div style="color:var(--text-dim);font-size:11px;padding:4px;align-self:center;">None</div>`}
        </div>
      </div>
    </div>`;
  }).join('');

  panel.innerHTML = `
    <div style="margin-top:16px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        ${categorySelHtml}
      </div>
      <div style="position:relative;display:flex;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap;">
        ${charSelHtml}
        <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;align-items:center;gap:6px;">
          <span style="font-family:'Barlow Condensed',sans-serif;font-size:8px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--text-dim);">Show:</span>
          ${filterSelHtmlSmall}
        </div>
        <div style="margin-left:auto;display:flex;flex-direction:column;align-items:flex-end;gap:5px;">
          <div style="display:flex;align-items:center;gap:8px;padding:5px 10px;background:var(--surface);border:1px solid var(--border2);border-radius:var(--radius-sm);">
            <span style="font-family:'Barlow Condensed',sans-serif;font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--text-dim);">Vault</span>
            <div style="width:120px;height:5px;background:var(--surface2);border-radius:3px;">
              <div style="height:5px;width:${vaultPct}%;background:${vaultColor};border-radius:3px;transition:width .3s;"></div>
            </div>
            <span style="font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:700;color:${vaultColor};">${vaultCount} / ${vaultMax}${nearFull?' ⚠':''}</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-family:'Barlow Condensed',sans-serif;font-size:8px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--text-dim);">Sort:</span>
            ${sortSelHtmlSmall}
          </div>
          ${classOnlyHtml}
        </div>
      </div>
      <div style="margin-bottom:10px;"></div>
      <div>${slotsHtml}</div>
    </div>`;



  // Wire drag/drop zones
  panel.querySelectorAll('.tm-drop-zone').forEach(zone=>{
    zone.addEventListener('dragover', e=>{ e.preventDefault(); zone.style.background='color-mix(in srgb, var(--accent) 15%, transparent)'; zone.style.borderColor='var(--accent)'; zone.style.boxShadow='inset 0 0 0 2px var(--accent)'; });
    zone.addEventListener('dragleave', ()=>{ zone.style.background=''; zone.style.borderColor=''; zone.style.boxShadow=''; });
    zone.addEventListener('drop', e=>{ e.preventDefault(); zone.style.background=''; zone.style.borderColor=''; zone.style.boxShadow=''; onTMDrop(e, zone.dataset.zone, Number(zone.dataset.slot)); });
  });
}

function selectTrashChar(cid) {
  trashModeCharId = cid;
  renderTrashMode();
}

function selectTrashCategory(cat) {
  trashModeCategory = cat;
  saveWorkModePrefs();
  renderTrashMode();
}

function toggleTrashClassOnly() {
  trashModeClassOnly = !trashModeClassOnly;
  saveWorkModePrefs();
  renderTrashMode();
}

function toggleTrashFilter(filterKey) {
  if (trashModeShowAll) {
    // Coming out of "All" mode — start a fresh selection with just the clicked filter
    trashModeShowAll = false;
    trashModeFilters = new Set([filterKey]);
  } else {
    if (trashModeFilters.has(filterKey)) {
      // Don't allow deselecting the last remaining filter — at least one must always be active
      if (trashModeFilters.size <= 1) return;
      trashModeFilters.delete(filterKey);
    } else {
      trashModeFilters.add(filterKey);
    }
  }
  saveWorkModePrefs();
  renderTrashMode();
}

function selectAllTrashFilters() {
  if (trashModeShowAll) return; // already active — no-op
  trashModeShowAll = true;
  saveWorkModePrefs();
  renderTrashMode();
}

function selectTrashSort(sortKey) {
  trashModeSort = sortKey;
  saveWorkModePrefs();
  renderTrashMode();
}

function onTMDragStart(event, iid, side, slot) {
  trashModeDragItem = {iid, side, slot: Number(slot)};
  event.dataTransfer.effectAllowed = 'move';
}

function onTMDrop(event, zone, slotBucket) {
  if (!trashModeDragItem) return;
  const {iid, side} = trashModeDragItem;
  trashModeDragItem = null;
  if (side === zone) return; // dropped in same zone, no-op
  transferItem(iid, side, slotBucket);
}

async function transferItem(iid, side, slotBucket) {
  const item = allItems.find(i=>i.itemInstanceId===iid);
  if (!item) return;
  const def = getItemDef(item.itemHash);
  const isInVault = item.loc === 'Vault';
  const isOnChar = item.characterId === trashModeCharId;
  // Capture lock state BEFORE any transfer touches it — Bungie's API has a known bug
  // where items can pick up the locked status of other copies in the destination bucket.
  // We'll re-assert this value after landing on a character, same workaround DIM uses.
  const wasLocked = !!(item.state & 1);

  const {membershipType} = profileInfo;
  const headers = await ensureAuthHeaders();
  if (!headers) return;

  // Postmaster items can't be vaulted or transferred directly — Bungie requires pulling
  // them into their owning character's regular inventory first via a separate endpoint.
  // Once pulled, the item behaves like a normal character-inventory item for the rest of
  // this function (vault-hop logic below already handles moving it on from there if needed).
  if (item.inPostmaster) {
    const pmResp = await fetch('https://www.bungie.net/Platform/Destiny2/Actions/Items/PullFromPostmaster/', {
      method:'POST', headers,
      body: JSON.stringify({itemReferenceHash: item.itemHash, itemId: iid, stackSize:1, characterId: item.characterId, membershipType})
    });
    const pmData = await pmResp.json();
    if (pmData.ErrorCode !== 1) {
      alert(`Bungie won't let this item be pulled from the Postmaster: ${pmData.Message}`);
      return;
    }
    item.inPostmaster = false;
    await new Promise(r=>setTimeout(r,300));
  }

  // Vault space check — any move that goes through vault needs room
  const vaultCount = allItems.filter(i=>i.loc==='Vault' && (WEAPON_BUCKETS.has(getEffectiveBucketHash(i))||ARMOR_BUCKETS.has(getEffectiveBucketHash(i)))).length;
  const needsVaultSpace = side === 'char' || (side === 'junk' && !isInVault);
  if (needsVaultSpace && vaultCount >= 1300) {
    alert('Vault is full (1300/1300). Clear some space before transferring.');
    return;
  }

  // Determine transfer direction
  let transferToVault, characterId;
  if (side === 'char') {
    // Character item → vault
    transferToVault = true;
    characterId = trashModeCharId;
  } else {
    // Junk item → character (from wherever it is)
    transferToVault = false;
    characterId = trashModeCharId;
    // If it's on another character, need to vault it first then transfer
    if (!isInVault && item.characterId !== trashModeCharId) {
      // Step 1: move to vault from source character
      const r1 = await fetch('https://www.bungie.net/Platform/Destiny2/Actions/Items/TransferItem/', {
        method:'POST', headers,
        body: JSON.stringify({itemReferenceHash: item.itemHash, itemId: iid, stackSize:1, characterId: item.characterId, transferToVault: true, membershipType})
      });
      const d1 = await r1.json();
      if (d1.ErrorCode !== 1) { alert(`Transfer failed: ${d1.Message}`); return; }
      await new Promise(r=>setTimeout(r,300));
    }
  }

  const resp = await fetch('https://www.bungie.net/Platform/Destiny2/Actions/Items/TransferItem/', {
    method:'POST', headers,
    body: JSON.stringify({itemReferenceHash: item.itemHash, itemId: iid, stackSize:1, characterId, transferToVault, membershipType})
  });
  const data = await resp.json();
  if (data.ErrorCode !== 1) { alert(`Transfer failed: ${data.Message}`); return; }

  // Update local state
  if (transferToVault) {
    item.loc = 'Vault';
    item.characterId = null;
    item.equipped = false;
  } else {
    item.loc = CLASS_NAMES[allItems.find(i=>i.characterId===trashModeCharId&&i.equipped)?.classType]||'Character';
    item.characterId = trashModeCharId;

    // Workaround for Bungie API bug: transferring onto a character can silently
    // lock the item if another copy in that bucket was locked. Re-assert the
    // correct lock state right after landing, so it doesn't get clobbered.
    await new Promise(r=>setTimeout(r,400));
    try {
      console.log(`[lock-correction] item ${iid}: re-asserting locked=${wasLocked} on character ${characterId}`);
      const lockResp = await fetch('https://www.bungie.net/Platform/Destiny2/Actions/Items/SetLockState/', {
        method:'POST', headers,
        body: JSON.stringify({state: wasLocked, itemId: iid, characterId, membershipType})
      });
      const lockData = await lockResp.json();
      console.log(`[lock-correction] response:`, lockData);
      if (lockData.ErrorCode === 1) {
        item.state = wasLocked ? (item.state | 1) : (item.state & ~1);
        inGameLockState[iid] = wasLocked;
      } else {
        console.warn(`[lock-correction] Bungie rejected the corrective call:`, lockData.Message);
      }
    } catch(e) { console.warn('[lock-correction] request failed:', e); }
  }
  renderTrashMode();
}


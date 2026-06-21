// ===================== THEME SYSTEM =====================

const DAMAGE_ACCENTS = {
  1: { accent:'#b8b8c0', accent2:'#d0d0d8', glow:'rgba(184,184,192,0.12)', line:'rgba(184,184,192,0.06)', name:'Kinetic' },
  2: { accent:'#79c2f4', accent2:'#a0d8ff', glow:'rgba(121,194,244,0.14)', line:'rgba(121,194,244,0.06)', name:'Arc' },
  3: { accent:'#f07833', accent2:'#ffa060', glow:'rgba(240,120,51,0.14)',  line:'rgba(240,120,51,0.06)',  name:'Solar' },
  4: { accent:'#9966cc', accent2:'#b888e8', glow:'rgba(153,102,204,0.14)', line:'rgba(153,102,204,0.06)', name:'Void' },
  6: { accent:'#4d97c4', accent2:'#80c0e0', glow:'rgba(77,151,196,0.14)',  line:'rgba(77,151,196,0.06)',  name:'Stasis' },
  7: { accent:'#4fce96', accent2:'#80e8b8', glow:'rgba(79,206,150,0.14)',  line:'rgba(79,206,150,0.06)',  name:'Strand' },
};

let currentTheme      = localStorage.getItem('d2theme')      || 'destiny';
let currentAccent     = localStorage.getItem('d2accent')     || 'auto';
let currentBrightness = Number(localStorage.getItem('d2brightness') || 5);
let starAnimId = null;
let _starfieldResizeHandler = null;

function applyTheme(theme, accent, brightness) {
  if (brightness !== undefined) currentBrightness = brightness;
  const bMult = currentBrightness / 5; // 1.0 at default, 0.2 at min, 2.0 at max
  localStorage.setItem('d2brightness', currentBrightness);
  currentTheme  = theme;
  currentAccent = accent;
  localStorage.setItem('d2theme',  theme);
  localStorage.setItem('d2accent', accent);

  const root = document.documentElement;
  const canvas = document.getElementById('starCanvas');

  // Stop starfield if switching away
  if (theme !== 'starfield') {
    if (canvas) canvas.style.opacity = '0';
    if (starAnimId) { cancelAnimationFrame(starAnimId); starAnimId = null; }
  }

  // Toggle destiny hex overlay
  document.body.classList.toggle('theme-destiny', theme === 'destiny');

  // ── Main theme ──
  if (theme === 'starfield') {
    root.style.setProperty('--theme-glow', 'rgba(0,0,0,0)');
    root.style.setProperty('--theme-line', 'rgba(0,0,0,0)');
    startStarfield();
  } else if (theme.startsWith('class-')) {
    const classType = Number(theme.split('-')[1]);
    const t = CLASS_THEMES[classType] || CLASS_THEMES[0];
    root.style.setProperty('--theme-glow', `rgba(${t.glow.match(/\d+,\d+,\d+/)[0]},${parseFloat(t.glow.match(/[\d.]+\)$/)[0])*bMult})`);
    root.style.setProperty('--theme-line', `rgba(${t.line.match(/\d+,\d+,\d+/)[0]},${parseFloat(t.line.match(/[\d.]+\)$/)[0])*bMult})`);
  } else if (theme === 'class') {
    const classType = window._lastCharClass ?? 0;
    const t = CLASS_THEMES[classType] || CLASS_THEMES[0];
    root.style.setProperty('--theme-glow', `rgba(${t.glow.match(/\d+,\d+,\d+/)[0]},${parseFloat(t.glow.match(/[\d.]+\)$/)[0])*bMult})`);
    root.style.setProperty('--theme-line', `rgba(${t.line.match(/\d+,\d+,\d+/)[0]},${parseFloat(t.line.match(/[\d.]+\)$/)[0])*bMult})`);
  } else if (theme === 'destiny') {
    root.style.setProperty('--theme-glow', `rgba(200,168,75,${0.35*bMult})`);
    root.style.setProperty('--theme-line', `rgba(200,168,75,${0.16*bMult})`);
  }

  // ── Accent ──
  let accentData = null;
  const isClassTheme = theme.startsWith('class-') || theme === 'class';
  if (accent === 'auto') {
    // Find most-used damage type in inventory
    const counts = {};
    allItems.filter(i=>WEAPON_BUCKETS.has(getEffectiveBucketHash(i))).forEach(i=>{
      const dt = getItemDef(i.itemHash)?.defaultDamageType;
      if (dt && dt > 0) counts[dt] = (counts[dt]||0) + 1;
    });
    const topDt = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0];
    accentData = DAMAGE_ACCENTS[topDt] || null;
  } else {
    accentData = DAMAGE_ACCENTS[Number(accent)] || null;
  }

  if (accentData) {
    // Accent only controls UI colors (--accent, --accent2), never the background theme
    root.style.setProperty('--accent',  accentData.accent);
    root.style.setProperty('--accent2', accentData.accent2);
  } else if (accent === 'auto' && !profileLoaded) {
    root.style.setProperty('--accent',  '#c8a84b');
    root.style.setProperty('--accent2', '#e8c96a');
  }

  updateThemePickerUI();
}

function startStarfield() {
  const canvas = document.getElementById('starCanvas');
  if (!canvas) return;
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.opacity = '1';
  const ctx = canvas.getContext('2d');
  const stars = Array.from({length: 200}, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.4 + 0.2,
    speed: Math.random() * 0.12 + 0.03,
    opacity: Math.random() * 0.7 + 0.2,
    twinkle: Math.random() * Math.PI * 2,
    twinkleSpeed: Math.random() * 0.02 + 0.005,
  }));

  function draw() {
    if (currentTheme !== 'starfield') return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
      s.twinkle += s.twinkleSpeed;
      s.y += s.speed;
      if (s.y > canvas.height) { s.y = 0; s.x = Math.random() * canvas.width; }
      const alpha = s.opacity * (0.6 + 0.4 * Math.sin(s.twinkle));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fill();
    });
    starAnimId = requestAnimationFrame(draw);
  }
  if (starAnimId) cancelAnimationFrame(starAnimId);
  draw();

  // Remove previous resize handler if any, then add a fresh one
  if (_starfieldResizeHandler) window.removeEventListener('resize', _starfieldResizeHandler);
  _starfieldResizeHandler = () => {
    if (currentTheme !== 'starfield') return;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    stars.forEach(s => { s.x = Math.random() * canvas.width; s.y = Math.random() * canvas.height; });
  };
  window.addEventListener('resize', _starfieldResizeHandler);
}

function updateThemePickerUI() {
  const brightnessEl = document.getElementById('themeBrightness');
  if (brightnessEl) brightnessEl.value = currentBrightness;
  // Update theme swatch active states — handles class-0/1/2
  document.querySelectorAll('.theme-swatch').forEach(el => {
    const active = el.dataset.theme === currentTheme;
    el.style.border = active ? `2px solid var(--accent)` : '2px solid transparent';
    el.style.boxShadow = active ? '0 0 8px var(--accent)' : 'none';
  });

  document.querySelectorAll('.accent-swatch').forEach(el => {
    const active = el.dataset.accent === currentAccent;
    el.style.border = active ? `2px solid var(--accent)` : '2px solid rgba(255,255,255,0.2)';
    el.style.boxShadow = active ? '0 0 6px var(--accent)' : 'none';
    el.style.transform = active ? 'scale(1.15)' : 'scale(1)';
  });

  // Draw starfield swatch preview
  const swatchCanvas = document.querySelector('.theme-swatch[data-theme="starfield"] .swatch-canvas');
  if (swatchCanvas) {
    const sc = swatchCanvas.getContext('2d');
    sc.fillStyle = '#0a0c0f';
    sc.fillRect(0, 0, 58, 44);
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * 58, y = Math.random() * 44;
      const r = Math.random() * 1.2 + 0.2;
      sc.beginPath();
      sc.arc(x, y, r, 0, Math.PI*2);
      sc.fillStyle = `rgba(255,255,255,${Math.random()*0.8+0.2})`;
      sc.fill();
    }
  }
}

function toggleThemePanel() {
  const panel = document.getElementById('themePicker');
  const arrow = document.getElementById('themeArrow');
  const isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'block';
  arrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
  if (!isOpen) updateThemePickerUI();
}

function initThemePicker() {
  document.querySelectorAll('.theme-swatch').forEach(el => {
    el.addEventListener('click', () => applyTheme(el.dataset.theme, currentAccent));
  });
  document.querySelectorAll('.accent-swatch').forEach(el => {
    el.addEventListener('click', () => applyTheme(currentTheme, el.dataset.accent));
  });
  const brightnessEl = document.getElementById('themeBrightness');
  if (brightnessEl) {
    brightnessEl.value = currentBrightness;
    brightnessEl.addEventListener('input', () => applyTheme(currentTheme, currentAccent, Number(brightnessEl.value)));
  }
  updateThemePickerUI();
}

// Hover tooltip
let interactiveTooltipIid = null; // which item's right-click popup is open, if any (for refreshing after auto-sync)
let interactiveTooltipPos = null; // {x,y} screen position to redraw the popup in place without a new mouse event
function startHoverTimer(event, iid) {
  clearHoverTimer();
  hoverTimer = setTimeout(()=>showItemTooltip(event, iid), 1500);
}
function clearHoverTimer() {
  if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer=null; }
  if (hoverTooltip) { hoverTooltip.remove(); hoverTooltip=null; }
  interactiveTooltipIid = null;
  interactiveTooltipPos = null;
}
// Mouseleave on an icon: a plain hover tooltip should still close as normal, but an interactive
// (right-click) popup should stay open until explicitly dismissed via outside click or Escape —
// otherwise it'd vanish the instant you move toward the popup itself to click a mark button.
function onIconMouseLeave() {
  if (interactiveTooltipIid) {
    if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer=null; }
    return;
  }
  clearHoverTimer();
}
// Right-click opens the same popup instantly (no delay) with mark buttons added, replacing
// any hover popup so the two never compete for the same spot.
function showInteractiveTooltip(event, iid) {
  event.preventDefault();
  event.stopPropagation();
  clearHoverTimer();
  showItemTooltip(event, iid, true);
}
// Robust guard against the outside-click-to-dismiss handler closing the popup on its own mark
// button clicks. event.stopPropagation() alone isn't reliable here since the button itself gets
// replaced (the popup refreshes) as a side effect of the very click that's still bubbling.
let suppressNextDocClick = false;
function toggleMarkFromTooltip(iid, mark) {
  suppressNextDocClick = true;
  const pos = interactiveTooltipPos; // capture before renderTrashMode's defensive clearHoverTimer wipes it
  const current = getMark(iid);
  saveMark(iid, current===mark ? null : mark);
  if (document.getElementById('panel-trashmode')?.classList.contains('active')) renderTrashMode();
  if (pos) showItemTooltip({clientX:pos.x, clientY:pos.y}, iid, true);
}
function toggleFavoriteFromTooltip(iid) {
  suppressNextDocClick = true;
  const pos = interactiveTooltipPos;
  toggleFavorite(iid);
  if (document.getElementById('panel-trashmode')?.classList.contains('active')) renderTrashMode();
  if (pos) showItemTooltip({clientX:pos.x, clientY:pos.y}, iid, true);
}
function showItemTooltip(event, iid, interactive) {
  const item = allItems.find(i=>i.itemInstanceId===iid);
  if (!item) return;
  // Always clear out any existing tooltip element first — without this, refreshing an
  // interactive popup in place (after clicking a mark button) creates a brand new DOM element
  // every time without removing the old one, leaving orphaned stacked popups that never close.
  if (hoverTooltip) { hoverTooltip.remove(); hoverTooltip = null; }
  if (interactive) { interactiveTooltipIid = iid; interactiveTooltipPos = {x: event.clientX, y: event.clientY}; }
  const def = getItemDef(item.itemHash);
  const inst = instanceData[iid];
  const stats = statsData[iid];
  const socks = socketData[iid];
  const name = def?.displayProperties?.name||'Item';
  const type = def?.itemTypeDisplayName||'';
  const tier = def?.inventory?.tierType||0;
  const rk = RARITY[tier]||'common';
  const power = inst?.primaryStat?.value||'—';
  const isWeapon = WEAPON_BUCKETS.has(getEffectiveBucketHash(item));
  const iconPath = def?.displayProperties?.hasIcon ? `https://www.bungie.net${def.displayProperties.icon}` : '';
  const flavorText = def?.flavorText||'';
  const mw = isMasterworked(iid);

  // Rarity colors
  const rarityColors = {exotic:'#ceae33',legendary:'#7a4c96',rare:'#5076a3',uncommon:'#366f42',common:'#c3bcb4'};
  const rarityColor = rarityColors[rk]||'#c3bcb4';

  // Intrinsic frame (socket 0)
  let intrinsicHtml = '';
  if (socks?.sockets?.[0]?.plugHash) {
    const pd = getItemDef(socks.sockets[0].plugHash);
    const pname = pd?.displayProperties?.name||'';
    const pdesc = pd?.displayProperties?.description||'';
    const picon = pd?.displayProperties?.hasIcon ? `https://www.bungie.net${pd.displayProperties.icon}` : '';
    if (pname && !pname.toLowerCase().includes('empty')) {
      intrinsicHtml = `<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-top:1px solid rgba(255,255,255,0.08);border-bottom:1px solid rgba(255,255,255,0.08);margin:8px 0;">
        ${picon?`<img src="${picon}" style="width:32px;height:32px;flex-shrink:0;" />`:''}
        <div><div style="font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:700;color:var(--text);">${pname}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">${pdesc}</div></div>
      </div>`;
    }
  }

  // Weapon perk columns
  let perksHtml = '';
  if (isWeapon && socks?.sockets) {
    const cols = extractWeaponCols(item, iid, socks);
    if (cols.length) {
      perksHtml = `<div style="display:grid;grid-template-columns:repeat(${cols.length},1fr);gap:6px;margin-bottom:8px;">
        ${cols.map(col=>`<div>
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:8px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin-bottom:4px;border-bottom:1px solid var(--border);padding-bottom:3px;">${col.label}</div>
          ${col.hashes.map(h=>{
            const pd=getItemDef(h); const pn=pd?.displayProperties?.name||'';
            const isEq = h===col.equippedHash;
            return `<div style="font-size:11px;padding:2px 0;color:${isEq?'var(--text)':'var(--text-muted)'};font-weight:${isEq?700:400};">${pn}</div>`;
          }).join('')}
        </div>`).join('')}
      </div>`;
    }
  }

  // Armor stats
  let statsHtml = '';
  if (!isWeapon && stats?.stats) {
    const entries = ARMOR_STAT_HASHES.map(h=>({n:ARMOR_STAT_NAMES[h],v:stats.stats[h]?.value||0})).filter(s=>s.v>0);
    const total = entries.reduce((a,s)=>a+s.v,0);
    if (entries.length) {
      statsHtml = `<div style="margin-bottom:8px;">
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--text-dim);margin-bottom:4px;">Stats <span style="color:var(--accent);">${total}</span></div>
        ${entries.map(s=>`<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
          <div style="font-size:10px;color:var(--text-muted);width:52px;flex-shrink:0;">${s.n}</div>
          <div style="flex:1;height:3px;background:var(--surface2);">
            <div style="height:3px;width:${Math.min(s.v,100)}%;background:var(--accent);"></div>
          </div>
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:700;color:var(--text);width:20px;text-align:right;">${s.v}</div>
        </div>`).join('')}
      </div>`;
    }
  }

  // Weapon stats
  let wStatsHtml = '';
  if (isWeapon && stats?.stats) {
    const entries = WEAPON_STAT_HASHES.map(h=>({n:WEAPON_STAT_NAMES[h],v:stats.stats[h]?.value})).filter(s=>s.v!==undefined&&s.v>0);
    if (entries.length) {
      wStatsHtml = `<div style="margin-bottom:8px;">
        ${entries.map(s=>`<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
          <div style="font-size:10px;color:var(--text-muted);width:72px;flex-shrink:0;">${s.n}</div>
          <div style="flex:1;height:3px;background:var(--surface2);">
            <div style="height:3px;width:${Math.min(s.v,100)}%;background:var(--accent);"></div>
          </div>
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:700;color:var(--text);width:24px;text-align:right;">${s.v}</div>
        </div>`).join('')}
      </div>`;
    }
  }

  const markButtonsHtml = interactive ? `
    <div style="display:flex;justify-content:flex-end;gap:3px;margin-bottom:8px;">
      <button onclick="event.stopPropagation();toggleFavoriteFromTooltip('${iid}')" title="Favorite" style="width:26px;height:26px;display:flex;align-items:center;justify-content:center;background:${isFavorite(iid)?'var(--favorite)':'var(--surface2)'};border:1px solid var(--favorite);border-radius:4px;cursor:pointer;padding:0;">${favoriteIconInline(13, isFavorite(iid)?'#0a0c0f':'var(--favorite)')}</button>
      <button onclick="event.stopPropagation();toggleMarkFromTooltip('${iid}','fav')" title="Lock" style="width:26px;height:26px;display:flex;align-items:center;justify-content:center;background:var(--surface2);border:1px solid var(--fav);border-radius:4px;cursor:pointer;padding:0;">${lockSyncIconSvg(iid,14)}</button>
      <button onclick="event.stopPropagation();toggleMarkFromTooltip('${iid}','junk')" title="Junk" style="width:26px;height:26px;display:flex;align-items:center;justify-content:center;background:${getMark(iid)==='junk'?'var(--junk)':'var(--surface2)'};border:1px solid var(--junk);border-radius:4px;cursor:pointer;padding:0;">${markIconSvg('junk',13,getMark(iid)==='junk'?'#fff':'var(--junk)')}</button>
      <button onclick="event.stopPropagation();toggleMarkFromTooltip('${iid}','infuse')" title="Infuse" style="width:26px;height:26px;display:flex;align-items:center;justify-content:center;background:${getMark(iid)==='infuse'?'var(--infuse)':'var(--surface2)'};border:1px solid var(--infuse);border-radius:4px;cursor:pointer;padding:0;">${markIconSvg('infuse',13,getMark(iid)==='infuse'?'#0a0c0f':'var(--infuse)')}</button>
    </div>` : '';

  const tt = document.createElement('div');
  tt.style.cssText = `position:fixed;z-index:9999;background:#0e1015;border:1px solid ${rarityColor};padding:0;max-width:280px;min-width:220px;pointer-events:${interactive?'auto':'none'};font-family:'Barlow',sans-serif;box-shadow:0 8px 32px rgba(0,0,0,0.7);`;
  tt.innerHTML = `
    <div style="height:4px;background:${rarityColor};"></div>
    <div style="padding:10px 12px;">
      ${markButtonsHtml}
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;">
        ${iconPath?`<div style="position:relative;width:56px;height:56px;flex-shrink:0;background:var(--surface2);${mw?'outline:2px solid var(--exotic-col);outline-offset:-2px;':''}"><img src="${iconPath}" style="width:100%;height:100%;object-fit:cover;display:block;" />${tierPipsSvg(gearTierOf(iid),'lg')}${isCrafted(iid)?`<div style="position:absolute;bottom:2px;left:2px;line-height:0;">${craftedIconInline(13)}</div>`:''}</div>`:''}
        <div style="flex:1;min-width:0;">
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:15px;font-weight:700;color:var(--text);line-height:1.2;">${name}</div>
          <div style="font-size:10px;color:${rarityColor};margin-top:2px;text-transform:uppercase;letter-spacing:.06em;">${type}</div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:4px;">
            <div style="font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:700;color:var(--accent);">${power}</div>
            <div style="display:flex;align-items:center;line-height:0;">${locBadgeSvg(item)}</div>
            <span style="font-size:10px;color:var(--text-muted);">${item.loc||''}${item.equipped?' · Equipped':''}</span>
          </div>
        </div>
      </div>
      ${intrinsicHtml}
      ${perksHtml}
      ${statsHtml}
      ${wStatsHtml}
      ${flavorText?`<div style="font-size:10px;color:var(--text-dim);font-style:italic;border-top:1px solid rgba(255,255,255,0.06);padding-top:6px;margin-top:6px;">"${flavorText}"</div>`:''}
    </div>`;

  document.body.appendChild(tt);
  hoverTooltip = tt;

  const ttW = 280, ttH = 400;
  const x = Math.min(event.clientX + 14, window.innerWidth - ttW - 10);
  const y = Math.min(event.clientY + 14, window.innerHeight - ttH - 10);
  tt.style.left = x+'px';
  tt.style.top  = y+'px';
}

// ===================== INIT =====================
(async function init() {
  buildDamageIconMap();
  updateOAuthStatus();
  initThemePicker();
  applyTheme(currentTheme, currentAccent);
  // Handle OAuth callback redirect - auto-load profile after login
  if (window.location.search.includes('code=')) {
    const ok = await handleOAuthCallback();
    if (ok) searchPlayer();
  } else if (isOAuthValid()) {
    // Already logged in - auto-load guardian
    searchPlayer();
  } else {
    // Try token refresh
    const refreshed = await refreshOAuthToken();
    if (refreshed) { updateOAuthStatus(); searchPlayer(); }
  }
})();

// ===================== KEYBOARD =====================
document.addEventListener('keydown', e=>{ if (e.key==='Escape') { closeCompare(); clearHoverTimer(); } });
document.addEventListener('click', ()=>{ if (suppressNextDocClick) { suppressNextDocClick=false; return; } clearHoverTimer(); });
document.getElementById('previewId')?.addEventListener('keydown', e=>{ if(e.key==='Enter') previewPlayer(); });
document.getElementById('compareOverlay').addEventListener('click',e=>{ if(e.target===e.currentTarget) closeCompare(); });

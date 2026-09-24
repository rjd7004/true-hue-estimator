/* ============================================================
   True Hue Estimate Builder — common.js
   Loaded by every page (index.html, residential.html,
   commercial.html). Holds everything that isn't specific to one
   calculator: config, the shared page shell (lock screen, header +
   nav, icons, print area), dates, paint-color lookup, theme, lock,
   navigation, project numbers, printing, and service worker setup.
   Page files load this FIRST, then their own calculator script.
   ============================================================ */

// Links from before v7.2 (everything in one file) looked like
// index.html#/residential/interior — send those to the new page.
function redirectOldLinks(){
  const m = /^#\/(residential|commercial)\/(interior|exterior)\/?$/.exec(location.hash);
  if (m && (document.body.dataset.category || 'home') === 'home'){
    location.replace(`${m[1]}.html#${m[2]}`);
    return true;
  }
  return false;
}
redirectOldLinks();

/* ============================================================
   SHARED PAGE SHELL — the same on every page, so it lives here
   once instead of being copied into each HTML file.
   ============================================================ */
function renderShell(){
  document.body.insertAdjacentHTML('afterbegin', `<div id="lockScreen" class="lock-screen">
  <div class="lock-card">
    <img id="lockLogo" src="logo-light.svg" alt="True Hue Painting Co." style="height:32px; margin-bottom:14px;">
    <h2>Enter password</h2>
    <p>This tool is for internal use only.</p>
    <input type="password" id="lockPasswordInput" placeholder="Password" autocomplete="off">
    <button type="button" class="primary block" onclick="checkLockPassword()">Unlock</button>
    <p id="lockError" class="lock-error" style="display:none;">Incorrect password — try again.</p>
  </div>
</div>`);
  document.getElementById('siteHeader').outerHTML = `  <!-- Job-type icons, defined once and reused on the home tiles and the
       not-built-yet pages. Outline = building type (pitched roof house vs.
       flat-roof building); roller inside = interior, sun outside = exterior.
       The colored part picks up --type-color from whatever it sits in. -->
  <svg width="0" height="0" style="position:absolute" aria-hidden="true">
    <defs>
      <symbol id="ico-res-int" viewBox="0 0 48 48">
        <g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 22 L24 7 L43 22"/>
          <path d="M10 19 V41 H38 V19"/>
          <rect x="15" y="23" width="15" height="6" rx="2" style="fill:var(--type-color)"/>
          <path d="M30 26 H33 V32 H23 V37"/>
        </g>
      </symbol>
      <symbol id="ico-res-ext" viewBox="0 0 48 48">
        <g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="39" cy="9" r="3.6" style="fill:var(--type-color)"/>
          <path d="M45.2 9.0 L47.6 9.0 M43.4 13.4 L45.1 15.1 M39.0 15.2 L39.0 17.6 M34.6 13.4 L32.9 15.1 M32.8 9.0 L30.4 9.0 M34.6 4.6 L32.9 2.9 M39.0 2.8 L39.0 0.4 M43.4 4.6 L45.1 2.9" stroke-width="2"/>
          <path d="M3 27 L20 13 L37 27"/>
          <path d="M7 24 V42 H33 V24"/>
          <path d="M17 42 V34 H23 V42"/>
        </g>
      </symbol>
      <symbol id="ico-com-int" viewBox="0 0 48 48">
        <g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 42 V8 H40 V42"/>
          <path d="M4 42 H44"/>
          <path d="M8 14 H40"/>
          <rect x="15" y="21" width="15" height="6" rx="2" style="fill:var(--type-color)"/>
          <path d="M30 24 H33 V30 H23 V36"/>
        </g>
      </symbol>
      <symbol id="ico-com-ext" viewBox="0 0 48 48">
        <g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="39" cy="9" r="3.6" style="fill:var(--type-color)"/>
          <path d="M45.2 9.0 L47.6 9.0 M43.4 13.4 L45.1 15.1 M39.0 15.2 L39.0 17.6 M34.6 13.4 L32.9 15.1 M32.8 9.0 L30.4 9.0 M34.6 4.6 L32.9 2.9 M39.0 2.8 L39.0 0.4 M43.4 4.6 L45.1 2.9" stroke-width="2"/>
          <path d="M5 42 V13 H31 V42"/>
          <path d="M3 42 H45"/>
          <rect x="10" y="18" width="5" height="4" rx="0.5" stroke-width="2"/>
          <rect x="21" y="18" width="5" height="4" rx="0.5" stroke-width="2"/>
          <rect x="10" y="26" width="5" height="4" rx="0.5" stroke-width="2"/>
          <rect x="21" y="26" width="5" height="4" rx="0.5" stroke-width="2"/>
          <path d="M15.5 42 V35 H20.5 V42"/>
        </g>
      </symbol>
      <symbol id="ico-chevron" viewBox="0 0 12 12">
        <path d="M2.5 4.5 L6 8 L9.5 4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </symbol>
    </defs>
  </svg>

  <header class="brand">
    <a class="brand-lockup" href="index.html" aria-label="True Hue Painting Co. — home">
      <img id="headerLogo" src="logo-light.svg" alt="True Hue Painting Co." class="brand-mark">
    </a>

    <nav class="main-nav" aria-label="Estimate types">
      <div class="nav-item">
        <a class="nav-tab" href="index.html" data-nav-group="home">Home</a>
      </div>
      <div class="nav-item nav-dropdown">
        <button type="button" class="nav-tab" data-nav-group="residential" aria-expanded="false" aria-controls="menu-residential" onclick="toggleNavMenu(this)">
          Residential <svg class="nav-chevron" aria-hidden="true"><use href="#ico-chevron"/></svg>
        </button>
        <div class="nav-menu" id="menu-residential" hidden>
          <a href="residential.html#interior" class="t-res-int" data-page-link="residential-interior"><span class="type-bar"></span>Interior</a>
          <a href="residential.html#exterior" class="t-res-ext" data-page-link="residential-exterior"><span class="type-bar"></span>Exterior</a>
        </div>
      </div>
      <div class="nav-item nav-dropdown">
        <button type="button" class="nav-tab" data-nav-group="commercial" aria-expanded="false" aria-controls="menu-commercial" onclick="toggleNavMenu(this)">
          Commercial <svg class="nav-chevron" aria-hidden="true"><use href="#ico-chevron"/></svg>
        </button>
        <div class="nav-menu align-right" id="menu-commercial" hidden>
          <a href="commercial.html#interior" class="t-com-int" data-page-link="commercial-interior"><span class="type-bar"></span>Interior</a>
          <a href="commercial.html#exterior" class="t-com-ext" data-page-link="commercial-exterior"><span class="type-bar"></span>Exterior</a>
        </div>
      </div>
    </nav>

    <div class="header-tools">
      <span class="version-label" id="versionLabel"></span>
      <a class="header-link" id="settingsLink" href="settings.html" aria-label="Settings"><span aria-hidden="true">⚙</span><span class="header-link-text">Settings</span></a>
      <button type="button" class="small theme-toggle" id="themeToggleBtn" onclick="toggleTheme()">🌙 Dark mode</button>
    </div>
  </header>
  <div class="brand-stripe" aria-hidden="true">
    <span style="background:var(--brand-red)"></span>
    <span style="background:var(--brand-orange)"></span>
    <span style="background:var(--brand-yellow)"></span>
    <span style="background:var(--brand-green)"></span>
    <span style="background:var(--brand-blue)"></span>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', `<!-- Hidden printable view, built at print time -->
<div id="printArea"></div>

<!-- Tap a color swatch to see it bigger; tap anywhere here to close -->
<div id="colorZoomOverlay" class="color-zoom-overlay hidden" onclick="closeColorZoom()">
  <div class="color-zoom-box" id="colorZoomBox"></div>
  <div class="color-zoom-label" id="colorZoomLabel"></div>
</div>`);
}

/* ============================================================
   CONFIG — quick brand edits
   ============================================================ */
const CONFIG = {
  businessName: "True Hue Painting Co.",
  website: "truehuepaintingco.com",
  phone: "(402) 202-6216",
  instagram: "truehuepaintingco",
  version: "7.5",
  // Name + mailing address printed on the Notice of Cancellation (where a
  // customer sends it to cancel). Keep in sync with the Services Agreement.
  noticeName: "True Hue Painting Co.",
  noticeAddress: "109 S Canopy St #637, Lincoln, NE 68508",
  // Which calculators print the 3-day cancellation notice on the customer copy
  // (FTC Cooling-Off Rule). Commercial customers generally aren't covered.
  cancellationNotice: { residential: true, commercial: false },
};

const fmt = n => n.toLocaleString('en-US', {style:'currency', currency:'USD'});
const $ = id => document.getElementById(id);
const val = (id, fallback=0) => {
  const v = parseFloat($(id).value);
  return isNaN(v) ? fallback : v;
};

// Estimator instances by page key, filled in by createEstimator() near the
// bottom. Declared up here (not down there) so the router and the global
// listeners can reference it at any point during startup without a
// "used before declared" error — same class of bug as gotcha #6.
const ESTIMATORS = {};

/* ============================================================
   DATES — always read/write the date input as a LOCAL calendar
   date. new Date('2026-09-22') and toISOString() both use UTC,
   which in Nebraska shifts the date by a day in the evening.
   ============================================================ */
function todayISO(){
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function parseLocalDate(iso){
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date();
}
function formatLongDate(d){
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/* ---------- Business days for the 3-day cancellation deadline ----------
   The FTC Cooling-Off Rule counts every day except Sundays and federal
   holidays. We skip both the actual holiday and its observed weekday (e.g. a
   Saturday July 4 also skips Friday July 3) — erring toward giving the
   customer an extra day, never one too few. */
function federalHolidayKeys(year){
  const key = d => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const nth = (month, weekday, n) => {          // n-th weekday of a month (n = -1: last)
    if (n > 0){
      const d = new Date(year, month, 1);
      d.setDate(1 + ((weekday - d.getDay() + 7) % 7) + (n - 1) * 7);
      return d;
    }
    const d = new Date(year, month + 1, 0);     // last day of the month
    d.setDate(d.getDate() - ((d.getDay() - weekday + 7) % 7));
    return d;
  };
  const days = [
    nth(0, 1, 3),   // Martin Luther King Jr. Day
    nth(1, 1, 3),   // Washington's Birthday
    nth(4, 1, -1),  // Memorial Day
    nth(8, 1, 1),   // Labor Day
    nth(9, 1, 2),   // Columbus Day
    nth(10, 4, 4),  // Thanksgiving
  ];
  // Fixed-date holidays, plus their observed day when they land on a weekend.
  [[0,1], [5,19], [6,4], [10,11], [11,25]].forEach(([m, dd]) => {
    const d = new Date(year, m, dd);
    days.push(d);
    if (d.getDay() === 6) days.push(new Date(year, m, dd - 1));
    if (d.getDay() === 0) days.push(new Date(year, m, dd + 1));
  });
  return new Set(days.map(key));
}
function isFederalHoliday(d){
  // Check this year and next (a Saturday New Year's is observed on Dec 31).
  const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  return federalHolidayKeys(d.getFullYear()).has(key) || federalHolidayKeys(d.getFullYear() + 1).has(key);
}
// Midnight of the third business day AFTER the transaction date.
function cancellationDeadline(transactionDate){
  const d = new Date(transactionDate.getFullYear(), transactionDate.getMonth(), transactionDate.getDate());
  let counted = 0;
  while (counted < 3){
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && !isFederalHoliday(d)) counted++;
  }
  return d;
}

/* ============================================================
   SETTINGS — defaults for new estimates, editable on settings.html
   (v7.5). Saved per device in localStorage under SETTINGS_KEY, and
   shared between phones by exporting/importing a settings file.
   Anything missing or invalid falls back to BUILTIN_SETTINGS, so an
   untouched device behaves exactly like v7.4.
   Settings only feed NEW estimates (page load with no draft, or
   "Start new estimate"); a restored draft or loaded file keeps its own
   numbers.
   ============================================================ */
const SETTINGS_KEY = 'thpc_settings';
const SETTINGS_FILE_TYPE = 'true-hue-settings';

// The Commercial rate fields per page — shared by commercial.js (the Rates
// card) and settings.js (the default rates), so labels live in one place.
const COMMERCIAL_RATE_FIELDS = {
  'commercial-interior': [
    { key: 'walls',     label: 'Walls ($ / sq ft)' },
    { key: 'ceiling',   label: 'Ceilings ($ / sq ft)' },
    { key: 'door',      label: 'Doors ($ / door)' },
    { key: 'trim',      label: 'Trim ($ / linear ft)' },
    { key: 'baseboard', label: 'Baseboard ($ / linear ft)' },
  ],
  'commercial-exterior': [
    { key: 'walls',  label: 'Walls ($ / sq ft)' },
    { key: 'door',   label: 'Doors ($ / door)' },
    { key: 'window', label: 'Windows ($ / window)' },
  ],
};

const DEFAULT_NOTES = `1. Change Orders: This estimate covers only the exact scope of work listed above. Any additional work requested by the client, or necessary repairs discovered after commencement (e.g., hidden drywall water damage), will require a written and signed Change Order specifying the additional cost before work continues.

2. Site Preparation: The client is responsible for removing fragile items and electronics from the work area prior to our arrival.

3. Lead-Based Paint: If the property was built prior to 1978 and lead-based paint is discovered, work will be paused, and the estimate will be revised to reflect necessary EPA RRP compliance procedures.`;

// A fresh copy every call, so callers can edit it freely.
function builtinSettings(){
  const commercialRates = {};
  Object.entries(COMMERCIAL_RATE_FIELDS).forEach(([page, fields]) => {
    commercialRates[page] = Object.fromEntries(fields.map(f => [f.key, 0]));
  });
  return {
    crew: [
      { name: 'Employee 1', rate: 20, prod: 90 },
      { name: 'Employee 2', rate: 20, prod: 90 },
    ],
    newEmployee: { rate: 20, prod: 90 },   // "+ Add employee" on an estimate
    employeeBurden: 15,
    markupPct: 30,                         // Residential only
    ccSurchargePct: 2.6,
    minJobCharge: 300,
    validDays: 10,
    notes: DEFAULT_NOTES,
    commercialRates,
  };
}

// Takes anything (saved JSON, an imported file, the settings form) and
// returns a complete, valid settings object — bad or missing values fall
// back to the built-in ones.
function normalizeSettings(raw){
  const out = builtinSettings();
  if (!raw || typeof raw !== 'object') return out;
  const num = (v, fallback) => {
    const n = typeof v === 'number' ? v : parseFloat(v);
    return (isFinite(n) && n >= 0) ? n : fallback;
  };
  ['employeeBurden', 'markupPct', 'ccSurchargePct', 'minJobCharge', 'validDays']
    .forEach(k => { out[k] = num(raw[k], out[k]); });
  if (typeof raw.notes === 'string') out.notes = raw.notes;
  if (raw.newEmployee && typeof raw.newEmployee === 'object'){
    out.newEmployee = {
      rate: num(raw.newEmployee.rate, out.newEmployee.rate),
      prod: num(raw.newEmployee.prod, out.newEmployee.prod),
    };
  }
  if (Array.isArray(raw.crew) && raw.crew.length){
    out.crew = raw.crew.slice(0, 25).map((c, i) => ({
      name: String((c && c.name) ?? '').trim().slice(0, 60) || `Employee ${i + 1}`,
      rate: num(c && c.rate, out.newEmployee.rate),
      prod: num(c && c.prod, out.newEmployee.prod),
    }));
  }
  Object.entries(COMMERCIAL_RATE_FIELDS).forEach(([page, fields]) => {
    const saved = raw.commercialRates && raw.commercialRates[page];
    fields.forEach(f => { out.commercialRates[page][f.key] = num(saved && saved[f.key], 0); });
  });
  return out;
}

function getSettings(){
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null'); } catch (e) { /* ignore */ }
  return normalizeSettings(raw);
}
function hasCustomSettings(){
  try { return localStorage.getItem(SETTINGS_KEY) !== null; } catch (e) { return false; }
}
// Returns true if it stuck (storage can be full or blocked).
function saveSettings(settings){
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalizeSettings(settings)));
    return true;
  } catch (e){ return false; }
}
function clearSettings(){
  try { localStorage.removeItem(SETTINGS_KEY); } catch (e) { /* ignore */ }
}

// The starting value of every default-driven field on one estimate page,
// by data-f name, as the strings an <input> holds.
function estimateDefaults(key){
  const s = getSettings();
  const d = {
    validDays: String(s.validDays),
    markupPct: String(s.markupPct),
    employeeBurden: String(s.employeeBurden),
    ccSurchargePct: String(s.ccSurchargePct),
    minJobCharge: String(s.minJobCharge),
    notes: s.notes,
  };
  Object.entries(s.commercialRates[key] || {}).forEach(([k, v]) => { d[`rate-${k}`] = String(v); });
  return d;
}

// Safe text for HTML attributes and element content.
function escapeHtml(str){
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

renderShell(); // header, nav, lock screen, icons, print area — before anything below looks them up
$('versionLabel').textContent = 'v' + CONFIG.version;

/* ============================================================
   SHERWIN-WILLIAMS COLOR LOOKUP
   Loaded once from sw-colors.json (cached offline by the service
   worker like everything else). Matching is deliberately simple:
   a hex code always works with no lookup needed; an SW color
   number is matched against the loaded list. No name matching.
   ============================================================ */
let SW_COLOR_MAP = new Map(); // "7008" -> {code:"SW7008", name:"Alabaster", hex:"EDEAE0"}

fetch('./sw-colors.json')
  .then(r => r.json())
  .then(data => {
    data.forEach(c => {
      const digits = c.code.replace(/^SW/i, '');
      SW_COLOR_MAP.set(digits, c);
    });
    // Re-check any colors already typed before this finished loading
    document.querySelectorAll('.p-color-input').forEach(updateColorSwatch);
    recalcAll();
  })
  .catch(() => { /* offline on first-ever load — hex codes still work fine without this */ });

function resolveColor(rawInput){
  const input = (rawInput || '').trim();
  if (!input) return null;

  const hexMatch = input.match(/^#?([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/);
  if (hexMatch){
    let hex = hexMatch[1];
    if (hex.length === 3) hex = hex.split('').map(ch => ch + ch).join('');
    return { hex: '#' + hex.toUpperCase(), name: null, code: null };
  }

  const codeMatch = input.match(/^sw\s*-?\s*(\d{1,4})$/i) || input.match(/^(\d{1,4})$/);
  if (codeMatch){
    const digits = codeMatch[1].padStart(4, '0');
    const found = SW_COLOR_MAP.get(digits);
    if (found) return { hex: '#' + found.hex, name: found.name, code: found.code };
  }

  return null; // typed something, but it didn't resolve
}

// Accumulates a product's exact (unrounded) gallon need into the shared
// materials map, grouped by product name + resolved color + finish, so
// the same color in two different finishes (e.g. Gloss vs Matte) stays
// separate, while genuinely identical picks combine before rounding.
function addToMaterials(materialsMap, name, colorResult, finish, exactGal){
  if (exactGal <= 0) return;
  const colorKey = colorResult ? colorResult.hex : 'no-color';
  const finishKey = (finish || '').trim().toLowerCase();
  const key = `${name.trim().toLowerCase()}::${colorKey}::${finishKey}`;
  const colorLabel = colorResult ? (colorResult.code ? `${colorResult.code} ${colorResult.name}` : colorResult.hex) : '';
  if (!materialsMap.has(key)){
    materialsMap.set(key, { name, colorLabel, hex: colorResult ? colorResult.hex : '', finish: finish || '', exactGallons: 0 });
  }
  materialsMap.get(key).exactGallons += exactGal;
}

// Shared markup for one row in a Materials list — used by both the live
// summary panel and the internal print copy, so they always match.
function buildMaterialsHtml(materials){
  return materials.map(m => {
    const descriptor = m.colorLabel && m.finish ? `${m.colorLabel}, ${m.finish}` : (m.colorLabel || m.finish);
    const swatch = m.hex ? `<div class="material-swatch" style="background:${m.hex};"></div>` : '';
    return `<div class="material-row">${swatch}<div class="material-name">${m.name}${descriptor ? ' — ' + descriptor : ''}</div><div class="material-amount">${m.gallons} gal</div></div>`;
  }).join('');
}

function updateColorSwatch(inputEl){
  const row = inputEl.closest('.product-color-row');
  const swatch = row.querySelector('.color-swatch');
  const label = row.querySelector('.color-match-label');
  const result = resolveColor(inputEl.value);
  if (result){
    swatch.style.display = 'block';
    swatch.style.background = result.hex;
    label.textContent = result.code ? `${result.code} — ${result.name}` : result.hex;
    label.className = 'color-match-label found';
  } else if (inputEl.value.trim()){
    swatch.style.display = 'none';
    label.textContent = 'Not found';
    label.className = 'color-match-label not-found';
  } else {
    swatch.style.display = 'none';
    label.textContent = '';
    label.className = 'color-match-label';
  }
}

function openColorZoom(swatchEl){
  const bg = swatchEl.style.background;
  if (!bg) return;
  const label = swatchEl.parentElement.querySelector('.color-match-label')?.textContent || '';
  $('colorZoomBox').style.background = bg;
  $('colorZoomLabel').textContent = label;
  $('colorZoomOverlay').classList.remove('hidden');
}

function closeColorZoom(){
  $('colorZoomOverlay').classList.add('hidden');
}

/* ============================================================
   PASSWORD LOCK — client-side only. This deters someone from
   stumbling onto the page and understanding what it is; it is
   NOT real security, since the hash below is visible to anyone
   who reads the page source. Don't rely on this to protect
   anything sensitive.

   Uses a plain-JS hash (not the Web Crypto API) deliberately —
   crypto.subtle is unreliable when this file is opened directly
   (file://) rather than through a real hosted page, which broke
   unlocking entirely the first time around. This has no such
   restriction, so it works identically whether hosted on GitHub
   Pages or opened straight from the folder on your Mac.
   ============================================================ */
const LOCK_HASH = '71bfd910';
const LOCK_STORAGE_KEY = 'thpc_estimator_unlocked';

function simpleHash(text){
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++){
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function showApp(){
  $('lockScreen').classList.add('hidden');
  $('appWrap').style.display = 'block';
}

function checkLockPassword(){
  const input = $('lockPasswordInput').value;
  const hash = simpleHash(input);
  if (hash === LOCK_HASH){
    try { localStorage.setItem(LOCK_STORAGE_KEY, '1'); } catch (e) { /* ignore if storage is unavailable */ }
    showApp();
  } else {
    $('lockError').style.display = 'block';
    $('lockPasswordInput').value = '';
    $('lockPasswordInput').focus();
  }
}

/* ============================================================
   THEME — light mode by default; dark mode is opt-in and
   remembered per device. Never affects print output (handled
   separately in CSS via the [data-theme="dark"] #printArea reset).
   ============================================================ */
const THEME_STORAGE_KEY = 'thpc_theme';

function applyTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
  const isDark = theme === 'dark';
  $('themeToggleBtn').textContent = isDark ? '☀️ Light mode' : '🌙 Dark mode';
  const logoSrc = isDark ? 'logo-dark.svg' : 'logo-light.svg';
  $('headerLogo').src = logoSrc;
  $('lockLogo').src = logoSrc;
  try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch (e) { /* ignore */ }
}

function toggleTheme(){
  const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

(function initTheme(){
  let saved = 'light';
  try { saved = localStorage.getItem(THEME_STORAGE_KEY) || 'light'; } catch (e) { /* ignore */ }
  applyTheme(saved);
})();

(function initLock(){
  let alreadyUnlocked = false;
  try { alreadyUnlocked = localStorage.getItem(LOCK_STORAGE_KEY) === '1'; } catch (e) { /* ignore */ }
  if (alreadyUnlocked){
    showApp();
  } else {
    $('lockPasswordInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') checkLockPassword();
    });
    $('lockPasswordInput').focus();
  }
})();

// If this page load is the print tab opened by printViaNewTab() (see the
// iOS standalone print workaround), pick up the stashed print content and
// fire the print dialog automatically. Runs after the lock check above,
// since it's this same device and localStorage already marks it unlocked.
(function checkAutoPrint(){
  const params = new URLSearchParams(location.search);
  if (params.get('autoprint') !== '1') return;
  let pending = null;
  try { pending = localStorage.getItem('pendingPrintHtml'); } catch (e) { /* ignore */ }
  if (!pending) return;
  try { localStorage.removeItem('pendingPrintHtml'); } catch (e) { /* ignore */ }
  history.replaceState({}, '', location.pathname); // drop ?autoprint=1 so a refresh doesn't repeat this
  $('printArea').innerHTML = pending;
  $('printArea').classList.add('visible');
  setTimeout(() => window.print(), 400);
})();

/* ============================================================
   PAGES & NAVIGATION — the app is four files:
     index.html        Home
     residential.html  Residential interior + exterior  (#interior / #exterior)
     commercial.html   Commercial interior + exterior   (#interior / #exterior)
     settings.html     Settings (defaults for new estimates; v7.5)
   Each file has one <section class="page" data-page="..."> per page
   it holds, and the hash picks which one shows. <body data-category>
   says which file this is. Links between files are ordinary links.
   ============================================================ */
const PAGES = {
  'home':                 { title: 'Home',                 group: 'home',        file: 'index.html',       hash: '' },
  'residential-interior': { title: 'Residential interior', group: 'residential', file: 'residential.html', hash: 'interior', color: 'var(--brand-blue)' },
  'residential-exterior': { title: 'Residential exterior', group: 'residential', file: 'residential.html', hash: 'exterior', color: 'var(--brand-green)' },
  'commercial-interior':  { title: 'Commercial interior',  group: 'commercial',  file: 'commercial.html',  hash: 'interior', color: 'var(--brand-orange)' },
  'commercial-exterior':  { title: 'Commercial exterior',  group: 'commercial',  file: 'commercial.html',  hash: 'exterior', color: 'var(--brand-red)' },
  'settings':             { title: 'Settings',             group: 'settings',    file: 'settings.html',    hash: '' },
};
const CURRENT_CATEGORY = document.body.dataset.category || 'home';
// Home's active-tab underline is the full five-color stripe.
const HOME_TAB_COLOR = 'linear-gradient(90deg, var(--brand-red) 0 20%, var(--brand-orange) 20% 40%, var(--brand-yellow) 40% 60%, var(--brand-green) 60% 80%, var(--brand-blue) 80% 100%)';

// Which page of THIS file to show. No/unknown hash = the file's first page.
function pageFromHash(){
  if (CURRENT_CATEGORY === 'home' || CURRENT_CATEGORY === 'settings') return CURRENT_CATEGORY;
  const h = location.hash.replace(/^#\/?/, '').replace(/\/+$/, '');
  const key = `${CURRENT_CATEGORY}-${h}`;
  return PAGES[key] ? key : `${CURRENT_CATEGORY}-interior`;
}

function showPage(key, isNavigation){
  const page = PAGES[key];
  document.querySelectorAll('.page').forEach(sec => sec.classList.toggle('active', sec.dataset.page === key));

  document.querySelectorAll('.main-nav .nav-tab').forEach(tab => {
    const isActive = tab.dataset.navGroup === page.group;
    tab.classList.toggle('active', isActive);
    tab.style.setProperty('--tab-color', key === 'home' ? HOME_TAB_COLOR : (page.color || 'var(--accent)'));
  });
  document.querySelectorAll('[data-page-link]').forEach(a => {
    if (a.dataset.pageLink === key) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  const homeTab = document.querySelector('.nav-tab[data-nav-group="home"]');
  if (key === 'home') homeTab.setAttribute('aria-current', 'page'); else homeTab.removeAttribute('aria-current');
  const settingsLink = $('settingsLink');
  if (key === 'settings') settingsLink.setAttribute('aria-current', 'page'); else settingsLink.removeAttribute('aria-current');

  document.title = key === 'home' ? 'True Hue Estimates' : `${page.title} — True Hue Estimates`;
  closeNavMenus();

  if (isNavigation){
    flushAllDrafts();                           // so the home tiles' draft notes are current
    $('printArea').classList.remove('visible'); // a preview belongs to the page it was built on
    window.scrollTo(0, 0);
  }
  if (key === 'home') refreshHomeStatus();
}

function toggleNavMenu(btn){
  const wasOpen = btn.getAttribute('aria-expanded') === 'true';
  closeNavMenus();
  if (!wasOpen){
    btn.setAttribute('aria-expanded', 'true');
    $(btn.getAttribute('aria-controls')).hidden = false;
  }
}

function closeNavMenus(){
  document.querySelectorAll('.main-nav [aria-expanded="true"]').forEach(btn => {
    btn.setAttribute('aria-expanded', 'false');
    $(btn.getAttribute('aria-controls')).hidden = true;
  });
}

// Home tiles for built pages: note an in-progress draft if that page's
// autosaved draft has a client name on it; otherwise just "Ready".
function refreshHomeStatus(){
  document.querySelectorAll('[data-draft-status-for]').forEach(el => {
    let draft = null;
    try { draft = JSON.parse(localStorage.getItem('thpc_draft_' + el.dataset.draftStatusFor) || 'null'); } catch (e) { /* ignore */ }
    const name = draft && draft.client && (draft.client.name || '').trim();
    el.textContent = name ? `Draft in progress: ${name}` : 'Ready';
  });
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.nav-dropdown')) closeNavMenus();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeNavMenus();
});
window.addEventListener('hashchange', () => { if (!redirectOldLinks()) showPage(pageFromHash(), true); });
showPage(pageFromHash(), false);

// Project number — timestamp-based so it never collides across devices
// (your phone and your Mac each have their own separate storage, so a
// simple counter would risk duplicate numbers between them). Each call
// is at least one second after the last, so two estimators starting in
// the same second (Interior + Exterior on page load) never share a number.
let lastProjectNumberTime = 0;
function generateProjectNumber(){
  const t = Math.max(Date.now(), lastProjectNumberTime + 1000);
  lastProjectNumberTime = t;
  const d = new Date(t);
  const pad = n => String(n).padStart(2, '0');
  const datePart = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
  const timePart = `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `THPC-${datePart}-${timePart}`;
}

/* ============================================================
   COLLAPSIBLE SECTIONS
   ============================================================ */
function toggleCard(headerEl){
  headerEl.closest('.card').classList.toggle('collapsed');
}

/* ============================================================
   ESTIMATOR HELPERS — shared by every calculator script.
   ============================================================ */
// Finds the estimator instance an element belongs to — used by the
// inline onclick handlers in the estimator markup: EST(this).addRoom()
// (Instances register themselves in ESTIMATORS from the calculator scripts.)
function EST(el){
  const host = el && el.closest ? el.closest('[data-estimator]') : null;
  return host ? ESTIMATORS[host.dataset.estimator] : null;
}
function recalcAll(){ Object.values(ESTIMATORS).forEach(inst => inst.recalc()); }
function flushAllDrafts(){ Object.values(ESTIMATORS).forEach(inst => inst.flushDraft()); }

/* ============================================================
   CALCULATOR BUILDING BLOCKS — everything the Residential and
   Commercial calculators have in common, in one place:
   shared form cards, product + employee rows, labor, the minimum
   charge / deposit / card-surcharge rules, the live-summary money
   blocks, the whole print layout, autosave, and save/load.
   Each calculator script (residential.js, commercial.js) keeps
   only its own areas, rates, and math, and builds from these.
   Change a business rule here and both calculators follow.
   ============================================================ */

/* ---------- Shared form cards ---------- */
function clientCardHtml(){
  const S = getSettings();
  return `
      <div class="card">
        <div class="card-header" onclick="toggleCard(this)">
          <h2>Client &amp; job info</h2>
          <span class="chevron">⌄</span>
        </div>
        <div class="card-body">
          <p class="sub">Shows up on the printed estimate header.</p>
          <div class="field" style="margin-bottom:12px;">
            <label>Project #</label>
            <div style="display:flex; gap:8px;">
              <input type="text" data-f="projectNumber" style="flex:1;">
              <button type="button" class="small" onclick="EST(this).newProjectNumber()">New #</button>
            </div>
            <svg data-f="projectBarcode" class="barcode-hidden"></svg>
          </div>
          <div class="grid cols-2">
            <div class="field"><label>Client name</label><input type="text" data-f="clientName" placeholder="Jordan Smith"></div>
            <div class="field"><label>Job address</label><input type="text" data-f="jobAddress" placeholder="123 Elm St, Lincoln, NE"></div>
            <div class="field"><label>Phone</label><input type="tel" data-f="clientPhone" placeholder="(402) 555-0100"></div>
            <div class="field"><label>Email</label><input type="email" data-f="clientEmail" placeholder="jordan@email.com"></div>
            <div class="field"><label>Estimate date</label><input type="date" data-f="estDate"></div>
            <div class="field"><label>Valid for (days)</label><input type="number" data-f="validDays" value="${S.validDays}" min="0"></div>
          </div>
        </div>
      </div>`;
}

function laborCardHtml(){
  const S = getSettings();
  return `
      <div class="card">
        <div class="card-header" onclick="toggleCard(this)">
          <h2>Labor</h2>
          <span class="chevron">⌄</span>
        </div>
        <div class="card-body">
          <p class="sub">Only checked employees count toward the job — they're assumed to work the same hours together, so hours are based on their combined production rate and cost on their combined pay rate.</p>

          <div data-f="employeesList"></div>

          <div class="row-actions">
            <button type="button" class="small" onclick="EST(this).addEmployee()">+ Add employee</button>
          </div>

          <div class="room-section-label">Employee burden</div>
          <div class="field"><label>Employee burden (%)</label><input type="number" data-f="employeeBurden" value="${S.employeeBurden}" min="0" step="1"></div>
          <p class="hint">Added on top of pay rate to account for insurance and other per-employee costs — e.g. a $20/hr rate with a 15% burden costs $23/hr in the estimate. Pay rate above still shows what the employee actually earns.</p>
        </div>
      </div>`;
}

// withMarkup: Residential prices by cost + markup; Commercial prices by rate (no markup field).
function feesCardHtml({ withMarkup, minHint }){
  const S = getSettings();
  const markupAndCard = withMarkup ? `
          <div class="grid cols-2">
            <div class="field"><label>Markup / profit (%)</label><input type="number" data-f="markupPct" value="${S.markupPct}" min="0" step="1"></div>
            <div class="field"><label>Credit card surcharge (%)</label><input type="number" data-f="ccSurchargePct" value="${S.ccSurchargePct}" min="0" step="0.1"></div>
          </div>` : `
          <div class="grid cols-2">
            <div class="field"><label>Credit card surcharge (%)</label><input type="number" data-f="ccSurchargePct" value="${S.ccSurchargePct}" min="0" step="0.1"></div>
          </div>`;
  return `
      <div class="card">
        <div class="card-header" onclick="toggleCard(this)">
          <h2>${withMarkup ? 'Markup &amp; fees' : 'Fees'}</h2>
          <span class="chevron">⌄</span>
        </div>
        <div class="card-body">${markupAndCard}
          <p class="hint">Applied to the ${withMarkup ? 'rounded ' : ''}total on the customer's printed estimate, labeled as a Credit Card Processing Surcharge — separate from the Cash Price, which has no fee added.</p>
          <div class="field" style="margin-top:14px;"><label>Minimum job charge ($)</label><input type="number" data-f="minJobCharge" value="${S.minJobCharge}" min="0" step="10"></div>
          <p class="hint">${minHint}</p>
        </div>
      </div>`;
}

function notesCardHtml(){
  return `
      <div class="card">
        <div class="card-header" onclick="toggleCard(this)">
          <h2>Notes &amp; terms</h2>
          <span class="chevron">⌄</span>
        </div>
        <div class="card-body">
          <textarea data-f="notes" style="min-height:180px;">${escapeHtml(getSettings().notes)}</textarea>
        </div>
      </div>`;
}

// The whole two-column page: the calculator's own form cards on the left,
// the shared summary card on the right.
function calculatorLayoutHtml(formCardsHtml, totalLabel){
  return `
  <div class="layout">
    <div class="form-col">${formCardsHtml}
    </div>
    <div class="summary">
      <div class="card">
        <h2>Estimate summary</h2>
        <div data-f="summaryLines"></div>
        <div class="total-row">
          <span class="l">${totalLabel}</span>
          <span class="v" data-f="totalOut">$0.00</span>
        </div>
        <button type="button" class="primary block" style="margin-top:16px;" onclick="EST(this).previewEstimate()">Preview &amp; print estimate</button>
        <div style="display:flex; gap:8px; margin-top:8px;">
          <button type="button" style="flex:1;" onclick="EST(this).exportEstimate()">Save as file</button>
          <button type="button" style="flex:1;" onclick="EST(this).pickFile()">Load from file</button>
        </div>
        <input type="file" data-f="loadFileInput" accept=".json,application/json" style="display:none" onchange="EST(this).importEstimateFile(this)">
        <button type="button" class="block" style="margin-top:8px;" onclick="EST(this).resetForm()">Start new estimate</button>
      </div>
      <p class="hint" style="padding:0 4px;">Edit the rates on the left to match your real costs once you've priced a few actual jobs — everything recalculates instantly.</p>
      <p class="hint" style="padding:0 4px;">Your work autosaves on this device as you go, so closing the app or losing signal won't lose it. Use <strong>Save as file</strong> to keep a permanent copy or move an estimate to another device.</p>
      <p class="hint" data-f="draftStatus" style="padding:0 4px; margin-top:4px;"></p>
    </div>
  </div>
  `;
}

/* ---------- Product + employee rows ---------- */
// checks: [[className, label, checkedByDefault], ...]. One option (Walls only)
// means no "Apply to" row at all — the product simply covers the walls.
function applyRowHtml(checks){
  if (checks.length <= 1) return '';
  return `
        <div class="product-apply-row">
          <span class="product-apply-label">Apply to:</span>
          ${checks.map(([cls, label, on]) => `<label class="check"><input type="checkbox" class="${cls}"${on ? ' checked' : ''}> ${label}</label>`).join('\n          ')}
        </div>`;
}

function paintProductHtml(applyRow){
  return `
        <div class="product-top">
          <div class="field" style="max-width:170px;"><label>Product name</label><input type="text" class="p-name" value="Paint"></div>
          <div class="field"><label>Coverage (sq ft / gal)</label><input type="number" class="p-coverage" value="350" min="1"></div>
          <div class="field"><label>Price per gallon ($)</label><input type="number" class="p-price" value="35" min="0" step="0.5"></div>
          <div class="field"><label>Coats</label><input type="number" class="p-coats" value="2" min="1" step="1"></div>
          <button type="button" class="ghost" title="Remove product" onclick="EST(this).removeProduct(this)">✕</button>
        </div>${applyRow}
        <div class="product-color-row">
          <div class="field" style="max-width:220px;">
            <label>SW color # or hex</label>
            <input type="text" class="p-color-input" placeholder="e.g. SW7008 or #EDEAE0" oninput="updateColorSwatch(this)">
          </div>
          <div class="field" style="max-width:150px;">
            <label>Finish</label>
            <select class="p-finish-select">
              <option value="">Select one</option>
              <option value="Gloss">Gloss</option>
              <option value="Semi-Gloss">Semi-Gloss</option>
              <option value="Eg-Shel/Satin">Eg-Shel/Satin</option>
              <option value="Matte">Matte</option>
              <option value="Flat">Flat</option>
            </select>
          </div>
          <div class="color-swatch" style="display:none;" onclick="openColorZoom(this)"></div>
          <div class="color-match-label"></div>
        </div>
      `;
}

function supplyProductHtml(){
  return `
        <div class="product-top">
          <div class="field" style="max-width:220px;"><label>Item name</label><input type="text" class="p-name" value="Supplies"></div>
          <div class="field"><label>Flat cost ($)</label><input type="number" class="p-flatcost" value="0" min="0" step="0.5"></div>
          <button type="button" class="ghost" title="Remove product" onclick="EST(this).removeProduct(this)">✕</button>
        </div>
      `;
}

function employeeRowHtml(id, name, rate, prod){
  const NE = getSettings().newEmployee;
  return `
      <label class="check enabled-check">
        <input type="checkbox" class="e-enabled" checked onchange="this.closest('.employee').classList.toggle('disabled', !this.checked)">
      </label>
      <div class="field" style="max-width:170px;">
        <label>Name</label>
        <input type="text" class="e-name" value="${escapeHtml(name || 'Employee ' + id)}">
      </div>
      <div class="field"><label>Pay rate ($ / hour)</label><input type="number" class="e-rate" value="${rate ?? NE.rate}" min="0" step="0.5"></div>
      <div class="field"><label>Production rate (sq ft / hour)</label><input type="number" class="e-prod" value="${prod ?? NE.prod}" min="0" step="5"></div>
      <button type="button" class="ghost" title="Remove employee" onclick="EST(this).removeEmployee(${id})">✕</button>
    `;
}

// The crew every new estimate starts with (Settings → Crew).
function addStartingCrew(addEmployee){
  getSettings().crew.forEach(c => addEmployee(c.name, c.rate, c.prod));
}

/* ---------- Materials, labor, and pricing rules ---------- */
// One paint/primer product: which surfaces it covers, and its settings.
// A missing Walls box (walls-only pages) counts as checked; any other
// missing box counts as unchecked.
function readPaintProduct(p){
  const wallsBox = p.querySelector('.p-apply-walls');
  return {
    applyWalls:     wallsBox ? wallsBox.checked : true,
    applyCeiling:   !!p.querySelector('.p-apply-ceiling')?.checked,
    applyBaseboard: !!p.querySelector('.p-apply-baseboard')?.checked,
    applyTrim:      !!p.querySelector('.p-apply-trim')?.checked,
    coverage: parseFloat(p.querySelector('.p-coverage').value) || 350,
    price:    parseFloat(p.querySelector('.p-price').value) || 0,
    coats:    parseFloat(p.querySelector('.p-coats').value) || 1,
    colorResult: resolveColor(p.querySelector('.p-color-input')?.value),
    finish: p.querySelector('.p-finish-select')?.value || '',
  };
}

// Gallons for one product over an area: rounded up per product for
// PRICING/COST, while its exact need goes into the shared materials map
// (rounded once at the very end — see finalizeMaterials). Returns the
// summary line and the customer bullet. surfacesText null = don't name
// surfaces (single walls).
function paintProductLine(p, productName, area, surfacesText, materialsMap){
  const x = readPaintProduct(p);
  const gal = area > 0 ? Math.ceil((area * x.coats) / x.coverage) : 0;
  const cost = gal * x.price;
  const exactGal = area > 0 ? (area * x.coats) / x.coverage : 0;
  addToMaterials(materialsMap, productName, x.colorResult, x.finish, exactGal);
  const swatchHtml = x.colorResult ? `<span class="inline-swatch" style="background:${x.colorResult.hex}"></span>` : '';
  const colorLabel = x.colorResult ? (x.colorResult.code ? `${x.colorResult.code} ${x.colorResult.name}` : x.colorResult.hex) : '';
  const descriptor = colorLabel && x.finish ? `${colorLabel}, ${x.finish}` : (colorLabel || x.finish);
  const coatsText = `${x.coats} coat${x.coats === 1 ? '' : 's'}`;
  return {
    gal, cost, laborArea: area * x.coats,
    label: `${swatchHtml}${productName}${descriptor ? ' — ' + descriptor : ''} — ${area.toFixed(0)} sq ft${surfacesText !== null ? ` (${surfacesText})` : ''} × ${coatsText} ÷ ${x.coverage} sq ft/gal = ${gal} gal × ${fmt(x.price)}/gal`,
    bullet: `${swatchHtml}Applying ${coatsText} of ${productName}${descriptor ? ' (' + descriptor + ')' : ''}${surfacesText !== null ? ' to ' + surfacesText : ''}`,
  };
}

// Round each combined material's total need exactly once, at the very end —
// never per room — so two rooms sharing a paint aren't each rounded up.
function finalizeMaterials(materialsMap){
  return Array.from(materialsMap.values())
    .map(m => ({ name: m.name, colorLabel: m.colorLabel, hex: m.hex, finish: m.finish, gallons: Math.ceil(m.exactGallons) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Enabled employees are assumed to work the job together: their production
// rates add up (they split the area between them), and since they all work
// the same hours, their pay rates add up too for total cost per hour.
// Hours are billed whole, rounded up; burden is added on top of pay.
function laborFor(root, laborArea, burdenPct){
  let totalProdRate = 0, totalCrewRate = 0, activeEmployees = 0;
  root.querySelectorAll('.employee').forEach(emp => {
    if (!emp.querySelector('.e-enabled').checked) return;
    totalProdRate += parseFloat(emp.querySelector('.e-prod').value) || 0;
    totalCrewRate += parseFloat(emp.querySelector('.e-rate').value) || 0;
    activeEmployees++;
  });
  const laborHoursExact = (laborArea > 0 && totalProdRate > 0) ? laborArea / totalProdRate : 0;
  const laborHours = laborHoursExact > 0 ? Math.ceil(laborHoursExact) : 0;
  const burdenedCrewRate = totalCrewRate * (1 + burdenPct);
  const laborCost = laborHours * burdenedCrewRate;
  return { laborArea, totalProdRate, totalCrewRate, activeEmployees, burdenPct, burdenedCrewRate, laborHours, laborCost };
}

// Minimum job charge: top the priced total up to the minimum — only once
// there's actually priced work, so a blank form doesn't show the minimum.
function applyMinimumCharge(pricedSum, minJobChargeInput){
  const roomsSum = pricedSum;
  const minJobCharge = Math.max(0, minJobChargeInput);
  const minJobAdjustment = (roomsSum > 0 && roomsSum < minJobCharge) ? minJobCharge - roomsSum : 0;
  return { roomsSum, minJobCharge, minJobAdjustment, cashPrice: roomsSum + minJobAdjustment };
}

// Deposit: 30% or $300, whichever is greater — but never more than the job.
function depositFor(cashPrice){
  const amount = Math.min(cashPrice, Math.max(cashPrice * 0.30, 300));
  const isFullAmount = cashPrice > 0 && amount >= cashPrice;
  return {
    amount,
    note: isFullAmount
      ? 'For jobs of $300 or less, the full amount is due to secure your dates on our production schedule.'
      : 'A 30% deposit, or a minimum of $300 — whichever is greater — is required to secure your dates on our production schedule.',
  };
}

// The card surcharge is applied to the Cash Price (already rounded/final).
function cardPricing(cashPrice, surchargePctText){
  const pct = parseFloat(surchargePctText);
  const surchargeAmount = cashPrice * ((isNaN(pct) ? 2.6 : pct) / 100);
  return { surchargePctText, surchargeAmount, cardPrice: cashPrice + surchargeAmount };
}

/* ---------- Live summary + internal copy blocks ---------- */
function linesHtml(items){
  return items.map(item => `<div class="line"><span class="l">${item.label}</span><span class="v">${fmt(item.amount)}</span></div>`).join('');
}

function laborBlockHtml(L, burdenText){
  let html = `<div class="summary-room-name">Labor</div>`;
  if (L.activeEmployees > 0){
    html += `<div class="line"><span class="l">${L.activeEmployees} employee(s) combined: ${L.totalProdRate} sq ft/hr, ${fmt(L.totalCrewRate)}/hr pay + ${burdenText}% burden = ${fmt(L.burdenedCrewRate)}/hr</span><span class="v"></span></div>`;
  }
  html += `<div class="line"><span class="l">${L.laborArea.toFixed(0)} sq ft-coats ÷ ${L.totalProdRate || 0} sq ft/hr = ${L.laborHours} hr${L.laborHours === 1 ? '' : 's'} (rounded up) × ${fmt(L.burdenedCrewRate)}/hr</span><span class="v">${fmt(L.laborCost)}</span></div>`;
  return html;
}

// "Cash vs. credit card price" block for the live summary.
function cashSummaryHtml(P, card, sumLabel){
  let html = `<div class="summary-room-name">Cash vs. credit card price</div>`;
  if (P.minJobAdjustment > 0){
    html += `<div class="line"><span class="l">${sumLabel}</span><span class="v">${fmt(P.roomsSum)}</span></div>`;
    html += `<div class="line"><span class="l">Minimum job charge — topped up to ${fmt(P.minJobCharge)}</span><span class="v">${fmt(P.minJobAdjustment)}</span></div>`;
    html += `<div class="line"><span class="l">Cash Price</span><span class="v">${fmt(P.cashPrice)}</span></div>`;
  } else {
    html += `<div class="line"><span class="l">Cash Price (${sumLabel.charAt(0).toLowerCase() + sumLabel.slice(1)})</span><span class="v">${fmt(P.cashPrice)}</span></div>`;
  }
  html += `<div class="line"><span class="l">Credit Card Processing Surcharge (${card.surchargePctText}%)</span><span class="v">${fmt(card.surchargeAmount)}</span></div>`;
  html += `<div class="line room-subtotal"><span class="l">Credit Card Price</span><span class="v">${fmt(card.cardPrice)}</span></div>`;
  return html;
}

function materialsSummaryHtml(materials, hint){
  if (!materials.length) return '';
  return `<div class="summary-room-name">Materials to purchase</div>`
       + `<p class="hint" style="margin:0 0 8px;">${hint}</p>`
       + buildMaterialsHtml(materials);
}

// Customer-price lines at the bottom of the internal copy.
function internalCustomerPricesHtml(heading, areas, P, card){
  let html = `<div class="summary-room-name">${heading}</div>`;
  areas.forEach(a => {
    html += `<div class="line"><span class="l">${a.name}</span><span class="v">${fmt(a.price)}</span></div>`;
  });
  if (P.minJobAdjustment > 0){
    html += `<div class="line"><span class="l">Minimum job charge — topped up to ${fmt(P.minJobCharge)}</span><span class="v">${fmt(P.minJobAdjustment)}</span></div>`;
  }
  html += `<div class="line room-subtotal"><span class="l">Customer total (Cash Price)</span><span class="v">${fmt(P.cashPrice)}</span></div>`;
  html += `<div class="line"><span class="l">Credit Card Processing Surcharge (${card.surchargePctText}%)</span><span class="v">${fmt(card.surchargeAmount)}</span></div>`;
  html += `<div class="line room-subtotal"><span class="l">Credit Card Price</span><span class="v">${fmt(card.cardPrice)}</span></div>`;
  return html;
}

/* ---------- Print layout ---------- */
function internalHeaderHtml(f){
  return `
      <div class="p-head" style="flex-direction:column; align-items:stretch;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <img src="logo-light.svg" style="height:30px;">
            <div class="biz-sub">Internal Copy — not for customer distribution</div>
          </div>
          <div class="biz-sub" style="text-align:right;">
            <strong style="color:var(--ink); font-size:13px;">Project #${f.projectNumber}</strong><br>
            Client: ${f.clientName || '—'}<br>
            Date: ${formatLongDate(f.estDate)}
          </div>
        </div>
        <div style="margin-top:10px; display:flex; justify-content:center;">${f.barcodeHtml}</div>
      </div>
    `;
}

// Its own printed page: a purchase-only list, safe to hand to an employee
// without exposing pricing or client details.
function materialsPageHtml(materials, f){
  if (!materials.length) return '';
  return `
        <div class="p-head">
          <div style="display:flex; align-items:center; gap:12px;">
            <img src="logo-light.svg" style="height:30px;">
            <div class="biz-sub">Materials to Purchase — Project #${f.projectNumber}${f.clientName ? ' — ' + f.clientName : ''}</div>
          </div>
        </div>
        ${buildMaterialsHtml(materials)}
      `;
}

// One priced area on the customer copy (a room, an exterior, a wall…).
function customerAreaHtml(area, idx, notesPlaceholder){
  return `
      <div class="p-room">
        <div class="p-room-head">
          <h3>${area.name}</h3>
          <span class="p-room-price">${fmt(area.price)}</span>
        </div>
        <ul class="p-bullets">
          ${area.bullets.map(b => `<li>${b}</li>`).join('')}
        </ul>
        <textarea class="p-notes-input" data-room-idx="${idx}" placeholder="${notesPlaceholder}"></textarea>
        <div class="p-notes-print-only" data-room-print-idx="${idx}"></div>
      </div>
    `;
}

// Does this page print the 3-day cancellation notice? (CONFIG.cancellationNotice)
function showsCancellationNotice(){
  return !!CONFIG.cancellationNotice[document.body.dataset.category];
}

// The FTC Cooling-Off Rule's required statement, in bold right above the
// customer's signature line.
function cancellationStatementHtml(){
  return `
      <p class="p-cancel-statement">You, the buyer, may cancel this transaction at any time prior to midnight of the third business day after the date of this transaction. See the attached notice of cancellation form for an explanation of this right.</p>
    `;
}

// One Notice of Cancellation, worded as the FTC rule (16 CFR 429.1) requires,
// with the transaction date, seller name/address, and deadline filled in.
// The customer gets two: one to keep, one to send if they cancel.
function cancellationNoticeHtml(f, copyLabel){
  const deadline = cancellationDeadline(f.estDate);
  return `
      <div class="p-cancel-notice">
        <div class="p-cancel-top">
          <span>Project #${f.projectNumber}</span>
          <span>${copyLabel}</span>
        </div>
        <h2>Notice of Cancellation</h2>
        <p class="p-cancel-date"><span class="p-cancel-fill">${formatLongDate(f.estDate)}</span><br><span class="p-cancel-caption">(Date of transaction)</span></p>
        <p>You may cancel this transaction, without any penalty or obligation, within three business days from the above date.</p>
        <p>If you cancel, any property traded in, any payments made by you under the contract or sale, and any negotiable instrument executed by you will be returned within 10 business days following receipt by the seller of your cancellation notice, and any security interest arising out of the transaction will be cancelled.</p>
        <p>If you cancel, you must make available to the seller at your residence, in substantially as good condition as when received, any goods delivered to you under this contract or sale, or you may, if you wish, comply with the instructions of the seller regarding the return shipment of the goods at the seller's expense and risk.</p>
        <p>If you do make the goods available to the seller and the seller does not pick them up within 20 days of the date of your notice of cancellation, you may retain or dispose of the goods without any further obligation. If you fail to make the goods available to the seller, or if you agree to return the goods to the seller and fail to do so, then you remain liable for performance of all obligations under the contract.</p>
        <p>To cancel this transaction, mail or deliver a signed and dated copy of this cancellation notice, or any other written notice, or send a telegram, to <span class="p-cancel-fill">${CONFIG.noticeName}</span>, at <span class="p-cancel-fill">${CONFIG.noticeAddress}</span> not later than midnight of <span class="p-cancel-fill">${formatLongDate(deadline)}</span>.</p>
        <p>I hereby cancel this transaction.</p>
        <div class="p-sig-row p-cancel-sig">
          <span class="p-sig-line"></span>
          <span class="p-sig-date-line"></span>
        </div>
        <div class="p-sig-labels"><span>Buyer's signature</span><span>Date</span></div>
      </div>
    `;
}

// Both copies, on their own page after the customer copy, split by a cut line.
function cancellationNoticesPageHtml(f){
  return `
      <div class="print-page-break p-cancel-page">
        ${cancellationNoticeHtml(f, 'Copy 1 of 2 — keep for your records')}
        <div class="p-cut-line" aria-hidden="true"><span>✂ Detach here</span></div>
        ${cancellationNoticeHtml(f, 'Copy 2 of 2 — send this copy to cancel')}
      </div>
    `;
}

// The customer's copy: header, client, priced areas, minimum charge (as its
// own line), Cash / surcharge / Card price, deposit, notes, acceptance, the
// cancellation statement (Residential), signatures, then the two Notices of
// Cancellation on their own page (Residential).
function customerCopyHtml(f, areasHtml, P, card){
  const withNotice = showsCancellationNotice();
  const minJobHtml = P.minJobAdjustment > 0 ? `
      <div class="p-room">
        <div class="p-room-head">
          <h3>Minimum job charge</h3>
          <span class="p-room-price">${fmt(P.minJobAdjustment)}</span>
        </div>
        <ul class="p-bullets"><li>Brings this job up to our ${fmt(P.minJobCharge)} minimum</li></ul>
      </div>
    ` : '';
  const deposit = depositFor(P.cashPrice);
  return `
      <div class="p-head">
        <div style="display:flex; align-items:center; gap:12px;">
          <img src="logo-light.svg" style="height:32px;">
          <div class="biz-sub">${CONFIG.website}<br>${CONFIG.phone}<br>@${CONFIG.instagram}</div>
        </div>
        <div class="biz-sub">
          <strong style="color:var(--ink); font-size:13px;">Project #${f.projectNumber}</strong><br>
          Date: ${formatLongDate(f.estDate)}<br>
          Valid until: ${formatLongDate(f.validUntil)}
        </div>
      </div>
      <div class="p-meta">
        <div>
          <strong>Prepared for:</strong><br>
          ${f.clientName || '—'}<br>
          ${f.jobAddress || ''}<br>
          ${f.clientPhone || ''} ${f.clientEmail ? ' · ' + f.clientEmail : ''}
        </div>
      </div>
      ${areasHtml}
      ${minJobHtml}
      <div class="p-grand-total"><span>Cash Price</span><span>${fmt(P.cashPrice)}</span></div>
      <div class="line" style="margin-top:6px; justify-content:flex-end; gap:24px;"><span class="l">Credit Card Processing Surcharge (${card.surchargePctText}%)</span><span class="v">${fmt(card.surchargeAmount)}</span></div>
      <div class="p-grand-total" style="margin-top:6px; border-top:1px solid var(--line); padding-top:10px;"><span>Credit Card Price</span><span>${fmt(card.cardPrice)}</span></div>
      <div class="p-deposit">
        <div class="line room-subtotal"><span class="l">Deposit required</span><span class="v">${fmt(deposit.amount)}</span></div>
        <p class="p-deposit-note">${deposit.note}</p>
      </div>
      <div class="p-notes">${(f.notes || '').replace(/</g,'&lt;')}</div>
      <p class="p-accept">By signing below, the customer accepts this estimate and the ${CONFIG.businessName} Painting Services Agreement provided with it, which together make up the contract for this project.</p>
      <div class="p-signatures" style="margin-top:20px;">
        <div class="p-sig-block">
          ${withNotice ? cancellationStatementHtml() : ''}
          <div class="p-sig-row">
            <span class="p-sig-line"></span>
            <span class="p-sig-date-line"></span>
          </div>
          <div class="p-sig-labels"><span>Customer Signature</span><span>Date</span></div>
        </div>
        <div class="p-sig-block">
          <div class="p-sig-row">
            <span class="p-sig-line"></span>
            <span class="p-sig-date-line"></span>
          </div>
          <div class="p-sig-labels"><span>Employee Signature</span><span>Date</span></div>
        </div>
      </div>
      ${withNotice ? cancellationNoticesPageHtml(f) : ''}
    `;
}

// Puts the three printed sections into the shared #printArea and shows it.
function showPrintPreview(internalHtml, materialsHtml, customerHtml){
  const printArea = document.getElementById('printArea');
  printArea.innerHTML = `
      <div class="preview-controls">
        <button type="button" class="primary" onclick="finalizePrint()">Print / save as PDF</button>
      </div>
      <div class="p-internal-copy">${internalHtml}</div>
      ${materialsHtml ? `<div class="p-internal-copy print-page-break">${materialsHtml}</div>` : ''}
      <div class="p-customer-copy print-page-break">${customerHtml}</div>
    `;
  printArea.classList.add('visible');
  printArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------- Shared field helpers (client info, fees, notes, dates) ---------- */
// The header fields every calculator prints. `$` is the calculator's scoped lookup.
function printFields($){
  const estDate = parseLocalDate($('estDate').value);
  const validUntil = parseLocalDate($('estDate').value);
  validUntil.setDate(validUntil.getDate() + (parseFloat($('validDays').value) || 0));
  return {
    projectNumber: $('projectNumber').value,
    clientName: $('clientName').value,
    jobAddress: $('jobAddress').value,
    clientPhone: $('clientPhone').value,
    clientEmail: $('clientEmail').value,
    notes: $('notes').value,
    estDate, validUntil,
    barcodeHtml: $('projectBarcode').outerHTML.replace('data-f="projectBarcode"', '').replace('barcode-hidden', ''),
  };
}

function redrawBarcode($){
  const svg = $('projectBarcode');
  const value = $('projectNumber').value.trim();
  if (!value || typeof JsBarcode === 'undefined'){
    svg.innerHTML = '';
    return;
  }
  try {
    JsBarcode(svg, value, {
      format: 'CODE39',
      lineColor: '#23221d',
      width: 1.6,
      height: 36,
      displayValue: false,
      margin: 0,
    });
  } catch (e){
    svg.innerHTML = ''; // e.g. characters outside CODE39's supported set
  }
}

// Client info + the shared settings, as saved in a file/draft.
function readSharedFields($, key){
  const data = {
    version: 1,
    estimateType: key, // which page this belongs to; a file only loads on its own page
    savedAt: new Date().toISOString(),
    client: {
      projectNumber: $('projectNumber').value,
      name: $('clientName').value,
      address: $('jobAddress').value,
      phone: $('clientPhone').value,
      email: $('clientEmail').value,
      date: $('estDate').value,
      validDays: $('validDays').value,
    },
  };
  if ($('markupPct')) data.markupPct = $('markupPct').value;
  data.employeeBurden = $('employeeBurden').value;
  data.ccSurchargePct = $('ccSurchargePct').value;
  data.minJobCharge = $('minJobCharge').value;
  data.notes = $('notes').value;
  return data;
}

function loadSharedFields($, data){
  $('projectNumber').value = data.client?.projectNumber || generateProjectNumber();
  $('clientName').value = data.client?.name || '';
  $('jobAddress').value = data.client?.address || '';
  $('clientPhone').value = data.client?.phone || '';
  $('clientEmail').value = data.client?.email || '';
  if (data.client?.date) $('estDate').value = data.client.date;
  if (data.client?.validDays !== undefined) $('validDays').value = data.client.validDays;
  if (data.markupPct !== undefined && $('markupPct')) $('markupPct').value = data.markupPct;
  if (data.employeeBurden !== undefined) $('employeeBurden').value = data.employeeBurden;
  if (data.ccSurchargePct !== undefined) $('ccSurchargePct').value = data.ccSurchargePct;
  if (data.minJobCharge !== undefined) $('minJobCharge').value = data.minJobCharge;
  if (data.notes !== undefined) $('notes').value = data.notes;
}

// "Start new estimate": client fields cleared, defaults re-read from
// Settings (so a change made since this page loaded still applies), today's date.
function resetSharedFields($, key){
  ['clientName','jobAddress','clientPhone','clientEmail'].forEach(id => $(id).value = '');
  Object.entries(estimateDefaults(key)).forEach(([id, v]) => { const el = $(id); if (el) el.value = v; });
  $('estDate').value = todayISO();
  $('projectNumber').value = generateProjectNumber();
}

// Fill a just-created product row from saved data. Fields this page doesn't
// have (e.g. ceiling/baseboard/trim on exterior pages) are skipped quietly.
function fillProductRow(row, prod){
  const setVal = (sel, v) => { const el = row.querySelector(sel); if (el) el.value = v; };
  const setChk = (sel, v) => { const el = row.querySelector(sel); if (el) el.checked = v; };
  setVal('.p-name', prod.name ?? '');
  if (prod.type === 'supply'){
    setVal('.p-flatcost', prod.flatCost ?? 0);
  } else {
    setVal('.p-coverage', prod.coverage ?? 350);
    setVal('.p-price', prod.price ?? 35);
    setVal('.p-coats', prod.coats ?? 2);
    setChk('.p-apply-walls', prod.applyWalls !== undefined ? !!prod.applyWalls : true);
    setChk('.p-apply-ceiling', !!prod.applyCeiling);
    setChk('.p-apply-baseboard', !!prod.applyBaseboard);
    setChk('.p-apply-trim', !!prod.applyTrim);
    const colorInput = row.querySelector('.p-color-input');
    colorInput.value = prod.color || '';
    updateColorSwatch(colorInput);
    setVal('.p-finish-select', prod.finish || '');
  }
}

// Products in a room/area/wall, as saved in a file/draft.
function readProductRows(container){
  const products = [];
  container.querySelectorAll('.products-list .product').forEach(p => {
    if (p.dataset.type === 'paint'){
      products.push({
        type: 'paint',
        name: p.querySelector('.p-name').value,
        coverage: p.querySelector('.p-coverage').value,
        price: p.querySelector('.p-price').value,
        coats: p.querySelector('.p-coats').value,
        applyWalls: p.querySelector('.p-apply-walls')?.checked,
        applyCeiling: p.querySelector('.p-apply-ceiling')?.checked,
        applyBaseboard: p.querySelector('.p-apply-baseboard')?.checked,
        applyTrim: p.querySelector('.p-apply-trim')?.checked,
        color: p.querySelector('.p-color-input').value,
        finish: p.querySelector('.p-finish-select').value,
      });
    } else {
      products.push({
        type: 'supply',
        name: p.querySelector('.p-name').value,
        flatCost: p.querySelector('.p-flatcost').value,
      });
    }
  });
  return products;
}

function readEmployeeRows(root){
  return Array.from(root.querySelectorAll('.employee')).map(emp => ({
    enabled: emp.querySelector('.e-enabled').checked,
    name: emp.querySelector('.e-name').value,
    rate: emp.querySelector('.e-rate').value,
    prod: emp.querySelector('.e-prod').value,
  }));
}

/* ---------- Save / load files ---------- */
function downloadEstimateFile(data){
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const safeName = (data.client.name || 'estimate').trim().replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'estimate';
  const projectNum = data.client.projectNumber || generateProjectNumber();
  const a = document.createElement('a');
  a.href = url;
  a.download = `${projectNum}-${safeName}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Reads a picked file and hands it to onData only if it belongs to this page.
// Files saved before v7.0 have no estimateType; they're all residential interior.
function readEstimateFile(input, key, onData){
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    let data;
    try {
      data = JSON.parse(reader.result);
    } catch (err){
      alert('That file could not be read as a saved estimate (invalid JSON).');
      input.value = '';
      return;
    }
    const hasAreas = data && (Array.isArray(data.rooms) || Array.isArray(data.areas));
    if (!hasAreas){
      alert('That file does not look like a saved estimate from this tool.');
      input.value = '';
      return;
    }
    const fileType = data.estimateType || 'residential-interior';
    if (fileType !== key){
      const label = t => PAGES[t] ? PAGES[t].title.toLowerCase() : t;
      alert(`That file is a ${label(fileType)} estimate, not a ${label(key)} one. Open it from the ${PAGES[fileType] ? PAGES[fileType].title : fileType} page instead.`);
      input.value = '';
      return;
    }
    onData(data);
    input.value = ''; // allow picking the same file again later
  };
  reader.onerror = () => alert('Could not read that file.');
  reader.readAsText(file);
}

/* ---------- Autosave ----------
   One working draft per page in this device's localStorage
   (thpc_draft_<page key>), saved 600ms after an edit and flushed right
   away when the app is backgrounded or you switch pages. A closed tab or
   iOS killing the app doesn't lose an estimate mid-walkthrough. Per
   device; the draft is always "whatever's on screen." "Save as file" is
   still how you keep an estimate for good.
   `ready` stays false until the saved draft is restored, so start-up
   defaults never overwrite a real draft. */
function createDraftStore({ key, legacyKey, getData, loadData, statusEl }){
  const draftKey = `thpc_draft_${key}`;
  let ready = false, timer = null;

  function status(text, when){
    if (!statusEl) return;
    if (!text){ statusEl.textContent = ''; return; }
    const time = when ? ' · ' + when.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
    statusEl.textContent = text + time;
  }
  function saveNow(){
    if (!ready) return;
    clearTimeout(timer);
    timer = null;
    try {
      localStorage.setItem(draftKey, JSON.stringify(getData()));
      status('Draft autosaved', new Date());
    } catch (e){
      status("Autosave isn't available in this browser — use Save as file.");
    }
  }
  function schedule(){
    if (!ready) return;
    clearTimeout(timer);
    timer = setTimeout(saveNow, 600);
  }
  function flush(){ if (timer) saveNow(); }
  function clear(){
    clearTimeout(timer);
    timer = null;
    try { localStorage.removeItem(draftKey); } catch (e) { /* ignore */ }
    status('');
  }
  function restore(){
    let saved = null, fromLegacyKey = false;
    try {
      saved = JSON.parse(localStorage.getItem(draftKey) || 'null');
      if (!saved && legacyKey){
        saved = JSON.parse(localStorage.getItem(legacyKey) || 'null');
        fromLegacyKey = !!saved;
      }
    } catch (e) { /* ignore bad data */ }
    if (saved && (Array.isArray(saved.rooms) || Array.isArray(saved.areas))){
      try {
        loadData(saved);
        const when = saved.savedAt ? new Date(saved.savedAt) : null;
        status(when ? `Restored your draft from ${formatLongDate(when)}` : 'Restored your draft', when);
      } catch (e){
        console.warn(`Could not restore saved ${key} draft:`, e);
      }
    }
    ready = true;
    if (fromLegacyKey){
      saveNow(); // re-save under the per-page key...
      try { localStorage.removeItem(legacyKey); } catch (e) { /* ignore */ }
    }
  }
  return { draftKey, schedule, saveNow, flush, clear, restore };
}

/* ============================================================
   GLOBAL PRINT ACTIONS — work on whatever is in #printArea,
   whichever page built it.
   ============================================================ */
function finalizePrint(){
  // Copy each room's typed notes into a plain-text version for the printed
  // page, so it prints as clean text instead of a boxed input control.
  document.querySelectorAll('.p-notes-input').forEach(ta => {
    const idx = ta.dataset.roomIdx;
    const target = document.querySelector(`.p-notes-print-only[data-room-print-idx="${idx}"]`);
    if (target) target.textContent = ta.value;
  });

  // iOS Safari silently refuses window.print() when a site is running
  // "standalone" (opened from a home-screen icon) — a long-standing WebKit
  // limitation with no direct fix. The workaround: open the estimate as its
  // own page in a real Safari tab, which isn't standalone, and print there.
  if (window.navigator.standalone === true){
    printViaNewTab();
    return;
  }

  window.print();
}

function printViaNewTab(){
  // A blob: URL gets opened by iOS more like a document preview than a real
  // Safari tab, and that preview's Share sheet doesn't include Print. Real
  // https navigation does, so instead we stash the built print content and
  // reopen this actual hosted page with a flag telling it to auto-print.
  try {
    localStorage.setItem('pendingPrintHtml', $('printArea').innerHTML);
  } catch (e){
    alert("Couldn't prepare the print tab (browser storage unavailable). Try opening this page directly in Safari instead of the home screen icon, then print from there.");
    return;
  }
  const printUrl = location.origin + location.pathname + '?autoprint=1';
  const win = window.open(printUrl, '_blank');
  if (!win){
    alert("Your browser blocked the print tab from opening. Try opening this page directly in Safari (not from the home screen icon) and use Print from there instead.");
  }
}

// Any edit inside an estimator recalculates (and autosaves) only that one.
function onEstimatorEdit(e){
  const inst = EST(e.target);
  if (inst) inst.recalc();
}
document.addEventListener('input', onEstimatorEdit);
document.addEventListener('change', onEstimatorEdit);

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushAllDrafts();
});
window.addEventListener('pagehide', flushAllDrafts);

/* ============================================================
   PWA — register the service worker for install + offline use.
   Silently no-ops if opened as a local file rather than hosted.
   ============================================================ */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.warn('Service worker registration failed:', err));
  });
}

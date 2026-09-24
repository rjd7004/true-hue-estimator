/* ============================================================
   True Hue Estimate Builder — settings.js  (v7.5)
   The Settings page: edit the defaults new estimates start with,
   and export/import them as a file so every phone matches.
   Storage, validation, and the built-in values live in common.js
   (SETTINGS section); this file is only the form.
   Loaded by settings.html after common.js.
   ============================================================ */

const settingsRoot = document.querySelector('[data-settings]');
let settingsDirty = false;

/* ---------- Building the form ---------- */
function numField(label, name, value, step){
  return `<div class="field"><label>${label}</label><input type="number" data-s="${name}" data-label="${escapeHtml(label)}" value="${value}" min="0" step="${step}"></div>`;
}

function crewRowHtml(member){
  return `
      <div class="employee crew-row">
        <div class="field" style="max-width:190px;"><label>Name</label><input type="text" class="c-name" value="${escapeHtml(member.name)}" maxlength="60"></div>
        <div class="field"><label>Pay rate ($ / hour)</label><input type="number" class="c-rate" data-label="Pay rate" value="${member.rate}" min="0" step="0.5"></div>
        <div class="field"><label>Production rate (sq ft / hour)</label><input type="number" class="c-prod" data-label="Production rate" value="${member.prod}" min="0" step="5"></div>
        <button type="button" class="ghost" title="Remove from crew" aria-label="Remove from crew" onclick="removeCrewMember(this)">✕</button>
      </div>`;
}

function commercialRatesHtml(s){
  const titles = { 'commercial-interior': 'Commercial interior', 'commercial-exterior': 'Commercial exterior' };
  return Object.entries(COMMERCIAL_RATE_FIELDS).map(([page, fields]) => `
          <div class="room-section-label">${titles[page]}</div>
          <div class="grid cols-2">
            ${fields.map(f => `<div class="field"><label>${f.label}</label><input type="number" data-rate-page="${page}" data-rate-key="${f.key}" data-label="${escapeHtml(titles[page] + ' ' + f.label)}" value="${s.commercialRates[page][f.key]}" min="0" step="0.01"></div>`).join('')}
          </div>`).join('');
}

function renderSettings(){
  const s = getSettings();
  settingsRoot.innerHTML = `
  <div class="layout settings-layout">
    <div class="form-col">

      <div class="card">
        <div class="card-header" onclick="toggleCard(this)">
          <h2>Crew</h2>
          <span class="chevron">⌄</span>
        </div>
        <div class="card-body">
          <p class="sub">Every new estimate starts with these people in its Labor card, checked. Uncheck or edit them on the estimate itself for a one-off job.</p>
          <div data-s-list="crew">${s.crew.map(crewRowHtml).join('')}</div>
          <div class="row-actions">
            <button type="button" class="small" onclick="addCrewMember()">+ Add crew member</button>
          </div>
          <div class="room-section-label">When someone is added on an estimate</div>
          <div class="grid cols-2">
            ${numField('Pay rate ($ / hour)', 'newEmployee.rate', s.newEmployee.rate, 0.5)}
            ${numField('Production rate (sq ft / hour)', 'newEmployee.prod', s.newEmployee.prod, 5)}
          </div>
          <p class="hint">Used by "+ Add employee" on an estimate, for a helper who isn't on the regular crew.</p>
        </div>
      </div>

      <div class="card">
        <div class="card-header" onclick="toggleCard(this)">
          <h2>Pricing &amp; fees</h2>
          <span class="chevron">⌄</span>
        </div>
        <div class="card-body">
          <div class="grid cols-2">
            ${numField('Employee burden (%)', 'employeeBurden', s.employeeBurden, 1)}
            ${numField('Markup / profit (%) — Residential', 'markupPct', s.markupPct, 1)}
            ${numField('Credit card surcharge (%)', 'ccSurchargePct', s.ccSurchargePct, 0.1)}
            ${numField('Minimum job charge ($)', 'minJobCharge', s.minJobCharge, 10)}
            ${numField('Estimate valid for (days)', 'validDays', s.validDays, 1)}
          </div>
          <p class="hint">Commercial has no markup — its price comes from the rates below. A minimum job charge of 0 turns it off.</p>
        </div>
      </div>

      <div class="card">
        <div class="card-header" onclick="toggleCard(this)">
          <h2>Commercial rates</h2>
          <span class="chevron">⌄</span>
        </div>
        <div class="card-body">
          <p class="sub">What a new Commercial estimate charges per surface. Walls and ceilings are per square foot of surface, not per coat. Leave at 0 to set them per job.</p>
          ${commercialRatesHtml(s)}
        </div>
      </div>

      <div class="card">
        <div class="card-header" onclick="toggleCard(this)">
          <h2>Notes &amp; terms</h2>
          <span class="chevron">⌄</span>
        </div>
        <div class="card-body">
          <p class="sub">Printed at the bottom of the customer copy on every new estimate.</p>
          <textarea data-s="notes" style="min-height:220px;">${escapeHtml(s.notes)}</textarea>
        </div>
      </div>

    </div>

    <div class="summary">
      <div class="card">
        <h2>Save</h2>
        <p class="settings-status" data-s-status></p>
        <button type="button" class="primary block" onclick="saveSettingsForm()">Save settings</button>
        <button type="button" class="block" style="margin-top:8px;" data-s-discard onclick="discardSettingsChanges()">Discard changes</button>
      </div>
      <div class="card">
        <h2>Share with the crew</h2>
        <p class="sub" style="margin-bottom:12px;">Export these settings as a file, send it to each phone, and import it there so everyone quotes from the same numbers.</p>
        <div style="display:flex; gap:8px;">
          <button type="button" style="flex:1;" onclick="exportSettingsFile()">Export file</button>
          <button type="button" style="flex:1;" onclick="document.getElementById('settingsFileInput').click()">Import file</button>
        </div>
        <input type="file" id="settingsFileInput" accept=".json,application/json" style="display:none" onchange="importSettingsFile(this)">
        <p class="hint">The file includes pay rates, so only send it to your crew.</p>
        <button type="button" class="block" style="margin-top:14px;" onclick="resetSettingsToBuiltin()">Reset to built-in defaults</button>
      </div>
    </div>
  </div>
  <div class="settings-savebar" data-s-savebar role="status">
    <span>Unsaved changes</span>
    <button type="button" class="primary" onclick="saveSettingsForm()">Save settings</button>
  </div>`;
  setSettingsDirty(false);
}

/* ---------- Crew rows ---------- */
function addCrewMember(){
  const list = settingsRoot.querySelector('[data-s-list="crew"]');
  const s = readSettingsForm();
  list.insertAdjacentHTML('beforeend', crewRowHtml({
    name: `Employee ${list.children.length + 1}`,
    rate: s.newEmployee.rate, prod: s.newEmployee.prod,
  }));
  list.lastElementChild.querySelector('.c-name').select();
  setSettingsDirty(true);
}

function removeCrewMember(btn){
  const list = settingsRoot.querySelector('[data-s-list="crew"]');
  if (list.children.length <= 1){
    alert('Keep at least one person on the crew — every estimate needs someone doing the work.');
    return;
  }
  btn.closest('.crew-row').remove();
  setSettingsDirty(true);
}

/* ---------- Reading + checking the form ---------- */
// Raw form values, shaped like a settings object (normalizeSettings cleans it up).
function readSettingsForm(){
  const val = name => settingsRoot.querySelector(`[data-s="${name}"]`).value;
  const raw = {
    crew: Array.from(settingsRoot.querySelectorAll('.crew-row')).map(row => ({
      name: row.querySelector('.c-name').value,
      rate: row.querySelector('.c-rate').value,
      prod: row.querySelector('.c-prod').value,
    })),
    newEmployee: { rate: val('newEmployee.rate'), prod: val('newEmployee.prod') },
    employeeBurden: val('employeeBurden'),
    markupPct: val('markupPct'),
    ccSurchargePct: val('ccSurchargePct'),
    minJobCharge: val('minJobCharge'),
    validDays: val('validDays'),
    notes: val('notes'),
    commercialRates: {},
  };
  settingsRoot.querySelectorAll('[data-rate-page]').forEach(input => {
    const page = input.dataset.ratePage;
    (raw.commercialRates[page] = raw.commercialRates[page] || {})[input.dataset.rateKey] = input.value;
  });
  return normalizeSettings(raw);
}

// Every number box must hold a number of 0 or more. Returns the first bad input.
function firstInvalidNumber(){
  return Array.from(settingsRoot.querySelectorAll('input[type="number"]')).find(input => {
    const n = parseFloat(input.value);
    return input.value.trim() === '' || !isFinite(n) || n < 0;
  });
}

/* ---------- Save / discard / status ---------- */
function setSettingsDirty(dirty){
  settingsDirty = dirty;
  const status = settingsRoot.querySelector('[data-s-status]');
  if (dirty) status.textContent = 'You have unsaved changes.';
  else status.textContent = hasCustomSettings()
    ? 'Saved on this device. New estimates start with these.'
    : 'Using the built-in defaults.';
  status.classList.toggle('unsaved', dirty);
  settingsRoot.querySelector('[data-s-discard]').disabled = !dirty;
  settingsRoot.querySelector('[data-s-savebar]').classList.toggle('visible', dirty);
}

function saveSettingsForm(){
  const bad = firstInvalidNumber();
  if (bad){
    const row = bad.closest('.crew-row');
    const who = row ? ` for ${row.querySelector('.c-name').value || 'a crew member'}` : '';
    alert(`${bad.dataset.label || 'That field'}${who} needs a number (0 or more).`);
    bad.focus();
    return false;
  }
  if (!saveSettings(readSettingsForm())){
    alert("Couldn't save — this browser isn't allowing storage. Try again outside private browsing.");
    return false;
  }
  renderSettings(); // redraw from what was saved, so the form shows cleaned-up values
  return true;
}

function discardSettingsChanges(){
  if (!confirm('Throw away your unsaved changes?')) return;
  renderSettings();
}

function resetSettingsToBuiltin(){
  if (!confirm('Reset every setting on this device back to the built-in defaults? Estimates you already have open or saved are not affected.')) return;
  clearSettings();
  renderSettings();
}

/* ---------- Export / import ---------- */
function exportSettingsFile(){
  if (settingsDirty){
    if (!confirm('Save your changes first? The file will include them.')) return;
    if (!saveSettingsForm()) return;
  }
  const file = {
    type: SETTINGS_FILE_TYPE,
    version: 1,
    appVersion: CONFIG.version,
    exportedAt: new Date().toISOString(),
    settings: getSettings(),
  };
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `true-hue-settings-${todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importSettingsFile(input){
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    input.value = ''; // so the same file can be picked again
    let data;
    try { data = JSON.parse(reader.result); } catch (e) { data = null; }
    if (!data || data.type !== SETTINGS_FILE_TYPE || typeof data.settings !== 'object'){
      const isEstimate = data && (Array.isArray(data.rooms) || Array.isArray(data.areas));
      alert(isEstimate
        ? 'That file is a saved estimate, not a settings file. Open it with "Load from file" on its estimate page.'
        : "That file isn't a True Hue settings file.");
      return;
    }
    const when = data.exportedAt ? ` (exported ${formatLongDate(new Date(data.exportedAt))})` : '';
    const lose = settingsDirty ? ' Your unsaved changes here will be lost.' : '';
    if (!confirm(`Replace the settings on this device with the ones in this file${when}?${lose}`)) return;
    if (!saveSettings(normalizeSettings(data.settings))){
      alert("Couldn't save — this browser isn't allowing storage. Try again outside private browsing.");
      return;
    }
    renderSettings();
    alert('Settings imported. New estimates on this device will use them.');
  };
  reader.onerror = () => alert('Could not read that file.');
  reader.readAsText(file);
}

/* ---------- Start-up ---------- */
settingsRoot.addEventListener('input', () => { if (!settingsDirty) setSettingsDirty(true); });
window.addEventListener('beforeunload', (e) => {
  if (!settingsDirty) return;
  e.preventDefault();
  e.returnValue = '';
});
renderSettings();

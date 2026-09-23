/* ============================================================
   True Hue Estimate Builder — commercial.js
   The Commercial calculator: PER-SQUARE-FOOT pricing with a
   separate rate per surface, used by commercial.html for both
   Interior and Exterior. Loaded AFTER common.js, whose CALCULATOR
   BUILDING BLOCKS supply the shared cards, rows, labor, minimum /
   deposit / surcharge rules, print layout, autosave, and save/load.

   How a commercial price works (different from Residential):
   - The CUSTOMER PRICE comes only from the Rates card:
       walls / ceilings  = square feet of surface × $/sq ft  (not per coat)
       trim / baseboard  = linear feet × $/linear ft
       doors / windows   = count × $/each
     A wall, ceiling, trim, or baseboard surface is billed once any
     paint/primer product in that area covers it (same "Apply to"
     checkboxes as Residential). Doors/windows bill by their count.
     Prices are exact (to the cent) — no rounding to $10.
   - YOUR COST is still figured behind the scenes, the same way
     Residential does it: paint gallons (rounded up per product),
     supplies, and labor hours from the crew's production rate.
     Doors, windows, trim, and baseboard have no separate cost model
     (each page's rateOnlyHint says so on screen).
   - MARGIN = Cash Price − your cost, shown on the live summary and
     the internal copy only. There's no markup field on Commercial.
   - Minimum job charge, card surcharge, and deposit are the same
     rules as Residential (they live in common.js).
   ============================================================ */

const COMMERCIAL_CONFIGS = {
  'commercial-interior': {
    surfaceTitle: 'Interior',
    surfaceSub: "Add one entry per area — an office, a hallway, a suite. The customer's price comes from the Rates card; paint, supplies, and labor below are figured as your cost.",
    surfaces: { ceiling: true, baseboard: true, trim: true, windows: false },
    unit: {
      nameLabel: 'Area name',
      defaultName: id => `Area ${id}`,
      fallbackName: 'Area',
      addLabel: '+ Add area',
      removeTitle: 'Remove area',
      productsLabel: 'Products for this area',
      productsHint: 'Each product picks the surfaces it covers. A surface is billed at its rate once any product here covers it.',
    },
    wallsHint: 'For a single wall or partial job — just a width and height, no doors/length.',
    rates: [
      { key: 'walls',     label: 'Walls ($ / sq ft)' },
      { key: 'ceiling',   label: 'Ceilings ($ / sq ft)' },
      { key: 'door',      label: 'Doors ($ / door)' },
      { key: 'trim',      label: 'Trim ($ / linear ft)' },
      { key: 'baseboard', label: 'Baseboard ($ / linear ft)' },
    ],
    notesPlaceholder: 'Additional notes for this area (optional) — e.g. after-hours work, protect furniture and flooring',
    ratesHint: 'What the customer pays for each surface on this job. Walls and ceilings are per square foot of surface, not per coat.',
    rateOnlyHint: 'Doors, trim, and baseboard are billed by rate only — no separate cost is figured for them.',
  },

  'commercial-exterior': {
    surfaceTitle: 'Exterior',
    surfaceSub: "Add one entry per exterior — a building, a wing, one side. The customer's price comes from the Rates card; paint, supplies, and labor below are figured as your cost.",
    surfaces: { ceiling: false, baseboard: false, trim: false, windows: true },
    unit: {
      nameLabel: 'Exterior',
      defaultName: id => id === 1 ? 'Exterior' : `Exterior ${id}`,
      fallbackName: 'Exterior',
      addLabel: '+ Add exterior',
      removeTitle: 'Remove exterior',
      productsLabel: 'Products',
      productsHint: 'Paint and primer cover the full wall area all the way around: (length + width) × 2 × height.',
    },
    wallsHint: 'For one side of a building or a partial job — just a width and height, no doors/windows/length.',
    rates: [
      { key: 'walls',  label: 'Walls ($ / sq ft)' },
      { key: 'door',   label: 'Doors ($ / door)' },
      { key: 'window', label: 'Windows ($ / window)' },
    ],
    notesPlaceholder: 'Additional notes for this area (optional) — e.g. lift access, scrape and prime peeling spots',
    ratesHint: 'What the customer pays for each surface on this job. Walls are per square foot of surface, not per coat.',
    rateOnlyHint: 'Doors and windows are billed by rate only — no separate cost is figured for them.',
  },
};

// 1,234.5 — square/linear feet with commas and at most one decimal.
const qty = n => n.toLocaleString('en-US', { maximumFractionDigits: 1 });
const cents = n => Math.round(n * 100) / 100;

/* ---- One Commercial calculator instance ---- */
function createCommercialEstimator(root, key, cfg){
  const S = cfg.surfaces, U = cfg.unit;
  const rateKeys = cfg.rates.map(r => r.key);

  root.innerHTML = calculatorLayoutHtml(
    clientCardHtml() + `
      <div class="card">
        <div class="card-header" onclick="toggleCard(this)">
          <h2>Rates</h2>
          <span class="chevron">⌄</span>
        </div>
        <div class="card-body">
          <p class="sub">${cfg.ratesHint}</p>
          <div class="grid cols-2">
            ${cfg.rates.map(r => `<div class="field"><label>${r.label}</label><input type="number" data-f="rate-${r.key}" value="0" min="0" step="0.01"></div>`).join('\n            ')}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header" onclick="toggleCard(this)">
          <h2>${cfg.surfaceTitle}</h2>
          <span class="chevron">⌄</span>
        </div>
        <div class="card-body">
          <p class="sub">${cfg.surfaceSub}</p>
          <div data-f="areasList"></div>
          <div class="row-actions">
            <button type="button" class="small" onclick="EST(this).addArea()">${U.addLabel}</button>
          </div>

          <div class="room-section-label">Single walls</div>
          <p class="hint" style="margin-top:-4px;">${cfg.wallsHint}</p>
          <div data-f="wallsList"></div>
          <div class="row-actions">
            <button type="button" class="small" onclick="EST(this).addWall()">+ Add single wall</button>
          </div>
        </div>
      </div>` +
    laborCardHtml() +
    feesCardHtml({ withMarkup: false, minHint: 'If the area prices add up to less than this, the estimate adds a "Minimum job charge" line to bring the Cash Price up to it. Set to 0 to turn it off.' }) +
    notesCardHtml(),
    'Cash Price'
  );

  // Scoped lookups — only ever see THIS page's fields (see gotcha #11).
  const $ = name => root.querySelector(`[data-f="${name}"]`);
  const val = (name, fallback=0) => {
    const v = parseFloat($(name).value);
    return isNaN(v) ? fallback : v;
  };

  const drafts = createDraftStore({
    key, getData: getEstimateData, loadData: loadEstimateData, statusEl: $('draftStatus'),
  });

  let areaCount = 0, productCount = 0, wallCount = 0, employeeCount = 0;

  /* ============================================================
     AREAS (interior) / EXTERIORS (exterior)
     ============================================================ */
  function addArea(){
    areaCount++;
    const id = areaCount;
    const div = document.createElement('div');
    div.className = 'room';
    div.dataset.roomId = id;
    const windowsField = S.windows
      ? `<div class="field" style="max-width:110px;"><label>Windows</label><input type="number" class="r-windows" value="0" min="0"></div>`
      : '';
    div.innerHTML = `
      <div class="room-top">
        <div class="field" style="max-width:160px;">
          <label>${U.nameLabel}</label>
          <input type="text" class="r-name" value="${U.defaultName(id)}">
        </div>
        <div class="field" style="max-width:110px;"><label>Doors</label><input type="number" class="r-doors" value="0" min="0"></div>
        ${windowsField}
        <button type="button" class="ghost" title="${U.removeTitle}" onclick="EST(this).removeArea(${id})">✕</button>
      </div>

      <div class="grid cols-3 room-fields">
        <div class="field"><label>Length (ft)</label><input type="number" class="r-l" value="12" min="0"></div>
        <div class="field"><label>Width (ft)</label><input type="number" class="r-w" value="10" min="0"></div>
        <div class="field"><label>Height (ft)</label><input type="number" class="r-h" value="8" min="0"></div>
      </div>

      <div class="room-section-label">${U.productsLabel}</div>
      <p class="hint" style="margin-top:-4px;">${U.productsHint}</p>
      <div class="products-list" data-room-products="${id}"></div>
      <div class="row-actions product-add-row">
        <button type="button" class="small" onclick="EST(this).addProduct(${id}, 'paint')">+ Add paint / primer</button>
        <button type="button" class="small" onclick="EST(this).addProduct(${id}, 'supply')">+ Add supplies</button>
      </div>
    `;
    $('areasList').appendChild(div);
    addProduct(id, 'paint'); // seed one default paint entry
  }

  function addProduct(containerId, type, kind){
    kind = kind || 'room';
    productCount++;
    const list = root.querySelector(kind === 'wall'
      ? `.products-list[data-wall-products="${containerId}"]`
      : `.products-list[data-room-products="${containerId}"]`);
    const div = document.createElement('div');
    div.className = 'product';
    div.dataset.productId = productCount;
    div.dataset.type = type;
    div.innerHTML = type === 'paint'
      ? paintProductHtml(applyRowHtml([
          ['p-apply-walls', 'Walls', true],
          (S.ceiling && kind !== 'wall') && ['p-apply-ceiling', 'Ceiling', false],
          S.baseboard && ['p-apply-baseboard', 'Baseboard', false],
          S.trim && ['p-apply-trim', 'Trim', false],
        ].filter(Boolean)))
      : supplyProductHtml();
    list.appendChild(div);
    recalc();
  }

  function removeProduct(btn){
    btn.closest('.product').remove();
    recalc();
  }

  function removeArea(id){
    if (root.querySelectorAll('.room').length <= 1){
      // keep at least one entry, just clear/reset it
      const row = root.querySelector(`.room[data-room-id="${id}"]`);
      const set = (sel, v) => { const el = row.querySelector(sel); if (el) el.value = v; };
      set('.r-name', U.defaultName(1));
      set('.r-l', 0); set('.r-w', 0); set('.r-h', 0);
      set('.r-doors', 0); set('.r-windows', 0);
      row.querySelector('.products-list').innerHTML = '';
      addProduct(id, 'paint');
      recalc();
      return;
    }
    root.querySelector(`.room[data-room-id="${id}"]`)?.remove();
    recalc();
  }

  /* ---- Single walls: width × height, no doors/windows/ceiling ---- */
  function addWall(){
    wallCount++;
    const id = wallCount;
    const div = document.createElement('div');
    div.className = 'wall';
    div.dataset.wallId = id;
    div.innerHTML = `
      <div class="room-top">
        <div class="field" style="max-width:220px;">
          <label>Wall name</label>
          <input type="text" class="w-name" value="Wall ${id}">
        </div>
        <button type="button" class="ghost" title="Remove wall" onclick="EST(this).removeWall(${id})">✕</button>
      </div>

      <div class="grid cols-2 room-fields">
        <div class="field"><label>Width (ft)</label><input type="number" class="w-w" value="10" min="0"></div>
        <div class="field"><label>Height (ft)</label><input type="number" class="w-h" value="8" min="0"></div>
      </div>

      <div class="room-section-label">Products for this wall</div>
      <div class="products-list" data-wall-products="${id}"></div>
      <div class="row-actions product-add-row">
        <button type="button" class="small" onclick="EST(this).addProduct(${id}, 'paint', 'wall')">+ Add paint / primer</button>
        <button type="button" class="small" onclick="EST(this).addProduct(${id}, 'supply', 'wall')">+ Add supplies</button>
      </div>
    `;
    $('wallsList').appendChild(div);
    addProduct(id, 'paint', 'wall');
  }

  function removeWall(id){
    root.querySelector(`.wall[data-wall-id="${id}"]`)?.remove();
    recalc();
  }

  /* ---- Employees (labor) ---- */
  function addEmployee(name, rate, prod){
    employeeCount++;
    const div = document.createElement('div');
    div.className = 'employee';
    div.dataset.employeeId = employeeCount;
    div.innerHTML = employeeRowHtml(employeeCount, name, rate, prod);
    $('employeesList').appendChild(div);
  }

  function removeEmployee(id){
    root.querySelector(`.employee[data-employee-id="${id}"]`)?.remove();
    recalc();
  }

  /* ============================================================
     CALCULATION — price from rates, cost from materials + labor
     ============================================================ */
  function computeEstimate(){
    const rate = k => rateKeys.includes(k) ? Math.max(0, val(`rate-${k}`, 0)) : 0;
    const materialsMap = new Map();
    let paintCost = 0, suppliesCost = 0, laborArea = 0;
    const areas = [];

    // Paint/supplies in one area or wall → cost lines + scope bullets, and
    // which surfaces any product covers (those are what get billed).
    function costProducts(container, surfaceAreaFor, surfacesTextFor){
      const costItems = [], scopeBullets = [];
      const covers = { walls: false, ceiling: false, baseboard: false, trim: false };
      let areaLabor = 0;
      container.querySelectorAll('.products-list .product').forEach(p => {
        const productName = p.querySelector('.p-name').value || (p.dataset.type === 'paint' ? 'Paint' : 'Supplies');
        if (p.dataset.type === 'paint'){
          const x = readPaintProduct(p);
          if (x.applyWalls) covers.walls = true;
          if (x.applyCeiling) covers.ceiling = true;
          if (x.applyBaseboard) covers.baseboard = true;
          if (x.applyTrim) covers.trim = true;
          const line = paintProductLine(p, productName, surfaceAreaFor(x), surfacesTextFor(x), materialsMap);
          paintCost += line.cost;
          areaLabor += line.laborArea;
          if (line.gal > 0){
            costItems.push({ label: line.label, amount: line.cost });
            scopeBullets.push(line.bullet);
          }
        } else {
          const flat = parseFloat(p.querySelector('.p-flatcost').value) || 0;
          suppliesCost += flat;
          if (flat > 0) costItems.push({ label: productName, amount: flat });
        }
      });
      return { costItems, scopeBullets, covers, areaLabor };
    }

    // One billed surface → a price line (summary/internal) and a customer bullet.
    function billLine(priceItems, priceBullets, name, amountOf, unitText, rateKey){
      const r = rate(rateKey);
      if (!(amountOf > 0)) return;
      const amount = cents(amountOf * r);
      const text = `${name} — ${qty(amountOf)} ${unitText.plural} × ${fmt(r)}/${unitText.one}`;
      priceItems.push({ label: text, amount });
      priceBullets.push(`${text} = ${fmt(amount)}`);
    }
    const SQFT = { plural: 'sq ft', one: 'sq ft' }, LINFT = { plural: 'linear ft', one: 'linear ft' };
    const DOOR = { plural: 'doors', one: 'door' }, WINDOW = { plural: 'windows', one: 'window' };
    const unitsFor = (n, u) => n === 1 ? { plural: u.one, one: u.one } : u;

    function pushArea(name, priceItems, priceBullets, c){
      if (!priceItems.length && !c.costItems.length) return;
      areas.push({
        name, priceItems, costItems: c.costItems,
        price: cents(priceItems.reduce((s, i) => s + i.amount, 0)),
        cost: c.costItems.reduce((s, i) => s + i.amount, 0),
        bullets: [...priceBullets, ...c.scopeBullets],
      });
      laborArea += c.areaLabor;
    }

    // ---- Areas / exteriors
    root.querySelectorAll('.room').forEach(r => {
      const num = sel => parseFloat(r.querySelector(sel)?.value) || 0;
      const L = num('.r-l'), W = num('.r-w'), H = num('.r-h');
      const perimeter = 2 * (L + W), wallArea = perimeter * H, ceilingArea = L * W;
      const c = costProducts(r,
        x => (x.applyWalls ? wallArea : 0) + (x.applyCeiling ? ceilingArea : 0),
        x => [x.applyWalls && 'walls', x.applyCeiling && 'ceiling'].filter(Boolean).join(' and '));

      const priceItems = [], priceBullets = [];
      if (c.covers.walls)     billLine(priceItems, priceBullets, 'Walls',     wallArea,    SQFT,  'walls');
      if (c.covers.ceiling)   billLine(priceItems, priceBullets, 'Ceilings',  ceilingArea, SQFT,  'ceiling');
      if (c.covers.trim)      billLine(priceItems, priceBullets, 'Trim',      perimeter,   LINFT, 'trim');
      if (c.covers.baseboard) billLine(priceItems, priceBullets, 'Baseboard', perimeter,   LINFT, 'baseboard');
      const doors = num('.r-doors'), windows = num('.r-windows');
      billLine(priceItems, priceBullets, 'Doors', doors, unitsFor(doors, DOOR), 'door');
      if (S.windows) billLine(priceItems, priceBullets, 'Windows', windows, unitsFor(windows, WINDOW), 'window');

      pushArea(r.querySelector('.r-name').value || U.fallbackName, priceItems, priceBullets, c);
    });

    // ---- Single walls (width × height; trim/baseboard run the wall's width)
    root.querySelectorAll('.wall').forEach(w => {
      const num = sel => parseFloat(w.querySelector(sel)?.value) || 0;
      const width = num('.w-w'), wallArea = width * num('.w-h');
      const c = costProducts(w, x => x.applyWalls ? wallArea : 0, () => null);
      const priceItems = [], priceBullets = [];
      if (c.covers.walls)     billLine(priceItems, priceBullets, 'Wall',      wallArea, SQFT,  'walls');
      if (c.covers.trim)      billLine(priceItems, priceBullets, 'Trim',      width,    LINFT, 'trim');
      if (c.covers.baseboard) billLine(priceItems, priceBullets, 'Baseboard', width,    LINFT, 'baseboard');
      pushArea(w.querySelector('.w-name').value || 'Wall', priceItems, priceBullets, c);
    });

    const labor = laborFor(root, laborArea, val('employeeBurden', 0) / 100);
    const materialsAndSupplies = paintCost + suppliesCost;
    const yourCost = materialsAndSupplies + labor.laborCost;
    const pricing = applyMinimumCharge(cents(areas.reduce((s, a) => s + a.price, 0)), val('minJobCharge', 0));
    const margin = pricing.cashPrice - yourCost;
    const marginPct = pricing.cashPrice > 0 ? margin / pricing.cashPrice : null;
    const noRatesSet = rateKeys.every(k => rate(k) === 0);

    return { areas, labor, paintCost, suppliesCost, materialsAndSupplies, yourCost, pricing, margin, marginPct, noRatesSet,
             materials: finalizeMaterials(materialsMap) };
  }

  function updateBarcode(){ redrawBarcode($); }

  function newProjectNumber(){
    $('projectNumber').value = generateProjectNumber();
    recalc();
  }

  // Area-by-area: what the customer pays (billed surfaces), then your cost lines.
  function areasBreakdownHtml(e){
    return e.areas.map(a =>
      `<div class="summary-room-name">${a.name}</div>` +
      linesHtml(a.priceItems) +
      `<div class="line room-subtotal"><span class="l">Area price</span><span class="v">${fmt(a.price)}</span></div>` +
      a.costItems.map(i => `<div class="line sub"><span class="l">Your cost: ${i.label}</span><span class="v">${fmt(i.amount)}</span></div>`).join('')
    ).join('');
  }

  function costVsPriceHtml(e){
    const pct = e.marginPct === null ? '—' : `${(e.marginPct * 100).toFixed(1)}% of price`;
    return `<div class="summary-room-name">Your cost vs. price</div>` +
      `<div class="line"><span class="l">Paint &amp; primer</span><span class="v">${fmt(e.paintCost)}</span></div>` +
      `<div class="line"><span class="l">Supplies</span><span class="v">${fmt(e.suppliesCost)}</span></div>` +
      `<div class="line"><span class="l">Labor</span><span class="v">${fmt(e.labor.laborCost)}</span></div>` +
      `<div class="line room-subtotal"><span class="l">Your cost</span><span class="v">${fmt(e.yourCost)}</span></div>` +
      `<div class="line"><span class="l">Cash Price</span><span class="v">${fmt(e.pricing.cashPrice)}</span></div>` +
      `<div class="line room-subtotal"><span class="l">Margin (${pct})</span><span class="v">${fmt(e.margin)}</span></div>` +
      `<p class="hint" style="margin:4px 0 0;">${cfg.rateOnlyHint}</p>`;
  }

  function recalc(){
    const e = computeEstimate();
    updateBarcode();
    const card = cardPricing(e.pricing.cashPrice, $('ccSurchargePct').value);
    const ratesNote = e.noRatesSet
      ? `<p class="hint" style="margin:0 0 10px; color:var(--ink);"><strong>Set your rates</strong> in the Rates card — every price is $0 until you do.</p>`
      : '';
    $('summaryLines').innerHTML =
      ratesNote +
      areasBreakdownHtml(e) +
      laborBlockHtml(e.labor, $('employeeBurden').value) +
      costVsPriceHtml(e) +
      cashSummaryHtml(e.pricing, card, 'Sum of area prices') +
      materialsSummaryHtml(e.materials, "Combined across every area and wall, then rounded up once — not per area — so a shared paint isn't over-bought.");
    $('totalOut').textContent = fmt(e.pricing.cashPrice);
    drafts.schedule();
  }

  /* ---- PRINT VIEW (layout shared via common.js) ---- */
  function previewEstimate(){
    const e = computeEstimate();
    updateBarcode();
    const f = printFields($);
    const card = cardPricing(e.pricing.cashPrice, $('ccSurchargePct').value);

    const internalHtml = internalHeaderHtml(f) +
      areasBreakdownHtml(e) +
      laborBlockHtml(e.labor, $('employeeBurden').value) +
      costVsPriceHtml(e) +
      internalCustomerPricesHtml('Customer prices (per-area totals)', e.areas, e.pricing, card);

    const areasHtml = e.areas.map((a, idx) => customerAreaHtml(a, idx, cfg.notesPlaceholder)).join('');
    showPrintPreview(internalHtml, materialsPageHtml(e.materials, f), customerCopyHtml(f, areasHtml, e.pricing, card));
  }

  /* ---- SAVE / LOAD (file + autosave) ---- */
  function getEstimateData(){
    const data = readSharedFields($, key);
    data.rates = Object.fromEntries(rateKeys.map(k => [k, $(`rate-${k}`).value]));
    data.areas = Array.from(root.querySelectorAll('.room')).map(r => ({
      name: r.querySelector('.r-name').value,
      doors: r.querySelector('.r-doors').value,
      windows: r.querySelector('.r-windows')?.value,
      length: r.querySelector('.r-l').value,
      width: r.querySelector('.r-w').value,
      height: r.querySelector('.r-h').value,
      products: readProductRows(r),
    }));
    data.walls = Array.from(root.querySelectorAll('.wall')).map(w => ({
      name: w.querySelector('.w-name').value,
      width: w.querySelector('.w-w').value,
      height: w.querySelector('.w-h').value,
      products: readProductRows(w),
    }));
    data.employees = readEmployeeRows(root);
    return data;
  }

  function loadEstimateData(data){
    loadSharedFields($, data);
    rateKeys.forEach(k => { if (data.rates && data.rates[k] !== undefined) $(`rate-${k}`).value = data.rates[k]; });

    $('areasList').innerHTML = '';
    areaCount = 0;
    (data.areas || []).forEach(areaData => {
      addArea();
      const id = areaCount;
      const row = root.querySelector(`.room[data-room-id="${id}"]`);
      const set = (sel, v) => { const el = row.querySelector(sel); if (el) el.value = v; };
      set('.r-name', areaData.name ?? '');
      set('.r-doors', areaData.doors ?? 0);
      set('.r-windows', areaData.windows ?? 0);
      set('.r-l', areaData.length ?? 0);
      set('.r-w', areaData.width ?? 0);
      set('.r-h', areaData.height ?? 0);
      row.querySelector('.products-list').innerHTML = '';
      (areaData.products || []).forEach(prod => {
        addProduct(id, prod.type === 'supply' ? 'supply' : 'paint');
        fillProductRow(row.querySelector('.products-list').lastElementChild, prod);
      });
    });
    if (!data.areas || data.areas.length === 0) addArea();

    $('wallsList').innerHTML = '';
    wallCount = 0;
    (data.walls || []).forEach(wallData => {
      addWall();
      const id = wallCount;
      const row = root.querySelector(`.wall[data-wall-id="${id}"]`);
      const set = (sel, v) => { const el = row.querySelector(sel); if (el) el.value = v; };
      set('.w-name', wallData.name ?? '');
      set('.w-w', wallData.width ?? 0);
      set('.w-h', wallData.height ?? 0);
      row.querySelector('.products-list').innerHTML = '';
      (wallData.products || []).forEach(prod => {
        addProduct(id, prod.type === 'supply' ? 'supply' : 'paint', 'wall');
        fillProductRow(row.querySelector('.products-list').lastElementChild, prod);
      });
    });

    loadEmployees(data.employees);
    recalc();
  }

  function loadEmployees(list){
    $('employeesList').innerHTML = '';
    employeeCount = 0;
    (list || []).forEach(empData => {
      addEmployee(empData.name, empData.rate, empData.prod);
      const row = root.querySelector(`.employee[data-employee-id="${employeeCount}"]`);
      const enabled = empData.enabled !== false;
      row.querySelector('.e-enabled').checked = enabled;
      row.classList.toggle('disabled', !enabled);
    });
    if (!list || list.length === 0){
      addEmployee('Employee 1', 20, 90);
      addEmployee('Employee 2', 20, 90);
    }
  }

  function exportEstimate(){ downloadEstimateFile(getEstimateData()); }
  function pickFile(){ $('loadFileInput').click(); }
  function importEstimateFile(input){ readEstimateFile(input, key, loadEstimateData); }

  function resetForm(){
    if(!confirm('Clear everything and start a new estimate? The current one (and its autosaved draft) will be gone, so use Save as file first if you want to keep it.')) return;
    $('areasList').innerHTML = '';
    areaCount = 0;
    addArea();
    $('wallsList').innerHTML = '';
    wallCount = 0;
    loadEmployees([]);
    resetSharedFields($, rateKeys.map(k => `rate-${k}`));
    recalc();
    drafts.clear();
  }

  /* ---- Start-up for this instance ---- */
  $('estDate').value = todayISO();
  $('projectNumber').value = generateProjectNumber();
  addArea();
  addEmployee('Employee 1', 20, 90);
  addEmployee('Employee 2', 20, 90);
  recalc();
  drafts.restore();

  return {
    key, root, draftKey: drafts.draftKey,
    addArea, removeArea, addWall, removeWall, addProduct, removeProduct,
    addEmployee, removeEmployee, newProjectNumber,
    recalc, previewEstimate, exportEstimate, pickFile, importEstimateFile, resetForm,
    flushDraft: drafts.flush,
  };
}

/* ============================================================
   START-UP — one Commercial calculator per mount point on the page.
   ============================================================ */
document.querySelectorAll('[data-estimator]').forEach(host => {
  const key = host.dataset.estimator;
  ESTIMATORS[key] = createCommercialEstimator(host, key, COMMERCIAL_CONFIGS[key]);
});

/* ============================================================
   True Hue Estimate Builder — residential.js
   The Residential calculator: PER-ROOM pricing (materials + labor
   + markup, bundled and rounded up per room), used by
   residential.html for both Interior and Exterior. Loaded AFTER
   common.js, whose CALCULATOR BUILDING BLOCKS supply the shared
   cards, rows, pricing rules, print layout, autosave, and save/load.

   Interior and Exterior differ only by ESTIMATOR_CONFIGS below —
   labels, and which surfaces exist (ceiling / baseboard / trim).
   Each instance only looks inside its own page (its `$` is scoped
   to its root), so the two never read each other's rooms.
   ============================================================ */

const ESTIMATOR_CONFIGS = {
  'residential-interior': {
    surfaceTitle: 'Interior',
    surfaceSub: "Add one entry per room. Paint coverage, price, coats, and door/window/trim rates are all set per room, so a room with a different paint or finish doesn't throw off the rest of the job.",
    surfaces: { ceiling: true, baseboard: true, trim: true },
    unit: {
      nameLabel: 'Room name',
      defaultName: id => `Room ${id}`,
      fallbackName: 'Room',
      addLabel: '+ Add room',
      removeTitle: 'Remove room',
      productsLabel: 'Products for this room',
      productsHint: 'Each product below picks its own surfaces — so walls can be one paint and the ceiling another, without paying for either product over the whole room.',
      pricingLabel: 'Doors, baseboard, windows &amp; trim pricing (flat rate per unit)',
    },
    walls: {
      hint: 'For an accent wall or partial-room job — just a width and height, no doors/windows/length.',
      productsHint: 'A single wall only has Walls, Baseboard, and Trim to apply a product to — no ceiling.',
      pricingLabel: 'Baseboard &amp; trim pricing (flat rate per linear ft)',
    },
    words: {
      subtotalSummary: 'Room subtotal (materials only — labor is combined below)',
      subtotalPrint: 'Room subtotal (materials only — labor combined below)',
      pricesPhrase: 'room prices',
      customerPricesHeading: 'Customer-facing room prices (rounded up to nearest $10)',
      materialsHint: "Combined across every room and wall, then rounded up once — not per room — so a shared paint isn't over-bought.",
      notesPlaceholder: 'Additional notes for this room (optional) — e.g. patch drywall crack near window, move furniture before starting',
    },
    legacyDraftKey: 'thpc_estimate_draft', // v6.4–6.5 draft key, migrated on first load
  },

  'residential-exterior': {
    surfaceTitle: 'Exterior',
    surfaceSub: "Add one entry per exterior. Paint coverage, price, coats, and door/window rates are all set per entry, so an area with a different paint or finish doesn't throw off the rest of the job.",
    surfaces: { ceiling: false, baseboard: false, trim: false },
    unit: {
      nameLabel: 'Exterior',
      defaultName: id => id === 1 ? 'Exterior' : `Exterior ${id}`,
      fallbackName: 'Exterior',
      addLabel: '+ Add exterior',
      removeTitle: 'Remove exterior',
      productsLabel: 'Products',
      productsHint: 'Paint and primer cover the full wall area all the way around: (length + width) × 2 × height.',
      pricingLabel: 'Door &amp; window pricing (flat rate per unit)',
    },
    walls: {
      hint: 'For one side of a building or a partial job — just a width and height, no doors/windows/length.',
      productsHint: '',
      pricingLabel: '',
    },
    words: {
      subtotalSummary: 'Subtotal (materials only — labor is combined below)',
      subtotalPrint: 'Subtotal (materials only — labor combined below)',
      pricesPhrase: 'prices',
      customerPricesHeading: 'Customer-facing prices (rounded up to nearest $10)',
      materialsHint: "Combined across every exterior and wall, then rounded up once — not per entry — so a shared paint isn't over-bought.",
      notesPlaceholder: 'Additional notes for this area (optional) — e.g. scrape and prime peeling spots, protect plants and walkways',
    },
  },
};

/* ---- One Residential calculator instance ---- */
function createEstimator(root, key, cfg){
  const S = cfg.surfaces, U = cfg.unit, WORDS = cfg.words;

  root.innerHTML = calculatorLayoutHtml(
    clientCardHtml() + `
      <div class="card">
        <div class="card-header" onclick="toggleCard(this)">
          <h2>${cfg.surfaceTitle}</h2>
          <span class="chevron">⌄</span>
        </div>
        <div class="card-body">
          <p class="sub">${cfg.surfaceSub}</p>
          <div data-f="roomsList"></div>
          <div class="row-actions">
            <button type="button" class="small" onclick="EST(this).addRoom()">${U.addLabel}</button>
          </div>

          <div class="room-section-label">Single walls</div>
          <p class="hint" style="margin-top:-4px;">${cfg.walls.hint}</p>
          <div data-f="wallsList"></div>
          <div class="row-actions">
            <button type="button" class="small" onclick="EST(this).addWall()">+ Add single wall</button>
          </div>
        </div>
      </div>` +
    laborCardHtml() +
    feesCardHtml({ withMarkup: true, minHint: 'If the rounded room prices add up to less than this, the estimate adds a "Minimum job charge" line to bring the Cash Price up to it. Set to 0 to turn it off.' }) +
    notesCardHtml(),
    'Total (exact, pre-rounding)'
  );

  // Scoped lookups — these shadow the global $ / val on purpose, so every
  // line below only ever sees THIS page's fields.
  const $ = name => root.querySelector(`[data-f="${name}"]`);
  const val = (name, fallback=0) => {
    const v = parseFloat($(name).value);
    return isNaN(v) ? fallback : v;
  };

  const drafts = createDraftStore({
    key, legacyKey: cfg.legacyDraftKey,
    getData: getEstimateData, loadData: loadEstimateData, statusEl: $('draftStatus'),
  });

  let roomCount = 0, productCount = 0, wallCount = 0, employeeCount = 0;

  /* ============================================================
     ROOMS (Interior) / EXTERIORS (Exterior)
     ============================================================ */
  function addRoom(){
    roomCount++;
    const id = roomCount;
    const div = document.createElement('div');
    div.className = 'room';
    div.dataset.roomId = id;
    const pricingFields = [
      `<div class="field"><label>Per door ($)</label><input type="number" class="r-doorprice" value="100" min="0"></div>`,
      `<div class="field"><label>Per window ($)</label><input type="number" class="r-windowprice" value="100" min="0"></div>`,
      S.baseboard && `<div class="field"><label>Per linear ft baseboard ($)</label><input type="number" class="r-baseboardprice" value="5" min="0" step="0.1"></div>`,
      S.trim && `<div class="field"><label>Per linear ft trim ($)</label><input type="number" class="r-trimprice" value="6" min="0" step="0.1"></div>`,
    ].filter(Boolean);
    div.innerHTML = `
      <div class="room-top">
        <div class="field" style="max-width:160px;">
          <label>${U.nameLabel}</label>
          <input type="text" class="r-name" value="${U.defaultName(id)}">
        </div>
        <div class="field" style="max-width:110px;"><label>Doors</label><input type="number" class="r-doors" value="0" min="0"></div>
        <div class="field" style="max-width:110px;"><label>Windows</label><input type="number" class="r-windows" value="0" min="0"></div>
        <button type="button" class="ghost" title="${U.removeTitle}" onclick="EST(this).removeRoom(${id})">✕</button>
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

      <div class="room-section-label">${U.pricingLabel}</div>
      <div class="grid cols-${pricingFields.length} room-fields">
        ${pricingFields.join('\n        ')}
      </div>
    `;
    $('roomsList').appendChild(div);
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
    // Only the surfaces this page has get a checkbox; a single wall never has a ceiling.
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

  function removeRoom(id){
    if (root.querySelectorAll('.room').length <= 1){
      // keep at least one entry, just clear/reset it
      const row = root.querySelector(`.room[data-room-id="${id}"]`);
      const set = (sel, v) => { const el = row.querySelector(sel); if (el) el.value = v; };
      set('.r-name', U.defaultName(1));
      set('.r-l', 0); set('.r-w', 0); set('.r-h', 0);
      set('.r-doors', 0); set('.r-windows', 0);
      set('.r-doorprice', 100); set('.r-windowprice', 100);
      set('.r-baseboardprice', 5); set('.r-trimprice', 6);
      row.querySelector('.products-list').innerHTML = '';
      addProduct(id, 'paint');
      recalc();
      return;
    }
    root.querySelector(`.room[data-room-id="${id}"]`)?.remove();
    recalc();
  }

  /* ============================================================
     SINGLE WALLS — a lighter version of a room: just a width and
     height, no doors/windows or their pricing. Optional; starts empty.
     ============================================================ */
  function addWall(){
    wallCount++;
    const id = wallCount;
    const div = document.createElement('div');
    div.className = 'wall';
    div.dataset.wallId = id;
    const pricingFields = [
      S.baseboard && `<div class="field"><label>Per linear ft baseboard ($)</label><input type="number" class="w-baseboardprice" value="5" min="0" step="0.1"></div>`,
      S.trim && `<div class="field"><label>Per linear ft trim ($)</label><input type="number" class="w-trimprice" value="6" min="0" step="0.1"></div>`,
    ].filter(Boolean);
    const pricingHtml = pricingFields.length ? `
      <div class="room-section-label">${cfg.walls.pricingLabel}</div>
      <div class="grid cols-${pricingFields.length} room-fields">
        ${pricingFields.join('\n        ')}
      </div>` : '';
    const productsHint = cfg.walls.productsHint ? `<p class="hint" style="margin-top:-4px;">${cfg.walls.productsHint}</p>` : '';
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
      ${productsHint}
      <div class="products-list" data-wall-products="${id}"></div>
      <div class="row-actions product-add-row">
        <button type="button" class="small" onclick="EST(this).addProduct(${id}, 'paint', 'wall')">+ Add paint / primer</button>
        <button type="button" class="small" onclick="EST(this).addProduct(${id}, 'supply', 'wall')">+ Add supplies</button>
      </div>
      ${pricingHtml}
    `;
    $('wallsList').appendChild(div);
    addProduct(id, 'paint', 'wall');
  }

  function removeWall(id){
    root.querySelector(`.wall[data-wall-id="${id}"]`)?.remove();
    recalc();
  }

  /* ============================================================
     EMPLOYEES (labor)
     ============================================================ */
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
     CALCULATION — per-room pricing: each room's materials,
     doors/windows/trim and its share of labor, marked up and
     rounded up to the nearest $10.
     ============================================================ */
  function computeEstimate(){
    const markupPct  = val('markupPct', 0) / 100;

    let paintCost = 0, suppliesCost = 0;
    let doorCost = 0, windowCost = 0, trimCost = 0, baseboardCost = 0;
    let laborArea = 0; // sq ft, already coats-adjusted per room
    const rooms = [];  // per-room breakdown for the summary display
    const materialsMap = new Map(); // shared paint needs across every room AND wall (see finalizeMaterials)

    // Supplies + paint for one room/wall. Returns the room's labor area and
    // which linear-ft surfaces (baseboard/trim) any of its products claimed.
    function priceProducts(container, roomItems, printBullets, surfaceAreaFor, surfacesTextFor){
      let areaLabor = 0, doesBaseboard = false, doesTrim = false;
      container.querySelectorAll('.products-list .product').forEach(p => {
        const productName = p.querySelector('.p-name').value || (p.dataset.type === 'paint' ? 'Paint' : 'Supplies');
        if (p.dataset.type === 'paint'){
          const x = readPaintProduct(p);
          if (x.applyBaseboard) doesBaseboard = true;
          if (x.applyTrim) doesTrim = true;
          const line = paintProductLine(p, productName, surfaceAreaFor(x), surfacesTextFor(x), materialsMap);
          paintCost += line.cost;
          areaLabor += line.laborArea;
          if (line.gal > 0){
            roomItems.push({ label: line.label, amount: line.cost });
            printBullets.push(line.bullet);
          }
        } else {
          const flat = parseFloat(p.querySelector('.p-flatcost').value) || 0;
          suppliesCost += flat;
          if (flat > 0){
            roomItems.push({ label: productName, amount: flat });
            printBullets.push(productName);
          }
        }
      });
      return { areaLabor, doesBaseboard, doesTrim };
    }

    // Baseboard/trim only need ONE product to claim them for the per-linear-ft cost.
    function linearFt(roomItems, printBullets, claimed, ft, baseboardPrice, trimPrice){
      if (claimed.doesBaseboard && ft > 0){
        const cost = ft * baseboardPrice;
        baseboardCost += cost;
        roomItems.push({ label: `Baseboard — ${ft.toFixed(0)} ft × ${fmt(baseboardPrice)}/ft`, amount: cost });
        printBullets.push(`Painting baseboard (~${ft.toFixed(0)} linear ft)`);
      }
      if (claimed.doesTrim && ft > 0){
        const cost = ft * trimPrice;
        trimCost += cost;
        roomItems.push({ label: `Trim — ${ft.toFixed(0)} ft × ${fmt(trimPrice)}/ft`, amount: cost });
        printBullets.push(`Painting trim (~${ft.toFixed(0)} linear ft)`);
      }
    }

    // ---- Rooms / exteriors: each product picks its own surfaces, so walls can
    // be one paint and the ceiling another without either paying for the whole room.
    root.querySelectorAll('.room').forEach(r => {
      const roomItems = [], printBullets = [];
      const num = sel => parseFloat(r.querySelector(sel)?.value) || 0;
      const L = num('.r-l'), W = num('.r-w'), H = num('.r-h');
      const perimeter = 2 * (L + W);
      const wallArea = perimeter * H;
      const ceilingArea = L * W;

      const claimed = priceProducts(r, roomItems, printBullets,
        x => (x.applyWalls ? wallArea : 0) + (x.applyCeiling ? ceilingArea : 0),
        x => [x.applyWalls && 'walls', x.applyCeiling && 'ceiling'].filter(Boolean).join(' and '));
      laborArea += claimed.areaLabor;
      linearFt(roomItems, printBullets, claimed, perimeter, num('.r-baseboardprice'), num('.r-trimprice'));

      const doors = num('.r-doors'), windows = num('.r-windows');
      const doorPrice = num('.r-doorprice'), windowPrice = num('.r-windowprice');
      doorCost += doors * doorPrice;
      windowCost += windows * windowPrice;
      if (doors > 0){
        roomItems.push({ label: `Doors — ${doors} × ${fmt(doorPrice)}/door`, amount: doors * doorPrice });
        printBullets.push(`Painting ${doors} door${doors === 1 ? '' : 's'}`);
      }
      if (windows > 0){
        roomItems.push({ label: `Windows — ${windows} × ${fmt(windowPrice)}/window`, amount: windows * windowPrice });
        printBullets.push(`Painting ${windows} window${windows === 1 ? '' : 's'}`);
      }

      if (roomItems.length > 0){
        rooms.push({ name: r.querySelector('.r-name').value || U.fallbackName, items: roomItems,
          subtotal: roomItems.reduce((sum, item) => sum + item.amount, 0), laborArea: claimed.areaLabor, printBullets });
      }
    });

    // ---- Single walls: width × height, no ceiling; baseboard/trim run the wall's width.
    // Pushed into the same `rooms` array so the summary and print handle them for free.
    root.querySelectorAll('.wall').forEach(w => {
      const roomItems = [], printBullets = [];
      const num = sel => parseFloat(w.querySelector(sel)?.value) || 0;
      const width = num('.w-w'), wallArea = width * num('.w-h');
      const claimed = priceProducts(w, roomItems, printBullets, x => x.applyWalls ? wallArea : 0, () => null);
      laborArea += claimed.areaLabor;
      linearFt(roomItems, printBullets, claimed, width, num('.w-baseboardprice'), num('.w-trimprice'));
      if (roomItems.length > 0){
        rooms.push({ name: w.querySelector('.w-name').value || 'Wall', items: roomItems,
          subtotal: roomItems.reduce((sum, item) => sum + item.amount, 0), laborArea: claimed.areaLabor, printBullets });
      }
    });

    const labor = laborFor(root, laborArea, val('employeeBurden', 0) / 100);
    const preMarkup = paintCost + suppliesCost + labor.laborCost + doorCost + windowCost + trimCost + baseboardCost;
    const markupAmount = preMarkup * markupPct;
    const total = preMarkup + markupAmount;

    // Each room = its own items + its share of labor (by the labor-hours it
    // drove) + markup, rounded up to a clean $10 for the printed estimate.
    rooms.forEach(room => {
      const roomLaborShare = laborArea > 0 ? labor.laborCost * (room.laborArea / laborArea) : 0;
      room.bundledPrice = Math.ceil(((room.subtotal + roomLaborShare) * (1 + markupPct)) / 10) * 10;
      room.price = room.bundledPrice;
    });

    const pricing = applyMinimumCharge(rooms.reduce((sum, room) => sum + room.bundledPrice, 0), val('minJobCharge', 0));
    return { labor, preMarkup, markupAmount, total, rooms, pricing, materials: finalizeMaterials(materialsMap) };
  }

  function updateBarcode(){ redrawBarcode($); }

  function newProjectNumber(){
    $('projectNumber').value = generateProjectNumber();
    recalc(); // redraws the barcode and autosaves the new number
  }

  // Room-by-room lines + subtotal (live summary and internal copy).
  function roomsBreakdownHtml(e, subtotalLabel){
    return e.rooms.map(room =>
      `<div class="summary-room-name">${room.name}</div>` + linesHtml(room.items) +
      `<div class="line room-subtotal"><span class="l">${subtotalLabel}</span><span class="v">${fmt(room.subtotal)}</span></div>`
    ).join('');
  }
  function markupLineHtml(e){
    return `<div class="line" style="margin-top:8px;"><span class="l">Markup — ${$('markupPct').value}% of ${fmt(e.preMarkup)} (materials + labor)</span><span class="v">${fmt(e.markupAmount)}</span></div>`;
  }

  function recalc(){
    const e = computeEstimate();
    updateBarcode();
    const card = cardPricing(e.pricing.cashPrice, $('ccSurchargePct').value);
    $('summaryLines').innerHTML =
      roomsBreakdownHtml(e, WORDS.subtotalSummary) +
      laborBlockHtml(e.labor, $('employeeBurden').value) +
      markupLineHtml(e) +
      cashSummaryHtml(e.pricing, card, `Sum of rounded ${WORDS.pricesPhrase}`) +
      materialsSummaryHtml(e.materials, WORDS.materialsHint);
    $('totalOut').textContent = fmt(e.total);

    // Every edit already flows through recalc() (typing, checkboxes, adding
    // or removing rows), so this is the one place autosave needs to hook in.
    drafts.schedule();
  }

  /* ---- PRINT VIEW (layout shared via common.js) ---- */
  function previewEstimate(){
    const e = computeEstimate();
    updateBarcode(); // make sure the barcode reflects the current project number before we embed it
    const f = printFields($);
    const card = cardPricing(e.pricing.cashPrice, $('ccSurchargePct').value);

    const internalHtml = internalHeaderHtml(f) +
      roomsBreakdownHtml(e, WORDS.subtotalPrint) +
      laborBlockHtml(e.labor, $('employeeBurden').value) +
      markupLineHtml(e) +
      `<div class="p-grand-total"><span>Total (exact)</span><span>${fmt(e.total)}</span></div>` +
      internalCustomerPricesHtml(WORDS.customerPricesHeading, e.rooms, e.pricing, card);

    const areasHtml = e.rooms.map((room, idx) =>
      customerAreaHtml({ name: room.name, price: room.bundledPrice, bullets: room.printBullets }, idx, WORDS.notesPlaceholder)
    ).join('');

    showPrintPreview(internalHtml, materialsPageHtml(e.materials, f), customerCopyHtml(f, areasHtml, e.pricing, card));
  }

  /* ============================================================
     SAVE / LOAD (file + autosave share these two)
     ============================================================ */
  function getEstimateData(){
    const data = readSharedFields($, key);
    data.rooms = Array.from(root.querySelectorAll('.room')).map(r => ({
      name: r.querySelector('.r-name').value,
      doors: r.querySelector('.r-doors').value,
      windows: r.querySelector('.r-windows').value,
      length: r.querySelector('.r-l').value,
      width: r.querySelector('.r-w').value,
      height: r.querySelector('.r-h').value,
      doorPrice: r.querySelector('.r-doorprice').value,
      windowPrice: r.querySelector('.r-windowprice').value,
      baseboardPrice: r.querySelector('.r-baseboardprice')?.value,
      trimPrice: r.querySelector('.r-trimprice')?.value,
      products: readProductRows(r),
    }));
    data.walls = Array.from(root.querySelectorAll('.wall')).map(w => ({
      name: w.querySelector('.w-name').value,
      width: w.querySelector('.w-w').value,
      height: w.querySelector('.w-h').value,
      baseboardPrice: w.querySelector('.w-baseboardprice')?.value,
      trimPrice: w.querySelector('.w-trimprice')?.value,
      products: readProductRows(w),
    }));
    data.employees = readEmployeeRows(root);
    return data;
  }

  function loadEstimateData(data){
    loadSharedFields($, data);

    $('roomsList').innerHTML = '';
    roomCount = 0;
    (data.rooms || []).forEach(roomData => {
      addRoom(); // creates the row plus one default paint product
      const id = roomCount;
      const row = root.querySelector(`.room[data-room-id="${id}"]`);
      const set = (sel, v) => { const el = row.querySelector(sel); if (el) el.value = v; };
      set('.r-name', roomData.name ?? '');
      set('.r-doors', roomData.doors ?? 0);
      set('.r-windows', roomData.windows ?? 0);
      set('.r-l', roomData.length ?? 0);
      set('.r-w', roomData.width ?? 0);
      set('.r-h', roomData.height ?? 0);
      set('.r-doorprice', roomData.doorPrice ?? 100);
      set('.r-windowprice', roomData.windowPrice ?? 100);
      set('.r-baseboardprice', roomData.baseboardPrice ?? 5);
      set('.r-trimprice', roomData.trimPrice ?? 6);
      row.querySelector('.products-list').innerHTML = '';
      (roomData.products || []).forEach(prod => {
        addProduct(id, prod.type === 'supply' ? 'supply' : 'paint');
        fillProductRow(row.querySelector('.products-list').lastElementChild, prod);
      });
    });
    if (!data.rooms || data.rooms.length === 0) addRoom();

    $('wallsList').innerHTML = '';
    wallCount = 0;
    (data.walls || []).forEach(wallData => {
      addWall(); // creates the row plus one default paint product
      const id = wallCount;
      const row = root.querySelector(`.wall[data-wall-id="${id}"]`);
      const set = (sel, v) => { const el = row.querySelector(sel); if (el) el.value = v; };
      set('.w-name', wallData.name ?? '');
      set('.w-w', wallData.width ?? 0);
      set('.w-h', wallData.height ?? 0);
      set('.w-baseboardprice', wallData.baseboardPrice ?? 5);
      set('.w-trimprice', wallData.trimPrice ?? 6);
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
    $('roomsList').innerHTML = '';
    roomCount = 0;
    addRoom();
    $('wallsList').innerHTML = '';
    wallCount = 0;
    loadEmployees([]);
    resetSharedFields($);
    recalc();
    drafts.clear();
  }

  /* ---- Start-up for this instance ---- */
  $('estDate').value = todayISO();
  $('projectNumber').value = generateProjectNumber();
  addRoom();                           // start with one room / exterior
  addEmployee('Employee 1', 20, 90);
  addEmployee('Employee 2', 20, 90);
  recalc();
  drafts.restore();

  return {
    key, root, draftKey: drafts.draftKey,
    addRoom, removeRoom, addWall, removeWall, addProduct, removeProduct,
    addEmployee, removeEmployee, newProjectNumber,
    recalc, previewEstimate, exportEstimate, pickFile, importEstimateFile, resetForm,
    flushDraft: drafts.flush,
  };
}

/* ============================================================
   START-UP — one Residential calculator per mount point on the page.
   ============================================================ */
document.querySelectorAll('[data-estimator]').forEach(host => {
  const key = host.dataset.estimator;
  ESTIMATORS[key] = createEstimator(host, key, ESTIMATOR_CONFIGS[key]);
});

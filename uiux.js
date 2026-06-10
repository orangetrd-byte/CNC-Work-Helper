(() => {
  const storeKey = 'cncLatheWorkHelper.v4';
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = v => { const n = Number(String(v ?? '').trim().replace(/^\./, '0.').replace(/^-\./, '-0.')); return Number.isFinite(n) ? n : null; };
  const fmt = v => Number.isFinite(v) ? Number(v).toFixed(4).replace(/0+$/, '').replace(/\.$/, '') : '--';
  const read = () => { try { return JSON.parse(localStorage.getItem(storeKey) || '{}'); } catch { return {}; } };
  const jobs = () => Array.isArray(read().jobs) ? read().jobs : [];
  const codeText = () => $('gcodeEditor')?.value || $('gcodeOut')?.textContent || '';
  const click = id => $(id)?.click();

  const primaryTabs = [
    ['notesView', 'Notes'],
    ['setupView', 'Setup'],
    ['toolsView', 'Tools'],
    ['gcodeView', 'G-Code'],
    ['simView', 'Simulator'],
    ['assistantView', 'Assistant'],
    ['referenceHubView', 'References']
  ];
  const referenceViews = [
    ['manualView', 'Move'],
    ['tipsView', 'Tips'],
    ['symbolsView', 'Symbols'],
    ['geometryView', 'Geometry'],
    ['handbookView', 'Codes'],
    ['savedView', 'Saved']
  ];

  function showOnly(viewId) {
    document.querySelectorAll('main > .view').forEach(section => section.classList.add('hidden'));
    if (viewId === 'referenceHubView') {
      $('referenceHubView')?.classList.remove('hidden');
      const activeRef = document.querySelector('.ref-chip.active')?.dataset.refView || 'manualView';
      showReference(activeRef);
    } else {
      $(viewId)?.classList.remove('hidden');
    }
    document.querySelectorAll('.uiux-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.view === viewId));
  }

  function showReference(viewId) {
    referenceViews.forEach(([id]) => $(id)?.classList.add('hidden'));
    $(viewId)?.classList.remove('hidden');
    document.querySelectorAll('.ref-chip').forEach(btn => btn.classList.toggle('active', btn.dataset.refView === viewId));
    applyReferenceFilter($('referenceSearchInput')?.value || '');
  }

  function buildTabs() {
    if ($('uiuxTabs')) return;
    const tabbar = document.createElement('nav');
    tabbar.id = 'uiuxTabs';
    tabbar.className = 'uiux-tabs';
    tabbar.setAttribute('aria-label', 'App sections');
    tabbar.innerHTML = primaryTabs.map(([id, label]) => `<button class="uiux-tab" data-view="${id}" type="button">${label}</button>`).join('');
    document.querySelector('header')?.after(tabbar);
    document.querySelector('.footer-nav')?.classList.add('legacy-nav-hidden');
    const ref = document.createElement('section');
    ref.id = 'referenceHubView';
    ref.className = 'view grid hidden';
    ref.innerHTML = `<div class="card span-2 reference-hub"><div class="section-head"><h2>References</h2><span class="mini">Searchable quick references, calculators, symbols, tips, and saved data.</span></div><div class="field reference-search"><label for="referenceSearchInput">Search / filter current reference</label><input id="referenceSearchInput" placeholder="Search Z0, G71, work shift, tap drill, thread, jaws"></div><div class="ref-chips">${referenceViews.map(([id, label], i) => `<button class="ref-chip ${i === 0 ? 'active' : ''}" data-ref-view="${id}" type="button">${label}</button>`).join('')}</div><div class="ref-quick-jumps"><button data-ref-view="handbookView" type="button">Codes</button><button data-ref-view="tipsView" type="button">Setup Tips</button><button data-ref-view="symbolsView" type="button">Symbols</button><button data-ref-view="savedView" type="button">Saved Jobs</button></div></div>`;
    document.querySelector('main')?.appendChild(ref);
    $('uiuxTabs').addEventListener('click', e => { const b = e.target.closest('.uiux-tab'); if (b) showOnly(b.dataset.view); });
    ref.addEventListener('click', e => { const b = e.target.closest('.ref-chip,[data-ref-view]'); if (b) showReference(b.dataset.refView); });
    $('referenceSearchInput')?.addEventListener('input', e => applyReferenceFilter(e.target.value));
    document.querySelectorAll('.footer-nav .nav').forEach(btn => btn.addEventListener('click', () => {
      const id = btn.dataset.view;
      if (referenceViews.some(([v]) => v === id)) { showOnly('referenceHubView'); showReference(id); }
      else showOnly(id);
    }));
    showOnly('notesView');
  }

  function activeReferenceSection() {
    return referenceViews.map(([id]) => $(id)).find(section => section && !section.classList.contains('hidden'));
  }

  function applyReferenceFilter(raw) {
    const section = activeReferenceSection();
    if (!section) return;
    const term = String(raw || '').toLowerCase().trim();
    const targets = section.querySelectorAll('.card, .item, .code-row, .code-category, .tap-table, .mini-calc, .refGrid p');
    targets.forEach(el => {
      const match = !term || el.textContent.toLowerCase().includes(term);
      el.classList.toggle('filtered-out', !match);
    });
    if ($('referenceFilterStatus')) $('referenceFilterStatus').textContent = term ? `Filtering: ${raw}` : 'Showing all reference items';
  }

  function makeJobActions() {
    if ($('jobActionsMenu')) return;
    const head = $('notesView')?.querySelector('.section-head');
    if (!head) return;
    head.querySelector('.actions')?.classList.add('job-actions-old');
    head.insertAdjacentHTML('beforeend', `<details id="jobActionsMenu" class="job-actions-menu"><summary>Job Actions</summary><div class="job-actions-list"><button type="button" data-job-action="new">New</button><button type="button" data-job-action="save">Save</button><button type="button" data-job-action="duplicate">Duplicate</button><button type="button" data-job-action="load">Load</button><button type="button" data-job-action="export">Export</button><button type="button" data-job-action="import">Import</button></div></details>`);
    $('jobActionsMenu').addEventListener('click', e => {
      const action = e.target.closest('[data-job-action]')?.dataset.jobAction;
      if (!action) return;
      e.preventDefault();
      const map = { new: 'newJobBtn', save: 'saveJobBtn', duplicate: 'duplicateJobBtn', load: 'loadJobBtn', export: 'exportJobBtn' };
      if (action === 'import') { showOnly('referenceHubView'); showReference('savedView'); $('importFile')?.click(); }
      else if (action === 'export') { showOnly('referenceHubView'); showReference('savedView'); setTimeout(() => click(map[action]), 80); }
      else click(map[action]);
      $('jobActionsMenu').open = false;
    });
  }

  function makeSaveStatus() {
    if ($('saveSignal')) return;
    document.querySelector('.status-row')?.insertAdjacentHTML('beforeend', '<span id="saveSignal" class="save-signal saved"><span></span>Saved</span>');
    const setDirty = () => { const s = $('saveSignal'); if (s) { s.className = 'save-signal unsaved'; s.lastChild.textContent = 'Unsaved Changes'; } };
    const setSaved = () => { const s = $('saveSignal'); if (s) { s.className = 'save-signal saved'; s.lastChild.textContent = 'Saved'; } };
    document.querySelectorAll('input, textarea, select').forEach(el => el.addEventListener('input', setDirty));
    ['saveJobBtn','saveCodeBtn','saveSetupBtn','exportJobBtn'].forEach(id => $(id)?.addEventListener('click', () => setTimeout(setSaved, 250)));
    const oldSet = Storage.prototype.setItem;
    if (!window.__uiuxSaveSignalPatched) {
      window.__uiuxSaveSignalPatched = true;
      Storage.prototype.setItem = function(k, v) { const r = oldSet.apply(this, arguments); if (k === storeKey) setSaved(); return r; };
    }
  }

  function makeFab() {
    if ($('uiuxFab')) return;
    document.body.insertAdjacentHTML('beforeend', `<details id="uiuxFab" class="uiux-fab"><summary>+</summary><div><button type="button" data-fab="new">New Job</button><button type="button" data-fab="save">Save</button><button type="button" data-fab="export">Export</button><button type="button" data-fab="load">Load</button></div></details>`);
    $('uiuxFab').addEventListener('click', e => {
      const a = e.target.closest('[data-fab]')?.dataset.fab;
      if (!a) return;
      e.preventDefault();
      ({ new: () => click('newJobBtn'), save: () => click('saveJobBtn'), export: () => { showOnly('referenceHubView'); showReference('savedView'); setTimeout(() => click('exportJobBtn'), 80); }, load: () => click('loadJobBtn') })[a]?.();
      $('uiuxFab').open = false;
    });
  }

  function makeJobSearch() {
    if ($('jobSearchPanel')) return;
    $('savedView')?.querySelector('.card')?.insertAdjacentHTML('afterbegin', '<div id="jobSearchPanel" class="job-search-panel"><label for="jobSearchInput">Search Jobs</label><input id="jobSearchInput" placeholder="Part number, material, machine"></div>');
    $('notesView')?.insertAdjacentHTML('beforeend', '<div class="card span-2 compact-job-search"><div class="section-head"><h2>Find Jobs</h2><span class="mini">Search saved jobs by part, material, or machine.</span></div><input id="jobSearchInputNotes" placeholder="Search jobs"><div id="jobSearchResults" class="list compact-results"></div></div>');
    const render = q => {
      const term = String(q || '').toLowerCase().trim();
      const list = jobs().filter(j => !term || [j.partNumber, j.material, j.machine, j.operation].some(v => String(v || '').toLowerCase().includes(term))).slice(0, 25);
      const html = list.map(j => `<button type="button" class="item search-job" data-job-id="${esc(j.id)}"><strong>${esc(j.partNumber || 'Untitled job')}</strong><span>${esc([j.material, j.machine, j.operation].filter(Boolean).join(' | '))}</span></button>`).join('') || '<p class="hint">No matching jobs.</p>';
      if ($('jobSearchResults')) $('jobSearchResults').innerHTML = html;
    };
    function filterExistingLists(q) {
      const term = String(q || '').toLowerCase().trim();
      ['jobsList','setupJobsList','recentJobsList'].forEach(id => $(id)?.querySelectorAll('.item').forEach(item => item.classList.toggle('filtered-out', !!term && !item.textContent.toLowerCase().includes(term))));
    }
    ['jobSearchInput','jobSearchInputNotes'].forEach(id => $(id)?.addEventListener('input', e => { render(e.target.value); filterExistingLists(e.target.value); }));
    $('jobSearchResults')?.addEventListener('click', e => {
      const id = e.target.closest('[data-job-id]')?.dataset.jobId;
      if (!id) return;
      const st = read(); st.currentJobId = id; localStorage.setItem(storeKey, JSON.stringify(st)); location.reload();
    });
    render('');
  }

  function collapseBeginner() {
    if ($('beginnerResources')) return;
    const panel = $('beginnerNotesPanel');
    if (!panel) return;
    const details = document.createElement('details');
    details.id = 'beginnerResources';
    details.className = 'card span-2 beginner-resources';
    details.innerHTML = '<summary>Beginner Resources</summary><div class="beginner-slot"></div>';
    panel.replaceWith(details);
    details.querySelector('.beginner-slot').appendChild(panel);
  }

  function addReferenceCalculators() {
    if ($('expandedMachinistRefs')) return;
    $('handbookView')?.insertAdjacentHTML('afterbegin', `
      <div id="expandedMachinistRefs" class="card span-2 machinist-ref-panel">
        <div class="section-head"><h2>Speeds, Feeds & Shop Math</h2><span class="mini">Quick reference for setup planning.</span></div>
        <div class="calc-grid">
          <div class="mini-calc"><h3>SFM / RPM</h3><label>SFM<input id="sfmIn" inputmode="decimal"></label><label>Diameter<input id="diaIn" inputmode="decimal"></label><label>RPM<input id="rpmIn" inputmode="decimal"></label><div id="sfmOut" class="result compact">Enter two values.</div></div>
          <div class="mini-calc"><h3>Feed</h3><label>RPM<input id="feedRpm" inputmode="decimal"></label><label>Feed / rev<input id="feedRev" inputmode="decimal"></label><label>Flutes<input id="feedFlutes" inputmode="numeric" value="1"></label><div id="feedOut" class="result compact">IPM = RPM x feed/rev x flutes.</div></div>
          <div class="mini-calc"><h3>Thread</h3><label>TPI<input id="threadTpi" inputmode="decimal"></label><label>Pitch<input id="threadPitch" inputmode="decimal"></label><label>Major Dia<input id="threadMajor" inputmode="decimal"></label><div id="threadOut" class="result compact">Depth = 0.6495 / TPI.</div></div>
          <div class="mini-calc"><h3>Decimal / Fraction</h3><label>Fraction<input id="fracIn" placeholder="3/16"></label><label>Decimal<input id="decIn" inputmode="decimal"></label><div id="fracOut" class="result compact">Converts to nearest 1/64.</div></div>
          <div class="mini-calc"><h3>Trig</h3><label>Angle<input id="triAngle" inputmode="decimal"></label><label>Side / Radius<input id="triSide" inputmode="decimal"></label><label>Points<input id="boltPoints" inputmode="numeric"></label><div id="trigOut" class="result compact">Right triangle, bolt circle step, and chord helper.</div></div>
        </div>
      </div>
      <div class="card span-2 tap-chart-panel"><div class="section-head"><h2>Common Tap Drill Quick Chart</h2><span class="mini">Verify with shop chart before cutting.</span></div><div class="tap-grid">${tapTables()}</div></div>`);
    $('handbookView')?.insertAdjacentHTML('afterbegin', `
      <div id="shopProblemRefs" class="card span-2 machinist-ref-panel">
        <div class="section-head"><h2>Common Shop Problem References</h2><span id="referenceFilterStatus" class="mini">Showing all reference items</span></div>
        <div class="category-grid">
          <div class="code-category"><h3>Lost Z / Retouch Z</h3><ul><li>If original Z0 is gone, use another known surface.</li><li>If Z0 is jaw face and part face is 1.602 from jaw face, do not blindly call part face Z0.</li><li>Touch the known surface and enter its true Z value in Work Shift / measurement, then verify Absolute Position.</li></ul></div>
          <div class="code-category"><h3>Fanuc Work Shift</h3><ul><li>Call active tool and offset first, such as T0101.</li><li>Use OFFSET/SETTING -> WORK SHIFT / EXT, screen names vary.</li><li>Measurement Z should receive the value the touched surface should read.</li><li>Work Shift affects all tools, so prove the next move.</li></ul></div>
          <div class="code-category"><h3>Tool Offset Checks</h3><ul><li>Confirm station and offset pair, such as T0101.</li><li>Separate geometry correction from small wear changes.</li><li>Do not fix a global Z problem by changing one tool unless only that tool is wrong.</li></ul></div>
          <div class="code-category"><h3>First Article Checks</h3><ul><li>Check OD, length from datum, groove width, chamfer, and surface finish.</li><li>Compare measured part to program datum before changing offsets.</li><li>Record what surface was touched and what offset was changed.</li></ul></div>
        </div>
      </div>`);
    document.querySelectorAll('#expandedMachinistRefs input').forEach(i => i.addEventListener('input', updateCalcs));
    updateCalcs();
  }

  function tapTables() {
    const groups = [
      ['UNC', [['1/4-20','.201 #7'],['5/16-18','.257 F'],['3/8-16','.3125 5/16'],['1/2-13','.4219 27/64']]],
      ['UNF', [['1/4-28','.213 #3'],['5/16-24','.272 I'],['3/8-24','.332 Q'],['1/2-20','.4531 29/64']]],
      ['Metric', [['M4x0.7','3.3 mm'],['M5x0.8','4.2 mm'],['M6x1.0','5.0 mm'],['M8x1.25','6.8 mm'],['M10x1.5','8.5 mm']]]
    ];
    return groups.map(([name, rows]) => `<div class="tap-table"><h3>${name}</h3>${rows.map(([a,b]) => `<p><strong>${a}</strong><span>${b}</span></p>`).join('')}</div>`).join('');
  }

  function gcd(a, b) { return b ? gcd(b, a % b) : Math.abs(a); }
  function updateCalcs() {
    const sfm = num($('sfmIn')?.value), dia = num($('diaIn')?.value), rpm = num($('rpmIn')?.value);
    if ($('sfmOut')) $('sfmOut').textContent = sfm && dia ? `RPM ${fmt((sfm * 3.82) / dia)}` : rpm && dia ? `SFM ${fmt((rpm * dia) / 3.82)}` : 'Enter SFM + diameter, or RPM + diameter.';
    const frpm = num($('feedRpm')?.value), fpr = num($('feedRev')?.value), fl = num($('feedFlutes')?.value) || 1;
    if ($('feedOut')) $('feedOut').textContent = frpm && fpr ? `Feed ${fmt(frpm * fpr * fl)} IPM` : 'IPM = RPM x feed/rev x flutes.';
    const tpi = num($('threadTpi')?.value), pitch = num($('threadPitch')?.value), major = num($('threadMajor')?.value);
    const effTpi = tpi || (pitch ? 25.4 / pitch : null), depth = effTpi ? 0.6495 / effTpi : null;
    if ($('threadOut')) $('threadOut').textContent = depth ? `Thread depth ${fmt(depth)}. ${major ? `Approx minor dia ${fmt(major - depth * 2)}.` : ''}` : 'Depth = 0.6495 / TPI.';
    const frac = $('fracIn')?.value?.trim(), dec = num($('decIn')?.value);
    if ($('fracOut')) {
      let text = 'Converts to nearest 1/64.';
      if (frac && frac.includes('/')) { const [a,b] = frac.split('/').map(Number); if (b) text = `Decimal ${fmt(a / b)}`; }
      else if (dec !== null) { let n = Math.round(dec * 64), d = 64, g = gcd(n,d); text = `Nearest fraction ${n / g}/${d / g}`; }
      $('fracOut').textContent = text;
    }
    const angle = num($('triAngle')?.value), side = num($('triSide')?.value), points = num($('boltPoints')?.value);
    if ($('trigOut')) {
      let text = 'Right triangle, bolt circle step, and chord helper.';
      if (angle !== null && side !== null) text = `Opposite ${fmt(Math.tan(angle * Math.PI / 180) * side)}. Hypotenuse ${fmt(side / Math.cos(angle * Math.PI / 180))}.`;
      if (side !== null && points && points > 1) text += ` Bolt step angle ${fmt(360 / points)} deg. Chord ${fmt(2 * side * Math.sin(Math.PI / points))}.`;
      $('trigOut').textContent = text;
    }
  }

  function addGcodeUpgrades() {
    if ($('controllerProfilePanel')) return;
    $('gcodeEditorPanel')?.insertAdjacentHTML('afterbegin', `<div id="controllerProfilePanel" class="controller-profile-panel"><label for="controllerProfile">Controller Profile</label><select id="controllerProfile"><option>Fanuc</option><option>Haas</option><option>Mazak</option></select><button id="formatProfileBtn" type="button">Apply Formatting</button></div>`);
    $('gcodeEditorPanel')?.insertAdjacentHTML('beforeend', `<div id="advancedSafetyPanel" class="result warn compact"><div class="mini">Safety Checker</div><div id="advancedSafetyWarnings" class="warnList">Run Check code to see safety warnings.</div></div><div class="canned-cycle-panel"><div class="mini">Canned cycle templates</div><button data-cycle="G71" type="button">G71</button><button data-cycle="G70" type="button">G70</button><button data-cycle="G72" type="button">G72</button><button data-cycle="G74" type="button">G74</button><button data-cycle="G76" type="button">G76</button></div>`);
    $('formatProfileBtn')?.addEventListener('click', applyControllerProfile);
    $('gcodeView')?.addEventListener('click', e => { const c = e.target.closest('[data-cycle]')?.dataset.cycle; if (c) insertCycle(c); });
    ['checkCodeBtn','plotCodeBtn','simulateCodeBtn','runSimBtn'].forEach(id => $(id)?.addEventListener('click', () => setTimeout(runAdvancedSafety, 80)));
    $('gcodeEditor')?.addEventListener('input', () => setTimeout(runAdvancedSafety, 160));
    ensurePlotModeBadge();
    runAdvancedSafety();
  }

  function applyControllerProfile() {
    const profile = $('controllerProfile')?.value || 'Fanuc';
    const ed = $('gcodeEditor');
    if (!ed) return;
    let lines = ed.value.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (profile === 'Haas') lines = lines.map(l => l.replace(/\bG99\b/g, 'G99'));
    if (profile === 'Mazak') lines.unshift('(MAZAK PROFILE - VERIFY EIA/ISO MODE)');
    if (!lines[0]?.startsWith('%')) lines.unshift('%');
    if (!lines[lines.length - 1]?.startsWith('%')) lines.push('%');
    ed.value = lines.join('\n'); ed.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function insertCycle(cycle) {
    const templates = {
      G71: 'G71 U.050 R.020\nG71 P100 Q200 U.010 W.005 F.008\nN100 G00 X...\nG01 Z...\nN200 G01 X...',
      G70: 'G70 P100 Q200',
      G72: 'G72 W.050 R.020\nG72 P100 Q200 U.010 W.005 F.008',
      G74: 'G74 Z... Q... F...',
      G76: 'G76 P010060 Q0050 R0\nG76 X... Z... P... Q... F...'
    };
    const ed = $('gcodeEditor'); if (!ed) return;
    ed.value = [ed.value.trim(), `(${cycle} TEMPLATE - VERIFY CONTROL FORMAT)`, templates[cycle]].filter(Boolean).join('\n');
    ed.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function runAdvancedSafety() {
    const src = codeText().toUpperCase();
    const warnings = [];
    const lines = src.split(/\r?\n/);
    if (!/\bG20\b|\bG21\b/.test(src)) warnings.push('Missing G20/G21 unit mode.');
    if (!/\bG18\b/.test(src)) warnings.push('Missing G18 XZ plane selection for lathe work.');
    if (!/\bG40\b/.test(src)) warnings.push('Missing G40 tool nose compensation cancel.');
    if (!/\bG80\b/.test(src)) warnings.push('Missing G80 canned cycle cancel.');
    if (!/\bG90\b/.test(src)) warnings.push('Missing G90 absolute/cycle safety mode. Verify System A intent.');
    if (!/\bG54\b|\bG55\b|\bG56\b|\bG57\b|\bG58\b|\bG59\b/.test(src)) warnings.push('Missing visible work offset G54-G59.');
    if (!/\bG98\b|\bG99\b/.test(src)) warnings.push('Missing feed mode G98/G99. Many lathes use G99 feed/rev for turning.');
    if (!/\bM0?3\b|\bM0?4\b/.test(src)) warnings.push('Missing spindle command M03/M04.');
    if (!/\bM0?9\b/.test(src)) warnings.push('Missing coolant off M09.');
    if (!/\bM30\b|\bM02\b/.test(src)) warnings.push('Missing program end M30/M02.');
    if (/\bG96\b/.test(src) && !/\bG50\b/.test(src)) warnings.push('G96 CSS used without visible G50 spindle speed clamp.');
    if (/\bG41\b|\bG42\b/.test(src) && !/\bG40\b/.test(src)) warnings.push('Tool nose compensation used without visible G40 cancel.');
    (src.match(/\bT\s*\d+/g) || []).forEach(t => { const digits = t.replace(/\D/g, ''); if (digits.length < 4 || digits.endsWith('00')) warnings.push(`Tool change without clear offset: ${t}.`); });
    const stock = num($('stockDiameter')?.value), face = num($('faceZ')?.value) ?? 0;
    let feedActive = /\bF\s*-?\d*\.?\d+/.test(src.split(/\bG0?1\b/)[0] || '');
    lines.forEach((line, i) => {
      const clean = line.replace(/\([^)]*\)/g, '').trim();
      if (/\bF\s*-?\d*\.?\d+/i.test(clean)) feedActive = true;
      if (/\bG0?1\b/.test(clean) && !feedActive) warnings.push(`Line ${i + 1}: G01 feed move before feed rate F.`);
      if (/\bG0?[23]\b/.test(clean) && !/\bR\s*-?\d*\.?\d+|\bI\s*-?\d*\.?\d+|\bK\s*-?\d*\.?\d+/.test(clean)) warnings.push(`Line ${i + 1}: arc move missing R/I/K.`);
      const x = /X\s*(-?\d*\.?\d+)/.exec(line)?.[1], z = /Z\s*(-?\d*\.?\d+)/.exec(line)?.[1];
      const xv = num(x), zv = num(z);
      if (xv !== null && xv < 0) warnings.push(`Line ${i + 1}: X below zero. Lathe X is diameter based.`);
      if (/\bG0?1\b/.test(clean) && zv !== null && zv > face) warnings.push(`Line ${i + 1}: positive Z feed/plunge. Verify Z direction from face.`);
      if (!/\bG0?0\b/.test(clean)) return;
      if (stock && xv !== null && zv !== null && xv <= stock + .02 && zv <= face + .05) warnings.push(`Line ${i + 1}: rapid move into/near stock envelope.`);
      if (zv !== null && zv < face && (xv === null || (stock && xv <= stock + .1))) warnings.push(`Line ${i + 1}: rapid enters negative Z near stock or jaws.`);
    });
    if ($('advancedSafetyWarnings')) $('advancedSafetyWarnings').innerHTML = warnings.length ? warnings.map(w => `<div>${esc(w)}</div>`).join('') : '<span class="okText">No added safety warnings found. Still verify at the machine.</span>';
  }

  function ensurePlotModeBadge() {
    if ($('plotModeBadge')) return;
    $('editorPlotStatus')?.insertAdjacentHTML('afterend', '<span id="plotModeBadge" class="plot-mode-badge">X diameter mode / Z length axis</span>');
    $('simPlot')?.insertAdjacentHTML('beforebegin', '<div class="plot-mode-badge sim-badge">X-axis = diameter, Z-axis = length. Radius math shown only where labeled.</div>');
  }

  function colorCodeSections() {
    const map = { notesView: 'tone-notes', setupView: 'tone-setup', toolsView: 'tone-tools', gcodeView: 'tone-gcode', simView: 'tone-warn', referenceHubView: 'tone-ref' };
    Object.entries(map).forEach(([id, cls]) => $(id)?.classList.add(cls));
    referenceViews.forEach(([id]) => $(id)?.classList.add('tone-ref'));
  }

  function wire() {
    buildTabs();
    makeJobActions();
    makeSaveStatus();
    makeFab();
    makeJobSearch();
    addReferenceCalculators();
    addGcodeUpgrades();
    colorCodeSections();
    collapseBeginner();
    let tries = 0;
    const wait = setInterval(() => { collapseBeginner(); addGcodeUpgrades(); if (++tries > 20 || $('beginnerResources')) clearInterval(wait); }, 300);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();

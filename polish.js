(() => {
  const key = 'cncLatheWorkHelper.v4';
  const beginnerKey = 'cncLatheWorkHelper.beginnerMode';
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  const val = id => $(id)?.value?.trim() || '';
  const setVal = (id, value) => { if ($(id)) { $(id).value = value || ''; $(id).dispatchEvent(new Event('input', { bubbles: true })); } };
  const num = v => { const n = Number(String(v ?? '').trim().replace(/^\./, '0.').replace(/^-\./, '-0.')); return Number.isFinite(n) ? n : null; };
  const fmt = v => Number.isFinite(v) ? Number(v).toFixed(4).replace(/0+$/, '').replace(/\.$/, '') : '--';
  const read = () => { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; } };
  const currentJob = st => Array.isArray(st.jobs) ? st.jobs.find(j => j.id === st.currentJobId) || st.jobs[0] : null;
  const save = (st, msg = 'Saved local') => {
    const job = currentJob(st);
    if (job) job.updatedAt = new Date().toISOString();
    localStorage.setItem(key, JSON.stringify(st));
    if ($('saveStatus')) $('saveStatus').textContent = msg;
  };
  const gcodeText = () => $('gcodeEditor')?.value || $('gcodeOut')?.textContent || '';

  const samples = [
    {
      name: 'Face and OD Turn', partNumber: 'TRAIN-001', material: '1018 Steel', operation: 'Face, OD turn, break edge', machine: 'Training lathe',
      toolNotes: 'T0101 CNMG rough/finish tool. Touch off X on known OD, Z on faced surface.',
      setupNotes: 'Z0 is front face. Stock held in soft jaws. Verify stickout and jaw clearance before first rapid.',
      setup: { workOffset: 'G54', stockDiameter: '2.000', stockLength: '3.000', chuckJaw: 'Soft jaws', stickout: '1.500', coolant: 'Flood', inspectionNotes: 'Check faced length and OD after first pass.', setupReference: 'Beginner sample job.' },
      calculator: { mode: 'od', touchDia: '2.000', targetDia: '1.750', faceZ: '0.000', plungeDepth: '.250', zDirection: 'minus' },
      tool: { label: 'CNMG 432', width: '', radius: '.031', notes: 'General OD turning insert' },
      feed: { label: 'Steel light finish', speed: 'S450 M03', feed: '.004' },
      gcode: { toolCall: 'T0101', rapidX: '2.100', rapidZ: '.100', comment: 'FACE AND OD TURN SAMPLE', output: '%\n(FACE AND OD TURN SAMPLE)\n(DRAFT/CHECK BEFORE RUNNING - LATHE SYSTEM A)\nG18 G40 G80 G99\nG54\nT0101\nS450 M03\nG00 X2.100 Z.100\nG01 Z-.250 F.004\nG01 X1.750 F.004\nG00 X2.100\nG00 Z.100\nM05\nM30\n%' }
    },
    {
      name: 'Groove Plunge', partNumber: 'TRAIN-002', material: '4140 Steel', operation: 'OD groove plunge', machine: 'Training lathe',
      toolNotes: 'T0505 DB .187 x .015 groove tool. Confirm insert width before cutting.',
      setupNotes: 'Z0 is face. Groove starts from front face into negative Z. Keep X clearance above stock before Z move.',
      setup: { workOffset: 'G54', stockDiameter: '2.500', stockLength: '2.000', chuckJaw: 'Pie jaws / soft jaws', stickout: '1.000', coolant: 'Flood', inspectionNotes: 'Measure groove width and diameter after spring pass.', setupReference: 'Use single block first cut.' },
      calculator: { mode: 'od', touchDia: '2.500', targetDia: '2.000', faceZ: '0.000', plungeDepth: '.500', zDirection: 'minus' },
      tool: { label: 'DB .187 x .015', width: '.187', radius: '.015', notes: 'Groove/plunge insert' },
      feed: { label: 'Steel groove light', speed: 'S250 M03', feed: '.004' },
      gcode: { toolCall: 'T0505', rapidX: '2.600', rapidZ: '.100', comment: 'GROOVE PLUNGE SAMPLE', output: '%\n(GROOVE PLUNGE SAMPLE)\n(DRAFT/CHECK BEFORE RUNNING - LATHE SYSTEM A)\nG18 G40 G80 G99\nG54\nT0505\nS250 M03\nG00 X2.600 Z.100\nG00 Z-.500\nG01 X2.000 F.004\nG00 X2.600\nG00 Z.100\nM05\nM30\n%' }
    },
    {
      name: 'Pie Jaw Setup', partNumber: 'TRAIN-003', material: 'Aluminum', operation: 'Second-op face in pie jaws', machine: 'Training lathe',
      toolNotes: 'T0202 VNMG finish tool. Watch holder clearance near jaws.',
      setupNotes: 'Use pie jaws. Confirm pocket bore, jaw step, clamp pressure, and part seating. Mark Z0 face.',
      setup: { workOffset: 'G55', stockDiameter: '3.000', stockLength: '1.250', chuckJaw: 'Pie jaws', stickout: '.650', coolant: 'Flood', inspectionNotes: 'Check face cleanup and OD runout.', setupReference: 'Photo/note: part seated against jaw step.', pieJawSize: '6 inch', pieJawBore: '3.050', pieJawStep: '.125', pieJawNotes: 'Seat part flat against step. Verify no chip under part.' },
      calculator: { mode: 'od', touchDia: '3.000', targetDia: '2.950', faceZ: '0.000', plungeDepth: '.050', zDirection: 'minus' },
      tool: { label: 'VNMG 331', width: '', radius: '.015', notes: 'Finishing insert' },
      feed: { label: 'Aluminum finish', speed: 'S800 M03', feed: '.005' },
      gcode: { toolCall: 'T0202', rapidX: '3.100', rapidZ: '.080', comment: 'PIE JAW FACE SAMPLE', output: '%\n(PIE JAW FACE SAMPLE)\n(DRAFT/CHECK BEFORE RUNNING - LATHE SYSTEM A)\nG18 G40 G80 G99\nG55\nT0202\nS800 M03\nG00 X3.100 Z.080\nG01 Z-.050 F.005\nG01 X2.950 F.005\nG00 X3.100\nG00 Z.080\nM05\nM30\n%' }
    }
  ];

  const warningHelp = [
    ['Missing tool call', 'Add a T word such as T0101 so the station and offset are clear.'],
    ['Missing spindle start', 'Add M03 or M04 with a safe S speed before cutting.'],
    ['Missing feed before G01', 'A G01 cutting move needs F feed set before or on that line.'],
    ['G96 without G50', 'Constant surface speed should have a spindle RPM clamp.'],
    ['Rapid too close', 'G00 is not a cutting move. Keep it clear of stock, jaws, and shoulders.'],
    ['Positive Z plunge', 'If Z0 is the face, cutting into the part is usually negative Z.'],
    ['X below zero', 'Lathe X is diameter. Negative X is usually a crash or wrong mode.'],
    ['Unsupported code', 'The checker is basic. Verify machine-specific codes at the control.']
  ];

  function captureCurrent(extra = {}) {
    const st = read();
    const job = currentJob(st);
    if (!job) return null;
    job.partNumber = val('partNumber'); job.material = val('material'); job.operation = val('operation'); job.machine = val('machine');
    job.toolNotes = val('toolNotes'); job.setupNotes = val('setupNotes');
    job.setup = { ...(job.setup || {}), workOffset: val('workOffset'), stockDiameter: val('stockDiameter'), stockLength: val('stockLength'), chuckJaw: val('chuckJaw'), stickout: val('stickout'), coolant: val('coolant'), inspectionNotes: val('inspectionNotes'), setupReference: val('setupReference'), pieJawNotes: val('pieJawNotes'), pieJawSize: val('pieJawSize'), pieJawBore: val('pieJawBore'), pieJawStep: val('pieJawStep'), setupPhotoName: val('setupPhotoName'), setupPhotoData: $('setupPhotoPreview')?.src?.startsWith('data:') ? $('setupPhotoPreview').src : (job.setup?.setupPhotoData || '') };
    job.calculator = { ...(job.calculator || {}), mode: document.querySelector('.seg.active')?.dataset.mode || 'od', touchDia: val('touchDia'), targetDia: val('targetDia'), faceZ: val('faceZ'), plungeDepth: val('plungeDepth'), zDirection: $('zDirection')?.value || 'minus' };
    job.tool = { ...(job.tool || {}), label: val('toolLabel'), width: val('insertWidth'), radius: val('insertRadius'), notes: val('customToolNotes') };
    job.feed = { ...(job.feed || {}), label: val('feedLabel'), speed: val('gSpeed'), feed: val('gFeed') };
    job.gcode = { ...(job.gcode || {}), toolCall: val('gTool'), rapidX: val('gRapidX'), rapidZ: val('gRapidZ'), comment: val('gComment'), output: gcodeText() };
    Object.assign(job, extra);
    save(st, 'Saved job card');
    return job;
  }

  function fillJob(job) {
    setVal('partNumber', job.partNumber); setVal('material', job.material); setVal('operation', job.operation); setVal('machine', job.machine);
    setVal('toolNotes', job.toolNotes); setVal('setupNotes', job.setupNotes);
    const s = job.setup || {}; ['workOffset','stockDiameter','stockLength','chuckJaw','stickout','coolant','inspectionNotes','setupReference','pieJawNotes','pieJawSize','pieJawBore','pieJawStep','setupPhotoName'].forEach(id => setVal(id, s[id]));
    const c = job.calculator || {}; ['touchDia','targetDia','faceZ','plungeDepth'].forEach(id => setVal(id, c[id])); if ($('zDirection')) $('zDirection').value = c.zDirection || 'minus';
    const t = job.tool || {}; setVal('toolLabel', t.label); setVal('insertWidth', t.width); setVal('insertRadius', t.radius); setVal('customToolNotes', t.notes);
    const f = job.feed || {}; setVal('feedLabel', f.label); setVal('gSpeed', f.speed); setVal('gFeed', f.feed);
    const g = job.gcode || {}; setVal('gTool', g.toolCall); setVal('gRapidX', g.rapidX); setVal('gRapidZ', g.rapidZ); setVal('gComment', g.comment);
    if ($('gcodeEditor')) $('gcodeEditor').value = g.output || '';
    if ($('gcodeOut')) $('gcodeOut').textContent = g.output || 'Enter calculator values to generate draft G-code.';
    if ($('setupPhotoPreview')) { $('setupPhotoPreview').src = s.setupPhotoData || ''; $('setupPhotoPreview').classList.toggle('hidden', !s.setupPhotoData); }
    $('checkCodeBtn')?.click();
  }

  function loadSample(index) {
    const sample = structuredClone(samples[index]);
    const st = read();
    const job = currentJob(st);
    if (!job) return;
    Object.assign(job, sample, { id: job.id, createdAt: job.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() });
    save(st, 'Loaded sample job');
    fillJob(job);
  }

  function appendNotes(id, text) {
    const field = $(id);
    if (!field) return;
    field.value = [field.value.trim(), text.trim()].filter(Boolean).join('\n\n');
    field.dispatchEvent(new Event('input', { bubbles: true }));
    captureCurrent();
  }

  function jobCardText(job) {
    const s = job.setup || {}, c = job.calculator || {}, t = job.tool || {}, f = job.feed || {};
    return [
      'CNC LATHE JOB CARD',
      `Part: ${job.partNumber || 'Untitled'}`,
      `Material: ${job.material || ''}`,
      `Operation: ${job.operation || ''}`,
      `Machine: ${job.machine || ''}`,
      '',
      `Work offset: ${s.workOffset || ''}`,
      `Stock: X${s.stockDiameter || ''} Length ${s.stockLength || ''}`,
      `Chuck/jaws: ${s.chuckJaw || ''}`,
      `Pie jaws: ${[s.pieJawSize, s.pieJawBore && `bore ${s.pieJawBore}`, s.pieJawStep && `step ${s.pieJawStep}`].filter(Boolean).join(', ')}`,
      `Stickout: ${s.stickout || ''}`,
      `Coolant: ${s.coolant || ''}`,
      '',
      `Calculator: touch X${c.touchDia || ''} target X${c.targetDia || ''} face Z${c.faceZ || ''} plunge ${c.plungeDepth || ''} ${c.zDirection || 'minus'}`,
      `Tool: ${t.label || ''} width ${t.width || ''} radius ${t.radius || ''}`,
      `Speed/feed: ${f.speed || ''} F${f.feed || ''}`,
      '',
      'Tool notes:', job.toolNotes || '', '',
      'Setup notes:', job.setupNotes || '', '',
      'Inspection notes:', s.inspectionNotes || '', '',
      'G-code draft/check before running:', job.gcode?.output || ''
    ].join('\n');
  }

  function renderJobCard() {
    const job = captureCurrent();
    if (!job || !$('jobCardOutput')) return '';
    const text = jobCardText(job);
    $('jobCardOutput').textContent = text;
    return text;
  }

  async function shareJobCard() {
    const text = renderJobCard();
    if (!text) return;
    if (navigator.share) {
      try { await navigator.share({ title: 'CNC Lathe Job Card', text }); return; } catch {}
    }
    try { await navigator.clipboard.writeText(text); if ($('saveStatus')) $('saveStatus').textContent = 'Job card copied'; }
    catch { alert('Job card is ready below. Long press to copy.'); }
  }

  function printJobCard() {
    const text = renderJobCard();
    if (!text) return;
    const w = window.open('', '_blank');
    if (!w) { alert('Job card is ready below. Browser blocked the print window.'); return; }
    w.document.write(`<title>CNC Lathe Job Card</title><pre style="font:14px/1.45 Arial,sans-serif;white-space:pre-wrap">${esc(text)}</pre>`);
    w.document.close(); w.focus(); w.print();
  }

  function injectNotesPolish() {
    if ($('notesPolishPanel')) return;
    $('notesView')?.insertAdjacentHTML('afterbegin', `
      <div id="notesPolishPanel" class="card span-2 polish-panel">
        <div class="section-head"><h2>Job Card</h2><label class="switchline"><input id="beginnerModeToggle" type="checkbox"> Beginner mode</label></div>
        <div class="row actions polish-actions">
          <button id="firstRunChecklistBtn" class="primary" type="button">First-Run Checklist</button>
          <button id="renderJobCardBtn" type="button">Build Job Card</button>
          <button id="shareJobCardBtn" type="button">Share / Copy</button>
          <button id="printJobCardBtn" type="button">Print</button>
        </div>
        <div class="sample-strip" id="sampleJobsPanel">${samples.map((s, i) => `<button type="button" data-sample="${i}">${esc(s.name)}</button>`).join('')}</div>
        <pre id="jobCardOutput" class="job-card-output">Build a job card when notes are ready.</pre>
      </div>`);
    $('beginnerModeToggle').checked = localStorage.getItem(beginnerKey) !== '0';
    setBeginnerMode($('beginnerModeToggle').checked);
    $('beginnerModeToggle').addEventListener('change', e => setBeginnerMode(e.target.checked));
    $('firstRunChecklistBtn').addEventListener('click', () => appendNotes('setupNotes', 'FIRST RUN CHECKLIST\n[ ] Correct program loaded\n[ ] Correct tool station and offset\n[ ] Work offset confirmed\n[ ] X is diameter mode\n[ ] Z0 face confirmed\n[ ] Stock/jaws/stickout checked\n[ ] Rapid clearance checked\n[ ] Spindle direction checked\n[ ] Feed rate checked\n[ ] Single block first motion\n[ ] Hand near feed hold'));
    $('renderJobCardBtn').addEventListener('click', renderJobCard);
    $('shareJobCardBtn').addEventListener('click', shareJobCard);
    $('printJobCardBtn').addEventListener('click', printJobCard);
    $('sampleJobsPanel').addEventListener('click', e => { const b = e.target.closest('[data-sample]'); if (b) loadSample(Number(b.dataset.sample)); });
  }

  function setBeginnerMode(on) {
    document.body.classList.toggle('beginner-mode', on);
    localStorage.setItem(beginnerKey, on ? '1' : '0');
    if ($('saveStatus')) $('saveStatus').textContent = on ? 'Beginner mode on' : 'Beginner mode off';
  }

  function injectSetupPhoto() {
    if ($('setupPhotoPanel')) return;
    $('setupView')?.querySelector('.card')?.insertAdjacentHTML('beforeend', `
      <div id="setupPhotoPanel" class="setup-photo-panel">
        <div class="section-head"><h2>Setup Photo / Sketch</h2><span class="mini">Stored on this device with the job.</span></div>
        <div class="row"><div class="field"><label for="setupPhotoFile">Add setup photo</label><input id="setupPhotoFile" type="file" accept="image/*"></div><div class="field"><label for="setupPhotoName">Photo note</label><input id="setupPhotoName" placeholder="Jaw setup, part seating, sketch note"></div></div>
        <img id="setupPhotoPreview" class="setup-photo-preview hidden" alt="Setup photo preview">
      </div>`);
    $('setupPhotoFile').addEventListener('change', event => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (file.size > 1600000) { alert('Photo is too large for local storage. Use a smaller picture or write a note.'); return; }
      const reader = new FileReader();
      reader.onload = () => { $('setupPhotoPreview').src = reader.result; $('setupPhotoPreview').classList.remove('hidden'); setVal('setupPhotoName', file.name); captureCurrent(); };
      reader.readAsDataURL(file);
    });
    $('setupPhotoName').addEventListener('input', () => captureCurrent());
    const data = currentJob(read())?.setup?.setupPhotoData;
    if (data) { $('setupPhotoPreview').src = data; $('setupPhotoPreview').classList.remove('hidden'); }
  }

  function injectWarningHelp() {
    if ($('warningHelpPanel')) return;
    $('tipsView')?.insertAdjacentHTML('beforeend', `<div id="warningHelpPanel" class="card span-2 warning-help"><h2>What Can Go Wrong?</h2><div class="warning-help-grid">${warningHelp.map(([title, note]) => `<p><strong>${esc(title)}</strong><span>${esc(note)}</span></p>`).join('')}</div></div>`);
    $('simView')?.querySelector('.card')?.insertAdjacentHTML('beforeend', '<p class="hint rough-sim-note">This is a rough preview, not machine simulation. It does not know your holder shape, exact control options, chuck model, or every machine setting.</p>');
  }

  function injectLostZHelper() {
    if ($('lostZHelperPanel')) return;
    const panel = `
      <div id="lostZHelperPanel" class="card span-2 lost-z-helper">
        <div class="section-head"><h2>Lost Z Face / Retouch Z Helper</h2><span class="mini">Use another known surface when original Z0 is gone.</span></div>
        <div class="result warn compact">
          <div class="medium">Do not set a random cut surface to Z0.</div>
          <div class="hint">Find a face, shoulder, groove wall, stop, gauge, or fixture surface that still exists and has a known print Z location. Touch that surface, then tell the control what Z value that surface should be.</div>
        </div>
        <ul class="quick">
          <li>Pick a surface that still exists and has a known distance from the original Z0.</li>
          <li>Example: if a shoulder is .750 behind the original face, that touched shoulder is Z-.750.</li>
          <li>If Z0 is the jaw face and the part face is 1.602 from the jaw face, do not blindly call the part face Z0. Touch the part face and enter its true Z distance from the jaw face into the Fanuc Work Shift measurement field. If your machine convention says the part face is Z-1.602, enter -1.602. Verify on Absolute Position before cutting.</li>
          <li>Single block and prove the next move after any work offset or tool offset change.</li>
        </ul>
        <div class="row">
          <div class="field"><label for="lostZSurface">Known surface</label><input id="lostZSurface" placeholder="Shoulder, back face, jaw stop, gauge block"></div>
          <div class="field"><label for="lostZPrint">Print Z for that surface</label><input id="lostZPrint" inputmode="decimal" placeholder="-.750"></div>
        </div>
        <div class="row">
          <div class="field"><label for="lostZReadout">Current Z readout when touched</label><input id="lostZReadout" inputmode="decimal" placeholder="-.732"></div>
          <div class="field"><label for="lostZOffsetNow">Current work offset Z (optional)</label><input id="lostZOffsetNow" inputmode="decimal" placeholder="Optional"></div>
        </div>
        <div class="row actions">
          <button id="lostZCalcBtn" class="primary" type="button">Calculate Z Shift</button>
          <button id="lostZNoteBtn" type="button">Insert Setup Note</button>
        </div>
        <div id="lostZOut" class="result compact">Enter the known surface Z and the current Z readout at touch.</div>
      </div>`;
    $('setupView')?.insertAdjacentHTML('beforeend', panel);
    $('tipsView')?.insertAdjacentHTML('afterbegin', `
      <div id="lostZTeachingPanel" class="card span-2">
        <h2>What If The Original Z Face Is Gone?</h2>
        <ul class="quick">
          <li>Z zero is a reference, not magic. If the original face is gone, use another known reference.</li>
          <li>Touch a remaining shoulder, face, stop, gauge, or fixture surface and assign its real print Z value.</li>
          <li>If Z0 is the jaw face and the part face is 1.602 from the jaw face, do not blindly call the part face Z0. Touch the part face and enter its true Z distance from the jaw face into the Fanuc Work Shift measurement field. If your machine convention says the part face is Z-1.602, enter -1.602. Verify on Absolute Position before cutting.</li>
          <li>If the known surface is Z-.750, the control should read Z-.750 at that touch. Do not call it Z0 unless it truly is the programmed zero face.</li>
        </ul>
      </div>`);
    ['lostZSurface','lostZPrint','lostZReadout','lostZOffsetNow'].forEach(id => $(id)?.addEventListener('input', updateLostZ));
    $('lostZCalcBtn')?.addEventListener('click', updateLostZ);
    $('lostZNoteBtn')?.addEventListener('click', insertLostZNote);
  }

  function lostZText() {
    const surface = val('lostZSurface') || 'known surface';
    const printZ = num(val('lostZPrint'));
    const readout = num(val('lostZReadout'));
    const offsetNow = num(val('lostZOffsetNow'));
    if (printZ === null || readout === null) return null;
    const shift = printZ - readout;
    const nextOffset = offsetNow === null ? null : offsetNow + shift;
    return { surface, printZ, readout, shift, nextOffset };
  }

  function updateLostZ() {
    const out = $('lostZOut');
    if (!out) return;
    const data = lostZText();
    if (!data) {
      out.className = 'result compact';
      out.innerHTML = 'Enter the known surface Z and the current Z readout at touch.';
      return;
    }
    out.className = 'result warn compact';
    out.innerHTML = `
      <div class="medium">Touched ${esc(data.surface)} should read Z${fmt(data.printZ)}.</div>
      <div class="hint">Current readout is Z${fmt(data.readout)}, so the needed Z shift is <strong>${fmt(data.shift)}</strong>.</div>
      ${data.nextOffset === null ? '<div class="hint">If adjusting a work offset, apply that shift using your control/shop procedure.</div>' : `<div class="hint">If current work offset Z is ${fmt(data.nextOffset - data.shift)}, estimated new work offset Z is <strong>${fmt(data.nextOffset)}</strong>.</div>`}
      <div class="hint">If adjusting a tool offset instead, apply the same idea only to the active tool/offset per shop procedure.</div>`;
  }

  function insertLostZNote() {
    updateLostZ();
    const data = lostZText();
    if (!data) return;
    const note = `\nLOST Z FACE / RETOUCH Z\nKnown surface: ${data.surface}\nPrint Z at surface: Z${fmt(data.printZ)}\nControl readout when touched: Z${fmt(data.readout)}\nNeeded Z shift: ${fmt(data.shift)}${data.nextOffset === null ? '' : `\nEstimated new work offset Z: ${fmt(data.nextOffset)}`}\nProve next move in single block with feed override low.\n`;
    const target = $('setupNotes') || $('setupReference');
    if (target) {
      target.value = `${target.value || ''}${note}`;
      target.dispatchEvent(new Event('input', { bubbles: true }));
      captureCurrent();
    }
    if ($('lostZOut')) $('lostZOut').insertAdjacentHTML('beforeend', '<div class="hint">Setup note inserted.</div>');
  }

  function improveReference() {
    if ($('categorizedCodeReference')) return;
    const groups = [
      ['Motion', ['G00 rapid positioning', 'G01 linear feed', 'G02 clockwise arc', 'G03 counterclockwise arc', 'G04 dwell', 'G28 return reference', 'G30 secondary reference']],
      ['Setup / Modes', ['G18 XZ plane', 'G20 inch', 'G21 metric', 'G40 cancel nose radius comp', 'G50 spindle clamp/coordinate setting', 'G54-G59 work offsets', 'G96 constant surface speed', 'G97 fixed RPM', 'G98 feed per minute', 'G99 feed per revolution']],
      ['Lathe System A Cycles', ['G70 finish cycle', 'G71 OD/ID roughing', 'G72 facing roughing', 'G73 pattern repeat', 'G74 face groove/peck', 'G75 OD/ID groove', 'G76 threading', 'G90 turning cycle', 'G92 threading cycle', 'G94 facing cycle']],
      ['M Codes', ['M00 stop', 'M01 optional stop', 'M03 spindle forward', 'M04 spindle reverse', 'M05 spindle stop', 'M08 coolant on', 'M09 coolant off', 'M30 end/rewind', 'M98 subprogram call', 'M99 return']]
    ];
    $('handbookView')?.insertAdjacentHTML('afterbegin', `<div id="categorizedCodeReference" class="card span-2 categorized-ref"><div class="section-head"><h2>G-Code / M-Code Quick List</h2><span class="mini">Grouped for first-time lathe work.</span></div><div class="category-grid">${groups.map(([name, items]) => `<div class="code-category"><h3>${esc(name)}</h3><ul>${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>`).join('')}</div></div>`);
  }

  function injectVersionInfo() {
    if ($('appVersionInfo')) return;
    $('handbookView')?.insertAdjacentHTML('beforeend', `
      <div id="appVersionInfo" class="card span-2 version-info-card">
        <div class="section-head"><h2>Version Info</h2><span class="mini">PWA cache v42</span></div>
        <div class="refGrid version-info-grid">
          <p><strong>App</strong><span>CNC Lathe Work Helper</span></p>
          <p><strong>Version</strong><span>Lost Z Retouch Helper</span></p>
          <p><strong>Updated</strong><span>June 8, 2026</span></p>
          <p><strong>Includes</strong><span>Lost Z face retouch helper, compact Assistant key controls, white-background Material You orange theme, editable G-code editor, simulator plot, Quick Entry, macro snippets, setup notes, tool/feed library, and offline cache.</span></p>
        </div>
      </div>`);
  }

  function wire() {
    injectNotesPolish();
    injectSetupPhoto();
    injectWarningHelp();
    injectLostZHelper();
    improveReference();
    injectVersionInfo();
    document.querySelectorAll('input, textarea, select').forEach(el => el.addEventListener('change', () => captureCurrent()));
    setTimeout(() => { const job = currentJob(read()); if (job) fillJob(job); }, 400);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();

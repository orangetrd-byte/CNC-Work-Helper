(() => {
  const $ = id => document.getElementById(id);
  const storeKey = 'cncLatheWorkHelper.v4';
  const legacyKey = 'cncLatheWorkHelper.v3';
  const premadeTools = [
    { label: 'DB .187 x .015', width: '.187', radius: '.015', notes: 'Common groove/plunge insert' },
    { label: 'DB .125 x .008', width: '.125', radius: '.008', notes: 'Narrow groove/plunge insert' },
    { label: 'CNMG 432', width: '', radius: '.031', notes: 'General OD turning insert' },
    { label: 'VNMG 331', width: '', radius: '.015', notes: 'Finishing insert' },
    { label: 'Threading 60 deg', width: '', radius: '', notes: 'Threading tool, verify pitch and offset' }
  ];
  const premadeFeeds = [
    { label: 'Steel groove light', speed: 'S250 M03', feed: '.004' },
    { label: 'Steel groove heavy', speed: 'S180 M03', feed: '.006' },
    { label: 'Aluminum groove', speed: 'S600 M03', feed: '.006' },
    { label: 'Cast iron dry', speed: 'S320 M03', feed: '.005' },
    { label: 'Finish pass', speed: 'S450 M03', feed: '.003' }
  ];
  const blankJob = () => ({
    id: crypto.randomUUID(), partNumber: '', material: '', operation: '', machine: '', toolNotes: '', setupNotes: '',
    setup: { workOffset: '', stockDiameter: '', stockLength: '', chuckJaw: '', stickout: '', coolant: '', inspectionNotes: '', setupReference: '' },
    calculator: { mode: 'od', touchDia: '', targetDia: '', faceZ: '0.000', plungeDepth: '', zDirection: 'minus' },
    tool: { label: '', width: '', radius: '', notes: '' }, feed: { label: '', speed: '', feed: '' },
    gcode: { toolCall: '', rapidX: '', rapidZ: '', comment: '', output: '' }, lastMove: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  });
  const baseState = () => ({ jobs: [], currentJobId: null, tools: [], feeds: [], recentJobIds: [] });
  const fmt = value => Number.isFinite(value) ? Number(value).toFixed(3).replace(/^-0\.000$/, '0.000') : '--';
  const num = value => {
    const cleaned = String(value ?? '').trim().replace(/^\./, '0.').replace(/^-\./, '-0.');
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
  const normalizeDecimal = value => {
    const n = num(value);
    if (n === null) return '';
    return n.toFixed(3).replace(/^0(?=\.)/, '').replace(/0+$/, '').replace(/\.$/, '');
  };

  function readState() {
    const saved = localStorage.getItem(storeKey);
    if (saved) {
      try { return normalizeState(JSON.parse(saved)); } catch (error) { console.warn(error); }
    }
    const legacy = localStorage.getItem(legacyKey);
    if (legacy) {
      try { return migrateLegacy(JSON.parse(legacy)); } catch (error) { console.warn(error); }
    }
    const state = baseState();
    const job = blankJob();
    state.jobs.push(job);
    state.currentJobId = job.id;
    state.recentJobIds = [job.id];
    return state;
  }
  function normalizeState(input) {
    const state = { ...baseState(), ...input };
    state.jobs = Array.isArray(state.jobs) ? state.jobs.map(job => ({ ...blankJob(), ...job, setup: { ...blankJob().setup, ...(job.setup || {}) }, calculator: { ...blankJob().calculator, ...(job.calculator || {}) }, tool: { ...blankJob().tool, ...(job.tool || {}) }, feed: { ...blankJob().feed, ...(job.feed || {}) }, gcode: { ...blankJob().gcode, ...(job.gcode || {}) } })) : [];
    state.tools = Array.isArray(state.tools) ? state.tools : [];
    state.feeds = Array.isArray(state.feeds) ? state.feeds : [];
    if (!state.jobs.length) state.jobs.push(blankJob());
    if (!state.currentJobId || !state.jobs.some(job => job.id === state.currentJobId)) state.currentJobId = pickResumeJob(state.jobs).id;
    const current = state.jobs.find(job => job.id === state.currentJobId);
    if (current && isBlankJob(current) && state.jobs.some(job => !isBlankJob(job))) state.currentJobId = pickResumeJob(state.jobs).id;
    state.recentJobIds = uniqueIds([state.currentJobId, ...(state.recentJobIds || [])], state.jobs);
    return state;
  }
  function migrateLegacy(legacy) {
    const state = baseState();
    const job = blankJob();
    const latestNote = Array.isArray(legacy.notes) ? legacy.notes[0] : null;
    if (latestNote) {
      job.partNumber = latestNote.job || '';
      job.operation = latestNote.operation || '';
      job.material = latestNote.material || '';
      job.toolNotes = latestNote.tooling || '';
      job.setupNotes = latestNote.text || '';
    }
    if (legacy.lastMove) {
      job.lastMove = legacy.lastMove;
      job.calculator.touchDia = fmt(legacy.lastMove.touch);
      job.calculator.targetDia = fmt(legacy.lastMove.target);
      job.calculator.faceZ = fmt(legacy.lastMove.face);
      job.calculator.plungeDepth = fmt(legacy.lastMove.depth);
      job.tool.label = legacy.lastMove.tool || '';
      job.tool.width = legacy.lastMove.insertWidth ? String(legacy.lastMove.insertWidth) : '';
      job.tool.radius = legacy.lastMove.insertRadius ? String(legacy.lastMove.insertRadius) : '';
    }
    job.gcode.output = legacy.lastGcode || '';
    state.tools = Array.isArray(legacy.tools) ? legacy.tools.map(tool => ({ id: tool.id || crypto.randomUUID(), label: tool.label || '', width: tool.width || '', radius: tool.radius || '', notes: tool.notes || '', date: tool.date || new Date().toLocaleString() })) : [];
    state.jobs.push(job);
    state.currentJobId = job.id;
    state.recentJobIds = [job.id];
    return state;
  }
  function uniqueIds(ids, jobs) {
    const valid = new Set(jobs.map(job => job.id));
    return [...new Set(ids.filter(id => valid.has(id)))].slice(0, 20);
  }
  function isBlankJob(job) {
    const gcodeOutput = String(job.gcode?.output || '').trim();
    const hasUserGcode = gcodeOutput && !/^Enter (calculator values|or generate G-code)/i.test(gcodeOutput);
    return ![
      job.partNumber, job.material, job.operation, job.machine, job.toolNotes, job.setupNotes,
      job.setup?.workOffset, job.setup?.stockDiameter, job.setup?.stockLength, job.setup?.chuckJaw, job.setup?.stickout, job.setup?.coolant, job.setup?.inspectionNotes, job.setup?.setupReference, job.setup?.pieJawNotes, job.setup?.pieJawSize, job.setup?.pieJawBore, job.setup?.pieJawStep,
      job.calculator?.touchDia, job.calculator?.targetDia, job.calculator?.plungeDepth,
      job.tool?.label, job.feed?.label, hasUserGcode ? gcodeOutput : ''
    ].some(value => String(value || '').trim());
  }
  function pickResumeJob(jobs) {
    return [...jobs].sort((a, b) => {
      const blankDelta = Number(isBlankJob(a)) - Number(isBlankJob(b));
      if (blankDelta) return blankDelta;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    })[0] || jobs[0];
  }

  let state = readState();
  let saveTimer = null;
  let currentView = 'notesView';
  const currentJob = () => state.jobs.find(job => job.id === state.currentJobId) || state.jobs[0];
  function touchStatus(text) {
    $('saveStatus').textContent = text;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { $('saveStatus').textContent = 'Offline ready'; }, 1200);
  }
  function persist(status = 'Saved local') {
    const job = currentJob();
    if (job) job.updatedAt = new Date().toISOString();
    localStorage.setItem(storeKey, JSON.stringify(state));
    touchStatus(status);
  }
  function updateFromFields() {
    const job = currentJob();
    job.partNumber = $('partNumber').value.trim();
    job.material = $('material').value.trim();
    job.operation = $('operation').value.trim();
    job.machine = $('machine').value.trim();
    job.toolNotes = $('toolNotes').value.trim();
    job.setupNotes = $('setupNotes').value.trim();
    job.setup = {
      workOffset: $('workOffset').value.trim(), stockDiameter: $('stockDiameter').value.trim(), stockLength: $('stockLength').value.trim(), chuckJaw: $('chuckJaw').value.trim(), stickout: $('stickout').value.trim(), coolant: $('coolant').value.trim(), inspectionNotes: $('inspectionNotes').value.trim(), setupReference: $('setupReference').value.trim(),
      pieJawNotes: $('pieJawNotes')?.value.trim() || '', pieJawSize: $('pieJawSize')?.value.trim() || '', pieJawBore: $('pieJawBore')?.value.trim() || '', pieJawStep: $('pieJawStep')?.value.trim() || '',
      setupPhotoName: $('setupPhotoName')?.value.trim() || '', setupPhotoData: $('setupPhotoPreview')?.src?.startsWith('data:') ? $('setupPhotoPreview').src : (job.setup?.setupPhotoData || '')
    };
    job.calculator = { mode: document.querySelector('.seg.active')?.dataset.mode || 'od', touchDia: $('touchDia').value.trim(), targetDia: $('targetDia').value.trim(), faceZ: $('faceZ').value.trim(), plungeDepth: $('plungeDepth').value.trim(), zDirection: $('zDirection').value };
    job.tool = { label: $('toolLabel').value.trim(), width: $('insertWidth').value.trim(), radius: $('insertRadius').value.trim(), notes: $('customToolNotes').value.trim() };
    job.feed = { label: $('feedLabel').value.trim(), speed: $('gSpeed').value.trim(), feed: $('gFeed').value.trim() };
    job.gcode = { toolCall: $('gTool').value.trim(), rapidX: $('gRapidX').value.trim(), rapidZ: $('gRapidZ').value.trim(), comment: $('gComment').value.trim(), output: $('gcodeOut').textContent };
  }
  function fillFields(job) {
    $('partNumber').value = job.partNumber || ''; $('material').value = job.material || ''; $('operation').value = job.operation || ''; $('machine').value = job.machine || '';
    $('toolNotes').value = job.toolNotes || ''; $('setupNotes').value = job.setupNotes || ''; $('touchDia').value = job.calculator.touchDia || ''; $('targetDia').value = job.calculator.targetDia || '';
    $('workOffset').value = job.setup.workOffset || ''; $('stockDiameter').value = job.setup.stockDiameter || ''; $('stockLength').value = job.setup.stockLength || ''; $('chuckJaw').value = job.setup.chuckJaw || ''; $('stickout').value = job.setup.stickout || ''; $('coolant').value = job.setup.coolant || ''; $('inspectionNotes').value = job.setup.inspectionNotes || ''; $('setupReference').value = job.setup.setupReference || '';
    $('faceZ').value = job.calculator.faceZ || ''; $('plungeDepth').value = job.calculator.plungeDepth || ''; $('zDirection').value = job.calculator.zDirection || 'minus'; setMode(job.calculator.mode || 'od', false);
    $('toolLabel').value = job.tool.label || ''; $('insertWidth').value = job.tool.width || ''; $('insertRadius').value = job.tool.radius || ''; $('customToolNotes').value = job.tool.notes || '';
    $('feedLabel').value = job.feed.label || ''; $('gSpeed').value = job.feed.speed || ''; $('gFeed').value = job.feed.feed || ''; $('gTool').value = job.gcode.toolCall || '';
    $('gRapidX').value = job.gcode.rapidX || ''; $('gRapidZ').value = job.gcode.rapidZ || ''; $('gComment').value = job.gcode.comment || '';
    $('gcodeOut').textContent = job.gcode.output || 'Enter calculator values to generate draft G-code.';
    updateJobLabel();
    renderMoveFromJob(job);
  }
  function renderMoveFromJob(job) {
    const move = job.lastMove;
    if (!move) {
      $('manualResult').innerHTML = '<div class="big">X -- / Z --</div><div class="hint">Enter touch-off X diameter and target diameter.</div>';
      drawPlot(null);
      return;
    }
    $('manualResult').innerHTML = `<div class="mini">Move to</div><div class="big">X${fmt(move.target)} &nbsp; Z${fmt(move.zTarget)}</div><div class="medium">Radial travel: ${fmt(move.radialTravel)}</div><div class="hint">Diameter change: ${fmt(move.diaChange)}.${move.tool ? ` Tool: ${escapeHtml(move.tool)}` : ''}</div>`;
    const safeX = num($('gRapidX').value) ?? Math.max(move.touch, move.target) + 0.100;
    const safeZ = num($('gRapidZ').value) ?? (move.zTarget < move.face ? move.face + 0.100 : move.face - 0.100);
    drawPlot({ safeX, safeZ, targetX: move.target, targetZ: move.zTarget, faceZ: move.face, touchX: move.touch });
  }
  function updateJobLabel() {
    const job = currentJob();
    $('currentJobLabel').textContent = `Current: ${job.partNumber || job.operation || 'Untitled job'}`;
  }
  function setMode(mode, shouldSave = true) {
    document.querySelectorAll('.seg').forEach(button => button.classList.toggle('active', button.dataset.mode === mode));
    if (shouldSave) markUnsaved();
  }
  function markUnsaved() {
    updateFromFields();
    buildGcode(false);
    updateFromFields();
    updateJobLabel();
    touchStatus('Unsaved changes');
  }
  function saveCurrentJob(status = 'Saved job') {
    updateFromFields();
    buildGcode(false);
    updateFromFields();
    persist(status);
    render();
  }
  function calculateMove(saveAfter = true) {
    const job = currentJob();
    const touch = num($('touchDia').value), target = num($('targetDia').value), face = num($('faceZ').value) ?? 0, depth = num($('plungeDepth').value) ?? 0;
    if (touch === null || target === null) {
      $('manualResult').innerHTML = '<div class="big">X -- / Z --</div><div class="hint">Enter touch-off X diameter and target diameter.</div>';
      drawPlot(null); return null;
    }
    const zTarget = $('zDirection').value === 'minus' ? face - depth : face + depth;
    const radialTravel = Math.abs(touch - target) / 2;
    const diaChange = Math.abs(touch - target);
    const tool = $('toolLabel').value.trim();
    const move = { mode: document.querySelector('.seg.active')?.dataset.mode || 'od', touch, target, face, depth, zTarget, radialTravel, diaChange, tool, insertWidth: num($('insertWidth').value), insertRadius: num($('insertRadius').value), date: new Date().toLocaleString() };
    job.lastMove = move;
    $('manualResult').innerHTML = `<div class="mini">Move to</div><div class="big">X${fmt(target)} &nbsp; Z${fmt(zTarget)}</div><div class="medium">Radial travel: ${fmt(radialTravel)}</div><div class="hint">Diameter change: ${fmt(diaChange)}.${tool ? ` Tool: ${escapeHtml(tool)}` : ''}</div>`;
    buildGcode(false);
    if (saveAfter) markUnsaved();
    return move;
  }
  function buildGcode(saveToJob = true) {
    const job = currentJob();
    const move = job.lastMove;
    if (!move) { drawPlot(null); return; }
    const safeX = num($('gRapidX').value) ?? Math.max(move.touch, move.target) + 0.100;
    const safeZ = num($('gRapidZ').value) ?? (move.zTarget < move.face ? move.face + 0.100 : move.face - 0.100);
    const feed = $('gFeed').value.trim() || '.004';
    const toolCall = $('gTool').value.trim();
    const speed = $('gSpeed').value.trim();
    const comment = $('gComment').value.trim() || job.operation || 'MANUAL LATHE MOVE';
    const workOffset = job.setup?.workOffset?.trim();
    const output = [
      '%',
      `(${comment})`,
      '(DRAFT/CHECK BEFORE RUNNING)',
      '(VERIFY POST, OFFSETS, CLEARANCE, SPINDLE, FEED, AND X DIAMETER MODE)',
      'G18 G40 G80 G99',
      workOffset || '',
      toolCall,
      speed,
      `G00 X${fmt(safeX)} Z${fmt(safeZ)}`,
      `G01 Z${fmt(move.zTarget)} F${feed}`,
      `G01 X${fmt(move.target)} F${feed}`,
      `G00 X${fmt(safeX)}`,
      `G00 Z${fmt(safeZ)}`,
      '(OPTIONAL STOP / END TO SHOP STANDARD)',
      `(TARGET X${fmt(move.target)} Z${fmt(move.zTarget)})`,
      `(RADIAL TRAVEL ${fmt(move.radialTravel)})`,
      move.tool ? `(TOOL ${move.tool})` : '',
      '%'
    ].filter(Boolean).join('\n');
    $('gcodeOut').textContent = output;
    drawPlot({ safeX, safeZ, targetX: move.target, targetZ: move.zTarget, faceZ: move.face, touchX: move.touch });
    if (saveToJob) job.gcode.output = output;
  }
  function drawPlot(move) {
    const svg = $('gcodePlot');
    if (!svg) return;
    if (!move) { svg.innerHTML = '<text x="24" y="42" class="plotLabel">No move calculated yet.</text>'; return; }
    const pad = 42, width = 640, height = 280, xs = [move.safeX, move.targetX, move.touchX], zs = [move.safeZ, move.targetZ, move.faceZ];
    let minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
    if (maxX - minX < .001) { maxX += 1; minX -= 1; }
    if (maxZ - minZ < .001) { maxZ += .25; minZ -= .25; }
    const marginX = (maxX - minX) * .12 || .1, marginZ = (maxZ - minZ) * .20 || .1;
    minX -= marginX; maxX += marginX; minZ -= marginZ; maxZ += marginZ;
    const px = z => pad + (z - minZ) / (maxZ - minZ) * (width - pad * 2);
    const py = x => height - pad - (x - minX) / (maxX - minX) * (height - pad * 2);
    const p1 = [px(move.safeZ), py(move.safeX)], p2 = [px(move.targetZ), py(move.safeX)], p3 = [px(move.targetZ), py(move.targetX)];
    svg.innerHTML = `<line x1="${pad}" y1="${height-pad}" x2="${width-pad}" y2="${height-pad}" class="plotGrid"/><line x1="${pad}" y1="${pad}" x2="${pad}" y2="${height-pad}" class="plotGrid"/><text x="${width/2-35}" y="${height-10}" class="plotLabel">Z axis</text><text x="8" y="${pad-12}" class="plotLabel">X diameter</text><path d="M ${p1[0]} ${p1[1]} L ${p2[0]} ${p2[1]} L ${p3[0]} ${p3[1]}" class="plotPath"/><path d="M ${p3[0]} ${p3[1]} L ${p1[0]} ${p1[1]}" class="plotRapid"/><circle cx="${p1[0]}" cy="${p1[1]}" r="6" class="plotSafe"/><text x="${p1[0]+8}" y="${p1[1]-8}" class="plotLabel">rapid X${fmt(move.safeX)} Z${fmt(move.safeZ)}</text><circle cx="${p2[0]}" cy="${p2[1]}" r="5" class="plotPoint"/><text x="${p2[0]+8}" y="${p2[1]+16}" class="plotLabel">feed Z${fmt(move.targetZ)}</text><circle cx="${p3[0]}" cy="${p3[1]}" r="6" class="plotWarn"/><text x="${p3[0]+8}" y="${p3[1]-8}" class="plotLabel">target X${fmt(move.targetX)} Z${fmt(move.targetZ)}</text><text x="${pad}" y="24" class="plotLabel">Solid = feed. Dashed = rapid/retract.</text>`;
  }
  function parseToolLabel(label) {
    const match = String(label).match(/([0-9]*\.?[0-9]+)\s*(?:x|X)\s*([0-9]*\.?[0-9]+)/);
    return match ? { width: normalizeDecimal(match[1]), radius: normalizeDecimal(match[2]) } : null;
  }
  function renderSelects() {
    const toolOptions = '<option value="">Choose tool...</option>' + allTools().map(tool => `<option value="${tool.id}">${escapeHtml(tool.label)}</option>`).join('');
    $('premadeTool').innerHTML = toolOptions;
    $('activeToolSelect').innerHTML = toolOptions;
    $('gcodeToolSelect').innerHTML = toolOptions;
    $('premadeFeed').innerHTML = '<option value="">Choose common speed/feed...</option>' + premadeFeeds.map((feed, index) => `<option value="${index}">${escapeHtml(feed.label)}</option>`).join('');
  }
  function allTools() {
    return [...premadeTools.map((tool, index) => ({ ...tool, id: `p${index}` })), ...state.tools];
  }
  function currentToolId() {
    const label = $('toolLabel').value.trim();
    return allTools().find(tool => tool.label === label)?.id || '';
  }
  function syncToolSelects() {
    const id = currentToolId();
    $('premadeTool').value = id;
    $('activeToolSelect').value = id;
    $('gcodeToolSelect').value = id;
  }
  const visibleJobs = () => state.jobs.filter(job => !isBlankJob(job));
  const jobTitle = job => job.partNumber || job.operation || job.machine || 'Untitled job';
  function renderJobs() {
    const sorted = visibleJobs().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    $('jobsList').innerHTML = sorted.map(job => `<div class="item"><strong>${escapeHtml(jobTitle(job))}</strong><span class="mini">${escapeHtml(new Date(job.updatedAt).toLocaleString())}</span><p>${escapeHtml([job.material,job.operation,job.machine].filter(Boolean).join('\n'))}</p><div class="row actions"><button type="button" onclick="loadJob('${job.id}')">Load</button><button class="ghost" type="button" onclick="duplicateJob('${job.id}')">Duplicate</button></div></div>`).join('') || '<p class="hint">No saved jobs yet.</p>';
    $('setupJobsList').innerHTML = sorted.map(job => `<div class="item"><strong>${escapeHtml(jobTitle(job))}</strong><span class="mini">${escapeHtml(new Date(job.updatedAt).toLocaleString())}</span><p>${escapeHtml([job.setup?.workOffset ? `Offset: ${job.setup.workOffset}` : '', job.setup?.stockDiameter ? `Stock: ${job.setup.stockDiameter}` : '', job.setup?.chuckJaw, job.setup?.setupReference].filter(Boolean).join('\n'))}</p><div class="row actions"><button type="button" onclick="loadJob('${job.id}')">Load Reference</button><button class="ghost" type="button" onclick="duplicateJob('${job.id}')">Duplicate</button></div></div>`).join('') || '<p class="hint">No saved job references yet.</p>';
    $('recentJobsList').innerHTML = state.recentJobIds.map(id => state.jobs.find(job => job.id === id)).filter(job => job && !isBlankJob(job)).map(job => `<div class="item"><strong>${escapeHtml(jobTitle(job))}</strong><span class="mini">${escapeHtml(new Date(job.updatedAt).toLocaleString())}</span><button type="button" onclick="loadJob('${job.id}')">Load Job</button></div>`).join('') || '<p class="hint">No recent jobs yet.</p>';
  }
  function renderTools() {
    const tools = allTools();
    const feeds = [...premadeFeeds.map((feed, index) => ({ ...feed, id: `f${index}` })), ...state.feeds];
    const toolHtml = tools.map(tool => `<div class="item"><strong>${escapeHtml(tool.label)}</strong><p>${escapeHtml([tool.width ? `Width: ${tool.width}` : '', tool.radius ? `Radius: ${tool.radius}` : '', tool.notes].filter(Boolean).join('\n'))}</p><button type="button" onclick="useTool('${tool.id}')">Use Tool</button></div>`).join('');
    const feedHtml = feeds.map(feed => `<div class="item"><strong>${escapeHtml(feed.label)}</strong><p>${escapeHtml([feed.speed, feed.feed ? `Feed: ${feed.feed}` : ''].filter(Boolean).join('\n'))}</p><button type="button" onclick="useFeed('${feed.id}')">Use Feed</button></div>`).join('');
    $('toolsList').innerHTML = toolHtml + feedHtml;
  }
  function render() { renderSelects(); renderJobs(); renderTools(); updateJobLabel(); syncToolSelects(); }
  function showView(id) {
    currentView = id;
    document.querySelectorAll('.view').forEach(view => view.classList.add('hidden'));
    $(id).classList.remove('hidden');
    document.querySelectorAll('.nav').forEach(button => button.classList.toggle('active', button.dataset.view === id));
    render();
  }
  function openDrawer() {
    renderJobs();
    $('recentDrawer').classList.remove('hidden');
    $('drawerScrim').classList.remove('hidden');
    document.body.classList.add('drawer-open');
    $('recentDrawer').setAttribute('aria-modal', 'true');
  }
  function closeDrawer() {
    $('recentDrawer').classList.add('hidden');
    $('drawerScrim').classList.add('hidden');
    document.body.classList.remove('drawer-open');
    $('recentDrawer').removeAttribute('aria-modal');
  }
  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  }
  function importJobData(data) {
    const incomingJobs = Array.isArray(data.jobs) ? data.jobs : [data.job || data];
    const normalized = incomingJobs.filter(Boolean).map(job => normalizeState({ jobs: [job], currentJobId: job.id }).jobs[0]);
    normalized.forEach(job => { job.id = crypto.randomUUID(); job.createdAt = new Date().toISOString(); job.updatedAt = new Date().toISOString(); state.jobs.unshift(job); });
    if (normalized[0]) { state.currentJobId = normalized[0].id; state.recentJobIds = uniqueIds([normalized[0].id, ...state.recentJobIds], state.jobs); fillFields(normalized[0]); }
    persist('Imported'); render();
  }
  window.loadJob = id => {
    updateFromFields();
    const job = state.jobs.find(item => item.id === id);
    if (!job) return;
    state.currentJobId = id;
    state.recentJobIds = uniqueIds([id, ...state.recentJobIds], state.jobs);
    fillFields(job); persist('Loaded job'); closeDrawer(); showView('notesView');
  };
  window.duplicateJob = id => {
    updateFromFields();
    const source = state.jobs.find(job => job.id === id) || currentJob();
    const copy = JSON.parse(JSON.stringify(source));
    copy.id = crypto.randomUUID(); copy.partNumber = `${copy.partNumber || 'Untitled'} copy`; copy.createdAt = new Date().toISOString(); copy.updatedAt = new Date().toISOString();
    state.jobs.unshift(copy); state.currentJobId = copy.id; state.recentJobIds = uniqueIds([copy.id, ...state.recentJobIds], state.jobs);
    fillFields(copy); persist('Duplicated'); render();
  };
  window.useTool = id => {
    const tool = String(id).startsWith('p') ? premadeTools[Number(String(id).slice(1))] : state.tools.find(item => item.id === id);
    if (!tool) return;
    $('toolLabel').value = tool.label || ''; $('insertWidth').value = tool.width || ''; $('insertRadius').value = tool.radius || ''; $('customToolNotes').value = tool.notes || ''; markUnsaved();
  };
  window.useFeed = id => {
    const feed = String(id).startsWith('f') ? premadeFeeds[Number(String(id).slice(1))] : state.feeds.find(item => item.id === id);
    if (!feed) return;
    $('feedLabel').value = feed.label || ''; $('gSpeed').value = feed.speed || ''; $('gFeed').value = feed.feed || ''; markUnsaved();
  };

  document.querySelectorAll('.nav').forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
  document.querySelectorAll('.seg').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
  $('recentToggle').addEventListener('click', openDrawer);
  $('closeDrawer').addEventListener('click', closeDrawer); $('drawerScrim').addEventListener('click', closeDrawer);
  $('newJobBtn').addEventListener('click', () => { updateFromFields(); const job = blankJob(); state.jobs.unshift(job); state.currentJobId = job.id; state.recentJobIds = uniqueIds([job.id, ...state.recentJobIds], state.jobs); fillFields(job); persist('New job'); render(); });
  $('saveJobBtn').addEventListener('click', () => saveCurrentJob());
  $('saveSetupBtn').addEventListener('click', () => saveCurrentJob('Saved setup'));
  $('duplicateJobBtn').addEventListener('click', () => window.duplicateJob(state.currentJobId));
  $('loadJobBtn').addEventListener('click', openDrawer);
  $('setupNewJobBtn').addEventListener('click', () => $('newJobBtn').click());
  $('setupLoadJobBtn').addEventListener('click', () => $('loadJobBtn').click());
  $('loadLatheExampleBtn').addEventListener('click', () => { $('touchDia').value = '24.000'; $('targetDia').value = '3.000'; $('faceZ').value = '0.000'; $('plungeDepth').value = '.500'; $('zDirection').value = 'minus'; $('toolLabel').value = 'DB .187 x .015'; $('insertWidth').value = '.187'; $('insertRadius').value = '.015'; calculateMove(true); });
  ['partNumber','material','operation','machine','toolNotes','setupNotes','workOffset','stockDiameter','stockLength','chuckJaw','stickout','coolant','inspectionNotes','setupReference','touchDia','targetDia','faceZ','plungeDepth','zDirection','insertWidth','insertRadius','customToolNotes','gTool','gRapidX','gRapidZ','gComment','gSpeed','gFeed','feedLabel'].forEach(id => {
    $(id).addEventListener('input', () => { if (['touchDia','targetDia','faceZ','plungeDepth','zDirection'].includes(id)) calculateMove(false); markUnsaved(); });
  });
  $('toolLabel').addEventListener('input', () => { const parsed = parseToolLabel($('toolLabel').value); if (parsed) { $('insertWidth').value = parsed.width; $('insertRadius').value = parsed.radius; } markUnsaved(); });
  ['premadeTool','activeToolSelect','gcodeToolSelect'].forEach(id => {
    $(id).addEventListener('change', event => { if (event.target.value !== '') window.useTool(event.target.value); });
  });
  $('premadeFeed').addEventListener('change', event => { if (event.target.value !== '') window.useFeed(`f${event.target.value}`); });
  $('saveToolBtn').addEventListener('click', () => { const tool = { id: crypto.randomUUID(), date: new Date().toLocaleString(), label: $('toolLabel').value.trim(), width: $('insertWidth').value.trim(), radius: $('insertRadius').value.trim(), notes: $('customToolNotes').value.trim() }; if (!tool.label && !tool.width && !tool.radius && !tool.notes) return; state.tools.unshift(tool); saveCurrentJob('Saved tool'); });
  $('saveFeedBtn').addEventListener('click', () => { state.feeds.unshift({ id: crypto.randomUUID(), date: new Date().toLocaleString(), label: $('feedLabel').value.trim() || 'Custom speed/feed', speed: $('gSpeed').value.trim(), feed: $('gFeed').value.trim() }); saveCurrentJob('Saved feed'); });
  $('refreshGcodeBtn').addEventListener('click', () => { calculateMove(false); markUnsaved(); });
  $('copyGcodeBtn').addEventListener('click', async () => { try { await navigator.clipboard.writeText($('gcodeOut').textContent); touchStatus('Copied'); } catch (error) { alert('Copy failed. Long press and copy from the code box.'); } });
  $('exportJobBtn').addEventListener('click', () => { updateFromFields(); downloadJson('cnc-work-helper-job.json', { app: 'CNC Lathe Work Helper', version: 4, job: currentJob() }); });
  $('exportAllBtn').addEventListener('click', () => { updateFromFields(); downloadJson('cnc-work-helper-all.json', { app: 'CNC Lathe Work Helper', version: 4, ...state }); });
  $('importFile').addEventListener('change', async event => { const file = event.target.files[0]; if (!file) return; try { importJobData(JSON.parse(await file.text())); event.target.value = ''; } catch (error) { alert('Import failed. Check that this is a valid CNC Work Helper JSON export.'); } });
  $('clearBtn').addEventListener('click', () => { if (!confirm('Clear saved jobs, tools, feeds, and current auto-save?')) return; state = baseState(); const job = blankJob(); state.jobs.push(job); state.currentJobId = job.id; state.recentJobIds = [job.id]; fillFields(job); persist('Cleared'); render(); });
  renderSelects(); fillFields(currentJob()); touchStatus('Auto-resumed'); showView(currentView);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(console.warn));
})();

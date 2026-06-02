(() => {
  const storeKey = 'cncLatheWorkHelper.v4';
  const fieldIds = new Set([
    'partNumber','material','operation','machine','toolNotes','setupNotes','workOffset','stockDiameter','stockLength','chuckJaw','stickout','coolant','inspectionNotes','setupReference','touchDia','targetDia','faceZ','plungeDepth','zDirection','insertWidth','insertRadius','customToolNotes','gTool','gRapidX','gRapidZ','gComment','gSpeed','gFeed','feedLabel','toolLabel','pieJawNotes','pieJawSize','pieJawBore','pieJawStep','setupPhotoName','gcodeEditor'
  ]);
  const $ = id => document.getElementById(id);
  let timer = null;
  let saving = false;

  function read() {
    try { return JSON.parse(localStorage.getItem(storeKey) || '{}'); } catch { return {}; }
  }

  function write(state) {
    localStorage.setItem(storeKey, JSON.stringify(state));
  }

  function isBlankJob(job) {
    const setup = job?.setup || {}, calc = job?.calculator || {}, tool = job?.tool || {}, feed = job?.feed || {}, gcode = job?.gcode || {};
    return ![
      job?.partNumber, job?.material, job?.operation, job?.machine, job?.toolNotes, job?.setupNotes,
      setup.workOffset, setup.stockDiameter, setup.stockLength, setup.chuckJaw, setup.stickout, setup.coolant, setup.inspectionNotes, setup.setupReference, setup.pieJawNotes, setup.pieJawSize, setup.pieJawBore, setup.pieJawStep,
      calc.touchDia, calc.targetDia, calc.plungeDepth,
      tool.label, tool.width, tool.radius, tool.notes,
      feed.label, feed.speed, feed.feed,
      gcode.toolCall, gcode.rapidX, gcode.rapidZ, gcode.comment, gcode.output
    ].some(value => String(value || '').trim());
  }

  function pruneBlankUntitledJobs() {
    const state = read();
    if (!Array.isArray(state.jobs) || state.jobs.length <= 1) return;
    const currentId = state.currentJobId;
    const before = state.jobs.length;
    state.jobs = state.jobs.filter(job => job.id === currentId || !isBlankJob(job));
    if (Array.isArray(state.recentJobIds)) {
      const valid = new Set(state.jobs.map(job => job.id));
      state.recentJobIds = state.recentJobIds.filter(id => valid.has(id));
    }
    if (state.jobs.length !== before) write(state);
  }

  function markUnsaved() {
    const signal = $('saveSignal');
    if (signal) {
      signal.className = 'save-signal unsaved';
      if (signal.lastChild) signal.lastChild.textContent = 'Unsaved Changes';
    }
    if ($('saveStatus')) $('saveStatus').textContent = 'Unsaved changes';
  }

  function scheduleSave() {
    if (saving) return;
    markUnsaved();
    clearTimeout(timer);
    timer = setTimeout(() => {
      saving = true;
      $('saveJobBtn')?.click();
      setTimeout(() => {
        pruneBlankUntitledJobs();
        if ($('saveStatus')) $('saveStatus').textContent = 'Saved';
        saving = false;
      }, 120);
    }, 3500);
  }

  function shouldControl(event) {
    const target = event.target;
    if (!target || !fieldIds.has(target.id)) return false;
    if (target.closest('#geminiAssistantPanel')) return false;
    return true;
  }

  function interceptInput(event) {
    if (!shouldControl(event)) return;
    event.stopImmediatePropagation();
    scheduleSave();
  }

  function wire() {
    document.addEventListener('input', interceptInput, true);
    document.addEventListener('change', interceptInput, true);
    ['newJobBtn','saveJobBtn','duplicateJobBtn','loadJobBtn'].forEach(id => $(id)?.addEventListener('click', () => setTimeout(pruneBlankUntitledJobs, 250)));
    setTimeout(pruneBlankUntitledJobs, 800);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();

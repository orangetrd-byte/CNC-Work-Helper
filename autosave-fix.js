(() => {
  const storeKey = 'cncLatheWorkHelper.v4';
  const legacyKey = 'cncLatheWorkHelper.v3';
  const assistantKeys = new Set([
    'cncLatheWorkHelper.geminiApiKey',
    'cncLatheWorkHelper.geminiModel',
    'cncLatheWorkHelper.beginnerMode'
  ]);
  const $ = id => document.getElementById(id);
  let timer = null;
  let pendingState = null;
  let allowImmediateUntil = 0;
  let suppressUntilEdit = false;
  let patched = false;

  function read() {
    try { return JSON.parse(localStorage.getItem(storeKey) || '{}'); } catch { return {}; }
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

  function markUnsaved() {
    const signal = $('saveSignal');
    if (signal) {
      signal.className = 'save-signal unsaved';
      if (signal.lastChild) signal.lastChild.textContent = 'Unsaved Changes';
    }
    if ($('saveStatus')) $('saveStatus').textContent = 'Unsaved changes';
  }

  function markSaved(text = 'Saved') {
    const signal = $('saveSignal');
    if (signal) {
      signal.className = 'save-signal saved';
      if (signal.lastChild) signal.lastChild.textContent = 'Saved';
    }
    if ($('saveStatus')) $('saveStatus').textContent = text;
  }

  function pruneState(state) {
    if (!Array.isArray(state.jobs) || state.jobs.length <= 1) return state;
    const currentId = state.currentJobId;
    state.jobs = state.jobs.filter(job => job.id === currentId || !isBlankJob(job));
    if (Array.isArray(state.recentJobIds)) {
      const valid = new Set(state.jobs.map(job => job.id));
      state.recentJobIds = state.recentJobIds.filter(id => valid.has(id));
    }
    return state;
  }

  function scheduleWrite(serialized) {
    pendingState = serialized;
    markUnsaved();
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!pendingState || suppressUntilEdit) return;
      const value = pendingState;
      pendingState = null;
      allowImmediate(() => localStorage.setItem(storeKey, value));
      pruneBlankUntitledJobs();
      markSaved('Saved');
    }, 3500);
  }

  function allowImmediate(fn) {
    const previous = allowImmediateUntil;
    allowImmediateUntil = Date.now() + 1000;
    try { return fn(); }
    finally { allowImmediateUntil = previous; }
  }

  function pruneBlankUntitledJobs() {
    const state = pruneState(read());
    allowImmediate(() => localStorage.setItem(storeKey, JSON.stringify(state)));
  }

  function patchStorage() {
    if (patched || window.__cncDelayedAutosaveStoragePatch) return;
    patched = true;
    window.__cncDelayedAutosaveStoragePatch = true;
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (this === localStorage && key === storeKey && Date.now() > allowImmediateUntil) {
        if (suppressUntilEdit) return undefined;
        scheduleWrite(String(value));
        return undefined;
      }
      const result = originalSetItem.apply(this, arguments);
      if (this === localStorage && (key === storeKey || assistantKeys.has(key))) markSaved(key === storeKey ? 'Saved' : 'Saved setting');
      return result;
    };
  }

  function clearFields() {
    document.querySelectorAll('input, textarea').forEach(el => {
      if (el.closest('#geminiAssistantPanel')) return;
      if (el.type === 'file') el.value = '';
      else if (el.type !== 'checkbox' && el.type !== 'radio') el.value = '';
    });
    if ($('faceZ')) $('faceZ').value = '0.000';
    if ($('zDirection')) $('zDirection').value = 'minus';
    if ($('manualResult')) $('manualResult').innerHTML = '<div class="big">X -- / Z --</div><div class="hint">Start a new job or enter values to resume autosave.</div>';
    if ($('gcodeEditor')) $('gcodeEditor').value = '';
    if ($('gcodeOut')) $('gcodeOut').textContent = 'Enter or generate G-code.';
    if ($('jobsList')) $('jobsList').innerHTML = '<p class="hint">Local data cleared. Tap Start New Job to begin again.</p>';
    if ($('recentJobsList')) $('recentJobsList').innerHTML = '<p class="hint">No recent jobs.</p>';
    if ($('setupJobsList')) $('setupJobsList').innerHTML = '<p class="hint">No saved job references.</p>';
    $('startNewAfterClearBtn')?.classList.remove('hidden');
  }

  function clearLocal(event) {
    const target = event.target?.closest?.('#clearBtn');
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!confirm('Clear saved jobs, tools, feeds, and current auto-save?')) return;
    clearTimeout(timer);
    pendingState = null;
    suppressUntilEdit = true;
    allowImmediate(() => {
      localStorage.removeItem(storeKey);
      localStorage.removeItem(legacyKey);
    });
    clearFields();
    markSaved('Local data cleared');
  }

  function resumeAfterEdit(event) {
    if (!suppressUntilEdit) return;
    if (event.target?.closest?.('#geminiAssistantPanel')) return;
    if (event.target?.id === 'clearBtn') return;
    suppressUntilEdit = false;
    markUnsaved();
  }

  function wire() {
    patchStorage();
    document.addEventListener('click', event => {
      if (event.target?.closest?.('#newJobBtn, #saveJobBtn, #duplicateJobBtn, #loadJobBtn, #setupNewJobBtn, #setupLoadJobBtn, #saveSetupBtn, #saveCodeBtn, #exportJobBtn, #exportAllBtn, #startNewAfterClearBtn')) {
        suppressUntilEdit = false;
        allowImmediateUntil = Date.now() + 1000;
      }
    }, true);
    document.addEventListener('click', clearLocal, true);
    document.addEventListener('input', resumeAfterEdit, true);
    document.addEventListener('change', resumeAfterEdit, true);
    ['newJobBtn','saveJobBtn','duplicateJobBtn','loadJobBtn','saveCodeBtn'].forEach(id => $(id)?.addEventListener('click', () => setTimeout(pruneBlankUntitledJobs, 250)));
    setTimeout(pruneBlankUntitledJobs, 800);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();

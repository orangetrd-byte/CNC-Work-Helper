(() => {
  const storeKey = 'cncLatheWorkHelper.v4';
  const $ = id => document.getElementById(id);
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));

  function readState() {
    try {
      return JSON.parse(localStorage.getItem(storeKey) || '{}');
    } catch (error) {
      return {};
    }
  }

  function writeState(state) {
    localStorage.setItem(storeKey, JSON.stringify(state));
  }

  function readJobs() {
    const state = readState();
    return Array.isArray(state.jobs) ? state.jobs : [];
  }

  function title(job) {
    return job.partNumber || job.operation || job.machine || 'Untitled job';
  }

  function summary(job) {
    return [
      job.material,
      job.operation,
      job.machine,
      job.setup?.workOffset ? `Offset: ${job.setup.workOffset}` : '',
      job.setup?.stockDiameter ? `Stock: ${job.setup.stockDiameter}` : '',
      job.setup?.chuckJaw || ''
    ].filter(Boolean).join('\n');
  }

  function openJobPicker(event) {
    if (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    const list = $('recentJobsList');
    const drawer = $('recentDrawer');
    const scrim = $('drawerScrim');
    if (!list || !drawer || !scrim) return;

    const heading = drawer.querySelector('h2');
    if (heading) heading.textContent = 'Load Job';

    const jobs = readJobs().sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    list.innerHTML = jobs.length ? jobs.map(job => `<div class="item"><strong>${escapeHtml(title(job))}</strong><span class="mini">${escapeHtml(job.updatedAt ? new Date(job.updatedAt).toLocaleString() : '')}</span><p>${escapeHtml(summary(job))}</p><button type="button" onclick="loadJob('${job.id}')">Load Job</button></div>`).join('') : '<p class="hint">No saved jobs yet. Save the current job first.</p>';
    drawer.classList.remove('hidden');
    scrim.classList.remove('hidden');
  }

  function clearCalculator() {
    ['touchDia', 'targetDia', 'plungeDepth', 'gRapidX', 'gRapidZ'].forEach(id => { if ($(id)) $(id).value = ''; });
    if ($('faceZ')) $('faceZ').value = '0.000';
    if ($('zDirection')) $('zDirection').value = 'minus';
    if ($('manualResult')) $('manualResult').innerHTML = '<div class="big">X -- / Z --</div><div class="hint">Enter touch-off X diameter and target diameter.</div>';
    if ($('gcodeOut')) $('gcodeOut').textContent = 'Enter calculator values to generate draft G-code.';
    if ($('gcodePlot')) $('gcodePlot').innerHTML = '<text x="24" y="42" class="plotLabel">No move calculated yet.</text>';

    const state = readState();
    const job = Array.isArray(state.jobs) ? state.jobs.find(item => item.id === state.currentJobId) : null;
    if (job) {
      job.lastMove = null;
      job.calculator = { ...(job.calculator || {}), touchDia: '', targetDia: '', faceZ: '0.000', plungeDepth: '', zDirection: 'minus' };
      job.gcode = { ...(job.gcode || {}), rapidX: '', rapidZ: '', output: 'Enter calculator values to generate draft G-code.' };
      job.updatedAt = new Date().toISOString();
      writeState(state);
    }
  }

  ['loadJobBtn', 'setupLoadJobBtn', 'recentToggle'].forEach(id => {
    const button = $(id);
    if (button) button.addEventListener('click', openJobPicker, true);
  });

  const clearButton = $('clearCalcBtn');
  if (clearButton) clearButton.addEventListener('click', clearCalculator);
})();

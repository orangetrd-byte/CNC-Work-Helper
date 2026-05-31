(() => {
  const storeKey = 'cncLatheWorkHelper.v4';
  const $ = id => document.getElementById(id);
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));

  function readJobs() {
    try {
      const state = JSON.parse(localStorage.getItem(storeKey) || '{}');
      return Array.isArray(state.jobs) ? state.jobs : [];
    } catch (error) {
      return [];
    }
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

  ['loadJobBtn', 'setupLoadJobBtn', 'recentToggle'].forEach(id => {
    const button = $(id);
    if (button) button.addEventListener('click', openJobPicker, true);
  });
})();

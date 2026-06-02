(() => {
  const $ = id => document.getElementById(id);
  const referenceIds = ['manualView', 'tipsView', 'symbolsView', 'geometryView', 'handbookView', 'savedView'];

  function moveReferenceNavUp() {
    const hub = $('referenceHubView');
    const first = $('manualView');
    if (!hub || !first || hub.dataset.movedUp === '1') return false;
    first.parentNode.insertBefore(hub, first);
    hub.dataset.movedUp = '1';
    hub.classList.add('reference-hub-shell');
    return true;
  }

  function markReferenceMode() {
    const active = !$('referenceHubView')?.classList.contains('hidden') || referenceIds.some(id => !$(id)?.classList.contains('hidden'));
    document.body.classList.toggle('reference-mode-active', active);
  }

  function wire() {
    moveReferenceNavUp();
    markReferenceMode();
    document.addEventListener('click', event => {
      if (event.target.closest('.uiux-tab, .ref-chip, .nav')) setTimeout(() => { moveReferenceNavUp(); markReferenceMode(); }, 40);
    });
    let tries = 0;
    const timer = setInterval(() => {
      const moved = moveReferenceNavUp();
      markReferenceMode();
      if (moved || ++tries > 30) clearInterval(timer);
    }, 200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();

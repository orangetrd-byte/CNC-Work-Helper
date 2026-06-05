(() => {
  const storeKey = 'cncLatheWorkHelper.v4';
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const num = value => {
    const text = String(value ?? '').trim().replace(/^\./, '0.').replace(/-\./, '-0.');
    const parsed = Number(text);
    return text && Number.isFinite(parsed) ? parsed : null;
  };
  const fmt = value => Number.isFinite(value) ? Number(value).toFixed(4).replace(/0+$/, '').replace(/\.$/, '') : '--';
  const fmt3 = value => Number.isFinite(value) ? Number(value).toFixed(3).replace(/^-0\.000$/, '0.000') : '--';

  const presetSnippets = [
    {
      id: 'preset-safe-start',
      name: 'Safe start - turning',
      group: 'Setup',
      text: 'G18 G20 G40 G80 G99\nG50 S2500\nG54\n(VERIFY TOOL, OFFSET, STOCK, JAWS, AND Z FACE)'
    },
    {
      id: 'preset-safe-end',
      name: 'Safe retract / end',
      group: 'Setup',
      text: 'G00 X[#SAFE_X] Z[#SAFE_Z]\nM09\nM05\nM30'
    },
    {
      id: 'preset-css',
      name: 'CSS spindle block',
      group: 'Spindle',
      text: 'G50 S2500\nG96 S450 M03\nM08'
    },
    {
      id: 'preset-fixed-rpm',
      name: 'Fixed RPM block',
      group: 'Spindle',
      text: 'G97 S500 M03\nM08'
    },
    {
      id: 'preset-od-groove',
      name: 'OD groove plunge',
      group: 'Cut',
      text: '(OD GROOVE - DRAFT/CHECK BEFORE RUNNING)\nT0505\nG00 X[#SAFE_X] Z[#Z_START]\nG01 X[#TARGET_X] F[#FEED]\nG00 X[#SAFE_X]'
    },
    {
      id: 'preset-face-cleanup',
      name: 'Face cleanup pass',
      group: 'Cut',
      text: '(FACE CLEANUP - DRAFT/CHECK BEFORE RUNNING)\nG00 X[#SAFE_X] Z.050\nG01 Z0.000 F[#FEED]\nG01 X-.030\nG00 X[#SAFE_X] Z.100'
    },
    {
      id: 'preset-g71',
      name: 'G71 rough skeleton',
      group: 'Cycle',
      text: '(G71 ROUGH - VERIFY CONTROL FORMAT)\nG71 U.050 R.020\nG71 P100 Q200 U.010 W.005 F.008\nN100 G00 X[#START_X] Z[#START_Z]\nG01 X[#PROFILE_X] Z[#PROFILE_Z]\nN200 G01 X[#END_X]'
    },
    {
      id: 'preset-g76',
      name: 'G76 thread skeleton',
      group: 'Cycle',
      text: '(G76 THREAD - VERIFY CONTROL FORMAT)\nG76 P010060 Q0050 R0\nG76 X[#MINOR_X] Z[#END_Z] P[#DEPTH] Q[#FIRST_CUT] F[#PITCH]'
    }
  ];

  function read() {
    try { return JSON.parse(localStorage.getItem(storeKey) || '{}'); } catch { return {}; }
  }

  function write(state, message = 'Saved shop workflow') {
    localStorage.setItem(storeKey, JSON.stringify(state));
    if ($('saveStatus')) $('saveStatus').textContent = message;
  }

  function currentJob(state = read()) {
    return Array.isArray(state.jobs) ? state.jobs.find(job => job.id === state.currentJobId) || state.jobs[0] : null;
  }

  function allSnippets() {
    const state = read();
    const custom = Array.isArray(state.macroSnippets) ? state.macroSnippets : [];
    return [...presetSnippets, ...custom];
  }

  function customSnippets(state = read()) {
    return Array.isArray(state.macroSnippets) ? state.macroSnippets : [];
  }

  function editor() {
    return $('gcodeEditor');
  }

  function dispatchEditorInput() {
    editor()?.dispatchEvent(new Event('input', { bubbles: true }));
    $('checkCodeBtn')?.click();
  }

  function insertAtCursor(text) {
    const ed = editor();
    if (!ed) return;
    const value = ed.value || '';
    const start = ed.selectionStart ?? value.length;
    const end = ed.selectionEnd ?? value.length;
    const before = value.slice(0, start).replace(/\s*$/, '');
    const after = value.slice(end).replace(/^\s*/, '');
    const joined = [before, text.trim(), after].filter(Boolean).join('\n');
    ed.value = joined;
    const pos = (before ? before.length + 1 : 0) + text.trim().length;
    ed.focus();
    ed.setSelectionRange(pos, pos);
    dispatchEditorInput();
  }

  function replaceEditor(text) {
    const ed = editor();
    if (!ed) return;
    ed.value = text.trim();
    dispatchEditorInput();
  }

  function appendNote(text) {
    const field = $('setupNotes') || $('toolNotes');
    if (!field) return;
    field.value = [field.value.trim(), text.trim()].filter(Boolean).join('\n\n');
    field.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function tokenNumber(tokens, names) {
    for (const name of names) {
      const index = tokens.indexOf(name);
      if (index >= 0 && index + 1 < tokens.length) {
        const value = num(tokens[index + 1]);
        if (value !== null) return value;
      }
    }
    return null;
  }

  function parseQuickEntry(raw) {
    const text = String(raw || '').trim().toLowerCase().replace(/,/g, ' ');
    const tokens = text.split(/\s+/).filter(Boolean).map(token => token.replace(/^x(?=-?\d|\.)/, '').replace(/^z(?=-?\d|\.)/, ''));
    if (!tokens.length) return { title: 'Quick Entry', detail: 'Type a shop calculation or command.', action: null };

    const toIndex = tokens.indexOf('to');
    if (toIndex > 0) {
      const touch = num(tokens[toIndex - 1]);
      const target = num(tokens[toIndex + 1]);
      const zMatch = text.match(/\bz\s*(-?\d*\.?\d+)/) || text.match(/\bz(-?\d*\.?\d+)/);
      const z = zMatch ? num(zMatch[1]) : tokenNumber(tokens, ['depth', 'plunge']);
      if (touch !== null && target !== null) {
        const radial = Math.abs(touch - target) / 2;
        const zTarget = z !== null ? z : null;
        return {
          title: `X${fmt3(touch)} to X${fmt3(target)}`,
          detail: `Radial travel ${fmt3(radial)}${zTarget !== null ? `, Z target ${fmt3(zTarget)}` : ''}. X is diameter-based.`,
          note: `QUICK ENTRY\nTouch X${fmt3(touch)} to target X${fmt3(target)}\nRadial travel ${fmt3(radial)}${zTarget !== null ? `\nTarget Z ${fmt3(zTarget)}` : ''}`,
          action: () => {
            if ($('touchDia')) $('touchDia').value = fmt3(touch);
            if ($('targetDia')) $('targetDia').value = fmt3(target);
            if (zTarget !== null) {
              if ($('faceZ')) $('faceZ').value = '0.000';
              if ($('plungeDepth')) $('plungeDepth').value = fmt3(Math.abs(zTarget));
              if ($('zDirection')) $('zDirection').value = zTarget < 0 ? 'minus' : 'plus';
            }
            ['touchDia', 'targetDia', 'faceZ', 'plungeDepth'].forEach(id => $(id)?.dispatchEvent(new Event('input', { bubbles: true })));
          }
        };
      }
    }

    const sfm = tokenNumber(tokens, ['sfm', 'surface']);
    const dia = tokenNumber(tokens, ['dia', 'diameter', 'x']);
    if (sfm !== null && dia !== null && dia > 0) {
      const rpm = (sfm * 3.82) / dia;
      return {
        title: `RPM ${fmt(rpm)}`,
        detail: `SFM ${fmt(sfm)} at diameter ${fmt(dia)} gives about ${fmt(rpm)} RPM.`,
        note: `QUICK ENTRY\nRPM ${fmt(rpm)} from SFM ${fmt(sfm)} at diameter ${fmt(dia)}`,
        code: `S${Math.round(rpm)} M03`
      };
    }

    const rpm = tokenNumber(tokens, ['rpm']);
    if (rpm !== null && dia !== null && dia > 0) {
      const calcSfm = (rpm * dia) / 3.82;
      return {
        title: `SFM ${fmt(calcSfm)}`,
        detail: `RPM ${fmt(rpm)} at diameter ${fmt(dia)} gives about ${fmt(calcSfm)} SFM.`,
        note: `QUICK ENTRY\nSFM ${fmt(calcSfm)} from RPM ${fmt(rpm)} at diameter ${fmt(dia)}`
      };
    }

    const tpi = tokenNumber(tokens, ['tpi']);
    if (tpi !== null && tpi > 0) {
      const depth = 0.6495 / tpi;
      return {
        title: `Thread depth ${fmt(depth)}`,
        detail: `60 degree thread depth estimate: ${fmt(depth)} for ${fmt(tpi)} TPI. Verify shop/control method.`,
        note: `QUICK ENTRY\n${fmt(tpi)} TPI thread depth estimate ${fmt(depth)}`
      };
    }

    const chamferIndex = tokens.indexOf('chamfer');
    if (chamferIndex >= 0) {
      const size = num(tokens[chamferIndex + 1]);
      const angle = num(tokens[chamferIndex + 2]) ?? 45;
      if (size !== null) {
        const radialLeg = Math.tan(angle * Math.PI / 180) * size;
        const xDia = radialLeg * 2;
        return {
          title: `Chamfer ${fmt(size)} at ${fmt(angle)} deg`,
          detail: `Z leg ${fmt(size)}, radial leg ${fmt(radialLeg)}, X diameter change ${fmt(xDia)}.`,
          note: `QUICK ENTRY\nChamfer ${fmt(size)} at ${fmt(angle)} deg\nZ leg ${fmt(size)}\nX diameter change ${fmt(xDia)}`
        };
      }
    }

    const radius = tokenNumber(tokens, ['radius', 'rad']);
    if (radius !== null) return { title: `Diameter ${fmt(radius * 2)}`, detail: `Radius ${fmt(radius)} equals diameter ${fmt(radius * 2)}.`, note: `QUICK ENTRY\nRadius ${fmt(radius)} = diameter ${fmt(radius * 2)}` };
    const diameter = tokenNumber(tokens, ['diameter', 'dia']);
    if (diameter !== null) return { title: `Radius ${fmt(diameter / 2)}`, detail: `Diameter ${fmt(diameter)} equals radius ${fmt(diameter / 2)}.`, note: `QUICK ENTRY\nDiameter ${fmt(diameter)} = radius ${fmt(diameter / 2)}` };

    return {
      title: 'No match yet',
      detail: 'Try: 24 to 3 z-.5, sfm 300 dia 2.5, rpm 800 dia 1.25, tpi 16, chamfer .06 45.',
      action: null
    };
  }

  function renderQuickResult(result) {
    if (!$('quickEntryResult')) return;
    $('quickEntryResult').innerHTML = `<div class="medium">${esc(result.title)}</div><div class="hint">${esc(result.detail)}</div>`;
    $('quickSendCalcBtn').disabled = !result.action;
    $('quickInsertCodeBtn').disabled = !result.code;
    $('quickSendNotesBtn').disabled = !result.note;
  }

  function runQuickEntry() {
    const result = parseQuickEntry($('quickEntryInput')?.value || '');
    window.__cncQuickEntryResult = result;
    renderQuickResult(result);
    return result;
  }

  function renderSnippetSelect() {
    const select = $('macroSnippetSelect');
    if (!select) return;
    const snippets = allSnippets();
    select.innerHTML = snippets.map(snippet => `<option value="${esc(snippet.id)}">${esc(snippet.group ? `${snippet.group} - ${snippet.name}` : snippet.name)}</option>`).join('');
    renderSnippetPreview();
  }

  function selectedSnippet() {
    const id = $('macroSnippetSelect')?.value;
    return allSnippets().find(snippet => snippet.id === id) || allSnippets()[0];
  }

  function renderSnippetPreview() {
    const snippet = selectedSnippet();
    if ($('macroSnippetPreview')) $('macroSnippetPreview').textContent = snippet?.text || '';
    if ($('deleteSnippetBtn')) $('deleteSnippetBtn').disabled = !snippet || String(snippet.id).startsWith('preset-');
  }

  function saveSnippet() {
    const name = $('snippetName')?.value.trim();
    const text = $('snippetText')?.value.trim() || editor()?.value.trim();
    if (!name || !text) {
      if ($('saveStatus')) $('saveStatus').textContent = 'Name and snippet text required';
      return;
    }
    const state = read();
    state.macroSnippets = customSnippets(state);
    const existing = state.macroSnippets.find(snippet => snippet.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      existing.text = text;
      existing.updatedAt = new Date().toISOString();
    } else {
      state.macroSnippets.unshift({ id: crypto.randomUUID(), name, group: 'Custom', text, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    write(state, 'Saved snippet');
    $('snippetText').value = '';
    renderSnippetSelect();
  }

  function deleteSnippet() {
    const snippet = selectedSnippet();
    if (!snippet || String(snippet.id).startsWith('preset-')) return;
    const state = read();
    state.macroSnippets = customSnippets(state).filter(item => item.id !== snippet.id);
    write(state, 'Deleted snippet');
    renderSnippetSelect();
  }

  function fillSnippetFromSelection() {
    const ed = editor();
    if (!ed || !$('snippetText')) return;
    const selected = ed.value.slice(ed.selectionStart || 0, ed.selectionEnd || 0).trim();
    $('snippetText').value = selected || ed.value.trim();
  }

  function injectPanel() {
    if ($('quickFlowPanel') || !$('gcodeEditorPanel')) return false;
    $('gcodeEditorPanel').insertAdjacentHTML('afterbegin', `
      <div id="quickFlowPanel" class="quick-flow-panel">
        <div class="section-head"><h2>Fast Shop Workflow</h2><span class="mini">Quick Entry and Macro Snippets</span></div>
        <div class="quick-entry-grid">
          <div class="field quick-entry-field"><label for="quickEntryInput">Speedy Entry</label><input id="quickEntryInput" autocomplete="off" placeholder="24 to 3 z-.5 | sfm 300 dia 2.5 | tpi 16"></div>
          <button id="quickEntryRunBtn" class="primary" type="button">Run</button>
        </div>
        <div id="quickEntryResult" class="result compact quick-entry-result"><div class="medium">Ready</div><div class="hint">Try: 24 to 3 z-.5, sfm 300 dia 2.5, rpm 800 dia 1.25, tpi 16, chamfer .06 45.</div></div>
        <div class="row actions quick-entry-actions"><button id="quickSendCalcBtn" type="button" disabled>Send to calculator</button><button id="quickInsertCodeBtn" type="button" disabled>Insert code</button><button id="quickSendNotesBtn" type="button" disabled>Send to notes</button></div>
        <div class="snippet-grid">
          <div class="snippet-library">
            <div class="field"><label for="macroSnippetSelect">Macro snippets</label><select id="macroSnippetSelect"></select></div>
            <pre id="macroSnippetPreview" class="snippet-preview"></pre>
            <div class="row actions"><button id="insertSnippetBtn" class="primary" type="button">Insert snippet</button><button id="replaceWithSnippetBtn" type="button">Replace editor</button><button id="deleteSnippetBtn" class="ghost" type="button">Delete custom</button></div>
          </div>
          <div class="snippet-save-box">
            <div class="field"><label for="snippetName">Save custom snippet</label><input id="snippetName" placeholder="Name this G-code pattern"></div>
            <div class="field"><label for="snippetText">Snippet text</label><textarea id="snippetText" placeholder="Paste snippet text, or use selected editor text"></textarea></div>
            <div class="row actions"><button id="fillSnippetBtn" type="button">Use editor text</button><button id="saveSnippetBtn" class="primary" type="button">Save snippet</button></div>
          </div>
        </div>
        <p class="hint quick-flow-hint">Snippets are drafts. Verify control format, offsets, stock, jaws, spindle, feed, coolant, and X diameter mode before running.</p>
      </div>`);

    $('quickEntryRunBtn')?.addEventListener('click', runQuickEntry);
    $('quickEntryInput')?.addEventListener('input', runQuickEntry);
    $('quickEntryInput')?.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); runQuickEntry(); } });
    $('quickSendCalcBtn')?.addEventListener('click', () => { const result = window.__cncQuickEntryResult || runQuickEntry(); result.action?.(); });
    $('quickInsertCodeBtn')?.addEventListener('click', () => { const result = window.__cncQuickEntryResult || runQuickEntry(); if (result.code) insertAtCursor(result.code); });
    $('quickSendNotesBtn')?.addEventListener('click', () => { const result = window.__cncQuickEntryResult || runQuickEntry(); if (result.note) appendNote(result.note); });
    $('macroSnippetSelect')?.addEventListener('change', renderSnippetPreview);
    $('insertSnippetBtn')?.addEventListener('click', () => { const snippet = selectedSnippet(); if (snippet) insertAtCursor(snippet.text); });
    $('replaceWithSnippetBtn')?.addEventListener('click', () => { const snippet = selectedSnippet(); if (snippet) replaceEditor(snippet.text); });
    $('deleteSnippetBtn')?.addEventListener('click', deleteSnippet);
    $('fillSnippetBtn')?.addEventListener('click', fillSnippetFromSelection);
    $('saveSnippetBtn')?.addEventListener('click', saveSnippet);
    renderSnippetSelect();
    runQuickEntry();
    return true;
  }

  function wire() {
    if (injectPanel()) return;
    let tries = 0;
    const timer = setInterval(() => {
      if (injectPanel() || ++tries > 30) clearInterval(timer);
    }, 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();

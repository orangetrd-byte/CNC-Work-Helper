(() => {
  const key = 'cncLatheWorkHelper.v4';
  const $ = id => document.getElementById(id);
  const num = v => { const s = String(v ?? '').trim().replace(/^\./, '0.').replace(/^-\./, '-0.'); const n = Number(s); return s && Number.isFinite(n) ? n : null; };
  const fmt = v => Number.isFinite(v) ? Number(v).toFixed(3).replace(/^-0\.000$/, '0.000') : '--';
  const esc = v => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  let seenJob = '';
  let timer = null;

  function state() { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; } }
  function job(st = state()) { return Array.isArray(st.jobs) ? st.jobs.find(j => j.id === st.currentJobId) || st.jobs[0] : null; }
  function save(st, msg = 'Saved local') { const j = job(st); if (j) j.updatedAt = new Date().toISOString(); localStorage.setItem(key, JSON.stringify(st)); if ($('saveStatus')) $('saveStatus').textContent = msg; }
  function edit(mut, msg) { const st = state(); const j = job(st); if (!j) return null; j.setup = j.setup || {}; j.gcode = j.gcode || {}; mut(j, st); save(st, msg); return j; }
  function editor() { return $('gcodeEditor'); }
  function codeText() { return editor()?.value ?? $('gcodeOut')?.textContent ?? ''; }
  function setCode(text, persist = true, msg = 'Saved G-code') { if (editor()) editor().value = text; if ($('gcodeOut')) $('gcodeOut').textContent = text || 'Enter or generate G-code.'; if (persist) edit(j => { j.gcode.output = text; }, msg); }
  function scheduleParse() { clearTimeout(timer); timer = setTimeout(() => { syncEditor(false); runCheckAndPlot(); }, 120); }

  function addPieJaws() {
    if (!$('pieJawNotes')) $('notesView')?.querySelector('.card')?.insertAdjacentHTML('beforeend', '<div class="row cnc-enhanced-row"><div class="field"><label for="pieJawNotes">Pie jaw notes</label><textarea id="pieJawNotes" placeholder="Pie jaws, bore/step, jaw pressure, soft jaw sketch notes"></textarea></div></div>');
    if (!$('pieJawSize')) $('chuckJaw')?.closest('.row')?.insertAdjacentHTML('afterend', '<div class="row cnc-enhanced-row"><div class="field"><label for="pieJawSize">Pie jaw OD / size</label><input id="pieJawSize" inputmode="decimal" placeholder="jaw size or chuck size"></div><div class="field"><label for="pieJawBore">Pie jaw bore / pocket</label><input id="pieJawBore" inputmode="decimal" placeholder="bore or pocket diameter"></div><div class="field"><label for="pieJawStep">Pie jaw step / grip</label><input id="pieJawStep" placeholder="step depth, grip land, pressure"></div></div>');
    ['pieJawNotes','pieJawSize','pieJawBore','pieJawStep'].forEach(id => $(id)?.addEventListener('input', () => { captureJaws(true); scheduleParse(); }));
  }
  function fillJaws() { const s = job()?.setup || {}; ['pieJawNotes','pieJawSize','pieJawBore','pieJawStep'].forEach(id => { if ($(id)) $(id).value = s[id] || ''; }); }
  function captureJaws(persist) { if (!$('pieJawNotes')) return; edit(j => { ['pieJawNotes','pieJawSize','pieJawBore','pieJawStep'].forEach(id => { j.setup[id] = $(id)?.value.trim() || ''; }); }, persist ? 'Saved pie jaws' : 'Saved local'); }

  function injectEditor() {
    if ($('gcodeEditorPanel')) return;
    const card = $('gcodeView')?.querySelector('.card');
    $('copyGcodeBtn')?.closest('.row')?.classList.add('hidden');
    $('gcodeOut')?.classList.add('legacy-gcode-output');
    const source = job()?.gcode?.output || $('gcodeOut')?.textContent || '';
    card?.insertAdjacentHTML('beforeend', `
      <div id="gcodeEditorPanel" class="gcode-editor-panel">
        <div class="gcode-system-note"><strong>G-code system: Lathe System A</strong><span>G90/G92/G94 are treated as System A lathe cycles for checking and rough plotting.</span></div>
        <div class="field"><label for="gcodeEditor">Editable G-code</label><textarea id="gcodeEditor" class="gcode-editor" spellcheck="false" placeholder="Type or paste full G-code here. Typed code is the source of truth."></textarea></div>
        <div class="row actions editor-actions"><button id="genCalcBtn" type="button">Generate from calculator</button><button id="checkCodeBtn" class="primary" type="button">Check code</button><button id="simulateCodeBtn" type="button">Simulate</button><button id="plotCodeBtn" type="button">Plot</button><button id="copyEditorBtn" type="button">Copy</button><button id="clearEditorBtn" class="ghost" type="button">Clear</button><button id="saveCodeBtn" type="button">Save to job</button></div>
        <div class="row"><div class="result warn compact"><div class="mini">Warnings</div><div id="editorWarnings" class="warnList">Paste or type code, then check it.</div></div><div class="result compact"><div class="mini">Parsed position</div><div id="editorPosition" class="medium">X -- / Z --</div></div></div>
        <div class="result editor-plot-panel"><div class="section-head"><h2>Plot Preview</h2><span class="mini" id="editorPlotStatus">Reads typed G-code</span></div><div class="plotWrap"><svg id="editorPlot" class="plotSvg tall" viewBox="0 0 700 340" role="img" aria-label="Typed G-code plot preview"></svg></div></div>
      </div>`);
    setCode(source.includes('Enter calculator values') ? '' : source, false);
    editor()?.addEventListener('input', () => { syncEditor(true); scheduleParse(); });
    $('genCalcBtn')?.addEventListener('click', generateFromCalculator);
    $('checkCodeBtn')?.addEventListener('click', runCheckAndPlot);
    $('simulateCodeBtn')?.addEventListener('click', () => { runCheckAndPlot(); document.querySelector('[data-view="simView"]')?.click(); });
    $('plotCodeBtn')?.addEventListener('click', () => { runCheckAndPlot(); $('editorPlot')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
    $('copyEditorBtn')?.addEventListener('click', copyCode);
    $('clearEditorBtn')?.addEventListener('click', () => { setCode('', true, 'Cleared G-code'); runCheckAndPlot(); });
    $('saveCodeBtn')?.addEventListener('click', () => { syncEditor(true, 'Saved G-code'); runCheckAndPlot(); });
    ['gTool','gRapidX','gRapidZ','gComment','gSpeed','gFeed','workOffset','stockDiameter','stockLength','stickout','faceZ','zDirection'].forEach(id => { $(id)?.addEventListener('input', scheduleParse); $(id)?.addEventListener('change', scheduleParse); });
  }
  function syncEditor(persist, msg = 'Auto-saved code') { const text = codeText(); if ($('gcodeOut')) $('gcodeOut').textContent = text || 'Enter or generate G-code.'; if (persist) edit(j => { j.gcode.output = text; }, msg); }
  function generateFromCalculator() {
    const j = job() || {}, target = num($('targetDia')?.value), touch = num($('touchDia')?.value), face = num($('faceZ')?.value) ?? 0, depth = num($('plungeDepth')?.value) ?? 0;
    if (!Number.isFinite(target) || !Number.isFinite(touch)) { alert('Enter calculator touch-off X and target diameter first.'); return; }
    const zTarget = $('zDirection')?.value === 'plus' ? face + depth : face - depth;
    const safeX = num($('gRapidX')?.value) ?? Math.max(touch, target) + 0.1;
    const safeZ = num($('gRapidZ')?.value) ?? (zTarget < face ? face + 0.1 : face - 0.1);
    const feed = $('gFeed')?.value.trim() || '.004';
    const lines = ['%', `(${$('gComment')?.value.trim() || j.operation || 'CALCULATOR GENERATED DRAFT'})`, '(DRAFT/CHECK BEFORE RUNNING - LATHE SYSTEM A)', 'G18 G40 G80 G99'];
    if ($('workOffset')?.value.trim()) lines.push($('workOffset').value.trim());
    if ($('gTool')?.value.trim()) lines.push($('gTool').value.trim());
    if ($('gSpeed')?.value.trim()) lines.push($('gSpeed').value.trim());
    lines.push(`G00 X${fmt(safeX)} Z${fmt(safeZ)}`, `G01 Z${fmt(zTarget)} F${feed}`, `G01 X${fmt(target)} F${feed}`, `G00 X${fmt(safeX)}`, `G00 Z${fmt(safeZ)}`, '(VERIFY TOOL, OFFSETS, JAWS, STOCK, AND Z DIRECTION)', '%');
    setCode(lines.join('\n'), true, 'Generated from calculator'); runCheckAndPlot();
  }
  async function copyCode() { try { await navigator.clipboard.writeText(codeText()); if ($('saveStatus')) $('saveStatus').textContent = 'Copied'; } catch { alert('Copy failed. Long press and copy from the code box.'); } }

  function stripComment(line) { return line.replace(/\([^)]*\)/g, '').replace(/;.*/, '').trim().toUpperCase(); }
  function words(line) { const w = {}; line.replace(/([A-Z])\s*(-?\d*\.?\d+)/gi, (_, l, v) => { w[l.toUpperCase()] = Number(v); return ''; }); return w; }
  function compactCodes(line, letter) { return (line.match(new RegExp(letter + '\\s*\\d+(?:\\.\\d+)?', 'gi')) || []).map(code => code.replace(/\s+/g, '').toUpperCase()); }
  function norm(code) { return code[0] + String(Number(code.slice(1))); }
  function systemAMotion(gCodes, current) {
    if (gCodes.some(c => ['G0','G00'].includes(c) || norm(c) === 'G0')) return 'G00';
    if (gCodes.some(c => ['G1','G01'].includes(c) || norm(c) === 'G1')) return 'G01';
    if (gCodes.some(c => ['G2','G02'].includes(c) || norm(c) === 'G2')) return 'G02';
    if (gCodes.some(c => ['G3','G03'].includes(c) || norm(c) === 'G3')) return 'G03';
    if (gCodes.some(c => ['G90','G92','G94'].includes(c))) return gCodes.find(c => ['G90','G92','G94'].includes(c));
    if (gCodes.some(c => ['G70','G71','G72','G73','G74','G75','G76'].includes(c))) return gCodes.find(c => ['G70','G71','G72','G73','G74','G75','G76'].includes(c));
    return current;
  }
  function parseCode() {
    const supportedG = new Set(['G0','G00','G1','G01','G2','G02','G3','G03','G4','G04','G10','G18','G20','G21','G22','G23','G27','G28','G30','G32','G40','G41','G42','G50','G53','G54','G55','G56','G57','G58','G59','G65','G70','G71','G72','G73','G74','G75','G76','G80','G90','G92','G94','G96','G97','G98','G99']);
    const supportedM = new Set(['M0','M00','M1','M01','M3','M03','M4','M04','M5','M05','M8','M08','M9','M09','M30']);
    let x = null, z = null, motion = null, feedActive = false, hasTool = false, hasSpindle = false, hasG50 = false, hasG96 = false;
    const warnings = [], moves = [], unsupported = [];
    codeText().split(/\r?\n/).forEach((raw, i) => {
      const line = stripComment(raw); if (!line || line === '%') return;
      const gCodes = compactCodes(line, 'G'), mCodes = compactCodes(line, 'M');
      [...gCodes, ...mCodes].forEach(code => { if (code[0] === 'G' && !supportedG.has(code) && !supportedG.has(norm(code))) unsupported.push(`Line ${i + 1}: unsupported ${code} for System A checker.`); if (code[0] === 'M' && !supportedM.has(code) && !supportedM.has(norm(code))) unsupported.push(`Line ${i + 1}: unsupported ${code}.`); });
      if (/\bT\s*\d+/i.test(line)) hasTool = true;
      if (/M\s*0?3|M\s*0?4/i.test(line)) hasSpindle = true;
      if (gCodes.some(c => c === 'G50')) hasG50 = true;
      if (gCodes.some(c => c === 'G96')) hasG96 = true;
      motion = systemAMotion(gCodes, motion);
      const w = words(line);
      if (Number.isFinite(w.F)) feedActive = true;
      if ((motion === 'G02' || motion === 'G03') && (Number.isFinite(w.X) || Number.isFinite(w.Z)) && !Number.isFinite(w.R) && !Number.isFinite(w.I) && !Number.isFinite(w.K)) warnings.push(`Line ${i + 1}: arc move missing R, I, or K.`);
      if (motion === 'G01' && (Number.isFinite(w.X) || Number.isFinite(w.Z)) && !feedActive) warnings.push(`Line ${i + 1}: G01 move before feed rate F.`);
      const nx = Number.isFinite(w.X) ? w.X : x, nz = Number.isFinite(w.Z) ? w.Z : z;
      if ((Number.isFinite(w.X) || Number.isFinite(w.Z)) && motion) { moves.push({ line: i + 1, code: raw.trim(), motion, fromX: x, fromZ: z, x: nx, z: nz }); x = nx; z = nz; }
      if (Number.isFinite(w.X) && w.X < 0) warnings.push(`Line ${i + 1}: X below zero.`);
      if (['G90','G92','G94'].some(c => gCodes.includes(c))) warnings.push(`Line ${i + 1}: ${gCodes.find(c => ['G90','G92','G94'].includes(c))} read as a lathe System A cycle.`);
    });
    if (!hasTool) warnings.unshift('Missing tool call T word.');
    if (!hasSpindle) warnings.unshift('Missing spindle start M03/M04.');
    if (hasG96 && !hasG50) warnings.push('G96 CSS used without G50 spindle limit.');
    warnings.push(...unsupported.slice(0, 20));
    addSetupWarnings(moves, warnings);
    return { moves, warnings, x, z };
  }
  function addSetupWarnings(moves, warnings) {
    const setup = job()?.setup || {}, stock = num(setup.stockDiameter || $('stockDiameter')?.value), stick = num(setup.stickout || $('stickout')?.value), bore = num(setup.pieJawBore || $('pieJawBore')?.value), face = num($('faceZ')?.value) ?? 0, stockClear = Number.isFinite(stock) ? stock + 0.02 : null;
    moves.forEach(m => { if (!Number.isFinite(m.x) || !Number.isFinite(m.z)) return; if (m.motion === 'G00' && stockClear && m.x <= stockClear && m.z <= face + 0.05) warnings.push(`Line ${m.line}: rapid too close to stock.`); if (m.motion === 'G00' && m.z < face && (!stockClear || m.x <= stockClear)) warnings.push(`Line ${m.line}: rapid enters negative Z near stock.`); if (m.motion !== 'G00' && m.z > face) warnings.push(`Line ${m.line}: positive Z feed/plunge. Verify direction from face.`); if (stick && Math.abs(m.z - face) > stick && (!stockClear || m.x <= stockClear + 0.25)) warnings.push(`Line ${m.line}: Z travel past entered stickout.`); if (bore && m.x < bore) warnings.push(`Line ${m.line}: X below pie jaw bore/pocket X${fmt(bore)}.`); });
  }
  function runCheckAndPlot() { syncEditor(false); const parsed = parseCode(); drawPlot(parsed.moves); showResults(parsed); return parsed; }
  function showResults(parsed) {
    const html = parsed.warnings.length ? [...new Set(parsed.warnings)].map(w => `<div>${esc(w)}</div>`).join('') : '<span class="okText">No basic warnings found. Still verify at the machine.</span>';
    if ($('editorWarnings')) $('editorWarnings').innerHTML = html; if ($('simWarnings')) $('simWarnings').innerHTML = html; if ($('editorPosition')) $('editorPosition').textContent = `X ${fmt(parsed.x)} / Z ${fmt(parsed.z)}`; if ($('simCurrent')) $('simCurrent').textContent = `X ${fmt(parsed.x)} / Z ${fmt(parsed.z)}`;
    if ($('simSteps')) $('simSteps').innerHTML = parsed.moves.slice(0, 100).map(m => `<div class="item simStep ${m.motion === 'G00' ? 'simRapid' : 'simFeed'}"><code>${m.motion}</code><span>${esc(m.code)}</span><strong>X${fmt(m.x)} Z${fmt(m.z)}</strong></div>`).join('') || '<p class="hint">No X/Z moves found in the typed code.</p>';
    if ($('editorPlotStatus')) $('editorPlotStatus').textContent = parsed.moves.length ? `${parsed.moves.length} plotted move${parsed.moves.length === 1 ? '' : 's'}` : 'No path yet';
  }
  function drawPlot(moves) {
    const svgs = ['simPlot','editorPlot'].map(id => $(id)).filter(Boolean);
    if (!svgs.length) return;
    const pts = moves.filter(m => Number.isFinite(m.x) && Number.isFinite(m.z));
    if (!pts.length) { svgs.forEach(svg => svg.innerHTML = '<text x="24" y="42" class="plotLabel">No parsed X/Z path yet.</text>'); return; }
    const setup = job()?.setup || {}, stock = num(setup.stockDiameter || $('stockDiameter')?.value), len = num(setup.stockLength || $('stockLength')?.value), face = num($('faceZ')?.value) ?? 0;
    const W = 700, H = 340, P = 48, back = len ? face - len : Math.min(...pts.map(p => p.z), face - 0.5), xs = pts.map(p => p.x).concat(stock ? [stock, 0] : []), zs = pts.map(p => p.z).concat([face, back]);
    let minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs); if (maxX - minX < .001) { maxX++; minX--; } if (maxZ - minZ < .001) { maxZ += .25; minZ -= .25; } minX -= (maxX - minX) * .16; maxX += (maxX - minX) * .16; minZ -= (maxZ - minZ) * .22; maxZ += (maxZ - minZ) * .22;
    const px = z => P + (z - minZ) / (maxZ - minZ) * (W - P * 2), py = x => H - P - (x - minX) / (maxX - minX) * (H - P * 2);
    const out = [`<rect x="0" y="0" width="${W}" height="${H}" class="plotBg"/>`, `<line x1="${P}" y1="${H-P}" x2="${W-P}" y2="${H-P}" class="plotAxis"/>`, `<line x1="${P}" y1="${P}" x2="${P}" y2="${H-P}" class="plotAxis"/>`, `<text x="${P}" y="24" class="plotLabel">System A typed G-code path. Solid = feed/cycle, dashed = rapid.</text>`];
    if (stock) out.push(`<rect x="${px(back)}" y="${py(stock)}" width="${Math.max(1, px(face) - px(back))}" height="${Math.max(1, py(0) - py(stock))}" class="plotStock"/><text x="${px(back)+6}" y="${py(stock)-8}" class="plotLabel">stock X${fmt(stock)}</text>`);
    out.push(`<line x1="${px(face)}" y1="${P}" x2="${px(face)}" y2="${H-P}" class="plotZero"/><text x="${px(face)+5}" y="${P+14}" class="plotLabel">Z face</text>`);
    const feed = []; moves.forEach((m, i) => { if (!Number.isFinite(m.x) || !Number.isFinite(m.z)) return; const fx = Number.isFinite(m.fromX) ? m.fromX : m.x, fz = Number.isFinite(m.fromZ) ? m.fromZ : m.z, isFeed = m.motion !== 'G00'; if (isFeed) feed.push(`${px(m.z)},${py(m.x)}`); out.push(`<line x1="${px(fz)}" y1="${py(fx)}" x2="${px(m.z)}" y2="${py(m.x)}" class="${isFeed ? 'plotPath' : 'plotRapid'}"/>`, `<circle cx="${px(m.z)}" cy="${py(m.x)}" r="6" class="${isFeed ? 'plotPoint' : 'plotSafe'}"/>`, `<text x="${px(m.z)+8}" y="${py(m.x)+4}" class="plotStepLabel">${i+1}</text>`); });
    if (feed.length > 1) out.push(`<polyline points="${feed.join(' ')}" class="plotCutOutline"/>`); const last = pts[pts.length - 1]; out.push(`<circle cx="${px(last.z)}" cy="${py(last.x)}" r="8" class="plotEnd"/><text x="${px(last.z)+10}" y="${py(last.x)-10}" class="plotLabel">current X${fmt(last.x)} Z${fmt(last.z)}</text>`);
    svgs.forEach(svg => svg.innerHTML = out.join(''));
  }
  function refresh() { fillJaws(); const source = job()?.gcode?.output || ''; if (source && editor()) setCode(source, false); runCheckAndPlot(); }
  function wire() {
    addPieJaws(); injectEditor(); fillJaws(); refresh();
    const oldLoad = window.loadJob; if (typeof oldLoad === 'function' && !window.__cncEditorLoad) { window.__cncEditorLoad = true; window.loadJob = function() { const r = oldLoad.apply(this, arguments); setTimeout(refresh, 130); return r; }; }
    const oldDup = window.duplicateJob; if (typeof oldDup === 'function' && !window.__cncEditorDup) { window.__cncEditorDup = true; window.duplicateJob = function() { const r = oldDup.apply(this, arguments); setTimeout(refresh, 130); return r; }; }
    $('runSimBtn')?.addEventListener('click', e => { e.stopImmediatePropagation(); runCheckAndPlot(); }, true); $('copyGcodeBtn')?.addEventListener('click', e => { e.stopImmediatePropagation(); copyCode(); }, true); $('refreshGcodeBtn')?.addEventListener('click', e => { e.stopImmediatePropagation(); generateFromCalculator(); }, true);
    document.querySelectorAll('.nav').forEach(b => b.addEventListener('click', () => setTimeout(() => { const id = job()?.id || ''; if (id !== seenJob) { seenJob = id; refresh(); } if (b.dataset.view === 'simView' || b.dataset.view === 'gcodeView') runCheckAndPlot(); }, 100)));
    setInterval(() => { const id = job()?.id || ''; if (id && id !== seenJob) { seenJob = id; refresh(); } }, 1200);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();

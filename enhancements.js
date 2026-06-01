(() => {
  const key = 'cncLatheWorkHelper.v4';
  const $ = id => document.getElementById(id);
  const num = v => { const s = String(v ?? '').trim().replace(/^\./, '0.').replace(/^-\./, '-0.'); const n = Number(s); return s && Number.isFinite(n) ? n : null; };
  const fmt = v => Number.isFinite(v) ? Number(v).toFixed(3).replace(/^-0\.000$/, '0.000') : '--';
  const esc = v => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const uid = () => crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
  let seenJob = '';
  let timer = null;

  function state() { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; } }
  function job(st = state()) { return Array.isArray(st.jobs) ? st.jobs.find(j => j.id === st.currentJobId) || st.jobs[0] : null; }
  function save(st, msg = 'Saved local') { const j = job(st); if (j) j.updatedAt = new Date().toISOString(); localStorage.setItem(key, JSON.stringify(st)); if ($('saveStatus')) $('saveStatus').textContent = msg; }
  function edit(mut, msg) { const st = state(); const j = job(st); if (!j) return null; j.setup = j.setup || {}; j.cutPlan = Array.isArray(j.cutPlan) ? j.cutPlan : []; mut(j, st); save(st, msg); return j; }
  function cuts() { return Array.isArray(job()?.cutPlan) ? job().cutPlan : []; }
  function schedule() { clearTimeout(timer); timer = setTimeout(() => { captureJaws(false); renderCuts(); buildCode(); parseSim(); }, 60); }

  function addPieJaws() {
    if ($('pieJawNotes')) return;
    $('notesView')?.querySelector('.card')?.insertAdjacentHTML('beforeend', '<div class="row cnc-enhanced-row"><div class="field"><label for="pieJawNotes">Pie jaw notes</label><textarea id="pieJawNotes" placeholder="Pie jaws, bore/step, jaw pressure, soft jaw sketch notes"></textarea></div></div>');
    $('chuckJaw')?.closest('.row')?.insertAdjacentHTML('afterend', '<div class="row cnc-enhanced-row"><div class="field"><label for="pieJawSize">Pie jaw OD / size</label><input id="pieJawSize" inputmode="decimal" placeholder="jaw size or chuck size"></div><div class="field"><label for="pieJawBore">Pie jaw bore / pocket</label><input id="pieJawBore" inputmode="decimal" placeholder="bore or pocket diameter"></div><div class="field"><label for="pieJawStep">Pie jaw step / grip</label><input id="pieJawStep" placeholder="step depth, grip land, pressure"></div></div>');
    ['pieJawNotes','pieJawSize','pieJawBore','pieJawStep'].forEach(id => $(id)?.addEventListener('input', () => { captureJaws(true); schedule(); }));
  }
  function fillJaws() {
    const s = job()?.setup || {};
    if ($('pieJawNotes')) $('pieJawNotes').value = s.pieJawNotes || '';
    if ($('pieJawSize')) $('pieJawSize').value = s.pieJawSize || '';
    if ($('pieJawBore')) $('pieJawBore').value = s.pieJawBore || '';
    if ($('pieJawStep')) $('pieJawStep').value = s.pieJawStep || '';
  }
  function captureJaws(persist) {
    if (!$('pieJawNotes')) return;
    edit(j => { j.setup.pieJawNotes = $('pieJawNotes').value.trim(); j.setup.pieJawSize = $('pieJawSize').value.trim(); j.setup.pieJawBore = $('pieJawBore').value.trim(); j.setup.pieJawStep = $('pieJawStep').value.trim(); }, persist ? 'Saved pie jaws' : 'Saved local');
  }

  function addPlanner() {
    if ($('cutPlanPanel')) return;
    $('gComment')?.closest('.field')?.insertAdjacentHTML('afterend', `
      <div id="cutPlanPanel" class="result cut-plan-panel">
        <div class="section-head"><h2>Cut Plan</h2><span class="mini">Multi-cut draft path</span></div>
        <div class="row"><div class="field"><label for="cutMotion">Move type</label><select id="cutMotion"><option value="G01">G01 feed cut</option><option value="G00">G00 rapid position</option></select></div><div class="field"><label for="cutX">X diameter</label><input id="cutX" inputmode="decimal" placeholder="3.000"></div><div class="field"><label for="cutZ">Z position</label><input id="cutZ" inputmode="decimal" placeholder="-.500"></div><div class="field"><label for="cutFeed">Feed override</label><input id="cutFeed" inputmode="decimal" placeholder="uses feed box"></div></div>
        <div class="field"><label for="cutNote">Cut note</label><input id="cutNote" placeholder="rough pass, finish pass, groove wall"></div>
        <div class="row actions cut-actions"><button id="addCutBtn" class="primary" type="button">Add Cut</button><button id="addCalcCutBtn" type="button">Add Calculator Cut</button><button id="buildStepCutsBtn" type="button">Build Step Cuts</button><button id="clearCutsBtn" class="ghost" type="button">Clear Cuts</button></div>
        <div class="row"><div class="field"><label for="roughStepDia">Step diameter amount</label><input id="roughStepDia" inputmode="decimal" placeholder=".500"></div><div class="result compact"><div class="mini">Plan output</div><div id="cutPlanSummary" class="medium">No cuts added.</div></div></div>
        <div id="cutPlanList" class="list cut-plan-list"></div>
      </div>`);
    $('addCutBtn')?.addEventListener('click', manualCut);
    $('addCalcCutBtn')?.addEventListener('click', calcCut);
    $('buildStepCutsBtn')?.addEventListener('click', stepCuts);
    $('clearCutsBtn')?.addEventListener('click', () => { edit(j => { j.cutPlan = []; }, 'Cleared cuts'); renderCuts(); });
    ['gTool','gRapidX','gRapidZ','gComment','gSpeed','gFeed','workOffset','stockDiameter','stockLength','stickout','faceZ','zDirection'].forEach(id => { $(id)?.addEventListener('input', schedule); $(id)?.addEventListener('change', schedule); });
  }
  function calcTarget() { const x = num($('targetDia')?.value); const f = num($('faceZ')?.value) ?? 0; const d = num($('plungeDepth')?.value) ?? 0; return Number.isFinite(x) ? { x, z: $('zDirection')?.value === 'plus' ? f + d : f - d } : null; }
  function pushCut(cut) { edit(j => { j.cutPlan.push({ id: uid(), motion: cut.motion || 'G01', x: fmt(cut.x), z: fmt(cut.z), feed: cut.feed || '', note: cut.note || '' }); }, 'Added cut'); renderCuts(); buildCode(); parseSim(); }
  function manualCut() { const x = num($('cutX')?.value), z = num($('cutZ')?.value); if (!Number.isFinite(x) || !Number.isFinite(z)) return alert('Enter both X diameter and Z position.'); pushCut({ motion: $('cutMotion')?.value, x, z, feed: $('cutFeed')?.value.trim(), note: $('cutNote')?.value.trim() }); }
  function calcCut() { const t = calcTarget(); if (!t) return alert('Enter calculator target diameter first.'); pushCut({ x: t.x, z: t.z, feed: $('gFeed')?.value.trim(), note: 'calculator target' }); }
  function stepCuts() {
    const touch = num($('touchDia')?.value), t = calcTarget(), step = num($('roughStepDia')?.value) || 0.5;
    if (!Number.isFinite(touch) || !t || step <= 0) return alert('Enter touch-off diameter, target diameter, plunge depth, and step amount.');
    const mode = document.querySelector('.seg.active')?.dataset.mode || 'od';
    const list = []; let x = touch; let guard = 0;
    if (mode === 'id' || t.x > touch) while (x < t.x && guard++ < 40) { x = Math.min(t.x, x + step); list.push(x); }
    else while (x > t.x && guard++ < 40) { x = Math.max(t.x, x - step); list.push(x); }
    edit(j => { list.forEach((x, i) => j.cutPlan.push({ id: uid(), motion: 'G01', x: fmt(x), z: fmt(t.z), feed: $('gFeed')?.value.trim(), note: i === list.length - 1 ? 'finish target' : 'rough step' })); }, 'Built step cuts');
    renderCuts(); buildCode(); parseSim();
  }
  window.removeCut = id => { edit(j => { j.cutPlan = j.cutPlan.filter(c => c.id !== id); }, 'Removed cut'); renderCuts(); buildCode(); parseSim(); };
  function renderCuts() {
    const list = cuts();
    if ($('cutPlanSummary')) $('cutPlanSummary').textContent = list.length ? `${list.length} planned move${list.length === 1 ? '' : 's'}` : 'No cuts added.';
    if ($('cutPlanList')) $('cutPlanList').innerHTML = list.map((c, i) => `<div class="item cut-item"><strong>${i + 1}. ${esc(c.motion)} X${esc(c.x)} Z${esc(c.z)}</strong><p>${esc([c.feed ? `Feed ${c.feed}` : '', c.note].filter(Boolean).join(' | '))}</p><button class="ghost" type="button" onclick="removeCut('${esc(c.id)}')">Remove</button></div>`).join('') || '<p class="hint">Add cuts here to make the G-code and simulator show more than one move.</p>';
  }

  function codeFor(j) {
    const list = Array.isArray(j.cutPlan) ? j.cutPlan : [];
    if (!list.length) return null;
    const safeX = num($('gRapidX')?.value) ?? Math.max(...list.map(c => num(c.x)).filter(Number.isFinite), num($('stockDiameter')?.value) || 0) + 0.1;
    const safeZ = num($('gRapidZ')?.value) ?? 0.1;
    const feed = $('gFeed')?.value.trim() || '.004';
    const lines = ['%', `(${$('gComment')?.value.trim() || j.operation || 'MULTI CUT LATHE PLAN'})`, '(DRAFT/CHECK BEFORE RUNNING)', '(MULTI-CUT ROUGH PREVIEW ONLY)', 'G18 G40 G80 G99'];
    if (j.setup?.workOffset || $('workOffset')?.value.trim()) lines.push(j.setup?.workOffset || $('workOffset').value.trim());
    if ($('gTool')?.value.trim()) lines.push($('gTool').value.trim());
    if ($('gSpeed')?.value.trim()) lines.push($('gSpeed').value.trim());
    lines.push(`G00 X${fmt(safeX)} Z${fmt(safeZ)}`);
    list.forEach((c, i) => { const x = num(c.x), z = num(c.z); if (!Number.isFinite(x) || !Number.isFinite(z)) return; if (c.note) lines.push(`(${i + 1} ${c.note})`); lines.push(c.motion === 'G00' ? `G00 X${fmt(x)} Z${fmt(z)}` : `G01 X${fmt(x)} Z${fmt(z)} F${c.feed || feed}`); });
    lines.push(`G00 X${fmt(safeX)}`, `G00 Z${fmt(safeZ)}`, '(CHECK TOOLPATH, JAWS, STOCK, OFFSETS, AND Z DIRECTION)', '%');
    return lines.join('\n');
  }
  function buildCode() { const st = state(), j = job(st); if (!j) return; const out = codeFor(j); if (!out) return; j.gcode = j.gcode || {}; j.gcode.output = out; localStorage.setItem(key, JSON.stringify(st)); if ($('gcodeOut')) $('gcodeOut').textContent = out; }

  function words(line) { const w = {}; line.replace(/\([^)]*\)/g, '').replace(/([A-Z])\s*(-?\d*\.?\d+)/gi, (_, l, v) => { w[l.toUpperCase()] = Number(v); return ''; }); return w; }
  function parseSim() {
    const src = $('gcodeOut')?.textContent || ''; let x = null, z = null, motion = null, hasF = false, hasS = false, hasT = false; const moves = [], warn = [];
    const setup = job()?.setup || {}; const stock = num(setup.stockDiameter || $('stockDiameter')?.value); const stick = num(setup.stickout || $('stickout')?.value); const bore = num(setup.pieJawBore || $('pieJawBore')?.value); const face = num($('faceZ')?.value) ?? 0; const len = num(setup.stockLength || $('stockLength')?.value);
    src.split(/\r?\n/).forEach((raw, i) => { const line = raw.trim().toUpperCase(); if (!line || line === '%' || line.startsWith('(')) return; if (/\bT\d+/.test(line)) hasT = true; if (/M0?3|M0?4|\bS\s*\d/.test(line)) hasS = true; if (/\bF\s*-?\d/.test(line)) hasF = true; if (/G0?0/.test(line)) motion = 'G00'; if (/G0?1/.test(line)) motion = 'G01'; const w = words(line); const nx = Number.isFinite(w.X) ? w.X : x, nz = Number.isFinite(w.Z) ? w.Z : z; if ((Number.isFinite(w.X) || Number.isFinite(w.Z)) && motion) { const m = { line: i + 1, code: raw.trim(), motion, fromX: x, fromZ: z, x: nx, z: nz }; moves.push(m); check(m, warn, { stock, stick, bore, face }); x = nx; z = nz; } });
    if (!hasT) warn.push('Missing tool call T word. Verify station and offset.'); if (!hasF) warn.push('Missing feed rate F.'); if (!hasS) warn.push('Missing spindle command or S speed.');
    const first = moves.find(m => m.motion === 'G00' && Number.isFinite(m.x)); if (stock && first && first.x <= stock) warn.push(`Approach X${fmt(first.x)} is not above stock diameter X${fmt(stock)}.`);
    drawSim(moves, { stock, len, face });
    if ($('simCurrent')) $('simCurrent').textContent = `X ${fmt(x)} / Z ${fmt(z)}`;
    if ($('simWarnings')) $('simWarnings').innerHTML = warn.length ? warn.map(w => `<div>${esc(w)}</div>`).join('') : '<span class="okText">No basic contact warnings found. Still verify at the machine.</span>';
    if ($('simSteps')) $('simSteps').innerHTML = moves.slice(0, 80).map(m => `<div class="item simStep ${m.motion === 'G01' ? 'simFeed' : 'simRapid'}"><code>${m.motion}</code><span>${esc(m.code)}</span><strong>X${fmt(m.x)} Z${fmt(m.z)}</strong></div>`).join('') || '<p class="hint">No X/Z moves found in the generated code.</p>';
  }
  function check(m, warn, lim) { if (!Number.isFinite(m.x) || !Number.isFinite(m.z)) return; const clear = Number.isFinite(lim.stock) ? lim.stock + 0.02 : null; if (m.motion === 'G00' && m.z < lim.face && (!clear || m.x <= clear)) warn.push(`Line ${m.line}: rapid move enters negative Z near stock. Check for crash/contact.`); if (m.motion === 'G00' && clear && m.x <= clear && m.z <= lim.face + 0.02) warn.push(`Line ${m.line}: rapid X/Z is inside the rough stock outline.`); if (lim.stick && Math.abs(m.z - lim.face) > lim.stick && (!clear || m.x <= clear + 0.25)) warn.push(`Line ${m.line}: Z travel is past entered stickout. Check jaw clearance.`); if (lim.bore && m.x < lim.bore) warn.push(`Line ${m.line}: X${fmt(m.x)} is below pie jaw bore/pocket X${fmt(lim.bore)}.`); if (m.motion === 'G01' && Number.isFinite(m.fromX) && Math.abs(m.fromX - m.x) > 0.25 && cuts().length <= 1) warn.push(`Line ${m.line}: heavy single X cut over .250 diameter. Consider step cuts.`); }
  function drawSim(moves, lim) {
    const svg = $('simPlot'); if (!svg) return; const pts = moves.filter(m => Number.isFinite(m.x) && Number.isFinite(m.z)); if (!pts.length) { svg.innerHTML = '<text x="24" y="42" class="plotLabel">No parsed toolpath yet.</text>'; return; }
    const W = 700, H = 340, P = 48; const back = lim.len ? lim.face - lim.len : Math.min(...pts.map(p => p.z), lim.face - 0.5); const xs = pts.map(p => p.x).concat(lim.stock ? [lim.stock, 0] : []), zs = pts.map(p => p.z).concat([lim.face, back]); let minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs); if (maxX - minX < .001) { maxX++; minX--; } if (maxZ - minZ < .001) { maxZ += .25; minZ -= .25; } minX -= (maxX - minX) * .16; maxX += (maxX - minX) * .16; minZ -= (maxZ - minZ) * .22; maxZ += (maxZ - minZ) * .22; const px = z => P + (z - minZ) / (maxZ - minZ) * (W - P * 2), py = x => H - P - (x - minX) / (maxX - minX) * (H - P * 2);
    const out = [`<rect x="0" y="0" width="${W}" height="${H}" class="plotBg"/>`, `<line x1="${P}" y1="${H-P}" x2="${W-P}" y2="${H-P}" class="plotAxis"/>`, `<line x1="${P}" y1="${P}" x2="${P}" y2="${H-P}" class="plotAxis"/>`, `<text x="${P}" y="24" class="plotLabel">Cut outline plus parsed path. Solid = feed, dashed = rapid.</text>`];
    if (lim.stock) out.push(`<rect x="${px(back)}" y="${py(lim.stock)}" width="${Math.max(1, px(lim.face) - px(back))}" height="${Math.max(1, py(0) - py(lim.stock))}" class="plotStock"/><text x="${px(back)+6}" y="${py(lim.stock)-8}" class="plotLabel">stock X${fmt(lim.stock)}</text>`);
    out.push(`<line x1="${px(lim.face)}" y1="${P}" x2="${px(lim.face)}" y2="${H-P}" class="plotZero"/><text x="${px(lim.face)+5}" y="${P+14}" class="plotLabel">Z face</text>`);
    const feed = [];
    moves.forEach((m, i) => { if (!Number.isFinite(m.x) || !Number.isFinite(m.z)) return; const fx = Number.isFinite(m.fromX) ? m.fromX : m.x, fz = Number.isFinite(m.fromZ) ? m.fromZ : m.z; if (m.motion === 'G01') feed.push(`${px(m.z)},${py(m.x)}`); out.push(`<line x1="${px(fz)}" y1="${py(fx)}" x2="${px(m.z)}" y2="${py(m.x)}" class="${m.motion === 'G01' ? 'plotPath' : 'plotRapid'}"/>`, `<circle cx="${px(m.z)}" cy="${py(m.x)}" r="6" class="${m.motion === 'G01' ? 'plotPoint' : 'plotSafe'}"/>`, `<text x="${px(m.z)+8}" y="${py(m.x)+4}" class="plotStepLabel">${i+1}</text>`); });
    if (feed.length > 1) out.push(`<polyline points="${feed.join(' ')}" class="plotCutOutline"/>`); const last = pts[pts.length - 1]; out.push(`<circle cx="${px(last.z)}" cy="${py(last.x)}" r="8" class="plotEnd"/><text x="${px(last.z)+10}" y="${py(last.x)-10}" class="plotLabel">current X${fmt(last.x)} Z${fmt(last.z)}</text>`); svg.innerHTML = out.join('');
  }

  function refresh() { fillJaws(); renderCuts(); buildCode(); parseSim(); }
  function wire() {
    addPieJaws(); addPlanner(); fillJaws(); renderCuts(); buildCode(); parseSim();
    const oldLoad = window.loadJob; if (typeof oldLoad === 'function' && !window.__cncEnhLoad) { window.__cncEnhLoad = true; window.loadJob = function() { const r = oldLoad.apply(this, arguments); setTimeout(refresh, 100); return r; }; }
    const oldDup = window.duplicateJob; if (typeof oldDup === 'function' && !window.__cncEnhDup) { window.__cncEnhDup = true; window.duplicateJob = function() { const r = oldDup.apply(this, arguments); setTimeout(refresh, 100); return r; }; }
    $('runSimBtn')?.addEventListener('click', e => { e.stopImmediatePropagation(); parseSim(); }, true);
    $('refreshGcodeBtn')?.addEventListener('click', () => setTimeout(schedule, 100), true);
    document.querySelectorAll('.nav').forEach(b => b.addEventListener('click', () => setTimeout(() => { const id = job()?.id || ''; if (id !== seenJob) { seenJob = id; refresh(); } if (b.dataset.view === 'simView') parseSim(); if (b.dataset.view === 'gcodeView') { renderCuts(); buildCode(); } }, 100)));
    setInterval(() => { const id = job()?.id || ''; if (id && id !== seenJob) { seenJob = id; refresh(); } }, 1200);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();

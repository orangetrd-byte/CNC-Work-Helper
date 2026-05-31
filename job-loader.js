(() => {
  const storeKey = 'cncLatheWorkHelper.v4';
  const clearFlag = 'cncLatheWorkHelper.clearMode';
  const $ = id => document.getElementById(id);
  const n = value => {
    const cleaned = String(value ?? '').trim().replace(/^\./, '0.').replace(/^-\./, '-0.');
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const fmt = value => Number.isFinite(value) ? Number(value).toFixed(3).replace(/^-0\.000$/, '0.000') : '--';
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));

  const presetTools = [
    { id: 'p0', label: 'DB .187 x .015', width: '.187', radius: '.015', notes: 'Common groove/plunge insert' },
    { id: 'p1', label: 'DB .125 x .008', width: '.125', radius: '.008', notes: 'Narrow groove/plunge insert' },
    { id: 'p2', label: 'CNMG 432', width: '', radius: '.031', notes: 'General OD turning insert' },
    { id: 'p3', label: 'VNMG 331', width: '', radius: '.015', notes: 'Finishing insert' },
    { id: 'p4', label: 'Threading 60 deg', width: '', radius: '', notes: 'Threading tool, verify pitch and offset' }
  ];
  const presetFeeds = [
    { id: 'f0', label: 'Steel groove light', speed: 'S250 M03', feed: '.004' },
    { id: 'f1', label: 'Steel groove heavy', speed: 'S180 M03', feed: '.006' },
    { id: 'f2', label: 'Aluminum groove', speed: 'S600 M03', feed: '.006' },
    { id: 'f3', label: 'Cast iron dry', speed: 'S320 M03', feed: '.005' },
    { id: 'f4', label: 'Finish pass', speed: 'S450 M03', feed: '.003' }
  ];

  function readState() {
    try { return JSON.parse(localStorage.getItem(storeKey) || '{}'); } catch { return {}; }
  }
  function clearCncStorage() {
    Object.keys(localStorage).filter(key => key.startsWith('cncLatheWorkHelper')).forEach(key => localStorage.removeItem(key));
  }
  function ensureToolsListTarget() {
    if ($('toolsList')) return;
    const holder = document.createElement('div');
    holder.id = 'toolsList';
    holder.className = 'hidden';
    (document.getElementById('toolsView') || document.body).appendChild(holder);
  }
  function showClearedState() {
    if (sessionStorage.getItem(clearFlag) !== '1') return;
    const start = $('startNewAfterClearBtn');
    if (start) start.classList.remove('hidden');
    if ($('saveStatus')) $('saveStatus').textContent = 'Cleared. Autosave is paused.';
    if ($('currentJobLabel')) $('currentJobLabel').textContent = 'No saved job loaded';
  }
  function blankVisibleFields() {
    document.querySelectorAll('input:not([type="file"]), textarea').forEach(field => {
      if (field.id === 'faceZ') field.value = '0.000';
      else if (field.id !== 'geoChamferAngle') field.value = '';
    });
    if ($('zDirection')) $('zDirection').value = 'minus';
    if ($('manualResult')) $('manualResult').innerHTML = '<div class="big">X -- / Z --</div><div class="hint">Start a new job or edit a field to restart autosave.</div>';
    if ($('gcodeOut')) $('gcodeOut').textContent = 'Enter calculator values to generate draft G-code.';
  }
  function handleClearLocal(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!confirm('Clear saved jobs, tools, feeds, and current auto-save?')) return;
    clearCncStorage();
    sessionStorage.setItem(clearFlag, '1');
    blankVisibleFields();
    showClearedState();
    setTimeout(() => location.reload(), 150);
  }
  function restartAfterClear() {
    if (sessionStorage.getItem(clearFlag) !== '1') return;
    sessionStorage.removeItem(clearFlag);
    const start = $('startNewAfterClearBtn');
    if (start) start.classList.add('hidden');
  }

  function dedupeByLabel(items) {
    const seen = new Set();
    return items.filter(item => {
      const key = String(item.label || '').trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  function allTools() {
    const state = readState();
    const custom = Array.isArray(state.tools) ? state.tools.map(tool => ({ ...tool, id: tool.id || tool.label })) : [];
    return dedupeByLabel([...presetTools, ...custom]);
  }
  function allFeeds() {
    const state = readState();
    const custom = Array.isArray(state.feeds) ? state.feeds.map(feed => ({ ...feed, id: feed.id || feed.label })) : [];
    return dedupeByLabel([...presetFeeds, ...custom]);
  }
  function optionList(items, prompt) {
    return `<option value="">${prompt}</option>` + items.map(item => `<option value="${esc(item.id)}">${esc(item.label)}</option>`).join('');
  }
  function useToolFromList(id) {
    if (!id) return;
    if (window.useTool) window.useTool(id);
    const tool = allTools().find(item => item.id === id);
    renderToolDetail(tool);
  }
  function useFeedFromList(id) {
    if (!id) return;
    if (window.useFeed) window.useFeed(id);
    const feed = allFeeds().find(item => item.id === id);
    renderFeedDetail(feed);
  }
  function renderToolDetail(tool) {
    if (!$('toolDetail')) return;
    $('toolDetail').innerHTML = tool ? `<div class="medium">${esc(tool.label)}</div><div class="hint">${esc([tool.width ? `Width ${tool.width}` : '', tool.radius ? `Radius ${tool.radius}` : '', tool.notes || ''].filter(Boolean).join(' | '))}</div>` : 'Choose a tool to see width, radius, and notes.';
  }
  function renderFeedDetail(feed) {
    if (!$('feedDetail')) return;
    $('feedDetail').innerHTML = feed ? `<div class="medium">${esc(feed.label)}</div><div class="hint">${esc([feed.speed, feed.feed ? `Feed ${feed.feed}` : ''].filter(Boolean).join(' | '))}</div>` : 'Choose a speed/feed to see spindle and feed values.';
  }
  function refreshLibrarySelectors() {
    const tools = allTools();
    const feeds = allFeeds();
    ['premadeTool', 'activeToolSelect', 'gcodeToolSelect', 'toolLibrarySelect'].forEach(id => { if ($(id)) $(id).innerHTML = optionList(tools, 'Choose tool...'); });
    if ($('premadeFeed')) $('premadeFeed').innerHTML = '<option value="">Choose common speed/feed...</option>' + presetFeeds.map((feed, index) => `<option value="${index}">${esc(feed.label)}</option>`).join('');
    if ($('feedLibrarySelect')) $('feedLibrarySelect').innerHTML = optionList(feeds, 'Choose speed/feed...');
  }

  function updateGeometry() {
    const dia = n($('geoDiameter')?.value), rad = n($('geoRadius')?.value);
    if ($('geoDiaOut')) $('geoDiaOut').textContent = dia !== null ? `Radius ${fmt(dia / 2)}` : rad !== null ? `Diameter ${fmt(rad * 2)}` : 'Enter diameter or radius.';
    const odStart = n($('geoOdStart')?.value), odTarget = n($('geoOdTarget')?.value);
    if ($('geoOdOut')) $('geoOdOut').textContent = odStart !== null && odTarget !== null ? `Diameter change ${fmt(Math.abs(odStart - odTarget))}. Radial travel ${fmt(Math.abs(odStart - odTarget) / 2)}.` : 'Radial travel = diameter change / 2.';
    const chamfer = n($('geoChamferSize')?.value), angle = n($('geoChamferAngle')?.value) ?? 45;
    if ($('geoChamferOut')) {
      const zLeg = chamfer !== null ? chamfer / Math.tan(angle * Math.PI / 180) : null;
      $('geoChamferOut').textContent = chamfer !== null ? `Approx X diameter change ${fmt(chamfer * 2)}. Z leg ${fmt(zLeg)} at ${fmt(angle)} degrees.` : '45 degree chamfer uses equal X-radius and Z legs.';
    }
    const big = n($('geoTaperBig')?.value), small = n($('geoTaperSmall')?.value), length = n($('geoTaperLength')?.value);
    if ($('geoTaperOut')) $('geoTaperOut').textContent = big !== null && small !== null && length ? `Taper per inch ${fmt(Math.abs(big - small) / length)} diameter per inch.` : 'TPI = diameter difference / length.';
    const helperAngle = n($('geoAngle')?.value), depth = n($('geoDepth')?.value);
    if ($('geoAngleOut')) {
      const side = helperAngle !== null && depth !== null ? depth * Math.tan(helperAngle * Math.PI / 180) : null;
      $('geoAngleOut').textContent = side !== null ? `For depth ${fmt(depth)}, side distance is about ${fmt(side)}. Diameter change would be ${fmt(side * 2)}.` : 'Enter angle and depth for a quick opposite/adjacent estimate.';
    }
  }

  function parseWords(line) {
    const words = {};
    line.replace(/\([^)]*\)/g, '').replace(/([A-Z])\s*(-?\d*\.?\d+)/gi, (_, letter, value) => { words[letter.toUpperCase()] = Number(value); return ''; });
    return words;
  }
  function parseGcode() {
    const source = $('gcodeOut')?.textContent || '';
    let x = null, z = null, lastMotion = null;
    let hasFeed = false, hasSpindle = false;
    const moves = [];
    const warnings = [];
    source.split(/\r?\n/).forEach((raw, index) => {
      const line = raw.trim().toUpperCase();
      if (!line || line === '%' || line.startsWith('(')) return;
      if (/M0?3|M0?4/.test(line) || /\bS\s*\d/.test(line)) hasSpindle = true;
      if (/\bF\s*-?\d/.test(line)) hasFeed = true;
      if (/G0?0/.test(line)) lastMotion = 'G00';
      if (/G0?1/.test(line)) lastMotion = 'G01';
      const words = parseWords(line);
      const nextX = Number.isFinite(words.X) ? words.X : x;
      const nextZ = Number.isFinite(words.Z) ? words.Z : z;
      if ((Number.isFinite(words.X) || Number.isFinite(words.Z)) && lastMotion) {
        moves.push({ line: index + 1, code: raw.trim(), motion: lastMotion, fromX: x, fromZ: z, x: nextX, z: nextZ });
        if (lastMotion === 'G00' && Number.isFinite(nextZ) && nextZ < 0) warnings.push(`Line ${index + 1}: rapid move goes to negative Z. Verify clearance before chuck/face.`);
        x = nextX;
        z = nextZ;
      }
    });
    if (!hasFeed) warnings.push('Missing feed rate F on generated code.');
    if (!hasSpindle) warnings.push('Missing spindle command or S speed.');
    const depth = n($('plungeDepth')?.value);
    const direction = $('zDirection')?.value;
    const finalZ = moves.length ? moves[moves.length - 1].z : null;
    if (depth && direction === 'minus' && Number.isFinite(finalZ) && finalZ > 0) warnings.push('Z direction mismatch: plunge is set for Z minus, but parsed path ends at positive Z.');
    drawSim(moves);
    if ($('simCurrent')) $('simCurrent').textContent = `X ${fmt(x)} / Z ${fmt(z)}`;
    if ($('simWarnings')) $('simWarnings').innerHTML = warnings.length ? warnings.map(w => `<div>${esc(w)}</div>`).join('') : '<span style="color:#c8f7c5">No basic warnings found. Still verify at the machine.</span>';
    if ($('simSteps')) $('simSteps').innerHTML = moves.map(move => `<div class="item simStep ${move.motion === 'G01' ? 'simFeed' : 'simRapid'}"><code>${move.motion}</code><span>${esc(move.code)}</span><strong>X${fmt(move.x)} Z${fmt(move.z)}</strong></div>`).join('') || '<p class="hint">No X/Z moves found in the generated code.</p>';
  }
  function drawSim(moves) {
    const svg = $('simPlot');
    if (!svg) return;
    if (!moves.length) { svg.innerHTML = '<text x="24" y="42" class="plotLabel">No parsed toolpath yet.</text>'; return; }
    const pts = moves.filter(m => Number.isFinite(m.x) && Number.isFinite(m.z));
    if (!pts.length) { svg.innerHTML = '<text x="24" y="42" class="plotLabel">No complete X/Z positions found.</text>'; return; }
    const width = 700, height = 340, pad = 42;
    let minX = Math.min(...pts.map(p => p.x)), maxX = Math.max(...pts.map(p => p.x)), minZ = Math.min(...pts.map(p => p.z)), maxZ = Math.max(...pts.map(p => p.z));
    if (maxX - minX < .001) { maxX += 1; minX -= 1; }
    if (maxZ - minZ < .001) { maxZ += .25; minZ -= .25; }
    minX -= (maxX - minX) * .12; maxX += (maxX - minX) * .12; minZ -= (maxZ - minZ) * .18; maxZ += (maxZ - minZ) * .18;
    const px = zVal => pad + (zVal - minZ) / (maxZ - minZ) * (width - pad * 2);
    const py = xVal => height - pad - (xVal - minX) / (maxX - minX) * (height - pad * 2);
    const parts = [`<line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" class="plotGrid"/>`, `<line x1="${pad}" y1="${pad}" x2="${pad}" y2="${height - pad}" class="plotGrid"/>`, '<text x="42" y="24" class="plotLabel">Parsed X/Z path. Solid = G01 feed. Dashed = G00 rapid.</text>'];
    moves.forEach(move => {
      if (!Number.isFinite(move.x) || !Number.isFinite(move.z)) return;
      const fromX = Number.isFinite(move.fromX) ? move.fromX : move.x;
      const fromZ = Number.isFinite(move.fromZ) ? move.fromZ : move.z;
      parts.push(`<line x1="${px(fromZ)}" y1="${py(fromX)}" x2="${px(move.z)}" y2="${py(move.x)}" class="${move.motion === 'G01' ? 'plotPath' : 'plotRapid'}"/>`);
      parts.push(`<circle cx="${px(move.z)}" cy="${py(move.x)}" r="5" class="${move.motion === 'G01' ? 'plotPoint' : 'plotSafe'}"/>`);
    });
    const last = pts[pts.length - 1];
    parts.push(`<text x="${px(last.z) + 8}" y="${py(last.x) - 8}" class="plotLabel">X${fmt(last.x)} Z${fmt(last.z)}</text>`);
    svg.innerHTML = parts.join('');
  }

  function wire() {
    ensureToolsListTarget();
    showClearedState();
    refreshLibrarySelectors();
    setTimeout(() => document.querySelector('.nav.active')?.click(), 0);
    $('clearBtn')?.addEventListener('click', handleClearLocal, true);
    $('startNewAfterClearBtn')?.addEventListener('click', () => { restartAfterClear(); $('newJobBtn')?.click(); }, true);
    document.querySelectorAll('input, textarea, select').forEach(field => field.addEventListener('input', restartAfterClear, { once: true }));
    ['premadeTool', 'activeToolSelect', 'gcodeToolSelect', 'toolLibrarySelect'].forEach(id => $(id)?.addEventListener('change', event => useToolFromList(event.target.value)));
    $('feedLibrarySelect')?.addEventListener('change', event => useFeedFromList(event.target.value));
    $('saveToolBtn')?.addEventListener('click', () => setTimeout(refreshLibrarySelectors, 50));
    $('saveFeedBtn')?.addEventListener('click', () => setTimeout(refreshLibrarySelectors, 50));
    document.querySelectorAll('#geometryView input').forEach(input => input.addEventListener('input', updateGeometry));
    $('runSimBtn')?.addEventListener('click', parseGcode);
    document.querySelector('[data-view="simView"]')?.addEventListener('click', () => setTimeout(parseGcode, 50));
    document.querySelector('[data-view="toolsView"]')?.addEventListener('click', () => setTimeout(refreshLibrarySelectors, 50));
    updateGeometry();
    parseGcode();
    if ('serviceWorker' in navigator && location.protocol !== 'file:') window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(console.warn));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();

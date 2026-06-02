(() => {
  const $ = id => document.getElementById(id);
  const num = v => { const s = String(v ?? '').trim().replace(/^\./, '0.').replace(/^-\./, '-0.'); const n = Number(s); return s && Number.isFinite(n) ? n : null; };
  const fmt = v => Number.isFinite(v) ? Number(v).toFixed(3).replace(/^-0\.000$/, '0.000') : '--';

  function ensurePanel() {
    if ($('editorPlot')) return;
    const panel = $('gcodeEditorPanel');
    if (!panel) return;
    panel.insertAdjacentHTML('beforeend', '<div class="result editor-plot-panel"><div class="section-head"><h2>Plot Preview</h2><span class="mini" id="editorPlotStatus">Reads typed G-code</span></div><div class="plotWrap"><svg id="editorPlot" class="plotSvg tall" viewBox="0 0 700 340" role="img" aria-label="Typed G-code plot preview"></svg></div></div>');
  }
  function strip(line) { return line.replace(/\([^)]*\)/g, '').replace(/;.*/, '').trim().toUpperCase(); }
  function words(line) { const w = {}; line.replace(/([A-Z])\s*(-?\d*\.?\d+)/gi, (_, l, v) => { w[l.toUpperCase()] = Number(v); return ''; }); return w; }
  function codes(line) { return (line.match(/G\s*\d+/gi) || []).map(c => c.replace(/\s+/g, '').toUpperCase()); }
  function motionFrom(line, current) {
    const g = codes(line);
    if (g.some(c => c === 'G0' || c === 'G00')) return 'G00';
    if (g.some(c => c === 'G1' || c === 'G01')) return 'G01';
    if (g.some(c => c === 'G2' || c === 'G02')) return 'G02';
    if (g.some(c => c === 'G3' || c === 'G03')) return 'G03';
    if (g.some(c => ['G90','G92','G94','G70','G71','G72','G73','G74','G75','G76'].includes(c))) return g.find(c => ['G90','G92','G94','G70','G71','G72','G73','G74','G75','G76'].includes(c));
    return current;
  }
  function parse() {
    const text = $('gcodeEditor')?.value || $('gcodeOut')?.textContent || '';
    let x = null, z = null, motion = null;
    const moves = [];
    text.split(/\r?\n/).forEach((raw, i) => {
      const line = strip(raw);
      if (!line || line === '%') return;
      motion = motionFrom(line, motion);
      const w = words(line);
      const nx = Number.isFinite(w.X) ? w.X : x;
      const nz = Number.isFinite(w.Z) ? w.Z : z;
      if ((Number.isFinite(w.X) || Number.isFinite(w.Z)) && motion) {
        moves.push({ line: i + 1, motion, fromX: x, fromZ: z, x: nx, z: nz });
        x = nx;
        z = nz;
      }
    });
    return moves;
  }
  function draw() {
    ensurePanel();
    const svg = $('editorPlot');
    if (!svg) return;
    const moves = parse();
    const pts = moves.filter(m => Number.isFinite(m.x) && Number.isFinite(m.z));
    if (!pts.length) {
      svg.innerHTML = '<text x="24" y="42" class="plotLabel">No X/Z moves found in typed G-code.</text>';
      if ($('editorPlotStatus')) $('editorPlotStatus').textContent = 'No path yet';
      return;
    }
    const stock = num($('stockDiameter')?.value);
    const stockLen = num($('stockLength')?.value);
    const face = num($('faceZ')?.value) ?? 0;
    const W = 700, H = 340, P = 48;
    const back = stockLen ? face - stockLen : Math.min(...pts.map(p => p.z), face - 0.5);
    const xs = pts.map(p => p.x).concat(stock ? [stock, 0] : []);
    const zs = pts.map(p => p.z).concat([face, back]);
    let minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
    if (maxX - minX < .001) { maxX += 1; minX -= 1; }
    if (maxZ - minZ < .001) { maxZ += .25; minZ -= .25; }
    minX -= (maxX - minX) * .16; maxX += (maxX - minX) * .16;
    minZ -= (maxZ - minZ) * .22; maxZ += (maxZ - minZ) * .22;
    const px = z => P + (z - minZ) / (maxZ - minZ) * (W - P * 2);
    const py = x => H - P - (x - minX) / (maxX - minX) * (H - P * 2);
    const out = [`<rect x="0" y="0" width="${W}" height="${H}" class="plotBg"/>`, `<line x1="${P}" y1="${H-P}" x2="${W-P}" y2="${H-P}" class="plotAxis"/>`, `<line x1="${P}" y1="${P}" x2="${P}" y2="${H-P}" class="plotAxis"/>`, `<text x="${P}" y="24" class="plotLabel">G-code tab plot. Solid = feed/cycle, dashed = rapid.</text>`];
    if (stock) out.push(`<rect x="${px(back)}" y="${py(stock)}" width="${Math.max(1, px(face) - px(back))}" height="${Math.max(1, py(0) - py(stock))}" class="plotStock"/><text x="${px(back)+6}" y="${py(stock)-8}" class="plotLabel">stock X${fmt(stock)}</text>`);
    out.push(`<line x1="${px(face)}" y1="${P}" x2="${px(face)}" y2="${H-P}" class="plotZero"/><text x="${px(face)+5}" y="${P+14}" class="plotLabel">Z face</text>`);
    const feed = [];
    moves.forEach((m, i) => {
      if (!Number.isFinite(m.x) || !Number.isFinite(m.z)) return;
      const fx = Number.isFinite(m.fromX) ? m.fromX : m.x;
      const fz = Number.isFinite(m.fromZ) ? m.fromZ : m.z;
      const isFeed = m.motion !== 'G00';
      if (isFeed) feed.push(`${px(m.z)},${py(m.x)}`);
      out.push(`<line x1="${px(fz)}" y1="${py(fx)}" x2="${px(m.z)}" y2="${py(m.x)}" class="${isFeed ? 'plotPath' : 'plotRapid'}"/>`);
      out.push(`<circle cx="${px(m.z)}" cy="${py(m.x)}" r="6" class="${isFeed ? 'plotPoint' : 'plotSafe'}"/>`);
      out.push(`<text x="${px(m.z)+8}" y="${py(m.x)+4}" class="plotStepLabel">${i + 1}</text>`);
    });
    if (feed.length > 1) out.push(`<polyline points="${feed.join(' ')}" class="plotCutOutline"/>`);
    const last = pts[pts.length - 1];
    out.push(`<circle cx="${px(last.z)}" cy="${py(last.x)}" r="8" class="plotEnd"/><text x="${px(last.z)+10}" y="${py(last.x)-10}" class="plotLabel">current X${fmt(last.x)} Z${fmt(last.z)}</text>`);
    svg.innerHTML = out.join('');
    if ($('editorPlotStatus')) $('editorPlotStatus').textContent = `${moves.length} plotted move${moves.length === 1 ? '' : 's'}`;
  }
  function wire() {
    ensurePanel();
    draw();
    $('plotCodeBtn')?.addEventListener('click', () => setTimeout(draw, 80));
    $('checkCodeBtn')?.addEventListener('click', () => setTimeout(draw, 80));
    $('genCalcBtn')?.addEventListener('click', () => setTimeout(draw, 120));
    $('gcodeEditor')?.addEventListener('input', () => setTimeout(draw, 140));
    document.querySelector('[data-view="gcodeView"]')?.addEventListener('click', () => setTimeout(draw, 180));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();

(() => {
  const storeKey = 'cncLatheWorkHelper.v4';
  const apiKeyStore = 'cncLatheWorkHelper.geminiApiKey';
  const modelStore = 'cncLatheWorkHelper.geminiModel';
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const read = () => { try { return JSON.parse(localStorage.getItem(storeKey) || '{}'); } catch { return {}; } };
  const currentJob = () => { const st = read(); return Array.isArray(st.jobs) ? st.jobs.find(j => j.id === st.currentJobId) || st.jobs[0] : null; };
  const codeText = () => $('gcodeEditor')?.value || $('gcodeOut')?.textContent || currentJob()?.gcode?.output || '';
  const savedKey = () => localStorage.getItem(apiKeyStore) || '';
  const savedModel = () => localStorage.getItem(modelStore) || 'gemini-2.5-flash';
  const machinistSystemPrompt = `You are the CNC Work Helper Machinist Assistant for an alpha-stage personal-use CNC lathe helper app.

Primary role:
- Help with practical machinist problems, shop questions, setup issues, offset recovery, tooling choices, speeds/feeds, inspection planning, CNC lathe G-code, System A lathe cycles, Fanuc-style controls, and beginner troubleshooting.
- Provide knowledge-based answers that teach the reasoning, not just the final number.
- Use the current job context when it is relevant, but say when the context is missing or uncertain.

Important lathe assumptions:
- This app is for CNC lathe work.
- X is diameter-based unless the user says the control is in radius mode.
- Z0 is a reference surface, often the part face, but sometimes the jaw/chuck face or another setup reference.
- Plunging into the part from a faced Z0 is usually negative Z, but machine conventions and setup choices can vary.
- Work Shift / EXT offset, G54-G59, tool geometry, and wear offsets can interact. Be explicit about which one the user is changing.

Answer style:
- Be direct and shop-floor practical.
- Give step-by-step procedures when the user asks "how do I".
- For calculations, show the formula and the sign logic.
- For control procedures, mention that exact key names can vary by Fanuc/Haas/Mazak/control generation.
- Ask for the missing control type, offset screen, active tool/offset, touched surface, or sign convention when those details determine the safe answer.

Safety boundaries:
- Do not claim any answer, generated G-code, simulator view, or rough plot proves a machine move is safe.
- Do not tell the user to run code or move the machine without verifying at the control.
- Always include a short verification step for offsets, G-code, tool clearance, spindle/feed, jaws/chuck clearance, and Distance-To-Go when relevant.
- If there is risk of a crash, wrong offset, wrong sign, wrong tool, or wrong mode, say so plainly.
- This is personal alpha software: treat answers as planning/reference help, not certified machine instructions.`;

  function setAnswer(text) {
    if ($('assistantAnswer')) $('assistantAnswer').textContent = text;
    if ($('saveStatus')) $('saveStatus').textContent = text;
  }

  function setLocalAnswer(text) {
    if ($('assistantAnswer')) $('assistantAnswer').innerHTML = `<div class="mini">Local shop help</div>${esc(text).replace(/\n/g, '<br>')}`;
    if ($('saveStatus')) $('saveStatus').textContent = 'Local shop help';
  }

  function localAssistantAnswer(rawQuestion) {
    const q = String(rawQuestion || '').toLowerCase();
    const has = (...terms) => terms.some(term => q.includes(term));
    if (!q.trim()) return null;

    if (has('diameter mode', 'radius mode', 'x mode', 'x diameter', 'x radius')) {
      return `Most CNC lathes run X in diameter mode: the X value shown on the control is the part diameter, not how far the tool physically moves.

Example: X2.000 to X1.500 changes the part diameter by .500, but the tool moves radially .250.

If a control is in radius mode, X would represent tool distance from centerline instead. Verify G7/G8 or the machine setting before entering offsets.`;
    }

    if (has('setup notes', 'setup note', 'setup reference', 'setup tab', 'job notes')) {
      return `Setup notes are the job memory for the next run.

Use them for: jaw/chuck setup, work offset, Z0 location, stickout, stock size, tool touch-off notes, inspection checks, safe approach notes, and anything that surprised you.

Save the job when the notes are ready. The app is now manual-save first, so typing does not commit changes until you tap Save Job.`;
    }

    if (has('saved job', 'saved jobs', 'load job', 'recent job', 'job library')) {
      return `Saved jobs are stored locally on this device in browser storage.

Use Save Job to commit the current notes, setup, tool/feed, calculator values, and G-code text. Use Load or Recent Jobs to bring a saved job back as a reference.

Import/Export JSON is the safer way to move jobs between devices or keep backups.`;
    }

    if (has('production-ready g-code', 'production ready g-code', 'proper g code', 'proper g-code', 'can this generate', 'draft g-code', 'draft g code')) {
      return `No. Treat app-generated G-code as draft/check-before-running assistance only.

It can help format a starting point from calculator values, but it does not know your exact post, machine parameters, offsets, tool nose comp, jaws, chuck clearance, or shop rules.

Before running anything: verify tool/offset, spindle, feed, work offset, X diameter/radius mode, Z sign, clearance, jaws/chuck, Distance-To-Go, and single block the first moves.`;
    }

    if (has('g-code check', 'gcode check', 'check g-code', 'check code', 'validation', 'warning')) {
      return `The G-code checker is a rough helper, not a machine simulation.

It looks for common issues such as missing tool call, missing spindle start, missing feed before G01, G96 without G50, unsupported codes, arc format issues, positive Z plunge questions, and X below zero.

A clean check does not prove the program is safe. Verify at the control and dry-run/single-block per shop practice.`;
    }

    if (has('plot', 'preview', 'toolpath', 'simulate', 'simulator')) {
      return `The plot/simulator is a rough X/Z visual aid.

It helps you see feed moves, rapid moves, retracts, and approximate toolpath shape from the typed G-code. It is not collision-proof and does not model your turret, holder, jaws, chuck, insert shape, or machine limits.

Use it to catch obvious direction mistakes, then verify the real move at the control.`;
    }

    if (has('x/z', 'xz', 'movement', 'move calculator', 'lathe move', 'radial travel', 'plunge')) {
      return `The movement calculator assumes lathe X is diameter-based.

Target X is the final diameter position. Z face is usually 0.000. A plunge into the part from the face is usually negative Z, such as Z-.500.

Radial travel = absolute diameter change / 2. Example: X24.000 to X3.000 gives 21.000 diameter change and 10.500 radial tool movement.`;
    }

    if (has('tool library', 'tool libraries', 'tool selector', 'tool choice', 'insert', 'nose radius', 'db .187')) {
      return `The tool library keeps common and custom tool data close to the job.

Use it for tool label, insert/tool width, nose radius, station/offset notes, and setup cautions. Labels like DB .187 x .015 can be parsed as width .187 and radius .015.

Still verify the physical insert and offset at the machine.`;
    }

    if (has('speed', 'feed', 'sfm', 'rpm', 'feeds and speeds')) {
      return `Speeds and feeds in this app are quick-reference helpers.

Use SFM/RPM and feed calculators to get a starting point, then adjust for material, insert grade, rigidity, stickout, coolant, interrupted cuts, and machine condition.

Formula reminder: RPM = (SFM x 3.82) / diameter in inches.`;
    }

    if (has('drill', 'tap', 'tap drill', 'thread')) {
      return `The drill/tap references are quick shop references.

Use them to get a starting tap drill or thread value, then verify against your shop chart, thread class, material, tool brand, and print requirement.

For 60-degree thread depth estimate: depth = 0.6495 / TPI.`;
    }

    if (has('import', 'export', 'json', 'backup')) {
      return `Import/Export uses JSON files.

Export a job when you want a backup or want to move it to another device. Import loads that JSON back into the app with notes, setup, calculator values, tool/feed, and G-code data preserved.

For important jobs, export JSON instead of relying only on browser storage.`;
    }

    if (has('offline', 'pwa', 'install', 'home screen', 'service worker')) {
      return `CNC Work Helper is a PWA. Once loaded and installed, the service worker caches the app so it can open offline.

Job data is local to the browser/device. Updating the app may require a refresh after GitHub Pages publishes and the service worker cache changes.`;
    }

    if (has('version', 'build', 'mgp', 'cache')) {
      return `Version/build information is shown at the bottom of the Reference/Codes area.

Use that to confirm whether the installed PWA has picked up the latest cache version. If the app looks stale, refresh the browser/PWA after GitHub Pages finishes updating.`;
    }

    if (has('z0', 'z zero', 'retouch z', 'lost z', 'work shift', 'w-shift', 'jaw face')) {
      return `For lost Z or retouching Z, do not blindly call a new surface Z0.

Use a known surface and enter its true Z value for your setup. If Z0 is the jaw face and the part face is 1.602 from the jaw face, enter the true signed distance your machine convention requires, such as Z-1.602 in the Fanuc Work Shift measurement field if that is your shop convention.

Verify on Absolute Position before cutting, then single-block the first move with low override.`;
    }

    return null;
  }

  function maskKey(key) {
    if (!key) return '';
    if (key.length <= 10) return 'saved key';
    return `${key.slice(0, 6)}...${key.slice(-4)}`;
  }

  function jobContext() {
    const j = currentJob() || {};
    const s = j.setup || {}, c = j.calculator || {}, t = j.tool || {}, f = j.feed || {};
    return [
      `Part: ${j.partNumber || ''}`,
      `Material: ${j.material || ''}`,
      `Operation: ${j.operation || ''}`,
      `Machine: ${j.machine || ''}`,
      `Work offset: ${s.workOffset || ''}`,
      `Stock diameter: ${s.stockDiameter || ''}`,
      `Stock length: ${s.stockLength || ''}`,
      `Chuck/jaws: ${s.chuckJaw || ''}`,
      `Pie jaws: ${[s.pieJawSize, s.pieJawBore, s.pieJawStep, s.pieJawNotes].filter(Boolean).join(' | ')}`,
      `Stickout: ${s.stickout || ''}`,
      `Coolant: ${s.coolant || ''}`,
      `Calculator: touch X ${c.touchDia || ''}, target X ${c.targetDia || ''}, face Z ${c.faceZ || ''}, plunge ${c.plungeDepth || ''}, Z direction ${c.zDirection || ''}`,
      `Tool: ${t.label || ''}, width ${t.width || ''}, radius ${t.radius || ''}, notes ${t.notes || ''}`,
      `Speed/feed: ${f.speed || ''}, feed ${f.feed || ''}`,
      `Tool notes: ${j.toolNotes || ''}`,
      `Setup notes: ${j.setupNotes || ''}`,
      `Inspection notes: ${s.inspectionNotes || ''}`,
      `G-code:\n${codeText().slice(0, 6000)}`
    ].join('\n');
  }

  function injectAssistant() {
    if ($('geminiAssistantPanel')) {
      hydrateKeyFields();
      return;
    }
    let target = $('assistantView');
    if (!target) {
      target = document.createElement('section');
      target.id = 'assistantView';
      target.className = 'view grid hidden';
      document.querySelector('main')?.appendChild(target);
    }
    target?.insertAdjacentHTML('beforeend', `
      <div id="geminiAssistantPanel" class="card span-2 ai-panel">
        <div class="section-head"><h2>Machinist Assistant</h2><span class="mini">Machining knowledge + current job context.</span></div>
        <div class="ai-compact-key"><span id="geminiKeyStatus" class="ai-key-status">No key saved yet.</span><button id="toggleGeminiKeyBtn" type="button">Key</button><button id="clearGeminiKeyBtn" type="button">Clear</button></div>
        <div id="geminiKeyEditor" class="ai-key-editor hidden"><div class="ai-key-grid"><div class="field"><label for="geminiApiKey">Gemini API key</label><input id="geminiApiKey" type="password" autocomplete="off" placeholder="Paste key, then tap Save Key"></div><div class="field"><label for="geminiModel">Model</label><select id="geminiModel"><option value="gemini-2.5-flash">gemini-2.5-flash</option><option value="gemini-3-flash-preview">gemini-3-flash-preview</option></select></div></div><button id="saveGeminiKeyBtn" type="button">Save Key</button></div>
        <div class="sample-strip ai-prompts"><button type="button" data-ai-q="What RPM should I run this material at the current stock diameter?">RPM</button><button type="button" data-ai-q="Review this setup for beginner mistakes and safety checks.">Setup Review</button><button type="button" data-ai-q="Check this G-code for obvious lathe safety issues.">G-code Check</button><button type="button" data-ai-q="How do I recover Z if the original Z face is gone?">Lost Z</button><button type="button" data-ai-q="What should I inspect first on this job?">Inspection</button></div>
        <div class="field"><label for="assistantQuestion">Question</label><textarea id="assistantQuestion" placeholder="Ask a machinist problem: offsets, Z0, work shift, tooling, speeds/feeds, inspection, G-code, or setup troubleshooting."></textarea></div>
        <div class="row actions"><button id="askGeminiBtn" class="primary" type="button">Ask Assistant</button></div>
        <div id="assistantAnswer" class="result compact ai-answer">Personal alpha helper. Ask a machining question and verify all answers at the machine/control before using them.</div>
      </div>`);
    hydrateKeyFields();
    $('geminiModel')?.addEventListener('change', () => saveKey(false));
  }

  function hydrateKeyFields() {
    if ($('geminiApiKey') && !$('geminiApiKey').value) $('geminiApiKey').value = savedKey();
    if ($('geminiModel')) $('geminiModel').value = savedModel();
    if ($('geminiKeyStatus')) $('geminiKeyStatus').textContent = savedKey() ? `Saved: ${maskKey(savedKey())}` : 'No key saved yet.';
  }

  function saveKey(requireKey = true) {
    const input = $('geminiApiKey');
    const model = $('geminiModel')?.value || 'gemini-2.5-flash';
    const key = input?.value.trim() || savedKey();
    if (requireKey && !key) {
      setAnswer('Paste a Gemini API key first, then tap Save Key.');
      return false;
    }
    try {
      if (key) localStorage.setItem(apiKeyStore, key);
      localStorage.setItem(modelStore, model);
      const stored = savedKey();
      if (key && stored !== key) throw new Error('Storage verification failed.');
      if ($('geminiKeyStatus')) $('geminiKeyStatus').textContent = stored ? `Saved: ${maskKey(stored)}` : 'No key saved yet.';
      setAnswer(stored ? 'Gemini key saved on this device.' : 'Gemini model saved.');
      return true;
    } catch (error) {
      setAnswer(`Could not save key: ${error.message}`);
      return false;
    }
  }

  function clearKey() {
    localStorage.removeItem(apiKeyStore);
    if ($('geminiApiKey')) $('geminiApiKey').value = '';
    if ($('geminiKeyStatus')) $('geminiKeyStatus').textContent = 'No key saved yet.';
    setAnswer('Gemini key cleared.');
  }

  function handleAssistantClick(event) {
    const q = event.target.closest('[data-ai-q]')?.dataset.aiQ;
    if (q && $('assistantQuestion')) $('assistantQuestion').value = q;
    if (event.target.closest('#toggleGeminiKeyBtn')) $('geminiKeyEditor')?.classList.toggle('hidden');
    if (event.target.closest('#saveGeminiKeyBtn')) saveKey(true);
    if (event.target.closest('#clearGeminiKeyBtn')) clearKey();
    if (event.target.closest('#askGeminiBtn')) askGemini();
  }

  async function askGemini() {
    const question = $('assistantQuestion')?.value.trim();
    if (!question) { setAnswer('Type a question first.'); return; }

    const local = localAssistantAnswer(question);
    if (local) {
      setLocalAnswer(local);
      return;
    }

    const key = $('geminiApiKey')?.value.trim() || savedKey();
    const model = $('geminiModel')?.value || savedModel();
    if (!key) {
      setAnswer('No built-in CNC Work Helper answer matched that question. Remote AI fallback requires a saved Gemini API key.');
      return;
    }
    if (!saveKey(false)) return;
    setAnswer('Asking Gemini...');
    const prompt = `${machinistSystemPrompt}

CURRENT JOB CONTEXT:
${jobContext()}

USER QUESTION:
${question}`;
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || 'Gemini request failed.');
      const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('\n').trim() || 'No answer returned.';
      if ($('assistantAnswer')) $('assistantAnswer').innerHTML = esc(text).replace(/\n/g, '<br>');
    } catch (error) {
      setAnswer(`Assistant error: ${error.message}`);
    }
  }

  function wire() {
    injectAssistant();
    document.addEventListener('click', event => {
      if (event.target.closest('#toggleGeminiKeyBtn, #saveGeminiKeyBtn, #clearGeminiKeyBtn, #askGeminiBtn, [data-ai-q]')) handleAssistantClick(event);
    });
    let tries = 0;
    const wait = setInterval(() => { injectAssistant(); if (++tries > 20 || $('geminiAssistantPanel')) clearInterval(wait); }, 300);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();

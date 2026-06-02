(() => {
  const storeKey = 'cncLatheWorkHelper.v4';
  const apiKeyStore = 'cncLatheWorkHelper.geminiApiKey';
  const modelStore = 'cncLatheWorkHelper.geminiModel';
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const read = () => { try { return JSON.parse(localStorage.getItem(storeKey) || '{}'); } catch { return {}; } };
  const currentJob = () => { const st = read(); return Array.isArray(st.jobs) ? st.jobs.find(j => j.id === st.currentJobId) || st.jobs[0] : null; };
  const codeText = () => $('gcodeEditor')?.value || $('gcodeOut')?.textContent || currentJob()?.gcode?.output || '';

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
    if ($('geminiAssistantPanel')) return;
    const target = $('referenceHubView') || $('handbookView') || document.querySelector('main');
    target?.insertAdjacentHTML('beforeend', `
      <div id="geminiAssistantPanel" class="card span-2 ai-panel">
        <div class="section-head"><h2>Machinist Assistant</h2><span class="mini">Gemini API. Uses current job context.</span></div>
        <div class="ai-key-grid"><div class="field"><label for="geminiApiKey">Gemini API key</label><input id="geminiApiKey" type="password" placeholder="Stored locally on this device"></div><div class="field"><label for="geminiModel">Model</label><select id="geminiModel"><option value="gemini-2.5-flash">gemini-2.5-flash</option><option value="gemini-3-flash-preview">gemini-3-flash-preview</option></select></div></div>
        <div class="sample-strip ai-prompts"><button type="button" data-ai-q="What RPM should I run this material at the current stock diameter?">RPM</button><button type="button" data-ai-q="Review this setup for beginner mistakes and safety checks.">Setup Review</button><button type="button" data-ai-q="Check this G-code for obvious lathe safety issues.">G-code Check</button><button type="button" data-ai-q="What should I inspect first on this job?">Inspection</button></div>
        <div class="field"><label for="assistantQuestion">Question</label><textarea id="assistantQuestion" placeholder="Ask about speeds/feeds, setup, inspection, G-code, or tooling."></textarea></div>
        <div class="row actions"><button id="askGeminiBtn" class="primary" type="button">Ask Assistant</button><button id="saveGeminiKeyBtn" type="button">Save Key</button><button id="clearGeminiKeyBtn" type="button">Clear Key</button></div>
        <div id="assistantAnswer" class="result compact ai-answer">Add a Gemini API key, ask a shop question, and verify all answers before using them at the machine.</div>
      </div>`);
    $('geminiApiKey').value = localStorage.getItem(apiKeyStore) || '';
    $('geminiModel').value = localStorage.getItem(modelStore) || 'gemini-2.5-flash';
    $('saveGeminiKeyBtn').addEventListener('click', () => { localStorage.setItem(apiKeyStore, $('geminiApiKey').value.trim()); localStorage.setItem(modelStore, $('geminiModel').value); $('assistantAnswer').textContent = 'Key saved locally on this device.'; });
    $('clearGeminiKeyBtn').addEventListener('click', () => { localStorage.removeItem(apiKeyStore); $('geminiApiKey').value = ''; $('assistantAnswer').textContent = 'Key cleared.'; });
    $('askGeminiBtn').addEventListener('click', askGemini);
    $('geminiModel').addEventListener('change', () => localStorage.setItem(modelStore, $('geminiModel').value));
    $('geminiAssistantPanel').addEventListener('click', e => { const q = e.target.closest('[data-ai-q]')?.dataset.aiQ; if (q) $('assistantQuestion').value = q; });
  }

  async function askGemini() {
    const key = $('geminiApiKey')?.value.trim() || localStorage.getItem(apiKeyStore) || '';
    const model = $('geminiModel')?.value || localStorage.getItem(modelStore) || 'gemini-2.5-flash';
    const question = $('assistantQuestion')?.value.trim();
    if (!key) { $('assistantAnswer').textContent = 'Add a Gemini API key first.'; return; }
    if (!question) { $('assistantAnswer').textContent = 'Type a question first.'; return; }
    localStorage.setItem(apiKeyStore, key);
    localStorage.setItem(modelStore, model);
    $('assistantAnswer').textContent = 'Asking Gemini...';
    const prompt = `You are a careful CNC lathe shop assistant for a first-time machinist. X is diameter-based. Z face is usually 0.000 and plunging into the part from face is usually negative Z. Use the current job context below. Give practical guidance, explain assumptions, and always tell the user to verify at the machine/control before cutting. Do not claim the rough simulator proves a program is safe.\n\nCURRENT JOB CONTEXT:\n${jobContext()}\n\nQUESTION:\n${question}`;
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || 'Gemini request failed.');
      const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('\n').trim() || 'No answer returned.';
      $('assistantAnswer').innerHTML = esc(text).replace(/\n/g, '<br>');
    } catch (error) {
      $('assistantAnswer').textContent = `Assistant error: ${error.message}`;
    }
  }

  function wire() {
    injectAssistant();
    let tries = 0;
    const wait = setInterval(() => { injectAssistant(); if (++tries > 20 || $('geminiAssistantPanel')) clearInterval(wait); }, 300);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();

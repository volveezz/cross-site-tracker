import { Hono } from "hono";
import { html } from "hono/html";

const TRACKER_URL = (process.env.TRACKER_URL || "http://localhost:3002").replace(/\/$/, "");
const BRIDGE_URL = (process.env.BRIDGE_URL || "http://localhost:3003").replace(/\/$/, "");

const app = new Hono();

app.get("/", (c) => {
	const page = html`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Casino</title>
  <style>
    body { font-family: system-ui; max-width: 900px; margin: 40px auto; padding: 0 20px; background: #000; color: #e0e0e0; }
    h1 { color: #fff; }
    .info { background: #0d1a26; padding: 12px; margin-bottom: 20px; border: 1px solid #1a3a5c; }
    .sections { display: grid; gap: 16px; }
    .section { padding: 16px; background: #111; border: 1px solid #333; }
    .section h3 { margin: 0 0 8px 0; color: #fff; }
    .game-frame { width: 100%; height: 800px; border: none; background: #111; }
    a { color: #8ab4f8; }
  </style>
</head>
<body>
  <h1>Casino</h1>
  <div class="info">
    <strong>Game:</strong> <a href="${BRIDGE_URL}" target="_blank">${BRIDGE_URL}</a><br>
    <strong>Tracker:</strong> <a href="${TRACKER_URL}" target="_blank">${TRACKER_URL}</a>
  </div>

  <iframe id="game-frame" class="game-frame" src="${BRIDGE_URL}"></iframe>

  <script>
    window.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'resize_frame' && e.data.height) {
        document.getElementById('game-frame').style.height = e.data.height + 'px';
      }
    });
  </script>
</body>
</html>
`;
	return c.html(page.toString());
});

app.get("/tests", (c) => {
	const page = html`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Casino - Check</title>
  <style>
    body { font-family: system-ui; max-width: 900px; margin: 40px auto; padding: 0 20px; background: #000; color: #e0e0e0; }
    h1 { color: #fff; }
    .result { padding: 16px; margin-bottom: 16px; }
    .tracked { background: #0a2f0a; border: 2px solid #4caf50; }
    .not-tracked { background: #2f0a0a; border: 2px solid #f44336; }
    .checking { background: #1a0a2e; border: 2px solid #4a1a7e; }
    .result-title { font-size: 24px; font-weight: bold; margin-bottom: 8px; }
    .result-info { font-size: 14px; color: #aaa; }
    .section { padding: 12px; background: #111; border: 1px solid #333; margin-bottom: 12px; }
    .section-title { font-weight: bold; color: #fff; margin-bottom: 8px; }
    .data { font-family: monospace; font-size: 11px; background: #0a0a0a; padding: 8px; border: 1px solid #222; color: #aaa; white-space: pre-wrap; word-break: break-all; }
    .visit { padding: 8px; background: #0a0a0a; border: 1px solid #222; margin-bottom: 4px; }
    .visit-method { color: #4caf50; font-weight: bold; }
    .visit-time { color: #888; font-size: 12px; }
    .fp-status { padding: 8px; }
    .fp-match { background: #0a2f0a; color: #4caf50; }
    .fp-no-match { background: #2f1a0a; color: #ff9800; }
    button { padding: 8px 16px; cursor: pointer; border: 1px solid #444; background: #222; color: #e0e0e0; }
    button:hover { background: #333; }
  </style>
</head>
<body>
  <h1>Tracking Check</h1>

  <div id="result" class="result checking">
    <div class="result-title" id="result-title">Checking...</div>
    <div class="result-info" id="result-info">Loading tracking data from Tracker</div>
  </div>

  <div id="visits-section" class="section" style="display:none">
    <div class="section-title">Visits (<span id="visit-count">0</span>)</div>
    <div id="visits-list"></div>
  </div>

  <div id="fp-section" class="section" style="display:none">
    <div class="section-title">Fingerprint</div>
    <div id="fp-result"></div>
  </div>

  <div style="margin-top: 16px;">
    <button onclick="runCheck()">Re-check</button>
    <button onclick="location.reload()">Refresh</button>
  </div>

  <div id="saa-container" style="display:none; margin-top: 16px;">
    <div class="section">
      <div class="section-title">Manual Verification Required</div>
      <p style="color: #aaa; margin: 8px 0;">Cookie check failed. Click below to verify via Storage Access.</p>
      <iframe id="saa-iframe" style="width:100%; height:120px; border:1px solid #333; background:#111;"></iframe>
    </div>
  </div>

  <script>
    const TRACKER = '${TRACKER_URL}';
    let currentFp = null;

    async function generateFingerprint() {
      const components = [];
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('fingerprint', 2, 2);
      components.push(canvas.toDataURL());

      const gl = document.createElement('canvas').getContext('webgl');
      if (gl) {
        components.push(gl.getParameter(gl.VENDOR));
        components.push(gl.getParameter(gl.RENDERER));
      }

      components.push(screen.width + 'x' + screen.height);
      components.push(screen.colorDepth);
      components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
      components.push(navigator.language);
      components.push(navigator.platform);

      const data = components.join('|');
      const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
      return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async function runCheck() {
      const resultEl = document.getElementById('result');
      const titleEl = document.getElementById('result-title');
      const infoEl = document.getElementById('result-info');

      resultEl.className = 'result checking';
      titleEl.textContent = 'Checking...';
      infoEl.textContent = 'Checking cookie...';

      currentFp = await generateFingerprint();

      let hasCookie = false;

      // Check cookie (silent)
      try {
        const res = await fetch(TRACKER + '/track-verify', { credentials: 'include' });
        const data = await res.json();
        hasCookie = data.cookieReceived;
      } catch {}

      // Always show SAA iframe to get full methods list
      infoEl.textContent = hasCookie ? 'Cookie found, loading methods...' : 'Loading methods...';
      showSAAIframe(hasCookie);
    }

    let cookieFound = false;

    function showSAAIframe(hasCookie) {
      cookieFound = hasCookie;
      const container = document.getElementById('saa-container');
      const iframe = document.getElementById('saa-iframe');
      container.style.display = 'block';
      iframe.src = TRACKER + '/embed?fp=' + encodeURIComponent(currentFp);

      window.addEventListener('message', handleSAAMessage);
    }

    function handleSAAMessage(e) {
      if (e.data && e.data.type === 'saa_result') {
        window.removeEventListener('message', handleSAAMessage);
        document.getElementById('saa-container').style.display = 'none';

        showResult({
          found: e.data.found || cookieFound,
          method: cookieFound ? 'cookie' : null,
          fpMatch: e.data.fpMatch,
          visits: e.data.visits
        });
      }
    }

    function showResult(data) {
      const resultEl = document.getElementById('result');
      const titleEl = document.getElementById('result-title');
      const infoEl = document.getElementById('result-info');
      const visitsSection = document.getElementById('visits-section');
      const visitsList = document.getElementById('visits-list');
      const visitCount = document.getElementById('visit-count');
      const fpSection = document.getElementById('fp-section');
      const fpResult = document.getElementById('fp-result');

      const tracked = data.found;

      resultEl.className = 'result ' + (tracked ? 'tracked' : 'not-tracked');
      titleEl.textContent = tracked ? 'User Tracked' : 'Not Tracked';

      // Show methods as badges
      let methods = [];
      if (data.method) methods.push(data.method);
      if (data.visits && data.visits.length > 0) {
        data.visits.forEach(v => {
          const m = v.method || v.source || 'unknown';
          if (!methods.includes(m)) methods.push(m);
        });
      }
      if (data.fpMatch) methods.push('fingerprint');

      if (methods.length > 0) {
        infoEl.innerHTML = methods.map(m =>
          '<span style="display:inline-block;padding:4px 10px;margin:2px;background:#0a2f0a;border:1px solid #4caf50;color:#4caf50;font-size:13px;">' + m + '</span>'
        ).join('');
      } else {
        infoEl.textContent = 'No tracking data found';
      }

      visitsSection.style.display = 'none';

      fpSection.style.display = 'block';
      fpResult.className = 'fp-status ' + (data.fpMatch ? 'fp-match' : 'fp-no-match');
      fpResult.innerHTML = data.fpMatch
        ? 'Fingerprint match: <span style="word-break:break-all;font-family:monospace;font-size:11px;">' + currentFp + '</span>'
        : 'Fingerprint: <span style="word-break:break-all;font-family:monospace;font-size:11px;">' + (currentFp || 'N/A') + '</span>';
    }

    runCheck();
  </script>
</body>
</html>
`;
	return c.html(page.toString());
});

export default app;

export const server = {
	port: Number(process.env.PORT) || 3001,
	hostname: "0.0.0.0",
	fetch: app.fetch.bind(app),
};

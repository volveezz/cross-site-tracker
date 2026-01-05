import { Hono } from "hono";
import { html } from "hono/html";

const TRACKER_URL = (process.env.TRACKER_URL || "http://localhost:3002").replace(/\/$/, "");

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
    h1 { color: #fff; margin-bottom: 20px; }
    .info { background: #0d1a26; padding: 12px; margin-bottom: 20px; border: 1px solid #1a3a5c; }
    .btn { padding: 12px 24px; font-size: 16px; cursor: pointer; background: #1a73e8; color: white; border: none; }
    .btn:hover { background: #1557b0; }
    a { color: #8ab4f8; }
    .frame-container { margin-top: 20px; display: none; }
    iframe { width: 100%; height: 70vh; border: 2px solid #333; background: #111; }
    @media (max-width: 600px) {
      body { margin: 20px auto; }
      .btn { width: 100%; }
      iframe { height: 60vh; }
    }
  </style>
</head>
<body>
  <h1>Casino</h1>
  <div class="info">
    <strong>Tracker:</strong> ${TRACKER_URL}<br>
    <strong>Purpose:</strong> Load tests iframe to detect if user visited Landing
  </div>

  <button class="btn" onclick="loadTests()">Load Tracking Tests</button>

  <div id="frame-container" class="frame-container">
    <iframe id="tests-frame"></iframe>
  </div>

  <script>
    function loadTests() {
      const container = document.getElementById('frame-container');
      const iframe = document.getElementById('tests-frame');
      container.style.display = 'block';
      iframe.src = '/tests';
    }
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
  <title>Casino - Tests</title>
  <style>
    body { font-family: system-ui; padding: 16px; margin: 0; background: #000; color: #e0e0e0; }
    h2 { color: #fff; margin: 0 0 16px 0; }
    .detection { padding: 16px; margin-bottom: 16px; }
    .detected { background: #0a2f0a; border: 2px solid #4caf50; }
    .not-detected { background: #2f0a0a; border: 2px solid #f44336; }
    .pending { background: #1a0a2e; border: 2px solid #4a1a7e; }
    .tests { display: grid; gap: 12px; }
    .test { padding: 12px; background: #111; border: 1px solid #333; }
    .test-header { display: flex; justify-content: space-between; align-items: center; }
    .test-name { font-weight: bold; color: #fff; }
    .badge { padding: 4px 8px; font-size: 12px; }
    .badge-success { background: #4caf50; color: #000; }
    .badge-failed { background: #f44336; color: #fff; }
    .badge-pending { background: #444; color: #888; }
    .data { font-family: monospace; font-size: 11px; background: #0a0a0a; padding: 8px; margin-top: 8px; border: 1px solid #222; color: #aaa; word-break: break-all; }
    button { padding: 8px 16px; cursor: pointer; border: 1px solid #444; background: #222; color: #e0e0e0; margin-right: 8px; margin-top: 8px; }
    button:hover { background: #333; }
    .btn-primary { background: #7c4dff; border-color: #7c4dff; }
    .btn-primary:hover { background: #651fff; }
  </style>
</head>
<body>
  <h2>Tracking Tests</h2>

  <div id="detection" class="detection pending">
    <strong id="detection-title">Not checked</strong>
    <p id="detection-desc" style="margin: 4px 0 0 0; font-size: 14px;">Click "Check Tracker" to detect visits</p>
  </div>

  <div class="tests">
    <div class="test">
      <div class="test-header">
        <span class="test-name">Redirect Check</span>
        <span id="redirect-badge" class="badge badge-pending">-</span>
      </div>
      <p style="font-size: 12px; color: #888; margin: 4px 0;">Redirect to Tracker, check localStorage</p>
      <button class="btn-primary" onclick="checkViaRedirect()">Check Tracker</button>
      <div id="redirect-data" class="data" style="display:none"></div>
    </div>

    <div class="test">
      <div class="test-header">
        <span class="test-name">Iframe Check</span>
        <span id="iframe-badge" class="badge badge-pending">-</span>
      </div>
      <p style="font-size: 12px; color: #888; margin: 4px 0;">Load Tracker iframe, postMessage result (partitioned)</p>
      <button onclick="checkViaIframe()">Check</button>
      <div id="iframe-data" class="data" style="display:none"></div>
    </div>

    <div class="test">
      <div class="test-header">
        <span class="test-name">Fingerprint Match</span>
        <span id="fp-badge" class="badge badge-pending">-</span>
      </div>
      <p style="font-size: 12px; color: #888; margin: 4px 0;">Compare fingerprint with Tracker's stored hashes</p>
      <button onclick="checkFingerprint()">Check</button>
      <div id="fp-data" class="data" style="display:none"></div>
    </div>
  </div>

  <div style="margin-top: 16px;">
    <button onclick="location.reload()">Refresh</button>
  </div>

  <script>
    const TRACKER = '${TRACKER_URL}';

    function setBadge(id, status, text) {
      const badge = document.getElementById(id + '-badge');
      badge.className = 'badge badge-' + status;
      badge.textContent = text;
    }

    function setData(id, data) {
      const el = document.getElementById(id + '-data');
      el.style.display = 'block';
      el.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    }

    function updateDetection(found, method) {
      const det = document.getElementById('detection');
      const title = document.getElementById('detection-title');
      const desc = document.getElementById('detection-desc');

      if (found) {
        det.className = 'detection detected';
        title.textContent = 'User Tracked!';
        desc.textContent = 'Detected via: ' + method;
      } else {
        det.className = 'detection not-detected';
        title.textContent = 'Not Tracked';
        desc.textContent = 'No tracking data found';
      }
    }

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

    function parseUrlResult() {
      const params = new URLSearchParams(window.location.search);
      const result = params.get('tracker_result');
      if (result) {
        try {
          const data = JSON.parse(result);
          setBadge('redirect', data.found ? 'success' : 'failed', data.found ? 'TRACKED' : 'not found');
          setData('redirect', data);
          updateDetection(data.found || data.fpMatch, 'redirect');
          history.replaceState({}, '', window.location.pathname);
        } catch (e) {}
      }
    }

    async function checkViaRedirect() {
      setBadge('redirect', 'pending', 'redirecting...');
      const fp = await generateFingerprint();
      const returnUrl = window.location.href.split('?')[0];
      window.location.href = TRACKER + '/check?fp=' + fp + '&return=' + encodeURIComponent(returnUrl);
    }

    function checkViaIframe() {
      setBadge('iframe', 'pending', 'loading...');
      const iframe = document.createElement('iframe');
      iframe.src = TRACKER + '/iframe-check';
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      const timeout = setTimeout(() => {
        setBadge('iframe', 'failed', 'timeout');
        iframe.remove();
      }, 5000);

      window.addEventListener('message', function handler(e) {
        if (e.data && e.data.type === 'tracker_check_result') {
          clearTimeout(timeout);
          window.removeEventListener('message', handler);
          setBadge('iframe', e.data.found ? 'success' : 'failed', e.data.found ? 'TRACKED' : 'not found');
          setData('iframe', e.data);
          if (e.data.found) updateDetection(true, 'iframe');
          iframe.remove();
        }
      });
    }

    async function checkFingerprint() {
      setBadge('fp', 'pending', 'checking...');
      const fp = await generateFingerprint();

      const iframe = document.createElement('iframe');
      iframe.src = TRACKER + '/iframe-check';
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      const timeout = setTimeout(() => {
        setBadge('fp', 'failed', 'timeout');
        iframe.remove();
      }, 5000);

      window.addEventListener('message', function handler(e) {
        if (e.data && e.data.type === 'tracker_check_result') {
          clearTimeout(timeout);
          window.removeEventListener('message', handler);

          const fpMatch = e.data.fps && e.data.fps.includes(fp);
          setBadge('fp', fpMatch ? 'success' : 'failed', fpMatch ? 'MATCH' : 'no match');
          setData('fp', { currentFp: fp, storedFps: e.data.fps || [], match: fpMatch });
          if (fpMatch) updateDetection(true, 'fingerprint');
          iframe.remove();
        }
      });
    }

    parseUrlResult();
  </script>
</body>
</html>
`;
	return c.html(page.toString());
});

export default app;

export const server = {
	port: 3001,
	fetch: app.fetch.bind(app),
};

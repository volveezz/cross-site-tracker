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
    h1 { color: #fff; }
    .info { background: #0d1a26; padding: 12px; margin-bottom: 20px; border: 1px solid #1a3a5c; }
    .detection { padding: 20px; margin-bottom: 20px; }
    .detected { background: #0a2f0a; border: 2px solid #4caf50; }
    .not-detected { background: #2f0a0a; border: 2px solid #f44336; }
    .checking { background: #1a0a2e; border: 2px solid #4a1a7e; }
    .btn { padding: 12px 24px; font-size: 16px; cursor: pointer; background: #7c4dff; color: white; border: none; margin-right: 8px; }
    .btn:hover { background: #651fff; }
    .result { font-family: monospace; font-size: 12px; background: #0a0a0a; padding: 12px; margin-top: 12px; white-space: pre-wrap; border: 1px solid #222; color: #aaa; }
    a { color: #8ab4f8; }
    @media (max-width: 600px) {
      body { margin: 20px auto; }
      .btn { width: 100%; margin-bottom: 8px; }
    }
  </style>
</head>
<body>
  <h1>Casino</h1>
  <div class="info">
    <strong>Tracker:</strong> ${TRACKER_URL}<br>
    <strong>Purpose:</strong> Detect if user visited any Landing site
  </div>

  <div id="detection" class="detection checking">
    <h2 id="detection-title">Check Tracker</h2>
    <p id="detection-desc">Click button to check if you've been tracked</p>
  </div>

  <button class="btn" onclick="checkTracker()">Check Tracker</button>
  <button class="btn" onclick="location.reload()" style="background: #333;">Refresh</button>

  <div id="result" class="result" style="display:none;"></div>

  <p style="margin-top: 20px;"><a href="${TRACKER_URL}" target="_blank">Open Tracker to see stored data</a></p>

  <script>
    const TRACKER = '${TRACKER_URL}';

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

    function parseTrackerResult() {
      const params = new URLSearchParams(window.location.search);
      const result = params.get('tracker_result');
      if (result) {
        try {
          const data = JSON.parse(result);
          showResult(data);
          history.replaceState({}, '', window.location.pathname);
        } catch (e) {}
      }
    }

    function showResult(data) {
      const detection = document.getElementById('detection');
      const title = document.getElementById('detection-title');
      const desc = document.getElementById('detection-desc');
      const resultEl = document.getElementById('result');

      if (data.found || data.fpMatch) {
        detection.className = 'detection detected';
        title.textContent = 'User Tracked!';
        desc.textContent = 'This user visited a Landing site (' + data.visits.length + ' visits)';
      } else {
        detection.className = 'detection not-detected';
        title.textContent = 'Not Tracked';
        desc.textContent = 'No tracking data found for this user';
      }

      resultEl.style.display = 'block';
      resultEl.textContent = JSON.stringify(data, null, 2);
    }

    async function checkTracker() {
      const detection = document.getElementById('detection');
      const title = document.getElementById('detection-title');
      const desc = document.getElementById('detection-desc');

      detection.className = 'detection checking';
      title.textContent = 'Checking...';
      desc.textContent = 'Redirecting to Tracker';

      const fp = await generateFingerprint();
      const returnUrl = window.location.href.split('?')[0];
      window.location.href = TRACKER + '/check?fp=' + fp + '&return=' + encodeURIComponent(returnUrl);
    }

    parseTrackerResult();
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

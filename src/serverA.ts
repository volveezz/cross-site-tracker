import { Hono } from "hono";
import { html } from "hono/html";

const TRACKER_URL = (process.env.TRACKER_URL || "http://localhost:3002").replace(/\/$/, "");

const app = new Hono();

app.get("/", (c) => {
	const registered = c.req.query("registered");

	const page = html`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Landing</title>
  <style>
    body { font-family: system-ui; max-width: 900px; margin: 40px auto; padding: 0 20px; background: #000; color: #e0e0e0; }
    h1 { color: #fff; }
    .info { background: #0d1a26; padding: 12px; margin-bottom: 20px; border: 1px solid #1a3a5c; }
    .tracker-box { background: #1a0a2e; padding: 20px; border: 2px solid #4a1a7e; margin-bottom: 20px; }
    .tracker-box h2 { margin: 0 0 12px 0; color: #b388ff; }
    .btn { padding: 12px 24px; font-size: 16px; cursor: pointer; background: #7c4dff; color: white; border: none; }
    .btn:hover { background: #651fff; }
    .status { padding: 12px; margin-top: 12px; }
    .success { background: #0a2f0a; color: #4caf50; }
    .pending { background: #222; color: #888; }
    a { color: #8ab4f8; }
    @media (max-width: 600px) {
      body { margin: 20px auto; }
      .btn { width: 100%; }
    }
  </style>
</head>
<body>
  <h1>Landing</h1>
  <div class="info">
    <strong>Tracker:</strong> ${TRACKER_URL}<br>
    <strong>Purpose:</strong> Register visit with central Tracker
  </div>

  <div class="tracker-box">
    <h2>Central Tracker</h2>
    <p>Click to register your visit with the Tracker. Any Casino site can then detect you.</p>
    <button class="btn" onclick="registerWithTracker()">Register Visit</button>
    <div id="status" class="status ${registered ? 'success' : 'pending'}">
      ${registered ? 'Visit registered with Tracker!' : 'Not registered yet'}
    </div>
  </div>

  <p><a href="${TRACKER_URL}" target="_blank">Open Tracker to see stored data</a></p>

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

    async function registerWithTracker() {
      document.getElementById('status').className = 'status pending';
      document.getElementById('status').textContent = 'Redirecting to Tracker...';
      const fp = await generateFingerprint();
      const returnUrl = window.location.href.split('?')[0] + '?registered=1';
      window.location.href = TRACKER + '/register?source=' + encodeURIComponent(window.location.hostname) + '&fp=' + fp + '&return=' + encodeURIComponent(returnUrl);
    }
  </script>
</body>
</html>
`;
	return c.html(page.toString());
});

export default app;

export const server = {
	port: 3000,
	fetch: app.fetch.bind(app),
};

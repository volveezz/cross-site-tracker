import { Hono } from "hono";
import { html } from "hono/html";

const SITE_X_URL = process.env.SITE_X_URL || "http://localhost:3001";

const app = new Hono();

app.get("/", (c) => {
	const page = html`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Landing</title>
  <style>
    body { font-family: system-ui; max-width: 900px; margin: 40px auto; padding: 0 20px; background: #000; color: #e0e0e0; }
    h1 { color: #fff; }
    .tests { display: grid; gap: 16px; }
    .test { padding: 16px; background: #111; border: 1px solid #333; }
    .test h3 { margin: 0 0 8px 0; color: #fff; }
    .status { padding: 8px 12px; font-size: 14px; margin-top: 8px; }
    .pending { background: #222; color: #888; }
    .running { background: #332b00; color: #ffcc00; }
    .success { background: #0a2f0a; color: #4caf50; }
    .failed { background: #2f0a0a; color: #f44336; }
    button { padding: 8px 16px; cursor: pointer; border: 1px solid #444; background: #222; color: #e0e0e0; }
    button:hover { background: #333; }
    .run-all { background: #1a73e8; color: white; border: none; padding: 12px 24px; font-size: 16px; }
    .run-all:hover { background: #1557b0; }
    a { color: #8ab4f8; }
    .info { background: #0d1a26; padding: 12px; margin-bottom: 20px; border: 1px solid #1a3a5c; }
    .result-data { font-family: monospace; font-size: 12px; background: #0a0a0a; padding: 8px; margin-top: 8px; white-space: pre-wrap; border: 1px solid #222; color: #aaa; }
  </style>
</head>
<body>
  <h1>Landing</h1>
  <div class="info">
    <strong>Target:</strong> ${SITE_X_URL}<br>
    <strong>Purpose:</strong> Set tracking flags that Game can detect
  </div>

  <button class="run-all" onclick="runAllTests()">Run All Tests</button>
  <p><a href="${SITE_X_URL}" target="_blank">Open Game to check results</a></p>

  <div class="tests">
    <div class="test" id="test-iframe">
      <h3>Iframe</h3>
      <p>Load hidden iframe of Game, send postMessage</p>
      <button onclick="runIframe()">Run</button>
      <div id="iframe-status" class="status pending">Not run</div>
      <div id="iframe-data" class="result-data" style="display:none"></div>
    </div>

    <div class="test" id="test-windowname">
      <h3>window.name</h3>
      <p>Set window.name and redirect (will leave this page)</p>
      <button onclick="runWindowName()">Run</button>
      <div id="windowname-status" class="status pending">Not run</div>
    </div>

    <div class="test" id="test-popup">
      <h3>Popup</h3>
      <p>Open popup to Game and send postMessage</p>
      <button onclick="runPopup()">Run</button>
      <div id="popup-status" class="status pending">Not run</div>
      <div id="popup-data" class="result-data" style="display:none"></div>
    </div>

    <div class="test" id="test-saa">
      <h3>Storage Access API</h3>
      <p>Embed Game as iframe, test if it can access its storage</p>
      <button onclick="runSAA()">Load iframe</button>
      <div id="saa-status" class="status pending">Not run</div>
      <div id="saa-frame" style="display:none; margin-top:12px; border:1px solid #333; overflow:hidden;">
        <iframe id="sitex-iframe" style="width:100%; height:300px; border:none;"></iframe>
      </div>
    </div>
  </div>

  <script>
    const SITE_X = '${SITE_X_URL}';

    function setStatus(testName, status, message, data) {
      const statusEl = document.getElementById(testName + '-status');
      const dataEl = document.getElementById(testName + '-data');
      statusEl.className = 'status ' + status;
      statusEl.textContent = message;
      if (dataEl && data) {
        dataEl.style.display = 'block';
        dataEl.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      }
    }

    function runIframe() {
      return new Promise((resolve) => {
        setStatus('iframe', 'running', 'Loading iframe...');
        const iframe = document.createElement('iframe');
        iframe.src = SITE_X + '/ping';
        iframe.style.display = 'none';
        document.body.appendChild(iframe);

        const timeout = setTimeout(() => {
          setStatus('iframe', 'failed', 'Timeout - no response');
          resolve({ success: false, error: 'timeout' });
        }, 5000);

        window.addEventListener('message', function handler(e) {
          if (e.data && e.data.type === 'ping_ready') {
            setStatus('iframe', 'running', 'Sending flag...');
            iframe.contentWindow.postMessage({ type: 'set_flag', source: 'siteA' }, '*');
          }
          if (e.data && e.data.type === 'flag_set') {
            clearTimeout(timeout);
            window.removeEventListener('message', handler);
            setStatus('iframe', 'success', 'Flag written!', e.data);
            iframe.remove();
            resolve({ success: true, data: e.data });
          }
          if (e.data && e.data.type === 'flag_error') {
            clearTimeout(timeout);
            window.removeEventListener('message', handler);
            setStatus('iframe', 'failed', 'Storage blocked', e.data);
            iframe.remove();
            resolve({ success: false, error: e.data.error });
          }
        });
      });
    }

    function runWindowName() {
      setStatus('windowname', 'running', 'Redirecting...');
      window.name = 'visited_siteA_' + Date.now();
      window.location.href = SITE_X + '?via=windowname';
    }

    function runPopup() {
      return new Promise((resolve) => {
        setStatus('popup', 'running', 'Opening popup...');
        const popup = window.open(SITE_X + '/receiver', 'siteX', 'width=600,height=400');
        if (!popup) {
          setStatus('popup', 'failed', 'Popup blocked');
          resolve({ success: false, error: 'popup_blocked' });
          return;
        }

        const timeout = setTimeout(() => {
          setStatus('popup', 'failed', 'Timeout');
          resolve({ success: false, error: 'timeout' });
        }, 10000);

        window.addEventListener('message', function handler(e) {
          if (e.data && e.data.type === 'receiver_ready') {
            setStatus('popup', 'running', 'Sending flag...');
            popup.postMessage({ type: 'set_flag', source: 'siteA' }, '*');
          }
          if (e.data && e.data.type === 'flag_set') {
            clearTimeout(timeout);
            window.removeEventListener('message', handler);
            setStatus('popup', 'success', 'Flag written!', e.data);
            popup.close();
            resolve({ success: true, data: e.data });
          }
          if (e.data && e.data.type === 'flag_error') {
            clearTimeout(timeout);
            window.removeEventListener('message', handler);
            setStatus('popup', 'failed', 'Storage blocked', e.data);
            popup.close();
            resolve({ success: false, error: e.data.error });
          }
        });
      });
    }

    function runSAA() {
      setStatus('saa', 'running', 'Loading iframe...');
      const frame = document.getElementById('saa-frame');
      const iframe = document.getElementById('sitex-iframe');
      frame.style.display = 'block';
      iframe.src = SITE_X + '/embed';

      window.addEventListener('message', function handler(e) {
        if (e.data && e.data.type === 'storage_access_result') {
          setStatus('saa', e.data.success ? 'success' : 'failed', e.data.message);
        }
      });
    }

    async function runAllTests() {
      await runIframe();
      await runPopup();
      runSAA();
    }
  </script>
</body>
</html>
`;
	return c.html(page as unknown as string);
});

export default app;

export const server = {
	port: 3000,
	fetch: app.fetch.bind(app),
};

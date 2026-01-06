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
    @media (max-width: 600px) {
      body { margin: 20px auto; }
      .run-all { width: 100%; }
      button { padding: 12px 16px; }
      .result-data { font-size: 11px; word-break: break-all; }
    }
  </style>
</head>
<body>
  <h1>Landing</h1>
  <div class="info">
    <strong>Tracker:</strong> ${TRACKER_URL}<br>
    <strong>Purpose:</strong> Register user visit with Tracker
  </div>

  <button class="run-all" onclick="runAllTests()">Run All Tests</button>
  <p><a href="${TRACKER_URL}" target="_blank">Open Tracker to see stored data</a></p>

  <div class="tests">
    <div class="test" id="test-iframe">
      <h3>Iframe</h3>
      <p>Load hidden iframe of Tracker, send postMessage</p>
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
      <p>Open popup to Tracker and send postMessage</p>
      <button onclick="runPopup()">Run</button>
      <div id="popup-status" class="status pending">Not run</div>
      <div id="popup-data" class="result-data" style="display:none"></div>
    </div>

    <div class="test" id="test-saa">
      <h3>Storage Access API</h3>
      <p>Load iframe, click button inside to grant access</p>
      <button onclick="runSAA()">Load iframe</button>
      <div id="saa-status" class="status pending">Not run</div>
      <div id="saa-frame" style="display:none; margin-top:12px; border:1px solid #333;">
        <iframe id="saa-iframe" style="width:100%; height:200px; border:none;"></iframe>
      </div>
    </div>

    <div class="test" id="test-crosscookie">
      <h3>Cross-Origin Cookie</h3>
      <p>Fetch request to Tracker with credentials, server sets cookie via Set-Cookie header</p>
      <button onclick="runCrossCookie()">Run</button>
      <button onclick="checkCrossCookie()">Check</button>
      <div id="crosscookie-status" class="status pending">Not run</div>
      <div id="crosscookie-data" class="result-data" style="display:none"></div>
    </div>

    <div class="test" id="test-redirect">
      <h3>Redirect Bounce</h3>
      <p>Redirect to Tracker, write to first-party storage, redirect back</p>
      <button onclick="runRedirectTrack()">Run</button>
      <div id="redirect-status" class="status pending">Not run</div>
    </div>

    <div class="test" id="test-sw">
      <h3>Service Worker</h3>
      <p>Register SW on Tracker via iframe, write flag to Cache API</p>
      <button onclick="runServiceWorker()">Run</button>
      <div id="sw-status" class="status pending">Not run</div>
      <div id="sw-data" class="result-data" style="display:none"></div>
    </div>

    <div class="test" id="test-fingerprint">
      <h3>Fingerprint</h3>
      <p>Calculate browser fingerprint, store on Tracker via iframe</p>
      <button onclick="runFingerprint()">Run</button>
      <div id="fingerprint-status" class="status pending">Not run</div>
      <div id="fingerprint-data" class="result-data" style="display:none"></div>
    </div>

    <div class="test" id="test-sharedstorage">
      <h3>Shared Storage API</h3>
      <p>Chrome Privacy Sandbox - cross-site storage that survives cookie blocking</p>
      <button onclick="runSharedStorage()">Run</button>
      <div id="sharedstorage-status" class="status pending">Not run</div>
    </div>

    <div class="test" id="test-tracker" style="background: #1a0a2e; border-color: #4a1a7e;">
      <h3>Central Tracker</h3>
      <p>Redirect to Tracker server, register visit in Tracker's first-party storage</p>
      <button onclick="runTracker()">Run</button>
      <div id="tracker-status" class="status pending">Not run</div>
    </div>
  </div>

  <script>
    const TRACKER = '${TRACKER_URL}';

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
        iframe.src = TRACKER + '/ping';
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
      window.location.href = TRACKER + '/windowname-bounce?return=' + encodeURIComponent(window.location.href);
    }

    let popupResolve = null;
    let popupTimeout = null;
    let popupWindow = null;

    function handlePopupMessage(e) {
      if (e.data && e.data.type === 'receiver_ready') {
        setStatus('popup', 'running', 'Sending flag...');
        popupWindow.postMessage({ type: 'set_flag', source: 'siteA' }, '*');
      }
      if (e.data && e.data.type === 'flag_set') {
        clearTimeout(popupTimeout);
        window.removeEventListener('message', handlePopupMessage);
        setStatus('popup', 'success', 'Flag written!', e.data);
        popupWindow.close();
        if (popupResolve) popupResolve({ success: true, data: e.data });
      }
      if (e.data && e.data.type === 'flag_error') {
        clearTimeout(popupTimeout);
        window.removeEventListener('message', handlePopupMessage);
        setStatus('popup', 'failed', 'Storage blocked', e.data);
        popupWindow.close();
        if (popupResolve) popupResolve({ success: false, error: e.data.error });
      }
    }

    function openPopupWithGesture() {
      const left = screen.width - 420;
      const top = screen.height - 320;
      popupWindow = window.open(TRACKER + '/receiver', 'siteX', 'width=400,height=300,left=' + left + ',top=' + top);
      if (popupWindow) {
        setStatus('popup', 'running', 'Popup opened, waiting...');
        window.addEventListener('message', handlePopupMessage);
        popupTimeout = setTimeout(() => {
          setStatus('popup', 'failed', 'Timeout');
          if (popupResolve) popupResolve({ success: false, error: 'timeout' });
        }, 10000);
      }
    }

    function runPopup() {
      return new Promise((resolve) => {
        popupResolve = resolve;
        setStatus('popup', 'running', 'Opening popup...');
        const left = screen.width - 420;
        const top = screen.height - 320;
        popupWindow = window.open(TRACKER + '/receiver', 'siteX', 'width=400,height=300,left=' + left + ',top=' + top);

        if (!popupWindow || popupWindow.closed) {
          const btn = document.createElement('button');
          btn.textContent = 'Click to open popup (blocked by browser)';
          btn.style.marginTop = '8px';
          btn.onclick = () => {
            openPopupWithGesture();
            btn.remove();
          };
          document.getElementById('popup-status').after(btn);
          setStatus('popup', 'failed', 'Popup blocked - click button below');
          return;
        }

        window.addEventListener('message', handlePopupMessage);
        popupTimeout = setTimeout(() => {
          setStatus('popup', 'failed', 'Timeout');
          resolve({ success: false, error: 'timeout' });
        }, 10000);
      });
    }

    function runSAA() {
      setStatus('saa', 'running', 'Click "Grant Access" in iframe below');
      const frame = document.getElementById('saa-frame');
      const iframe = document.getElementById('saa-iframe');
      frame.style.display = 'block';
      iframe.src = TRACKER + '/embed';

      window.addEventListener('message', function handler(e) {
        if (e.data && e.data.type === 'storage_access_result') {
          if (e.data.success) {
            setStatus('saa', 'success', 'Flag written!');
          } else {
            setStatus('saa', 'failed', e.data.message || 'Failed');
          }
        }
      });
    }

    async function runCrossCookie() {
      setStatus('crosscookie', 'running', 'Setting cookie...');
      try {
        await fetch(TRACKER + '/track', { credentials: 'include' });
        setStatus('crosscookie', 'success', 'Cookie set!');
      } catch (e) {
        setStatus('crosscookie', 'failed', 'Request failed: ' + e.message);
      }
    }

    async function checkCrossCookie() {
      setStatus('crosscookie', 'running', 'Checking...');
      try {
        const res = await fetch(TRACKER + '/track-verify', { credentials: 'include' });
        const data = await res.json();
        if (data.cookieReceived) {
          setStatus('crosscookie', 'success', 'Cookie found!', data);
        } else {
          setStatus('crosscookie', 'failed', 'No cookie', data);
        }
      } catch (e) {
        setStatus('crosscookie', 'failed', 'Error: ' + e.message);
      }
    }

    function runRedirectTrack() {
      setStatus('redirect', 'running', 'Redirecting to Tracker...');
      window.location.href = TRACKER + '/bounce?return=' + encodeURIComponent(window.location.href);
    }

    function runServiceWorker() {
      return new Promise((resolve) => {
        setStatus('sw', 'running', 'Loading iframe...');
        const iframe = document.createElement('iframe');
        iframe.src = TRACKER + '/sw-register';
        iframe.style.display = 'none';

        iframe.onerror = () => {
          setStatus('sw', 'failed', 'Iframe failed to load - accept cert at ' + TRACKER);
          resolve({ success: false, error: 'iframe_error' });
        };

        document.body.appendChild(iframe);

        const timeout = setTimeout(() => {
          setStatus('sw', 'failed', 'Timeout - visit ' + TRACKER + ' to accept cert');
          iframe.remove();
          resolve({ success: false, error: 'timeout' });
        }, 5000);

        window.addEventListener('message', function handler(e) {
          if (e.data && e.data.type === 'sw_flag_set') {
            clearTimeout(timeout);
            window.removeEventListener('message', handler);
            setStatus('sw', 'success', 'Flag written to Tracker storage', e.data);
            iframe.remove();
            resolve({ success: true, data: e.data });
          }
          if (e.data && e.data.type === 'sw_error') {
            clearTimeout(timeout);
            window.removeEventListener('message', handler);
            setStatus('sw', 'failed', e.data.error, e.data);
            iframe.remove();
            resolve({ success: false, error: e.data.error });
          }
        });
      });
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

    async function runFingerprint() {
      setStatus('fingerprint', 'running', 'Calculating fingerprint...');
      try {
        const fp = await generateFingerprint();
        setStatus('fingerprint', 'running', 'Storing on Tracker via iframe...', { hash: fp });

        const iframe = document.createElement('iframe');
        iframe.src = TRACKER + '/fingerprint-receiver';
        iframe.style.display = 'none';
        document.body.appendChild(iframe);

        const timeout = setTimeout(() => {
          setStatus('fingerprint', 'failed', 'Timeout');
          iframe.remove();
        }, 5000);

        window.addEventListener('message', function handler(e) {
          if (e.data && e.data.type === 'fp_ready') {
            iframe.contentWindow.postMessage({ type: 'store_fp', hash: fp }, '*');
          }
          if (e.data && e.data.type === 'fp_stored') {
            clearTimeout(timeout);
            window.removeEventListener('message', handler);
            setStatus('fingerprint', 'success', 'Fingerprint stored on Tracker', { hash: fp });
            iframe.remove();
          }
          if (e.data && e.data.type === 'fp_error') {
            clearTimeout(timeout);
            window.removeEventListener('message', handler);
            setStatus('fingerprint', 'failed', 'Storage error: ' + e.data.error);
            iframe.remove();
          }
        });
      } catch (e) {
        setStatus('fingerprint', 'failed', 'Error: ' + e.message);
      }
    }

    function runSharedStorage() {
      return new Promise((resolve) => {
        setStatus('sharedstorage', 'running', 'Loading iframe...');

        const iframe = document.createElement('iframe');
        iframe.src = TRACKER + '/ss-set';
        iframe.style.display = 'none';
        document.body.appendChild(iframe);

        const timeout = setTimeout(() => {
          setStatus('sharedstorage', 'failed', 'Timeout - no response');
          iframe.remove();
          resolve({ success: false, error: 'timeout' });
        }, 5000);

        window.addEventListener('message', function handler(e) {
          if (e.data && e.data.type === 'ss_set_result') {
            clearTimeout(timeout);
            window.removeEventListener('message', handler);
            iframe.remove();
            if (e.data.success) {
              setStatus('sharedstorage', 'success', 'Shared Storage set!');
              resolve({ success: true });
            } else {
              setStatus('sharedstorage', 'failed', e.data.error || 'Failed');
              resolve({ success: false, error: e.data.error });
            }
          }
        });
      });
    }

    async function runTracker() {
      setStatus('tracker', 'running', 'Redirecting to Tracker...');
      const fp = await generateFingerprint();
      window.location.href = TRACKER + '/register?source=landing&fp=' + fp + '&return=' + encodeURIComponent(window.location.href);
    }

    async function runAllTests() {
      const results = [];

      const iframe = await runIframe();
      if (iframe.success) results.push('iframe');

      const popup = await runPopup();
      if (popup.success) results.push('popup');

      await runCrossCookie();

      const sw = await runServiceWorker();
      if (sw.success) results.push('serviceworker');

      const ss = await runSharedStorage();
      if (ss.success) results.push('sharedstorage');

      await runFingerprint();

      if (results.length > 0) {
        const fp = await generateFingerprint();
        const methods = results.join(',');
        window.location.href = TRACKER + '/register?source=landing&methods=' + methods + '&fp=' + fp + '&return=' + encodeURIComponent(window.location.href);
      }
    }
  </script>
</body>
</html>
`;
	return c.html(page.toString());
});

app.get("/landing-sw.js", (c) => {
	const sw = `
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname === '/sw-ping') {
    event.respondWith(new Response(JSON.stringify({ swActive: true, timestamp: Date.now() }), {
      headers: {
        'Content-Type': 'application/json',
        'X-Landing-SW': '1',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': 'X-Landing-SW'
      }
    }));
    return;
  }
});
`;
	return new Response(sw, {
		headers: {
			"Content-Type": "application/javascript",
			"Cache-Control": "no-cache",
		},
	});
});

app.get("/sw-ping", (c) => {
	return new Response(JSON.stringify({ swActive: false }), {
		headers: {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Expose-Headers": "X-Landing-SW",
		},
	});
});

app.options("/sw-ping", (c) => {
	return new Response(null, {
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, OPTIONS",
			"Access-Control-Expose-Headers": "X-Landing-SW",
		},
	});
});

app.get("/sw-check", (c) => {
	const page = html`
<!DOCTYPE html>
<html>
<head><title>SW Check</title></head>
<body>
<script>
async function checkSW() {
  try {
    const res = await fetch('/sw-ping');
    const hasHeader = res.headers.get('X-Landing-SW') === '1';
    const data = await res.json();

    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'landing_sw_check',
        swActive: hasHeader || data.swActive,
        method: hasHeader ? 'header' : (data.swActive ? 'response' : 'none')
      }, '*');
    }
  } catch (e) {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'landing_sw_check', swActive: false, error: e.message }, '*');
    }
  }
}
checkSW();
</script>
</body>
</html>
`;
	return c.html(page.toString());
});

export default app;

const tls = await (async () => {
	try {
		const key = Bun.file("certs/key.pem");
		const cert = Bun.file("certs/cert.pem");
		if (await key.exists() && await cert.exists()) {
			return { key, cert };
		}
	} catch {}
	return undefined;
})();

export const server = {
	port: 3000,
	fetch: app.fetch.bind(app),
	...(tls && { tls }),
};

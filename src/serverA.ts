import { Hono } from "hono";
import { html } from "hono/html";

const SITE_X_URL = (process.env.SITE_X_URL || "http://localhost:3001").replace(/\/$/, "");

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

    <div class="test" id="test-crosscookie">
      <h3>Cross-Origin Cookie</h3>
      <p>Fetch request to Game with credentials, server sets cookie via Set-Cookie header</p>
      <button onclick="runCrossCookie()">Run</button>
      <div id="crosscookie-status" class="status pending">Not run</div>
      <div id="crosscookie-data" class="result-data" style="display:none"></div>
    </div>

    <div class="test" id="test-redirect">
      <h3>Redirect Bounce</h3>
      <p>Redirect to Game, write to first-party storage, redirect back (visible, but works in Safari)</p>
      <button onclick="runRedirectTrack()">Run</button>
      <div id="redirect-status" class="status pending">Not run</div>
    </div>

    <div class="test" id="test-indexeddb">
      <h3>IndexedDB (iframe)</h3>
      <p>Load hidden iframe, write to IndexedDB via postMessage</p>
      <button onclick="runIndexedDB()">Run</button>
      <div id="indexeddb-status" class="status pending">Not run</div>
      <div id="indexeddb-data" class="result-data" style="display:none"></div>
    </div>

    <div class="test" id="test-etag">
      <h3>ETag Tracking</h3>
      <p>Fetch image from Game, server sends unique ETag. Browser caches & sends back on next request</p>
      <button onclick="runEtag()">Run</button>
      <div id="etag-status" class="status pending">Not run</div>
      <div id="etag-data" class="result-data" style="display:none"></div>
    </div>

    <div class="test" id="test-cacheimg">
      <h3>Cache Image</h3>
      <p>Load unique image URL, server logs it. On Game, check if same ID was seen</p>
      <button onclick="runCacheImg()">Run</button>
      <div id="cacheimg-status" class="status pending">Not run</div>
      <div id="cacheimg-data" class="result-data" style="display:none"></div>
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
      window.location.href = SITE_X + '/windowname-bounce?return=' + encodeURIComponent(window.location.href);
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
      popupWindow = window.open(SITE_X + '/receiver', 'siteX', 'width=400,height=300');
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
        popupWindow = window.open(SITE_X + '/receiver', 'siteX', 'width=400,height=300');

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

    async function runCrossCookie() {
      setStatus('crosscookie', 'running', 'Sending fetch request...');
      try {
        const res = await fetch(SITE_X + '/track', {
          credentials: 'include'
        });
        const data = await res.json();
        setStatus('crosscookie', 'success', 'Request sent, cookie may be set', data);
      } catch (e) {
        setStatus('crosscookie', 'failed', 'Request failed: ' + e.message);
      }
    }

    function runRedirectTrack() {
      setStatus('redirect', 'running', 'Redirecting to Game...');
      window.location.href = SITE_X + '/bounce?return=' + encodeURIComponent(window.location.href);
    }

    function runIndexedDB() {
      return new Promise((resolve) => {
        setStatus('indexeddb', 'running', 'Loading iframe...');
        const iframe = document.createElement('iframe');
        iframe.src = SITE_X + '/ping-idb';
        iframe.style.display = 'none';
        document.body.appendChild(iframe);

        const timeout = setTimeout(() => {
          setStatus('indexeddb', 'failed', 'Timeout - no response');
          resolve({ success: false, error: 'timeout' });
        }, 5000);

        window.addEventListener('message', function handler(e) {
          if (e.data && e.data.type === 'ping_idb_ready') {
            setStatus('indexeddb', 'running', 'Sending flag...');
            iframe.contentWindow.postMessage({ type: 'set_flag_idb', source: 'siteA' }, '*');
          }
          if (e.data && e.data.type === 'flag_idb_set') {
            clearTimeout(timeout);
            window.removeEventListener('message', handler);
            setStatus('indexeddb', 'success', 'Flag written!', e.data);
            iframe.remove();
            resolve({ success: true, data: e.data });
          }
          if (e.data && e.data.type === 'flag_idb_error') {
            clearTimeout(timeout);
            window.removeEventListener('message', handler);
            setStatus('indexeddb', 'failed', 'Storage blocked', e.data);
            iframe.remove();
            resolve({ success: false, error: e.data.error });
          }
        });
      });
    }

    async function runEtag() {
      setStatus('etag', 'running', 'Fetching pixel with ETag...');
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        const loadPromise = new Promise((resolve, reject) => {
          img.onload = () => resolve(true);
          img.onerror = () => reject(new Error('Image load failed'));
        });
        img.src = SITE_X + '/etag-pixel?t=' + Date.now();
        await loadPromise;

        const trackerId = 'etag_' + Date.now() + '_' + Math.random().toString(36).slice(2);
        localStorage.setItem('test8_etag_id', trackerId);

        setStatus('etag', 'success', 'Pixel loaded, ETag should be cached', { trackerId });
      } catch (e) {
        setStatus('etag', 'failed', 'Error: ' + e.message);
      }
    }

    function runCacheImg() {
      setStatus('cacheimg', 'running', 'Loading cached image...');
      try {
        let cacheId = localStorage.getItem('test9_cacheimg_id');
        if (!cacheId) {
          cacheId = 'cache_' + Date.now() + '_' + Math.random().toString(36).slice(2);
          localStorage.setItem('test9_cacheimg_id', cacheId);
        }

        const img = new Image();
        img.onload = () => {
          setStatus('cacheimg', 'success', 'Image loaded and cached', { cacheId });
        };
        img.onerror = () => {
          setStatus('cacheimg', 'failed', 'Image load failed');
        };
        img.src = SITE_X + '/cache-img/' + cacheId;
      } catch (e) {
        setStatus('cacheimg', 'failed', 'Error: ' + e.message);
      }
    }

    async function runAllTests() {
      await runIframe();
      await runIndexedDB();
      await runPopup();
      await runCrossCookie();
      await runEtag();
      runCacheImg();
      runSAA();
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

import { Hono } from "hono";
import { html, raw } from "hono/html";

const SITE_A_URL = (process.env.SITE_A_URL || "http://localhost:3000").replace(/\/$/, "");

const app = new Hono();

const storageScript = `
<script>
  const TESTS = ['test2_iframe', 'test3_windowname', 'test4_popup', 'test5_crosscookie', 'test6_redirect', 'test7_indexeddb', 'test8_etag', 'test9_cacheimg'];

  function setCookie(name, value) {
    document.cookie = name + '=' + value + '; SameSite=None; Secure; path=/; max-age=31536000';
  }

  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  }

  function openIDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('tracker', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('flags');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function writeIDB(key, value) {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('flags', 'readwrite');
      tx.objectStore('flags').put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function readIDB(key) {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('flags', 'readonly');
      const req = tx.objectStore('flags').get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function clearIDB() {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('flags', 'readwrite');
      tx.objectStore('flags').clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  function writeFlag(testKey) {
    const timestamp = new Date().toISOString();
    const results = { testKey, timestamp, localStorage: false, cookie: false, errors: [] };

    try {
      localStorage.setItem(testKey, timestamp);
      results.localStorage = true;
    } catch (e) {
      results.errors.push('localStorage: ' + e.message);
    }

    try {
      setCookie(testKey, timestamp);
      results.cookie = true;
    } catch (e) {
      results.errors.push('cookie: ' + e.message);
    }

    return results;
  }

  async function writeFlagWithIDB(testKey) {
    const results = writeFlag(testKey);
    results.indexedDB = false;
    try {
      await writeIDB(testKey, results.timestamp);
      results.indexedDB = true;
    } catch (e) {
      results.errors.push('indexedDB: ' + e.message);
    }
    return results;
  }

  function readFlag(testKey) {
    const results = { testKey, localStorage: null, cookie: null, errors: [] };

    try {
      results.localStorage = localStorage.getItem(testKey);
    } catch (e) {
      results.errors.push('localStorage: ' + e.message);
    }

    try {
      results.cookie = getCookie(testKey);
    } catch (e) {
      results.errors.push('cookie: ' + e.message);
    }

    return results;
  }

  async function readFlagWithIDB(testKey) {
    const results = readFlag(testKey);
    results.indexedDB = null;
    try {
      results.indexedDB = await readIDB(testKey);
    } catch (e) {
      results.errors.push('indexedDB: ' + e.message);
    }
    return results;
  }

  function readAllFlags() {
    const all = {};
    for (const key of TESTS) {
      all[key] = readFlag(key);
    }
    return all;
  }

  async function readAllFlagsWithIDB() {
    const all = {};
    for (const key of TESTS) {
      all[key] = await readFlagWithIDB(key);
    }
    return all;
  }

  async function clearAllFlags() {
    for (const key of TESTS) {
      try { localStorage.removeItem(key); } catch (e) {}
      document.cookie = key + '=; path=/; max-age=0';
    }
    try { await clearIDB(); } catch (e) {}
  }
</script>
`;

const layout = (content: string, scripts: string = "") => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Game</title>
  <style>
    body { font-family: system-ui; max-width: 900px; margin: 40px auto; padding: 0 20px; background: #000; color: #e0e0e0; }
    h1 { color: #fff; }
    .detection { padding: 20px; margin-bottom: 20px; }
    .detected { background: #0a2f0a; border: 2px solid #4caf50; }
    .not-detected { background: #2f0a0a; border: 2px solid #f44336; }
    .tests { display: grid; gap: 12px; }
    .test { padding: 12px; background: #111; border: 1px solid #333; }
    .test-header { display: flex; justify-content: space-between; align-items: center; }
    .test-name { font-weight: bold; color: #fff; }
    .badge { padding: 4px 8px; font-size: 12px; }
    .badge-success { background: #4caf50; color: #000; }
    .badge-failed { background: #f44336; color: #fff; }
    .badge-pending { background: #444; color: #888; }
    .badge-data { background: #1a73e8; color: #fff; }
    .data { font-family: monospace; font-size: 12px; background: #0a0a0a; padding: 8px; margin-top: 8px; border: 1px solid #222; color: #aaa; }
    button { padding: 8px 16px; cursor: pointer; border: 1px solid #444; background: #222; color: #e0e0e0; margin-right: 8px; }
    button:hover { background: #333; }
    a { color: #8ab4f8; }
    .info { background: #0d1a26; padding: 12px; margin-bottom: 20px; border: 1px solid #1a3a5c; }
    .saa-section { margin-top: 20px; padding: 16px; background: #111; border: 1px solid #333; }
  </style>
</head>
<body>
  ${storageScript}
  ${content}
  ${scripts}
</body>
</html>
`;

app.get("/", (c) => {
	const via = c.req.query("via");

	const content = html`
    <h1>Game</h1>
    <div class="info">
      <strong>Origin:</strong> ${SITE_A_URL}<br>
      <strong>Purpose:</strong> Detect if user visited Landing
    </div>

    <div id="detection" class="detection not-detected">
      <h2 id="detection-title">Checking...</h2>
      <p id="detection-desc"></p>
    </div>

    <h3>Test Results</h3>
    <div class="tests">
      <div class="test">
        <div class="test-header">
          <span class="test-name">Iframe</span>
          <span id="iframe-badge" class="badge badge-pending">checking</span>
        </div>
        <div id="iframe-data" class="data" style="display:none"></div>
      </div>

      <div class="test">
        <div class="test-header">
          <span class="test-name">window.name</span>
          <span id="windowname-badge" class="badge badge-pending">checking</span>
        </div>
        <div id="windowname-data" class="data" style="display:none"></div>
      </div>

      <div class="test">
        <div class="test-header">
          <span class="test-name">Popup</span>
          <span id="popup-badge" class="badge badge-pending">checking</span>
        </div>
        <div id="popup-data" class="data" style="display:none"></div>
      </div>

      <div class="test">
        <div class="test-header">
          <span class="test-name">Storage Access API</span>
          <span id="saa-badge" class="badge badge-pending">N/A (not in iframe)</span>
        </div>
      </div>

      <div class="test">
        <div class="test-header">
          <span class="test-name">Cross-Origin Cookie</span>
          <span id="crosscookie-badge" class="badge badge-pending">checking</span>
        </div>
        <div id="crosscookie-data" class="data" style="display:none"></div>
      </div>

      <div class="test">
        <div class="test-header">
          <span class="test-name">Redirect Bounce</span>
          <span id="redirect-badge" class="badge badge-pending">checking</span>
        </div>
        <div id="redirect-data" class="data" style="display:none"></div>
      </div>

      <div class="test">
        <div class="test-header">
          <span class="test-name">IndexedDB (iframe)</span>
          <span id="indexeddb-badge" class="badge badge-pending">checking</span>
        </div>
        <div id="indexeddb-data" class="data" style="display:none"></div>
      </div>

      <div class="test">
        <div class="test-header">
          <span class="test-name">ETag Tracking</span>
          <span id="etag-badge" class="badge badge-pending">checking</span>
        </div>
        <div id="etag-data" class="data" style="display:none"></div>
      </div>

      <div class="test">
        <div class="test-header">
          <span class="test-name">Cache Image</span>
          <span id="cacheimg-badge" class="badge badge-pending">checking</span>
        </div>
        <div id="cacheimg-data" class="data" style="display:none"></div>
      </div>
    </div>

    <div class="saa-section">
      <h3>Storage Access API Test</h3>
      <p>Click to request storage access (simulates iframe context):</p>
      <button onclick="testStorageAccess()">Request Storage Access</button>
      <div id="saa-result"></div>
    </div>

    <h3>Actions</h3>
    <button onclick="location.reload()">Refresh</button>
    <button onclick="clearAllFlags(); location.reload();">Clear All Storage</button>
    <a href="${SITE_A_URL}">Go to Landing</a>

    <h3>Raw Storage Data</h3>
    <div id="raw-data" class="data"></div>
  `;

	const scripts = html`
    <script>
      const urlVia = '${via || ""}';
      const results = {};

      function setBadge(testName, status, text) {
        const badge = document.getElementById(testName + '-badge');
        badge.className = 'badge badge-' + status;
        badge.textContent = text;
      }

      function setData(testName, data) {
        const dataEl = document.getElementById(testName + '-data');
        if (dataEl && data) {
          dataEl.style.display = 'block';
          dataEl.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        }
      }

      function checkIframe() {
        const flags = readFlag('test2_iframe');
        if (flags.localStorage || flags.cookie) {
          results.iframe = { success: true, method: 'iframe', ...flags };
          setBadge('iframe', 'data', 'HAS DATA');
          setData('iframe', results.iframe);
          return true;
        }
        results.iframe = { success: false, ...flags };
        setBadge('iframe', 'failed', 'no data');
        setData('iframe', results.iframe);
        return false;
      }

      function checkWindowName() {
        const flags = readFlag('test3_windowname');
        if (flags.localStorage || flags.cookie) {
          results.windowname = { success: true, method: 'window_name', ...flags };
          setBadge('windowname', 'data', 'HAS DATA');
          setData('windowname', results.windowname);
          return true;
        }
        if (urlVia === 'windowname' && window.name && window.name.startsWith('visited_siteA')) {
          const writeResult = writeFlag('test3_windowname');
          results.windowname = { success: true, method: 'window_name', windowName: window.name, ...writeResult };
          window.name = '';
          setBadge('windowname', 'success', 'JUST WRITTEN');
          setData('windowname', results.windowname);
          return true;
        }
        results.windowname = { success: false, windowName: window.name || null };
        setBadge('windowname', 'failed', window.name ? 'wrong value' : 'empty');
        setData('windowname', results.windowname);
        return false;
      }

      function checkPopup() {
        const flags = readFlag('test4_popup');
        if (flags.localStorage || flags.cookie) {
          results.popup = { success: true, method: 'popup', ...flags };
          setBadge('popup', 'data', 'HAS DATA');
          setData('popup', results.popup);
          return true;
        }
        results.popup = { success: false, ...flags };
        setBadge('popup', 'failed', 'no data');
        return false;
      }

      function checkSAA() {
        const inIframe = window.self !== window.top;
        if (!inIframe) {
          results.saa = { success: false, reason: 'not in iframe' };
          setBadge('saa', 'pending', 'N/A');
          return false;
        }
        return false;
      }

      function checkCrossCookie() {
        const flags = readFlag('test5_crosscookie');
        if (flags.cookie) {
          results.crosscookie = { success: true, method: 'cross_origin_cookie', ...flags };
          setBadge('crosscookie', 'data', 'HAS DATA');
          setData('crosscookie', results.crosscookie);
          return true;
        }
        results.crosscookie = { success: false, ...flags };
        setBadge('crosscookie', 'failed', 'no data');
        setData('crosscookie', results.crosscookie);
        return false;
      }

      function checkRedirect() {
        const flags = readFlag('test6_redirect');
        if (flags.localStorage || flags.cookie) {
          results.redirect = { success: true, method: 'redirect_bounce', ...flags };
          setBadge('redirect', 'data', 'HAS DATA');
          setData('redirect', results.redirect);
          return true;
        }
        results.redirect = { success: false, ...flags };
        setBadge('redirect', 'failed', 'no data');
        setData('redirect', results.redirect);
        return false;
      }

      async function checkIndexedDB() {
        try {
          const flags = await readFlagWithIDB('test7_indexeddb');
          if (flags.localStorage || flags.cookie || flags.indexedDB) {
            results.indexeddb = { success: true, method: 'indexeddb_iframe', ...flags };
            setBadge('indexeddb', 'data', 'HAS DATA');
            setData('indexeddb', results.indexeddb);
            return true;
          }
          results.indexeddb = { success: false, ...flags };
          setBadge('indexeddb', 'failed', 'no data');
          setData('indexeddb', results.indexeddb);
          return false;
        } catch (e) {
          results.indexeddb = { success: false, error: e.message };
          setBadge('indexeddb', 'failed', 'error');
          setData('indexeddb', results.indexeddb);
          return false;
        }
      }

      async function checkEtag() {
        try {
          const res = await fetch('/etag-pixel', { cache: 'force-cache', credentials: 'include' });
          const found = res.headers.get('X-Tracker-Found') === 'true';
          const timestamp = res.headers.get('X-Tracker-Timestamp');
          if (found) {
            results.etag = { success: true, method: 'etag', found, timestamp };
            setBadge('etag', 'data', 'HAS DATA');
            setData('etag', results.etag);
            await writeIDB('test8_etag', timestamp);
            return true;
          }
          results.etag = { success: false, found, note: 'ETag not recognized (new visitor or cache cleared)' };
          setBadge('etag', 'failed', 'no match');
          setData('etag', results.etag);
          return false;
        } catch (e) {
          results.etag = { success: false, error: e.message };
          setBadge('etag', 'failed', 'error');
          setData('etag', results.etag);
          return false;
        }
      }

      async function checkCacheImg() {
        try {
          const res = await fetch('/cache-img-list');
          const data = await res.json();
          if (data.count > 0) {
            results.cacheimg = { success: true, method: 'cache_image', ...data };
            setBadge('cacheimg', 'data', 'HAS DATA');
            setData('cacheimg', results.cacheimg);
            await writeIDB('test9_cacheimg', data.lastSeen);
            return true;
          }
          results.cacheimg = { success: false, ...data };
          setBadge('cacheimg', 'failed', 'no cached images');
          setData('cacheimg', results.cacheimg);
          return false;
        } catch (e) {
          results.cacheimg = { success: false, error: e.message };
          setBadge('cacheimg', 'failed', 'error');
          setData('cacheimg', results.cacheimg);
          return false;
        }
      }

      async function testStorageAccess() {
        const resultEl = document.getElementById('saa-result');

        if (!document.requestStorageAccess) {
          resultEl.textContent = 'Storage Access API not supported in this browser';
          return;
        }

        try {
          const hasAccess = await document.hasStorageAccess();
          resultEl.textContent = 'Current access: ' + hasAccess;

          if (!hasAccess) {
            await document.requestStorageAccess();
            resultEl.textContent = 'Access granted! Reloading...';
            setTimeout(() => location.reload(), 500);
          }
        } catch (e) {
          resultEl.textContent = 'Error: ' + e.message;
        }
      }

      function updateDetection() {
        const allFlags = readAllFlags();
        const anySuccess = Object.values(allFlags).some(f => f.localStorage || f.cookie);

        const detectionEl = document.getElementById('detection');
        const titleEl = document.getElementById('detection-title');
        const descEl = document.getElementById('detection-desc');

        if (anySuccess) {
          const successMethods = Object.entries(allFlags)
            .filter(([k, v]) => v.localStorage || v.cookie)
            .map(([k]) => k)
            .join(', ');
          detectionEl.className = 'detection detected';
          titleEl.textContent = 'User visited Landing!';
          descEl.textContent = 'Working methods: ' + successMethods;
        } else {
          detectionEl.className = 'detection not-detected';
          titleEl.textContent = 'No visit detected';
          descEl.textContent = 'No tracking data found.';
        }

        document.getElementById('raw-data').textContent = JSON.stringify({
          urlParams: { via: urlVia },
          windowName: window.name || null,
          allFlags: allFlags,
          inIframe: window.self !== window.top
        }, null, 2);
      }

      async function runAllChecks() {
        checkIframe();
        checkWindowName();
        checkPopup();
        checkCrossCookie();
        checkRedirect();
        await checkIndexedDB();
        await checkEtag();
        await checkCacheImg();
        checkSAA();

        const allFlags = await readAllFlagsWithIDB();
        const anySuccess = Object.values(allFlags).some(f => f.localStorage || f.cookie || f.indexedDB);

        const detectionEl = document.getElementById('detection');
        const titleEl = document.getElementById('detection-title');
        const descEl = document.getElementById('detection-desc');

        if (anySuccess) {
          const successMethods = Object.entries(allFlags)
            .filter(([k, v]) => v.localStorage || v.cookie || v.indexedDB)
            .map(([k]) => k)
            .join(', ');
          detectionEl.className = 'detection detected';
          titleEl.textContent = 'User visited Landing!';
          descEl.textContent = 'Working methods: ' + successMethods;
        } else {
          detectionEl.className = 'detection not-detected';
          titleEl.textContent = 'No visit detected';
          descEl.textContent = 'No tracking data found.';
        }

        document.getElementById('raw-data').textContent = JSON.stringify({
          urlParams: { via: urlVia },
          windowName: window.name || null,
          allFlags: allFlags,
          inIframe: window.self !== window.top
        }, null, 2);

        console.log('Detection results:', results);
      }

      runAllChecks();
    </script>
  `;

	return c.html(layout(content.toString(), scripts.toString()));
});

app.get("/ping", (c) => {
	const content = html`
    <h1>Ping Receiver (iframe)</h1>
    <div id="status">Initializing...</div>
  `;

	const scripts = html`
    <script>
      const SITE_A = '${SITE_A_URL}';

      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'ping_ready' }, '*');
        document.getElementById('status').textContent = 'Ready, waiting for message...';
      }

      window.addEventListener('message', (event) => {
        console.log('Ping received:', event.data, 'from', event.origin);

        if (event.data && event.data.type === 'set_flag') {
          const result = writeFlag('test2_iframe');
          document.getElementById('status').textContent = 'Flag write attempted: ' + JSON.stringify(result);

          if (result.localStorage || result.cookie) {
            event.source.postMessage({ type: 'flag_set', ...result }, '*');
          } else {
            event.source.postMessage({ type: 'flag_error', error: result.errors.join(', ') || 'unknown' }, '*');
          }
        }
      });
    </script>
  `;

	return c.html(layout(content.toString(), scripts.toString()));
});

app.get("/receiver", (c) => {
	const content = html`
    <h1>Popup Receiver</h1>
    <div id="status">Initializing...</div>
  `;

	const scripts = html`
    <script>
      const SITE_A = '${SITE_A_URL}';

      if (window.opener) {
        window.opener.postMessage({ type: 'receiver_ready' }, '*');
        document.getElementById('status').textContent = 'Ready, waiting for message from opener...';
      } else {
        document.getElementById('status').textContent = 'No opener window found';
      }

      window.addEventListener('message', (event) => {
        console.log('Receiver got:', event.data, 'from', event.origin);

        if (event.data && event.data.type === 'set_flag') {
          const result = writeFlag('test4_popup');
          document.getElementById('status').textContent = 'Flag write attempted: ' + JSON.stringify(result);

          if (window.opener) {
            if (result.localStorage || result.cookie) {
              window.opener.postMessage({ type: 'flag_set', ...result }, '*');
            } else {
              window.opener.postMessage({ type: 'flag_error', error: result.errors.join(', ') || 'unknown' }, '*');
            }
          }
        }
      });
    </script>
  `;

	return c.html(layout(content.toString(), scripts.toString()));
});

app.get("/embed", (c) => {
	const page = html`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Game - Embedded</title>
  <style>
    body { font-family: system-ui; padding: 16px; margin: 0; background: #000; color: #e0e0e0; }
    h3 { color: #fff; margin: 0 0 12px 0; }
    .status { padding: 12px; margin: 8px 0; }
    .success { background: #0a2f0a; color: #4caf50; }
    .failed { background: #2f0a0a; color: #f44336; }
    .pending { background: #332b00; color: #ffcc00; }
    button { padding: 8px 16px; cursor: pointer; background: #222; color: #e0e0e0; border: 1px solid #444; }
    button:hover { background: #333; }
    pre { background: #0a0a0a; padding: 8px; font-size: 12px; overflow-x: auto; border: 1px solid #222; color: #aaa; }
  </style>
</head>
<body>
  ${raw(storageScript)}
  <h3>Game (embedded in iframe)</h3>

  <div id="access-status" class="status pending">Checking storage access...</div>

  <div id="storage-status"></div>

  <button onclick="requestAccess()">Request Storage Access</button>

  <pre id="debug"></pre>

  <script>
    const debug = document.getElementById('debug');
    const accessStatus = document.getElementById('access-status');
    const storageStatus = document.getElementById('storage-status');

    function log(msg) {
      debug.textContent += msg + '\\n';
    }

    function notifyParent(success, message) {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'storage_access_result', success, message }, '*');
      }
    }

    async function checkAccess() {
      log('Checking if in iframe: ' + (window.self !== window.top));

      const allFlags = readAllFlags();
      log('Storage read result: ' + JSON.stringify(allFlags));

      const anySuccess = Object.values(allFlags).some(f => f.localStorage || f.cookie);
      if (anySuccess) {
        accessStatus.className = 'status success';
        accessStatus.textContent = 'Storage accessible! Found flags.';
        storageStatus.innerHTML = '<pre>' + JSON.stringify(allFlags, null, 2) + '</pre>';
        notifyParent(true, 'Storage accessible, flags found');
        return;
      }

      if (document.hasStorageAccess) {
        const hasAccess = await document.hasStorageAccess();
        log('hasStorageAccess: ' + hasAccess);

        if (!hasAccess) {
          accessStatus.className = 'status failed';
          accessStatus.textContent = 'No storage access. Click button to request.';
          notifyParent(false, 'No storage access');
        } else {
          accessStatus.className = 'status pending';
          accessStatus.textContent = 'Has access but no flag found.';
          notifyParent(false, 'Access granted but no flag');
        }
      } else {
        log('Storage Access API not supported');
        accessStatus.className = 'status failed';
        accessStatus.textContent = 'Storage Access API not supported';
        notifyParent(false, 'API not supported');
      }
    }

    async function requestAccess() {
      if (!document.requestStorageAccess) {
        log('requestStorageAccess not available');
        return;
      }

      try {
        log('Requesting storage access...');
        await document.requestStorageAccess();
        log('Access granted!');
        accessStatus.className = 'status success';
        accessStatus.textContent = 'Access granted! Re-checking storage...';

        const allFlags = readAllFlags();
        log('Storage after access: ' + JSON.stringify(allFlags));
        storageStatus.innerHTML = '<pre>' + JSON.stringify(allFlags, null, 2) + '</pre>';

        const anySuccess = Object.values(allFlags).some(f => f.localStorage || f.cookie);
        notifyParent(anySuccess, anySuccess ? 'Access granted, flags found' : 'Access granted, no flags');
      } catch (e) {
        log('Access denied: ' + e.message);
        accessStatus.className = 'status failed';
        accessStatus.textContent = 'Access denied: ' + e.message;
        notifyParent(false, 'Access denied: ' + e.message);
      }
    }

    checkAccess();
  </script>
</body>
</html>
`;
	return c.html(page.toString());
});

app.get("/check", (c) => {
	return c.json({
		info: "Check storage via browser - this endpoint cannot read client storage",
	});
});

app.get("/track", (c) => {
	const origin = c.req.header("Origin") || SITE_A_URL;
	const timestamp = new Date().toISOString();

	return new Response(JSON.stringify({ success: true, timestamp }), {
		headers: {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": origin,
			"Access-Control-Allow-Credentials": "true",
			"Set-Cookie": `test5_crosscookie=${timestamp}; SameSite=None; Secure; Path=/; Max-Age=31536000`,
		},
	});
});

app.options("/track", (c) => {
	const origin = c.req.header("Origin") || SITE_A_URL;
	return new Response(null, {
		headers: {
			"Access-Control-Allow-Origin": origin,
			"Access-Control-Allow-Credentials": "true",
			"Access-Control-Allow-Methods": "GET, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		},
	});
});

app.get("/bounce", (c) => {
	const returnUrl = c.req.query("return") || SITE_A_URL;
	const timestamp = new Date().toISOString();

	const page = html`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Redirecting...</title>
  <style>
    body { font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #000; color: #e0e0e0; }
  </style>
</head>
<body>
  <div>Writing tracking data and redirecting back...</div>
  <script>
    const timestamp = '${timestamp}';
    const returnUrl = '${returnUrl}';

    try {
      localStorage.setItem('test6_redirect', timestamp);
    } catch (e) {}

    try {
      document.cookie = 'test6_redirect=' + timestamp + '; SameSite=Lax; Secure; path=/; max-age=31536000';
    } catch (e) {}

    setTimeout(() => {
      window.location.href = returnUrl;
    }, 100);
  </script>
</body>
</html>
`;
	return c.html(page.toString());
});

app.get("/ping-idb", (c) => {
	const content = html`
    <h1>IndexedDB Ping (iframe)</h1>
    <div id="status">Initializing...</div>
  `;

	const scripts = html`
    <script>
      const SITE_A = '${SITE_A_URL}';

      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'ping_idb_ready' }, '*');
        document.getElementById('status').textContent = 'Ready, waiting for message...';
      }

      window.addEventListener('message', async (event) => {
        if (event.data && event.data.type === 'set_flag_idb') {
          const result = await writeFlagWithIDB('test7_indexeddb');
          document.getElementById('status').textContent = 'Flag write attempted: ' + JSON.stringify(result);

          if (result.localStorage || result.cookie || result.indexedDB) {
            event.source.postMessage({ type: 'flag_idb_set', ...result }, '*');
          } else {
            event.source.postMessage({ type: 'flag_idb_error', error: result.errors.join(', ') || 'unknown' }, '*');
          }
        }
      });
    </script>
  `;

	return c.html(layout(content.toString(), scripts.toString()));
});

const etagStore = new Map<string, string>();

app.get("/etag-pixel", (c) => {
	const ifNoneMatch = c.req.header("If-None-Match");

	if (ifNoneMatch && etagStore.has(ifNoneMatch)) {
		return new Response(null, {
			status: 304,
			headers: {
				"ETag": ifNoneMatch,
				"Cache-Control": "private, max-age=31536000",
				"Access-Control-Allow-Origin": SITE_A_URL,
				"Access-Control-Allow-Credentials": "true",
				"X-Tracker-Found": "true",
				"X-Tracker-Timestamp": etagStore.get(ifNoneMatch) || "",
			},
		});
	}

	const timestamp = new Date().toISOString();
	const etag = `"tracker-${Date.now()}-${Math.random().toString(36).slice(2)}"`;
	etagStore.set(etag, timestamp);

	const pixel = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

	return new Response(pixel, {
		headers: {
			"Content-Type": "image/gif",
			"ETag": etag,
			"Cache-Control": "private, max-age=31536000",
			"Access-Control-Allow-Origin": SITE_A_URL,
			"Access-Control-Allow-Credentials": "true",
			"Access-Control-Expose-Headers": "ETag, X-Tracker-New, X-Tracker-Timestamp",
			"X-Tracker-New": "true",
			"X-Tracker-Timestamp": timestamp,
		},
	});
});

app.get("/etag-check", (c) => {
	const etag = c.req.query("etag");
	if (etag && etagStore.has(etag)) {
		return c.json({ found: true, timestamp: etagStore.get(etag) });
	}
	return c.json({ found: false });
});

const cacheImgStore = new Map<string, string>();

app.get("/cache-img/:id", (c) => {
	const id = c.req.param("id");
	const timestamp = new Date().toISOString();

	cacheImgStore.set(id, timestamp);

	const pixel = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

	return new Response(pixel, {
		headers: {
			"Content-Type": "image/gif",
			"Cache-Control": "public, max-age=31536000, immutable",
			"Access-Control-Allow-Origin": "*",
		},
	});
});

app.get("/cache-img-check/:id", (c) => {
	const id = c.req.param("id");
	if (cacheImgStore.has(id)) {
		return c.json({ found: true, timestamp: cacheImgStore.get(id) });
	}
	return c.json({ found: false });
});

app.get("/cache-img-list", (c) => {
	const entries = Array.from(cacheImgStore.entries());
	const last = entries[entries.length - 1];
	return c.json({
		count: entries.length,
		ids: entries.map(([id, ts]) => ({ id, timestamp: ts })),
		lastSeen: last ? last[1] : null,
	});
});

app.get("/windowname-bounce", (c) => {
	const returnUrl = c.req.query("return") || SITE_A_URL;
	const timestamp = new Date().toISOString();

	const page = html`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Redirecting...</title>
  <style>
    body { font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #000; color: #e0e0e0; }
  </style>
</head>
<body>
  <div>Checking window.name and redirecting back...</div>
  <script>
    const timestamp = '${timestamp}';
    const returnUrl = '${returnUrl}';

    if (window.name && window.name.startsWith('visited_siteA')) {
      try {
        localStorage.setItem('test3_windowname', timestamp);
      } catch (e) {}

      try {
        document.cookie = 'test3_windowname=' + timestamp + '; SameSite=Lax; Secure; path=/; max-age=31536000';
      } catch (e) {}

      window.name = '';
    }

    setTimeout(() => {
      window.location.href = returnUrl;
    }, 100);
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

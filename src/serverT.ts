import { Hono } from "hono";
import { html } from "hono/html";

const app = new Hono();

const STORAGE_KEY = "tracker_visits";
const FP_KEY = "tracker_fingerprints";

app.get("/", (c) => {
	const cookie = c.req.header("Cookie") || "";
	const hasCookie = cookie.includes("tracker_cookie");

	const page = html`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tracker</title>
  <style>
    body { font-family: system-ui; max-width: 900px; margin: 40px auto; padding: 0 20px; background: #000; color: #e0e0e0; }
    h1 { color: #fff; }
    .sections { display: grid; gap: 16px; }
    .section { padding: 16px; background: #111; border: 1px solid #333; }
    .section h3 { margin: 0 0 12px 0; color: #fff; }
    .status { padding: 8px 12px; font-size: 14px; }
    .success { background: #0a2f0a; color: #4caf50; }
    .failed { background: #2f0a0a; color: #f44336; }
    .method { display: inline-block; padding: 6px 12px; margin: 4px; background: #0a2f0a; border: 1px solid #4caf50; color: #4caf50; font-size: 13px; }
    .method-none { background: #222; border-color: #444; color: #666; }
    .badge { display: inline-block; padding: 4px 10px; margin: 2px; font-size: 12px; }
    .badge-good { background: #0a2f0a; border: 1px solid #4caf50; color: #4caf50; }
    .badge-bad { background: #2f0a0a; border: 1px solid #f44336; color: #f44336; }
    .badge-warn { background: #2f2a0a; border: 1px solid #ff9800; color: #ff9800; }
    .status-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #222; }
    .status-row:last-child { border-bottom: none; }
    .fp { font-family: monospace; font-size: 11px; padding: 6px 10px; margin: 4px 0; background: #0a0a0a; border: 1px solid #333; color: #8ab4f8; word-break: break-all; }
    button { padding: 8px 16px; cursor: pointer; border: 1px solid #444; background: #222; color: #e0e0e0; margin-right: 8px; margin-top: 8px; }
    button:hover { background: #333; }
  </style>
</head>
<body>
  <h1>Tracker</h1>

  <div class="sections">
    <div class="section" style="background: ${hasCookie ? "#0a2f0a" : "#2f0a0a"}; border-color: ${hasCookie ? "#4caf50" : "#f44336"};">
      <h3>Cookie</h3>
      <div class="status ${hasCookie ? "success" : "failed"}">
        ${hasCookie ? "Present" : "Not found"}
      </div>
    </div>

    <div class="section">
      <h3>Methods</h3>
      <div id="methods"></div>
    </div>

    <div class="section">
      <h3>Fingerprints</h3>
      <div id="fingerprints"></div>
    </div>

    <div class="section">
      <h3>Service Worker</h3>
      <div id="sw-status"></div>
    </div>

    <div class="section">
      <h3>Browser Status</h3>
      <div class="status-row">
        <span>Do Not Track</span>
        <span id="dnt-status" class="badge badge-warn">Checking...</span>
      </div>
      <div class="status-row">
        <span>3rd-party Cookies</span>
        <span id="cookie-status" class="badge badge-warn">N/A (first-party)</span>
      </div>
      <div class="status-row">
        <span>Storage Access API</span>
        <span id="saa-perm" class="badge badge-warn">Checking...</span>
      </div>
    </div>

    <div class="section">
      <h3>Actions</h3>
      <button onclick="clearData()">Clear All</button>
      <button onclick="location.reload()">Refresh</button>
    </div>
  </div>

  <script>
    async function loadData() {
      const visits = JSON.parse(localStorage.getItem('${STORAGE_KEY}') || '[]');
      const fps = JSON.parse(localStorage.getItem('${FP_KEY}') || '[]');

      const methodsEl = document.getElementById('methods');
      if (visits.length) {
        const methods = [...new Set(visits.map(v => v.method || v.source || 'unknown'))];
        methodsEl.innerHTML = methods.map(m => '<span class="method">' + m + '</span>').join('');
      } else {
        methodsEl.innerHTML = '<span class="method method-none">No visits</span>';
      }

      const fpsEl = document.getElementById('fingerprints');
      if (fps.length) {
        fpsEl.innerHTML = fps.map(f => '<div class="fp">' + f + '</div>').join('');
      } else {
        fpsEl.innerHTML = '<span class="method method-none">No fingerprints</span>';
      }

      const swEl = document.getElementById('sw-status');
      try {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.getRegistration('/tracker-sw.js');
          if (reg && reg.active) {
            const mc = new MessageChannel();
            mc.port1.onmessage = (e) => {
              const swVisits = e.data.visits || [];
              if (swVisits.length) {
                swEl.innerHTML = '<span class="method">serviceworker (' + swVisits.length + ' visits)</span>';
              } else {
                swEl.innerHTML = '<span class="method method-none">Registered, no visits</span>';
              }
            };
            reg.active.postMessage({ type: 'get_visits' }, [mc.port2]);
          } else {
            swEl.innerHTML = '<span class="method method-none">Not registered</span>';
          }
        } else {
          swEl.innerHTML = '<span class="method method-none">Not supported</span>';
        }
      } catch (e) {
        swEl.innerHTML = '<span class="method method-none">Error: ' + e.message + '</span>';
      }

      const dntEl = document.getElementById('dnt-status');
      const dnt = navigator.doNotTrack;
      if (dnt === '1') {
        dntEl.textContent = 'Enabled';
        dntEl.className = 'badge badge-bad';
      } else if (dnt === '0') {
        dntEl.textContent = 'Disabled';
        dntEl.className = 'badge badge-good';
      } else {
        dntEl.textContent = 'Not set';
        dntEl.className = 'badge badge-warn';
      }

      const saaEl = document.getElementById('saa-perm');
      try {
        const perm = await navigator.permissions.query({ name: 'storage-access' });
        saaEl.textContent = perm.state.charAt(0).toUpperCase() + perm.state.slice(1);
        saaEl.className = 'badge ' + (perm.state === 'granted' ? 'badge-good' : perm.state === 'denied' ? 'badge-bad' : 'badge-warn');
      } catch {
        saaEl.textContent = 'Not supported';
        saaEl.className = 'badge badge-warn';
      }
    }

    async function clearData() {
      localStorage.removeItem('${STORAGE_KEY}');
      localStorage.removeItem('${FP_KEY}');
      document.cookie = 'tracker_cookie=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      try {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.getRegistration('/tracker-sw.js');
          if (reg && reg.active) {
            const mc = new MessageChannel();
            mc.port1.onmessage = () => location.reload();
            reg.active.postMessage({ type: 'clear' }, [mc.port2]);
            return;
          }
        }
      } catch {}
      location.reload();
    }

    loadData();
  </script>
</body>
</html>
`;
	return c.html(page.toString());
});

app.get("/game", (c) => {
	const cookie = c.req.header("Cookie") || "";
	const isTracked = cookie.includes("tracker_cookie");

	const page = html`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tracker</title>
  <style>
    body { font-family: system-ui; max-width: 900px; margin: 40px auto; padding: 0 20px; background: #000; color: #e0e0e0; }
    h1 { color: #fff; margin-bottom: 20px; }
    .tracking-status { padding: 16px; font-size: 18px; font-weight: bold; text-align: center; }
    .tracked { background: #0a2f0a; border: 2px solid #4caf50; color: #4caf50; }
    .not-tracked { background: #2f0a0a; border: 2px solid #f44336; color: #f44336; }
  </style>
</head>
<body>
  <h1>Tracker</h1>
  <div class="tracking-status ${isTracked ? "tracked" : "not-tracked"}">
    ${isTracked ? "TRACKED" : "NOT TRACKED"}
  </div>
</body>
</html>
`;
	return c.html(page.toString());
});

app.get("/register", (c) => {
	const returnUrl = c.req.query("return") || "/";
	const source = c.req.query("source") || "unknown";
	const fp = c.req.query("fp") || "";
	const methods = c.req.query("methods") || "";

	const page = html`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Registering...</title>
  <style>
    body { font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #000; color: #e0e0e0; }
  </style>
</head>
<body>
  <div>Registering visit...</div>
  <script>
    const source = '${source}';
    const returnUrl = '${returnUrl}';
    const fp = '${fp}';
    const methodsParam = '${methods}';
    const timestamp = new Date().toISOString();

    try {
      const visits = JSON.parse(localStorage.getItem('${STORAGE_KEY}') || '[]');

      if (methodsParam) {
        methodsParam.split(',').forEach(m => {
          visits.push({ source, timestamp, method: m });
        });
      } else {
        visits.push({ source, timestamp, method: 'redirect' });
      }
      if (visits.length > 100) visits.shift();
      localStorage.setItem('${STORAGE_KEY}', JSON.stringify(visits));

      if (fp) {
        const fps = JSON.parse(localStorage.getItem('${FP_KEY}') || '[]');
        if (!fps.includes(fp)) {
          fps.push(fp);
          localStorage.setItem('${FP_KEY}', JSON.stringify(fps));
        }
      }
    } catch (e) {
      console.error('Storage error:', e);
    }

    setTimeout(() => {
      window.location.href = returnUrl;
    }, 50);
  </script>
</body>
</html>
`;
	return new Response(page.toString(), {
		headers: {
			"Content-Type": "text/html; charset=utf-8",
			"Set-Cookie": `tracker_cookie=${Date.now()}; SameSite=None; Secure; Path=/; Max-Age=31536000`,
		},
	});
});

app.get("/check", (c) => {
	const returnUrl = c.req.query("return") || "/";
	const fp = c.req.query("fp") || "";

	const page = html`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Checking...</title>
  <style>
    body { font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #000; color: #e0e0e0; }
  </style>
</head>
<body>
  <div>Checking tracking data...</div>
  <script>
    const returnUrl = '${returnUrl}';
    const fp = '${fp}';

    let result = { found: false, visits: [], fpMatch: false };

    try {
      const visits = JSON.parse(localStorage.getItem('${STORAGE_KEY}') || '[]');
      result.visits = visits;
      result.found = visits.length > 0;

      if (fp) {
        const fps = JSON.parse(localStorage.getItem('${FP_KEY}') || '[]');
        result.fpMatch = fps.includes(fp);
      }
    } catch (e) {
      result.error = e.message;
    }

    const separator = returnUrl.includes('?') ? '&' : '?';
    const redirectUrl = returnUrl + separator + 'tracker_result=' + encodeURIComponent(JSON.stringify(result));

    setTimeout(() => {
      window.location.href = redirectUrl;
    }, 50);
  </script>
</body>
</html>
`;
	return c.html(page.toString());
});

app.get("/iframe-check", (c) => {
	const page = html`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Tracker Check</title>
</head>
<body>
  <script>
    let result = { found: false, visits: [], fps: [], error: null, debug: {} };

    try {
      result.debug.hasLocalStorage = typeof localStorage !== 'undefined';
      result.debug.allKeys = Object.keys(localStorage);
      result.debug.rawVisits = localStorage.getItem('${STORAGE_KEY}');
      result.debug.rawFps = localStorage.getItem('${FP_KEY}');

      const visits = JSON.parse(localStorage.getItem('${STORAGE_KEY}') || '[]');
      const fps = JSON.parse(localStorage.getItem('${FP_KEY}') || '[]');
      result.visits = visits;
      result.fps = fps;
      result.found = visits.length > 0;
    } catch (e) {
      result.error = e.message;
    }

    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'tracker_check_result', ...result }, '*');
    }
  </script>
</body>
</html>
`;
	return c.html(page.toString());
});

app.get("/pixel", (c) => {
	const pixel = Buffer.from(
		"R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
		"base64"
	);

	return new Response(pixel, {
		headers: {
			"Content-Type": "image/gif",
			"Cache-Control": "no-cache, no-store",
			"Set-Cookie": `tracker_seen=1; SameSite=None; Secure; Path=/; Max-Age=31536000`,
		},
	});
});

app.get("/ping", (c) => {
	const page = html`
<!DOCTYPE html>
<html>
<head><title>Tracker Ping</title></head>
<body>
<script>
  const STORAGE_KEY = '${STORAGE_KEY}';

  function writeFlag(source) {
    const timestamp = new Date().toISOString();
    try {
      const visits = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      visits.push({ source, timestamp, method: 'iframe' });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visits));
      return { success: true, timestamp };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'ping_ready' }, '*');
  }

  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'set_flag') {
      const result = writeFlag(e.data.source || 'unknown');
      if (result.success) {
        window.parent.postMessage({ type: 'flag_set', ...result }, '*');
      } else {
        window.parent.postMessage({ type: 'flag_error', error: result.error }, '*');
      }
    }
  });
</script>
</body>
</html>
`;
	return c.html(page.toString());
});

app.get("/receiver", (c) => {
	const page = html`
<!DOCTYPE html>
<html>
<head><title>Tracker Receiver</title></head>
<body>
<script>
  const STORAGE_KEY = '${STORAGE_KEY}';

  function writeFlag(source) {
    const timestamp = new Date().toISOString();
    try {
      const visits = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      visits.push({ source, timestamp, method: 'popup' });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visits));
      return { success: true, timestamp };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  if (window.opener) {
    window.opener.postMessage({ type: 'receiver_ready' }, '*');
  }

  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'set_flag') {
      const result = writeFlag(e.data.source || 'unknown');
      if (result.success) {
        window.opener.postMessage({ type: 'flag_set', ...result }, '*');
      } else {
        window.opener.postMessage({ type: 'flag_error', error: result.error }, '*');
      }
    }
  });
</script>
</body>
</html>
`;
	return c.html(page.toString());
});

app.get("/windowname-bounce", (c) => {
	const returnUrl = c.req.query("return") || "/";
	const page = html`
<!DOCTYPE html>
<html>
<head><title>Redirecting...</title></head>
<body>
<script>
  const STORAGE_KEY = '${STORAGE_KEY}';
  const windowName = window.name;

  if (windowName) {
    try {
      const visits = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      visits.push({ source: 'windowname', timestamp: new Date().toISOString(), windowName, method: 'windowname' });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visits));
    } catch (e) {}
  }

  window.location.href = '${returnUrl}';
</script>
</body>
</html>
`;
	return new Response(page.toString(), {
		headers: {
			"Content-Type": "text/html; charset=utf-8",
			"Set-Cookie": `tracker_cookie=${Date.now()}; SameSite=None; Secure; Path=/; Max-Age=31536000`,
		},
	});
});

app.get("/bounce", (c) => {
	const returnUrl = c.req.query("return") || "/";
	const page = html`
<!DOCTYPE html>
<html>
<head><title>Redirecting...</title></head>
<body>
<script>
  const STORAGE_KEY = '${STORAGE_KEY}';

  try {
    const visits = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    visits.push({ source: 'redirect', timestamp: new Date().toISOString(), method: 'redirect' });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visits));
  } catch (e) {}

  window.location.href = '${returnUrl}';
</script>
</body>
</html>
`;
	return new Response(page.toString(), {
		headers: {
			"Content-Type": "text/html; charset=utf-8",
			"Set-Cookie": `tracker_cookie=${Date.now()}; SameSite=None; Secure; Path=/; Max-Age=31536000`,
		},
	});
});

app.get("/embed", (c) => {
	const fp = c.req.query("fp") || "";
	const page = html`
<!DOCTYPE html>
<html>
<head>
  <title>Tracker Embed</title>
  <style>
    body { font-family: system-ui; padding: 12px; margin: 0; background: #000; color: #e0e0e0; }
    .btn { padding: 12px 24px; font-size: 14px; cursor: pointer; background: #7c4dff; color: white; border: none; width: 100%; }
    .status { padding: 8px; margin-top: 8px; font-size: 12px; }
    .success { background: #0a2f0a; color: #4caf50; }
    .pending { background: #222; color: #888; }
    .hidden { display: none; }
  </style>
</head>
<body>
  <button id="btn" class="btn hidden" onclick="requestAccess()">Verify Visit</button>
  <div id="status" class="status pending">Checking...</div>

  <script>
    const STORAGE_KEY = '${STORAGE_KEY}';
    const FP_KEY = '${FP_KEY}';
    const providedFp = '${fp}';

    function checkStorage() {
      try {
        const visits = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const fps = JSON.parse(localStorage.getItem(FP_KEY) || '[]');
        const fpMatch = providedFp && fps.includes(providedFp);
        const found = visits.length > 0 || fpMatch;

        if (found) {
          document.getElementById('status').className = 'status success';
          document.getElementById('status').textContent = 'Found: ' + visits.length + ' visits' + (fpMatch ? ' + fingerprint' : '');
          window.parent.postMessage({ type: 'saa_result', found: true, fpMatch: fpMatch, visits: visits }, '*');
          return;
        }
      } catch (e) {}

      // No data found - show SAA button
      document.getElementById('btn').className = 'btn';
      document.getElementById('status').textContent = 'Click to check with Storage Access';
    }

    async function requestAccess() {
      const statusEl = document.getElementById('status');

      if (!document.requestStorageAccess) {
        statusEl.textContent = 'Storage Access API not supported';
        window.parent.postMessage({ type: 'saa_result', found: false, error: 'API not supported' }, '*');
        return;
      }

      try {
        await document.requestStorageAccess();

        const visits = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const fps = JSON.parse(localStorage.getItem(FP_KEY) || '[]');
        const fpMatch = providedFp && fps.includes(providedFp);
        const found = visits.length > 0 || fpMatch;

        statusEl.className = 'status success';
        statusEl.textContent = found
          ? 'Found: ' + visits.length + ' visits' + (fpMatch ? ' + fingerprint' : '')
          : 'No tracking data found';

        window.parent.postMessage({ type: 'saa_result', found: found, fpMatch: fpMatch, visits: visits }, '*');
      } catch (e) {
        statusEl.textContent = 'Denied: ' + e.message;
        window.parent.postMessage({ type: 'saa_result', found: false, error: e.message }, '*');
      }
    }

    checkStorage();
  </script>
</body>
</html>
`;
	return c.html(page.toString());
});

app.get("/track", (c) => {
	return new Response(JSON.stringify({ success: true }), {
		headers: {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": c.req.header("Origin") || "*",
			"Access-Control-Allow-Credentials": "true",
			"Set-Cookie": `tracker_cookie=${Date.now()}; SameSite=None; Secure; Path=/; Max-Age=31536000`,
		},
	});
});

app.options("/track", (c) => {
	return new Response(null, {
		headers: {
			"Access-Control-Allow-Origin": c.req.header("Origin") || "*",
			"Access-Control-Allow-Credentials": "true",
			"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
		},
	});
});

app.get("/track-verify", (c) => {
	const cookie = c.req.header("Cookie") || "";
	const hasCookie = cookie.includes("tracker_cookie");
	return new Response(JSON.stringify({ cookieReceived: hasCookie, cookie }), {
		headers: {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": c.req.header("Origin") || "*",
			"Access-Control-Allow-Credentials": "true",
		},
	});
});

app.get("/cookie-test", (c) => {
	const cookie = c.req.header("Cookie") || "";
	const hasTestCookie = cookie.includes("cookie_test=1");
	return new Response(JSON.stringify({ cookiesWork: hasTestCookie }), {
		headers: {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": c.req.header("Origin") || "*",
			"Access-Control-Allow-Credentials": "true",
			"Set-Cookie": "cookie_test=1; SameSite=None; Secure; Path=/; Max-Age=60",
		},
	});
});

app.options("/cookie-test", (c) => {
	return new Response(null, {
		headers: {
			"Access-Control-Allow-Origin": c.req.header("Origin") || "*",
			"Access-Control-Allow-Credentials": "true",
			"Access-Control-Allow-Methods": "GET, OPTIONS",
		},
	});
});

app.options("/track-verify", (c) => {
	return new Response(null, {
		headers: {
			"Access-Control-Allow-Origin": c.req.header("Origin") || "*",
			"Access-Control-Allow-Credentials": "true",
			"Access-Control-Allow-Methods": "GET, OPTIONS",
		},
	});
});

app.get("/fingerprint-receiver", (c) => {
	const page = html`
<!DOCTYPE html>
<html>
<head><title>Fingerprint Receiver</title></head>
<body>
<script>
  const FP_KEY = '${FP_KEY}';

  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'fp_ready' }, '*');
  }

  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'store_fp' && e.data.hash) {
      try {
        const fps = JSON.parse(localStorage.getItem(FP_KEY) || '[]');
        if (!fps.includes(e.data.hash)) {
          fps.push(e.data.hash);
          localStorage.setItem(FP_KEY, JSON.stringify(fps));
        }
        window.parent.postMessage({ type: 'fp_stored', hash: e.data.hash }, '*');
      } catch (e) {
        window.parent.postMessage({ type: 'fp_error', error: e.message }, '*');
      }
    }
  });
</script>
</body>
</html>
`;
	return c.html(page.toString());
});

app.get("/sw-register", (c) => {
	const page = `<!DOCTYPE html>
<html>
<head><title>SW Register</title></head>
<body>
<script>
(async function() {
  try {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported');
    }
    const reg = await navigator.serviceWorker.register('/tracker-sw.js');
    await navigator.serviceWorker.ready;

    const sw = reg.active || reg.waiting || reg.installing;
    if (!sw) throw new Error('SW not available');

    const mc = new MessageChannel();
    mc.port1.onmessage = (e) => {
      window.parent.postMessage({ type: 'sw_flag_set', success: true, data: e.data }, '*');
    };
    sw.postMessage({ type: 'set_visit', source: 'landing' }, [mc.port2]);
  } catch (e) {
    window.parent.postMessage({ type: 'sw_error', error: e.message }, '*');
  }
})();
</script>
</body>
</html>`;
	return new Response(page, {
		headers: { "Content-Type": "text/html" },
	});
});

app.get("/tracker-sw.js", (c) => {
	const sw = `
const CACHE_NAME = 'tracker-visits-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

self.addEventListener('message', async (e) => {
  if (e.data && e.data.type === 'set_visit') {
    const cache = await caches.open(CACHE_NAME);
    const visits = await getVisits(cache);
    visits.push({ source: e.data.source, timestamp: new Date().toISOString(), method: 'serviceworker' });
    await cache.put('/visits.json', new Response(JSON.stringify(visits)));
    e.ports[0].postMessage({ success: true, count: visits.length });
  }
  if (e.data && e.data.type === 'get_visits') {
    const cache = await caches.open(CACHE_NAME);
    const visits = await getVisits(cache);
    e.ports[0].postMessage({ visits });
  }
  if (e.data && e.data.type === 'clear') {
    await caches.delete(CACHE_NAME);
    e.ports[0].postMessage({ cleared: true });
  }
});

async function getVisits(cache) {
  try {
    const res = await cache.match('/visits.json');
    if (res) return await res.json();
  } catch {}
  return [];
}
`;
	return new Response(sw, {
		headers: {
			"Content-Type": "application/javascript",
			"Service-Worker-Allowed": "/",
		},
	});
});

app.get("/sw-check", (c) => {
	const page = `<!DOCTYPE html>
<html>
<head><title>SW Check</title></head>
<body>
<script>
(async function() {
  try {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported');
    }
    const reg = await navigator.serviceWorker.getRegistration('/tracker-sw.js');
    if (!reg || !reg.active) {
      window.parent.postMessage({ type: 'sw_check_result', found: false }, '*');
      return;
    }
    const mc = new MessageChannel();
    mc.port1.onmessage = (e) => {
      const visits = e.data.visits || [];
      window.parent.postMessage({ type: 'sw_check_result', found: visits.length > 0, visits }, '*');
    };
    reg.active.postMessage({ type: 'get_visits' }, [mc.port2]);
  } catch (e) {
    window.parent.postMessage({ type: 'sw_check_result', found: false, error: e.message }, '*');
  }
})();
</script>
</body>
</html>`;
	return new Response(page, {
		headers: { "Content-Type": "text/html" },
	});
});

app.get("/shared-storage-worklet.js", (c) => {
	const worklet = `
class CheckTrackedOperation {
  async run(urls) {
    const tracked = await sharedStorage.get('tracker_visited');
    return tracked === 'true' ? 0 : 1;
  }
}
register('check-tracked', CheckTrackedOperation);
`;
	return new Response(worklet, {
		headers: {
			"Content-Type": "application/javascript",
			"Access-Control-Allow-Origin": "*",
			"Shared-Storage-Cross-Origin-Worklet-Allowed": "?1",
		},
	});
});

app.get("/ss-tracked", (c) => {
	const page = `<!DOCTYPE html>
<html><head><title>Tracked</title></head>
<body>
<script>
window.parent.postMessage({ type: 'shared_storage_result', tracked: true }, '*');
</script>
</body></html>`;
	return new Response(page, {
		headers: {
			"Content-Type": "text/html",
			"Supports-Loading-Mode": "fenced-frame",
		},
	});
});

app.get("/ss-not-tracked", (c) => {
	const page = `<!DOCTYPE html>
<html><head><title>Not Tracked</title></head>
<body>
<script>
window.parent.postMessage({ type: 'shared_storage_result', tracked: false }, '*');
</script>
</body></html>`;
	return new Response(page, {
		headers: {
			"Content-Type": "text/html",
			"Supports-Loading-Mode": "fenced-frame",
		},
	});
});

app.get("/ss-set", (c) => {
	const page = `<!DOCTYPE html>
<html><head><title>Set Shared Storage</title></head>
<body>
<script>
(async () => {
  try {
    if (!window.sharedStorage) {
      window.parent.postMessage({ type: 'ss_set_result', success: false, error: 'Shared Storage not supported' }, '*');
      return;
    }
    await window.sharedStorage.set('tracker_visited', 'true');
    window.parent.postMessage({ type: 'ss_set_result', success: true }, '*');
  } catch (e) {
    window.parent.postMessage({ type: 'ss_set_result', success: false, error: e.message }, '*');
  }
})();
</script>
</body></html>`;
	return c.html(page);
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
	port: Number(process.env.PORT) || 3002,
	hostname: "0.0.0.0",
	fetch: app.fetch.bind(app),
	...(tls && { tls }),
};

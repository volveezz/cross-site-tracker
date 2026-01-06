import { Hono } from "hono";
import { html } from "hono/html";

const app = new Hono();

const STORAGE_KEY = "tracker_visits";
const FP_KEY = "tracker_fingerprints";

app.get("/", (c) => {
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
    .info { background: #1a0a2e; padding: 16px; margin-bottom: 20px; border: 1px solid #4a1a7e; }
    pre { background: #0a0a0a; padding: 12px; font-size: 12px; overflow-x: auto; border: 1px solid #222; color: #aaa; white-space: pre-wrap; word-break: break-all; }
    button { padding: 8px 16px; cursor: pointer; border: 1px solid #444; background: #222; color: #e0e0e0; margin-right: 8px; }
    button:hover { background: #333; }
    h3 { color: #fff; margin-top: 24px; }
  </style>
</head>
<body>
  <h1>Tracker</h1>
  <div class="info">
    <strong>Role:</strong> Central tracking server<br>
    <strong>Purpose:</strong> Store visit data that Landing writes and Casino reads
  </div>

  <h3>Stored Data</h3>
  <pre id="visits"></pre>

  <h3>Stored Fingerprints</h3>
  <pre id="fingerprints"></pre>

  <h3>Actions</h3>
  <button onclick="clearData()">Clear All Data</button>
  <button onclick="location.reload()">Refresh</button>

  <script>
    function loadData() {
      const visits = JSON.parse(localStorage.getItem('${STORAGE_KEY}') || '[]');
      const fps = JSON.parse(localStorage.getItem('${FP_KEY}') || '[]');
      document.getElementById('visits').textContent = JSON.stringify(visits, null, 2) || 'No visits recorded';
      document.getElementById('fingerprints').textContent = JSON.stringify(fps, null, 2) || 'No fingerprints stored';
    }

    function clearData() {
      localStorage.removeItem('${STORAGE_KEY}');
      localStorage.removeItem('${FP_KEY}');
      loadData();
    }

    loadData();
  </script>
</body>
</html>
`;
	return c.html(page.toString());
});

app.get("/register", (c) => {
	const returnUrl = c.req.query("return") || "/";
	const source = c.req.query("source") || "unknown";
	const fp = c.req.query("fp") || "";

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
    const timestamp = new Date().toISOString();

    try {
      const visits = JSON.parse(localStorage.getItem('${STORAGE_KEY}') || '[]');
      visits.push({ source, timestamp, userAgent: navigator.userAgent.slice(0, 50) });
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
	return c.html(page.toString());
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
	return c.html(page.toString());
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
	return c.html(page.toString());
});

app.get("/embed", (c) => {
	const page = html`
<!DOCTYPE html>
<html>
<head>
  <title>Tracker Embed</title>
  <style>
    body { font-family: system-ui; padding: 16px; margin: 0; background: #000; color: #e0e0e0; }
    .btn { padding: 12px 24px; font-size: 16px; cursor: pointer; background: #7c4dff; color: white; border: none; width: 100%; }
    .status { padding: 12px; margin-top: 12px; }
    .success { background: #0a2f0a; color: #4caf50; }
    .pending { background: #222; color: #888; }
  </style>
</head>
<body>
  <button class="btn" onclick="requestAccess()">Grant Storage Access</button>
  <div id="status" class="status pending">Click button to grant access</div>

  <script>
    const STORAGE_KEY = '${STORAGE_KEY}';

    async function requestAccess() {
      const statusEl = document.getElementById('status');

      if (!document.requestStorageAccess) {
        statusEl.textContent = 'Storage Access API not supported';
        window.parent.postMessage({ type: 'storage_access_result', success: false, message: 'API not supported' }, '*');
        return;
      }

      try {
        await document.requestStorageAccess();

        const visits = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        visits.push({ source: 'saa', timestamp: new Date().toISOString(), method: 'saa' });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(visits));

        statusEl.className = 'status success';
        statusEl.textContent = 'Access granted, visit recorded!';
        window.parent.postMessage({ type: 'storage_access_result', success: true }, '*');
      } catch (e) {
        statusEl.textContent = 'Denied: ' + e.message;
        window.parent.postMessage({ type: 'storage_access_result', success: false, message: e.message }, '*');
      }
    }
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
	const page = html`
<!DOCTYPE html>
<html>
<head><title>SW Register</title></head>
<body>
<script>
  const STORAGE_KEY = '${STORAGE_KEY}';

  async function registerSW() {
    try {
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker not supported');
      }

      const visits = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      visits.push({ source: 'sw', timestamp: new Date().toISOString(), method: 'serviceworker' });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visits));

      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'sw_flag_set', success: true }, '*');
      }
    } catch (e) {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'sw_error', error: e.message }, '*');
      }
    }
  }

  registerSW();
</script>
</body>
</html>
`;
	return c.html(page.toString());
});

export default app;

export const server = {
	port: 3002,
	fetch: app.fetch.bind(app),
};

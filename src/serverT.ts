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
    let result = { found: false, visits: [], error: null };

    try {
      const visits = JSON.parse(localStorage.getItem('${STORAGE_KEY}') || '[]');
      result.visits = visits;
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

export default app;

export const server = {
	port: 3002,
	fetch: app.fetch.bind(app),
};

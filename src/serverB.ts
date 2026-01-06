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
  <title>Game</title>
  <style>
    body { font-family: system-ui; max-width: 900px; margin: 40px auto; padding: 0 20px; background: #000; color: #e0e0e0; }
    h1 { color: #fff; }
    .sections { display: grid; gap: 16px; }
    .section { padding: 16px; background: #111; border: 1px solid #333; }
    .section h3 { margin: 0 0 12px 0; color: #fff; }
    .result { padding: 16px; margin-bottom: 16px; }
    .tracked { background: #0a2f0a; border: 2px solid #4caf50; }
    .not-tracked { background: #2f0a0a; border: 2px solid #f44336; }
    .checking { background: #1a0a2e; border: 2px solid #4a1a7e; }
    .result-title { font-size: 24px; font-weight: bold; margin-bottom: 8px; }
    .result-info { font-size: 14px; color: #aaa; }
    .method { display: inline-block; padding: 6px 12px; margin: 4px; background: #0a2f0a; border: 1px solid #4caf50; color: #4caf50; font-size: 13px; }
    .fp { font-family: monospace; font-size: 11px; padding: 6px 10px; margin: 4px 0; background: #0a0a0a; border: 1px solid #333; color: #8ab4f8; word-break: break-all; }
    button { padding: 8px 16px; cursor: pointer; border: 1px solid #444; background: #222; color: #e0e0e0; margin-right: 8px; margin-top: 8px; }
    button:hover { background: #333; }
    .saa-frame { width: 100%; height: 80px; border: 1px solid #333; background: #111; }
    .code { background: #0a0a0a; border: 1px solid #333; padding: 12px; font-family: monospace; font-size: 12px; overflow-x: auto; margin: 0; line-height: 1.5; }
    .code .kw { color: #c586c0; }
    .code .fn { color: #dcdcaa; }
    .code .str { color: #ce9178; }
    .code .prop { color: #9cdcfe; }
    .code .cmt { color: #6a9955; }
  </style>
</head>
<body>
  <div class="sections">
    <div id="result" class="result checking">
      <div class="result-title" id="result-title">Checking...</div>
      <div class="result-info" id="result-info">Verifying tracking status</div>
    </div>

    <div class="section">
      <h3>Verification Code</h3>
      <pre class="code"><span class="kw">const</span> res = <span class="kw">await</span> <span class="fn">fetch</span>(<span class="str">'${TRACKER_URL}/track-verify'</span>, {
  <span class="prop">credentials</span>: <span class="str">'include'</span>
});
<span class="kw">const</span> { cookieReceived } = <span class="kw">await</span> res.<span class="fn">json</span>();

<span class="cmt">// Если куки не найдены, пробуем через iframe с localStorage</span>
<span class="kw">const</span> iframe = <span class="fn">createElement</span>(<span class="str">'iframe'</span>);
iframe.<span class="prop">src</span> = <span class="str">'${TRACKER_URL}/embed?fp='</span> + fingerprint;
<span class="fn">postMessage</span>({ <span class="prop">type</span>: <span class="str">'saa_result'</span>, <span class="prop">found</span>, <span class="prop">visits</span> });</pre>
    </div>

    <div id="saa-container" class="section" style="display: none;">
      <h3>Storage Access</h3>
      <iframe id="saa-iframe" class="saa-frame"></iframe>
    </div>

    <div id="ss-container" class="section" style="display: none;">
      <h3>Shared Storage</h3>
      <div id="ss-status" class="fp">Checking...</div>
      <fencedframe id="ss-frame" style="width:1px;height:1px;border:none;"></fencedframe>
    </div>

    <div class="section">
      <h3>Fingerprint</h3>
      <div id="fingerprint" class="fp">Generating...</div>
    </div>

    <div class="section">
      <button onclick="runCheck()">Re-check</button>
      <button onclick="location.reload()">Refresh</button>
    </div>
  </div>

  <script>
    const TRACKER = '${TRACKER_URL}';
    let currentFp = null;

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
      if (crypto.subtle) {
        const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
        return Array.from(new Uint8Array(hashBuffer))
          .map(b => b.toString(16).padStart(2, '0')).join('');
      }
      const result = [];
      for (let j = 0; j < 8; j++) {
        let hash = j * 0x9e3779b9;
        for (let i = 0; i < data.length; i++) {
          hash = ((hash << 5) - hash + data.charCodeAt(i)) >>> 0;
          hash = (hash ^ (hash >>> 16)) >>> 0;
        }
        result.push(hash.toString(16).padStart(8, '0'));
      }
      return result.join('');
    }

    async function runCheck() {
      const resultEl = document.getElementById('result');
      const titleEl = document.getElementById('result-title');
      const infoEl = document.getElementById('result-info');

      resultEl.className = 'result checking';
      titleEl.textContent = 'Checking...';
      infoEl.textContent = 'Checking cookie...';

      currentFp = await generateFingerprint();
      document.getElementById('fingerprint').textContent = currentFp;

      let hasCookie = false;

      try {
        const res = await fetch(TRACKER + '/track-verify', { credentials: 'include' });
        const data = await res.json();
        hasCookie = data.cookieReceived;
      } catch {}

      checkSharedStorage();

      if (hasCookie) {
        showResult({ found: true, method: 'cookie', fpMatch: false, visits: [] });
      } else {
        infoEl.textContent = 'Checking storage...';
        showSAAIframe(false);
      }
    }

    async function checkSharedStorage() {
      const container = document.getElementById('ss-container');
      const statusEl = document.getElementById('ss-status');

      if (!window.sharedStorage || !window.sharedStorage.selectURL) {
        statusEl.textContent = 'Not supported';
        return;
      }

      container.style.display = 'block';
      statusEl.textContent = 'Loading worklet...';

      try {
        await window.sharedStorage.worklet.addModule(TRACKER + '/shared-storage-worklet.js');
        statusEl.textContent = 'Running selectURL...';

        const fencedFrameConfig = await window.sharedStorage.selectURL(
          'check-tracked',
          [
            { url: TRACKER + '/ss-tracked' },
            { url: TRACKER + '/ss-not-tracked' }
          ],
          { resolveToConfig: true }
        );

        const frame = document.getElementById('ss-frame');
        frame.config = fencedFrameConfig;
        statusEl.textContent = 'Waiting for result...';

        window.addEventListener('message', function ssHandler(e) {
          if (e.data && e.data.type === 'shared_storage_result') {
            window.removeEventListener('message', ssHandler);
            statusEl.textContent = e.data.tracked ? 'TRACKED via Shared Storage' : 'Not found';
            statusEl.style.color = e.data.tracked ? '#4caf50' : '#f44336';
          }
        });
      } catch (e) {
        statusEl.textContent = 'Error: ' + e.message;
      }
    }

    let cookieFound = false;

    function showSAAIframe(hasCookie) {
      cookieFound = hasCookie;
      const container = document.getElementById('saa-container');
      const iframe = document.getElementById('saa-iframe');
      container.style.display = 'block';
      iframe.src = TRACKER + '/embed?fp=' + encodeURIComponent(currentFp);

      window.addEventListener('message', handleSAAMessage);
    }

    function handleSAAMessage(e) {
      if (e.data && e.data.type === 'saa_result') {
        window.removeEventListener('message', handleSAAMessage);
        document.getElementById('saa-container').style.display = 'none';

        showResult({
          found: e.data.found || cookieFound,
          method: cookieFound ? 'cookie' : null,
          fpMatch: e.data.fpMatch,
          visits: e.data.visits
        });
      }
    }

    function showResult(data) {
      const resultEl = document.getElementById('result');
      const titleEl = document.getElementById('result-title');
      const infoEl = document.getElementById('result-info');

      const tracked = data.found;

      resultEl.className = 'result ' + (tracked ? 'tracked' : 'not-tracked');
      titleEl.textContent = tracked ? 'User Tracked' : 'Not Tracked';

      let methods = [];
      if (data.method) methods.push(data.method);
      if (data.visits && data.visits.length > 0) {
        data.visits.forEach(v => {
          const m = v.method || v.source || 'unknown';
          if (!methods.includes(m)) methods.push(m);
        });
      }
      if (data.fpMatch) methods.push('fingerprint');

      if (methods.length > 0) {
        infoEl.innerHTML = methods.map(m =>
          '<span class="method">' + m + '</span>'
        ).join('');
      } else {
        infoEl.textContent = 'No tracking data found';
      }
    }

    runCheck();
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
	port: Number(process.env.PORT) || 3003,
	hostname: "0.0.0.0",
	fetch: app.fetch.bind(app),
	...(tls && { tls }),
};

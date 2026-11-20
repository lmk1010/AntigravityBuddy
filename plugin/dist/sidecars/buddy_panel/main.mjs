/** AntigravityBuddy 面板。环境变量 ANTIGRAVITY_LS_ADDRESS / ANTIGRAVITY_CSRF_TOKEN 由 Antigravity 注入。 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SidecarApp, Response } from 'sidecar_sdk';
import { getData } from './lib/data.mjs';
import { startNative, nativeStatus, setNative, relaunchDebug } from './lib/native.mjs';

const dir = dirname(fileURLToPath(import.meta.url));
const app = new SidecarApp();
app.api('/api/data', async () => ({ ...(await getData()), native: nativeStatus() }), 'GET');
app.api('/api/native', data => setNative(data || {}), 'POST');
app.api('/api/relaunch', () => relaunchDebug(), 'POST');
const STATIC = { '/': ['index.html', 'text/html; charset=utf-8'], '/app.js': ['app.js', 'application/javascript; charset=utf-8'], '/styles.css': ['styles.css', 'text/css; charset=utf-8'] };
for (const [path, [file, type]] of Object.entries(STATIC)) app.page(path, () => new Response(readFileSync(join(dir, file), 'utf-8'), { contentType: type, headers: { 'Cache-Control': 'no-store' } }));
startNative();
app.run();

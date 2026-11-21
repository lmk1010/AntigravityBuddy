// 本地调试：node dev.mjs（需先设置 ANTIGRAVITY_LS_ADDRESS / ANTIGRAVITY_CSRF_TOKEN）
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getData } from './lib/data.mjs';
import { demoData } from './lib/demo.mjs';
import { snapshot, listAccounts } from './lib/accounts.mjs';
const dir = dirname(fileURLToPath(import.meta.url));
const T = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'application/javascript'], '/styles.css': ['styles.css', 'text/css'] };
createServer(async (q, r) => { const p = q.url.split('?')[0];
  if (p === '/api/data') { r.writeHead(200, { 'Content-Type': 'application/json' }); return r.end(JSON.stringify(process.env.DEMO ? demoData() : await (async () => { const d = await getData(); await snapshot(d.status, d.models); d.accounts = await listAccounts(); return d; })())); }
  if (p.startsWith('/illus/')) { try { r.writeHead(200, { 'Content-Type': 'image/jpeg' }); return r.end(readFileSync(join(dir, 'illus', p.slice(7)))); } catch { r.writeHead(404); return r.end(); } }
  const t = T[p]; if (!t) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': t[1] + '; charset=utf-8' }); r.end(readFileSync(join(dir, t[0])));
}).listen(+process.env.PORT || 4599, '127.0.0.1', () => console.log('dev on', +process.env.PORT || 4599));

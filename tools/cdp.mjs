// 调试用：在 Antigravity 主界面里执行一段 JS。node cdp.mjs '<表达式>'  或  node cdp.mjs @file.js
import { readFileSync } from 'node:fs'; import { homedir } from 'node:os';
const port = readFileSync(homedir() + '/Library/Application Support/Antigravity/DevToolsActivePort', 'utf8').split('\n')[0];
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const t = list.find(x => x.type === 'page' && /^https:\/\/127\.0\.0\.1:\d+\//.test(x.url)); if (!t) { console.error('no main page', list.map(x => x.url.slice(0, 60))); process.exit(1); }
let expr = process.argv[2]; if (expr.startsWith('@')) expr = readFileSync(expr.slice(1), 'utf8');
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true, awaitPromise: true } }));
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id === 1) { const r = m.result; console.log(r.exceptionDetails ? 'ERR ' + JSON.stringify(r.exceptionDetails.exception?.description || r.exceptionDetails).slice(0, 800) : typeof r.result.value === 'string' ? r.result.value : JSON.stringify(r.result.value, null, 1)); ws.close(); } };

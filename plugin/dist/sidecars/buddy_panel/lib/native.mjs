// 原生增强：经 Antigravity 的调试接口把输入框控件注入主界面，并定时推送数据。
// 只有 Antigravity 以 --remote-debugging-port 启动时才可用；默认关闭，由设置里的开关控制。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { getData, STORE_DIR, rawSessions } from './data.mjs';

const dir = dirname(fileURLToPath(import.meta.url));
const PORT_FILE = join(homedir(), 'Library', 'Application Support', 'Antigravity', 'DevToolsActivePort');
const CFG_FILE = join(STORE_DIR, 'settings.json');
const VERSION = '0.5.0';
let cfg = { native: false, ctx: true, speed: true, quota: true };
try { cfg = { ...cfg, ...JSON.parse(readFileSync(CFG_FILE, 'utf8')) }; } catch {}
const state = { status: 'off', detail: '', port: null, pushedAt: 0 };
let ws = null, seq = 0, timer = null;
const pending = new Map();

function send(method, params = {}) {
  return new Promise((res, rej) => { if (!ws || ws.readyState !== 1) return rej(new Error('未连接')); const id = ++seq; pending.set(id, [res, rej]); ws.send(JSON.stringify({ id, method, params })); setTimeout(() => { if (pending.delete(id)) rej(new Error(method + ' 超时')); }, 8000); });
}
async function findTarget() {
  let port; try { port = readFileSync(PORT_FILE, 'utf8').split('\n')[0].trim(); } catch { throw new Error('Antigravity 没有以调试模式启动'); }
  let list; try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(3000) })).json(); } catch { throw new Error('Antigravity 没有以调试模式启动'); }
  const t = list.find(x => x.type === 'page' && /^https:\/\/127\.0\.0\.1:\d+\//.test(x.url));
  if (!t) throw new Error('找不到 Antigravity 主界面');
  state.port = port; return t;
}
const source = () => readFileSync(join(dir, 'inject.js'), 'utf8').replace('__VERSION__', VERSION + ':' + Date.now());
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9.]/g, '');
// 与界面一致的 API 公开价（美元 / 百万 token）：输入、缓存读取、输出
const PRICE = [['gemini-4-neon', 3, .15, 15], ['gemini-4-carbon', 2, .1, 10], ['gemini-4-hydrogen', 1.5, .075, 7.5], ['gemini-4-argon', 2, .1, 10], ['claude-opus-5-5', 4, .2, 20], ['claude-sonnet-5-5', 2, .1, 10]];
const costOf = (m, i, o, c) => { const p = PRICE.find(x => String(m || '').startsWith(x[0])) || PRICE[0]; return (i * p[1] + c * p[2] + o * p[3]) / 1e6; };
const poolOf = m => /claude|gpt/i.test(m || '') ? 'claude' : /argon|g1-pro/i.test(m || '') ? 'argon' : 'gemini';
const median = a => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[b.length >> 1] : 0; };

export async function buildPayload() {
  const d = await getData(), conv = {}, quota = {}, now = Date.now() / 1000;
  for (const [sid, s] of Object.entries(rawSessions())) {
    const rs = (s.rows || []).slice().sort((a, b) => a[0] - b[0]); if (!rs.length) continue;
    const g = r => { const x = s.gm?.[r[6]]; return x && x[5] === r[2] && x[6] === r[3] ? x : null; };
    const last = rs[rs.length - 1], gl = g(last), ctxs = rs.map(r => r[2] + r[4]);
    const timed = rs.map(r => [r, g(r)]).filter(([r, x]) => x && x[1] >= .5 && r[3] > 0), lt = timed[timed.length - 1];
    conv[sid] = { ctx: last[2] + last[4], max: (gl && gl[4]) || 512000, cache: last[4], newIn: last[2], n: rs.length, drops: ctxs.filter((v, i) => i && v < ctxs[i - 1] * .6).length,
      bd: s.bd || null, tin: rs.reduce((a, r) => a + r[2], 0), tout: rs.reduce((a, r) => a + r[3], 0),
      dec: lt ? lt[0][3] / lt[1][1] : 0, med: median(timed.map(([r, x]) => r[3] / x[1])), ttft: lt ? lt[1][0] : 0, dur: lt ? lt[1][1] : 0, pre: lt && lt[1][0] > .05 ? (lt[0][2] + lt[0][4]) / lt[1][0] : 0 };
  }
  // 各额度池本窗口的花费，用来估算余额
  const all = []; for (const s of Object.values(rawSessions())) for (const r of s.rows || []) { const x = s.gm?.[r[6]], m = (x && x[5] === r[2] && x[6] === r[3] && x[3]) || r[1] || ''; all.push([r[0], poolOf(m), costOf(m, r[2], r[3], r[4]), r[2] + r[3] + r[4]]); }
  const d24 = all.filter(r => r[0] >= now - 86400), rate = d24.reduce((a, r) => a + r[2], 0) / Math.max(1, d24.reduce((a, r) => a + r[3], 0));
  const pools = {};
  for (const m of Object.values(d.models)) { const q = m.quotaInfo; if (!q?.resetTime || m.disabled || !m.displayName) continue; pools[q.resetTime] = (pools[q.resetTime] || new Set()).add(m.displayName); }
  for (const m of Object.values(d.models)) { const q = m.quotaInfo; if (!q?.resetTime || m.disabled || !m.displayName) continue; const reset = Math.floor(Date.parse(q.resetTime) / 1000), k = norm(m.displayName);
    if (!quota[k] || (q.remainingFraction ?? 0) < quota[k].f) { const f = q.remainingFraction ?? 0, five = reset - now <= 5 * 3600 + 600, pk = poolOf(Object.keys(d.models).find(id => d.models[id] === m)), rs = all.filter(r => r[0] >= reset - (five ? 5 * 3600 : 7 * 86400) && r[1] === pk);
      const used = rs.reduce((a, r) => a + r[2], 0), usedAll = rs.reduce((a, r) => a + r[3], 0), u = 1 - f, ok = u >= .03 && used > 0, left = ok ? used * f / u : null;
      quota[k] = { name: m.displayName, f, reset, kind: five ? '5 小时' : '每周', pool: pools[q.resetTime].size, used, usedAll, left, leftAll: ok && rate ? left / rate : null, idle: !usedAll }; } }
  return { at: Date.now(), cfg: { ctx: cfg.ctx, speed: cfg.speed, quota: cfg.quota }, conv, quota };
}
async function push() { const p = await buildPayload(); await send('Runtime.evaluate', { expression: `window.__buddy && window.__buddy.update(${JSON.stringify(p)})` }); state.pushedAt = Date.now(); }

let scriptId = null;
async function connect() {
  if (!cfg.native || (ws && ws.readyState <= 1)) return;
  try {
    const t = await findTarget();
    ws = new WebSocket(t.webSocketDebuggerUrl);
    ws.onmessage = e => { const m = JSON.parse(e.data); const p = pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p[1](new Error(m.error.message)) : p[0](m.result); } };
    ws.onclose = () => { ws = null; if (cfg.native) { state.status = 'waiting'; state.detail = '连接断开，稍后重试'; } };
    ws.onerror = () => {};
    await new Promise((res, rej) => { ws.onopen = res; setTimeout(() => rej(new Error('连接调试接口超时')), 5000); });
    const src = source();
    scriptId = (await send('Page.addScriptToEvaluateOnNewDocument', { source: src })).identifier;
    await send('Runtime.evaluate', { expression: src });
    await push(); state.status = 'on'; state.detail = '';
  } catch (e) { state.status = 'waiting'; state.detail = String(e.message || e); try { ws?.close(); } catch {} ws = null; }
}
async function disconnect() {
  try { if (ws && ws.readyState === 1) { if (scriptId) await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: scriptId }).catch(() => {}); await send('Runtime.evaluate', { expression: 'window.__buddy && (window.__buddy.dispose(), delete window.__buddy)' }).catch(() => {}); } } catch {}
  try { ws?.close(); } catch {} ws = null; scriptId = null; state.status = 'off'; state.detail = '';
}
function tick() { if (!cfg.native) return; if (ws && ws.readyState === 1) push().catch(e => { state.detail = String(e.message || e); }); else connect(); }
export function startNative() { if (timer) return; timer = setInterval(tick, 4000); if (cfg.native) connect(); }
export const nativeStatus = () => ({ ...cfg, status: cfg.native ? state.status : 'off', detail: state.detail, pushedAt: state.pushedAt });
export async function setNative(patch) {
  for (const k of ['native', 'ctx', 'speed', 'quota']) if (typeof patch[k] === 'boolean') cfg[k] = patch[k];
  try { mkdirSync(STORE_DIR, { recursive: true }); writeFileSync(CFG_FILE, JSON.stringify(cfg)); } catch {}
  if (!cfg.native) await disconnect(); else if (ws && ws.readyState === 1) await push().catch(() => {}); else await connect();
  return nativeStatus();
}
// 以调试模式重启 Antigravity。Buddy 后台是 Antigravity 的子进程，所以交给一个脱离出去的 shell 来做
export function relaunchDebug() {
  const sh = `sleep 1; osascript -e 'tell application "Antigravity" to quit'; i=0; while pgrep -x Antigravity >/dev/null && [ $i -lt 30 ]; do sleep 1; i=$((i+1)); done; open -a /Applications/Antigravity.app --args --remote-debugging-port=0`;
  spawn('/bin/sh', ['-c', sh], { detached: true, stdio: 'ignore' }).unref();
  return { ok: true };
}

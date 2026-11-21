// 多账号：Antigravity 把 Google 登录存在钥匙串 service=gemini / account=antigravity（go-keyring-base64 编码的 OAuth token）。
// Buddy 把每个见过的账号的登录另存一份到钥匙串 service=buddy-accounts / account=<邮箱>，切换时写回并重启 Antigravity。
// 秘密只在钥匙串里；plugin_data/buddy/accounts.json 只存邮箱、时间和最近一次看到的额度，不含任何令牌。
import { execFile, spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

const SVC = 'gemini', ACCT = 'antigravity', VAULT = 'buddy-accounts';
const DIR = join(homedir(), '.gemini', 'antigravity', 'plugin_data', 'buddy'), META = join(DIR, 'accounts.json');
const sec = args => new Promise(res => execFile('/usr/bin/security', args, { timeout: 8000 }, (e, out) => res(e ? null : String(out).trim())));
const decode = raw => { try { const p = 'go-keyring-base64:'; return JSON.parse(Buffer.from(raw.startsWith(p) ? raw.slice(p.length) : raw, 'base64').toString('utf8')); } catch { return null; } };
const valid = raw => { const j = raw && decode(raw); return j && j.token && j.token.refresh_token ? j : null; };

let meta = null;
function loadMeta() { if (meta) return meta; try { meta = JSON.parse(readFileSync(META, 'utf8')); } catch { meta = {}; } if (!meta.list) meta.list = []; return meta; }
function saveMeta() { mkdirSync(DIR, { recursive: true }); writeFileSync(META, JSON.stringify(meta, null, 1)); }
const entry = email => { const m = loadMeta(); let e = m.list.find(x => x.email === email); if (!e) { e = { email, added: Date.now() }; m.list.push(e); } return e; };

// 额度摘要：按重置时刻归组，取每组最低剩余比例
function poolsOf(models) {
  const g = new Map();
  for (const [id, m] of Object.entries(models || {})) {
    if (m.disabled || !m.quotaInfo?.resetTime) continue;
    const t = Math.floor(Date.parse(m.quotaInfo.resetTime) / 1000), k = Math.round(t / 60), f = m.quotaInfo.remainingFraction ?? 0;
    const p = /claude|opus|sonnet/i.test(id) ? 'claude' : /gpt|openai/i.test(id) ? 'openai' : 'gemini';
    const x = g.get(k) || { t, f: 1, provs: [] }; x.f = Math.min(x.f, f); if (!x.provs.includes(p)) x.provs.push(p); g.set(k, x);
  }
  return [...g.values()].sort((a, b) => a.t - b.t);
}

let lastSnap = 0, active = null;
// 每次取数据时顺手做：识别当前账号、把它的登录另存一份、记下它此刻的额度
export async function snapshot(status, models) {
  const now = Date.now();
  if (now - lastSnap > 60000 || !active) {
    lastSnap = now;
    const raw = await sec(['find-generic-password', '-s', SVC, '-a', ACCT, '-w']), j = valid(raw);
    if (j) {
      active = j.id_token_email || status?.email || null;
      if (active) { const old = await sec(['find-generic-password', '-s', VAULT, '-a', active, '-w']); if (old !== raw) await sec(['add-generic-password', '-U', '-s', VAULT, '-a', active, '-l', 'AntigravityBuddy account', '-w', raw]); }
    } else active = status?.email || null;
  }
  if (active) { const e = entry(active); e.seen = now; if (status?.name) e.name = status.name; if (status?.plan || status?.tier?.name) e.plan = status.tier?.name || status.plan; const ps = poolsOf(models); if (ps.length) e.pools = ps; saveMeta(); }
}

export async function listAccounts() {
  const m = loadMeta(), out = [];
  for (const e of m.list) out.push({ ...e, active: e.email === active, saved: !!(await sec(['find-generic-password', '-s', VAULT, '-a', e.email])), ip: e.ip || null });
  return { active, list: out.sort((a, b) => (b.active - a.active) || (b.seen || 0) - (a.seen || 0)), switching: m.switching || null };
}

// 退出 Antigravity → 写回钥匙串 → 重新打开。用独立进程做，Antigravity 退出时 sidecar 也会被关掉
function restartWith(script, debug) {
  const open = `open -a /Applications/Antigravity.app${debug ? ' --args --remote-debugging-port=0' : ''}`;
  const sh = `sleep 1; osascript -e 'tell application "Antigravity" to quit'; i=0; while pgrep -x Antigravity >/dev/null && [ $i -lt 40 ]; do sleep 1; i=$((i+1)); done; sleep 1; ${script}; ${open}`;
  spawn('/bin/sh', ['-c', sh], { detached: true, stdio: 'ignore' }).unref();
}
export async function switchTo(email, debug) {
  if (!email || email === active) return { ok: false, error: '已经是这个账号' };
  const raw = await sec(['find-generic-password', '-s', VAULT, '-a', email, '-w']);
  if (!valid(raw)) return { ok: false, error: '这个账号的登录没有保存，需要在 Antigravity 里重新登录一次' };
  // 秘密写进 0600 的临时文件，由 security -i 读入，不出现在进程参数里；用完即删
  const f = join(tmpdir(), `buddy-sw-${process.pid}-${Date.now()}`);
  writeFileSync(f, `add-generic-password -U -s ${SVC} -a ${ACCT} -w "${raw}"\n`); chmodSync(f, 0o600);
  const m = loadMeta(); m.switching = { to: email, at: Date.now() }; saveMeta();
  restartWith(`/usr/bin/security -i < '${f}'; rm -f '${f}'`, debug);
  return { ok: true };
}
// 添加账号：先确认当前账号已存好，再清掉 Antigravity 的登录并重启，让它出现登录页；登录新账号后 Buddy 会自动记下
export async function addAccount(debug) {
  if (active) await snapshot(null, null);
  if (active && !(await sec(['find-generic-password', '-s', VAULT, '-a', active]))) return { ok: false, error: '当前账号还没保存好，稍后再试' };
  restartWith(`/usr/bin/security delete-generic-password -s ${SVC} -a ${ACCT} >/dev/null 2>&1`, debug);
  return { ok: true };
}
export async function removeAccount(email) {
  if (email === active) return { ok: false, error: '不能删除正在使用的账号' };
  await sec(['delete-generic-password', '-s', VAULT, '-a', email]);
  const m = loadMeta(); m.list = m.list.filter(x => x.email !== email); saveMeta();
  return { ok: true };
}
export function clearSwitching() { const m = loadMeta(); if (m.switching) { delete m.switching; saveMeta(); } }

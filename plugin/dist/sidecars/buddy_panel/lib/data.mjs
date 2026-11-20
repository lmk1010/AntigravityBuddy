// AntigravityBuddy 数据层：只读 Antigravity 的本地接口与会话记录。
import { readFileSync, readdirSync, statSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, basename } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = join(homedir(), '.gemini', 'antigravity');
const BRAIN = join(ROOT, 'brain');
export const STORE_DIR = join(ROOT, 'plugin_data', 'buddy');
const STORE = join(STORE_DIR, 'usage.json');
const PREFIX = '/exa.language_server_pb.LanguageServerService/';

export async function lsRpc(method, body = {}, timeout = 8000) {
  const res = await fetch(`http://${process.env.ANTIGRAVITY_LS_ADDRESS}${PREFIX}${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-codeium-csrf-token': process.env.ANTIGRAVITY_CSRF_TOKEN },
    body: JSON.stringify(body), signal: AbortSignal.timeout(timeout),
  });
  if (!res.ok) throw new Error(`${method}: HTTP ${res.status}`);
  return res.json();
}

// 会话标题、父子关系：读 Antigravity 的摘要库（只读）
function loadMeta() {
  try {
    const db = join(ROOT, 'conversation_summaries.db');
    const sql = 'select conversation_id id, title, parent_conversation_id parent, agent_name agent, workspace_uris ws from conversation_summaries';
    const run = uri => execFileSync('/usr/bin/sqlite3', ['-json', uri, sql], { encoding: 'utf8', timeout: 5000, maxBuffer: 32 << 20, stdio: ['ignore', 'pipe', 'ignore'] });
    // 只读打开；库处于 WAL 模式且没有 -shm 文件时 mode=ro 打不开，退到 immutable（纯读文件，不加锁不写任何东西）
    let out; try { out = run(`file:${db}?mode=ro`); } catch { out = run(`file:${db}?immutable=1`); }
    const m = {};
    for (const r of JSON.parse(out || '[]')) m[r.id] = r;
    return m;
  } catch { return {}; }
}
const wsName = s => basename(String(s || '').split(',')[0].replace(/["\]\/\s]+$/g, '')) || '';

function parseTranscript(file) {
  const rows = [];
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.includes('"input_tokens"')) continue;
    let j; try { j = JSON.parse(line); } catch { continue; }
    if (j.input_tokens == null || !j.created_at) continue;
    const t = Math.floor(Date.parse(j.created_at) / 1000);
    if (!Number.isFinite(t)) continue;
    rows.push([t, j.model || null, +j.input_tokens || 0, +j.output_tokens || 0, +j.cache_read_tokens || 0,
      Array.isArray(j.tool_calls) ? j.tool_calls.length : 0, +j.step_index || 0, j.thinking ? 1 : 0]);
  }
  return rows;
}

// 每次调用的首字延迟、流式耗时、思考 token、确切模型、上下文上限：来自 GetCascadeTrajectoryGeneratorMetadata
const secs = v => { const n = parseFloat(String(v || '')); return Number.isFinite(n) ? +n.toFixed(3) : 0; };
async function loadGen(sid) {
  const d = await lsRpc('GetCascadeTrajectoryGeneratorMetadata', { cascadeId: sid }, 45000);
  const gm = {}; let bd = null;
  for (const g of d.generatorMetadata || []) {
    const cm = g.chatModel || {}, u = cm.usage || {};
    const v = [secs(cm.timeToFirstToken), secs(cm.streamingDuration), +u.thinkingOutputTokens || 0, g.plannerConfig?.modelName || cm.responseModel || null,
      +cm.chatStartMetadata?.contextWindowMetadata?.maxContextTokens || 0, +u.inputTokens || 0, +u.outputTokens || 0];
    for (const i of g.stepIndices || []) gm[i] = v;
    // 上下文构成（系统提示 / 工具 / 对话消息 …）只在最近一次调用上有
    const cw = cm.chatStartMetadata?.contextWindowMetadata, gs = cw?.tokenBreakdown?.groups;
    if (gs?.length) bd = { est: +cw.estimatedTokensUsed || 0, groups: gs.map(x => [x.name, +x.numTokens || 0, (x.children || []).map(c => [c.name, +c.numTokens || 0]).sort((a, b) => b[1] - a[1]).slice(0, 4)]) };
  }
  return { gm, bd };
}

let store = null;
export const rawSessions = () => loadStore().sessions;
function loadStore() {
  if (store) return store;
  try { store = JSON.parse(readFileSync(STORE, 'utf8')); } catch { store = { sessions: {} }; }
  if (!store.sessions) store.sessions = {};
  return store;
}

// Antigravity 只保留近期会话，所以解析结果存一份到 plugin_data/buddy，会话被清掉后统计仍在
export async function getUsage() {
  const st = loadStore(); let dirty = false;
  let dirs = []; try { dirs = readdirSync(BRAIN); } catch {}
  for (const sid of dirs) {
    const f = join(BRAIN, sid, '.system_generated', 'logs', 'transcript.jsonl');
    let s; try { s = statSync(f); } catch { continue; }
    const sig = `${s.size}:${Math.floor(s.mtimeMs)}`;
    if (st.sessions[sid]?.sig === sig) continue;
    try { st.sessions[sid] = { ...(st.sessions[sid] || {}), sig, rows: parseTranscript(f) }; dirty = true; } catch {}
  }
  // 调用元数据：会话有变化时才重新拉；失败的不反复重试
  for (const [sid, s] of Object.entries(st.sessions)) {
    if ((s.gmSig === s.sig && s.gmV === 2) || !s.rows?.length || !existsSync(join(BRAIN, sid))) continue;
    try { const r = await loadGen(sid); s.gm = r.gm; if (r.bd) s.bd = r.bd; } catch { s.gm = s.gm || {}; }
    s.gmSig = s.sig; s.gmV = 2; dirty = true;
  }
  const meta = loadMeta();
  for (const [sid, s] of Object.entries(st.sessions)) {
    const m = meta[sid]; if (!m) continue;
    const next = { title: m.title || '', parent: m.parent || '', agent: m.agent || '', ws: wsName(m.ws) };
    if (['title', 'parent', 'agent', 'ws'].some(k => s[k] !== next[k])) { Object.assign(s, next); dirty = true; }
  }
  if (dirty) { try { mkdirSync(STORE_DIR, { recursive: true }); writeFileSync(STORE, JSON.stringify(st)); } catch {} }

  const models = [], sessions = [], rows = [];
  const mi = m => { if (!m) return -1; let i = models.indexOf(m); if (i < 0) { models.push(m); i = models.length - 1; } return i; };
  for (const [sid, s] of Object.entries(st.sessions)) {
    if (!s.rows?.length) continue;
    const idx = sessions.length, cnt = {};
    for (const r of s.rows) { const g = s.gm?.[r[6]], ok = g && g[5] === r[2] && g[6] === r[3];   // 步骤号、输入、输出都对得上才采用
      const k = mi((ok && g[3]) || r[1]); if (k >= 0) cnt[k] = (cnt[k] || 0) + 1;
      rows.push([r[0], idx, k, r[2], r[3], r[4], r[5], r[6], r[7], ok ? g[0] : 0, ok ? g[1] : 0, ok ? g[2] : 0, ok ? g[4] : 0]); }
    const known = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
    sessions.push({ id: sid.slice(0, 8), title: s.title || '未命名会话', parent: (s.parent || '').slice(0, 8), agent: s.agent || '', ws: s.ws || '', known: known ? +known[0] : -1 });
  }
  rows.sort((a, b) => a[0] - b[0]);
  return { models, sessions, rows };
}

export async function getData() {
  const out = { at: Date.now(), usage: await getUsage(), status: null, models: {}, ls: process.env.ANTIGRAVITY_LS_ADDRESS || null, error: null,
    paths: { brain: BRAIN.replace(homedir(), '~'), store: STORE.replace(homedir(), '~') } };
  try {
    const [status, models] = await Promise.all([lsRpc('GetUserStatus'), lsRpc('GetAvailableModels')]);
    out.status = status.userStatus ?? null; out.models = models.response?.models ?? {};
    // 只把界面用得到的字段发给前端
    out.models = Object.fromEntries(Object.entries(out.models).map(([id, m]) => [id, { displayName: m.displayName || null, quotaInfo: m.quotaInfo || null, disabled: !!m.disabled, provider: m.modelProvider || '' }]));
    try { const st = loadStore(), snap = {}; for (const m of Object.values(out.models)) { const q = m.quotaInfo; if (!q?.resetTime || m.disabled) continue; const f = q.remainingFraction ?? 0; snap[q.resetTime] = Math.min(snap[q.resetTime] ?? 1, f); }
      const key = JSON.stringify(snap); if (st.lastSnap !== key) { st.lastSnap = key; (st.quota = st.quota || []).push([Math.floor(Date.now() / 1000), snap]); if (st.quota.length > 5000) st.quota.splice(0, st.quota.length - 5000); mkdirSync(STORE_DIR, { recursive: true }); writeFileSync(STORE, JSON.stringify(st)); } } catch {}
    if (out.status) { const p = out.status.planStatus || {}, i = p.planInfo || {};
      const tier = out.status.userTier || {}; out.status = { tier: { id: tier.id || '', name: tier.name || '', teams: i.teamsTier || '' }, name: out.status.name || '', email: out.status.email || '', plan: i.planName || '', promptAvail: p.availablePromptCredits ?? null, promptTotal: i.monthlyPromptCredits ?? null, flowAvail: p.availableFlowCredits ?? null, flowTotal: i.monthlyFlowCredits ?? null }; }
  } catch (e) { out.error = String(e.message || e); }
  return out;
}

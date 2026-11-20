/* ===== 数据层：全部来自 /api/data（Antigravity 本地接口 + 会话记录） ===== */
let U = { models: [], sessions: [], rows: [] }, LIVE = { at: 0 }, NOW = Math.floor(Date.now() / 1000), SE = [], ROWS = [], WINS = [], ACC = [];
const TZ_AUTO = -new Date().getTimezoneOffset() * 60, TZ_OPT = { auto: TZ_AUTO, sh: 8 * 3600, utc: 0 };
let TZ = TZ_AUTO;
const tzLabel = () => { const h = TZ / 3600; return 'GMT' + (h >= 0 ? '+' : '') + h; };
const hh = n => String(n).padStart(2, '0');
const L = t => new Date((t + TZ) * 1000);
const fT = t => { const d = L(t); return `${hh(d.getUTCHours())}:${hh(d.getUTCMinutes())}:${hh(d.getUTCSeconds())}`; };
const fD = t => { const d = L(t); return `${hh(d.getUTCMonth() + 1)}-${hh(d.getUTCDate())}`; };
const fmt = n => st.fullnum ? comma(n) : n >= 1e9 ? (n / 1e9).toFixed(2) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(n >= 1e8 ? 0 : 2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e5 ? 0 : 1) + 'K' : String(Math.round(n));
const ax = n => n >= 1e6 ? +(n / 1e6).toFixed(n < 1e7 ? 1 : 0) + 'M' : n >= 1e3 ? +(n / 1e3).toFixed(0) + 'K' : String(Math.round(n));
const comma = n => Math.round(n).toLocaleString('en-US');
const pct = (a, b) => b ? a / b : 0;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fUSD = v => '$' + (v >= 100 ? comma(v) : v >= 10 ? v.toFixed(1) : v.toFixed(2));
const WD = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const atLocal = t => fD(t) === fD(NOW) ? fT(t).slice(0, 5) : t - NOW < 7 * 86400 ? `${WD[L(t).getUTCDay()]} ${fT(t).slice(0, 5)}` : `${fD(t)} ${fT(t).slice(0, 5)}`;
const cdStr = s => s <= 0 ? '已重置' : s >= 86400 ? `${Math.floor(s / 86400)}d ${Math.floor(s % 86400 / 3600)}h` : `${Math.floor(s / 3600)}h ${hh(Math.floor(s % 3600 / 60))}m`;
const winAt = k => atLocal(WINS[k].t), winCd = k => cdStr(WINS[k].t - NOW), winProg = k => Math.max(0, Math.min(1, 1 - (WINS[k].t - NOW) / WINS[k].len));
const CW = () => Math.max(document.documentElement.clientWidth, 1000) - 64;
// API 公开价（美元 / 百万 token）。引自 agy-powertools 的价格表（其标注核对于 2026-11-19），未独立核实
const PRICE = [['gemini-4-neon', 3, .15, 15], ['gemini-4-carbon', 2, .1, 10], ['gemini-4-hydrogen', 1.5, .075, 7.5], ['gemini-4-argon', 2, .1, 10], ['claude-opus-5-5', 4, .2, 20], ['claude-sonnet-5-5', 2, .1, 10]];
const MODEL_NAME = i => i < 0 ? '未标注' : U.models[i];
const rateOf = name => PRICE.find(p => name.startsWith(p[0])) || PRICE[0];   // 未标注或无价格的记录按 Neon 价估算
const costOf = r => { const p = rateOf(MODEL_NAME(r.m)); return (r.in * p[1] + r.cache * p[2] + r.out * p[3]) / 1e6; };
const LOGO = __LOGOS__;
// 套餐标签：按层级名配色。免费灰、Pro 蓝、Ultra 金、团队/企业 青；试用加虚线框。只在 Pro 账号上实测过，其余按名称匹配
const planTag = a => { if (!a.p) return ''; const t = a.tier || '', cls = /ultra/i.test(t) ? 'ultra' : /team|enterprise|business|hybrid/i.test(t) && !/TEAMS_TIER_PRO\b/.test(t) ? 'team' : /pro/i.test(t) ? 'pro' : /free|standard/i.test(t) ? 'free' : 'std', trial = /trial/i.test(t); return `<span class="pill plan ${cls}${trial ? ' trial' : ''}">${a.p.replace(/\s*TRIAL\s*/i, '')}${trial ? ' · 试用' : ''}</span>`; };

function loadData(p) {
  LIVE = p; U = p.usage; NOW = Math.floor(Date.now() / 1000);
  SE = U.sessions.map((s, i) => ({ ...s, i, title: esc(s.title), agent: esc(s.agent) }));
  SE.forEach(s => { const par = s.parent && SE.find(x => x.id === s.parent); s.root = par ? par.i : s.i; s.child = !!par; });
  SE.forEach(s => { if (s.title === '未命名会话') s.title = s.child ? `子代理 · ${s.agent}` : `后台任务 ${s.id}`; });
  SE.forEach(s => { s.kids = SE.filter(x => x.child && x.root === s.i).length; });
  ROWS = U.rows.map((r, idx) => ({ idx, t: r[0], s: r[1], root: SE[r[1]].root, m: r[2] >= 0 ? r[2] : SE[r[1]].known, raw: r[2] >= 0, in: r[3], out: r[4], cache: r[5], tools: r[6], step: r[7], think: r[8], ttft: r[9] || 0, dur: r[10] || 0, tk: r[11] || 0, maxCtx: r[12] || 0 }));
  // 解码速度 = 输出 ÷ 流式耗时；prefill 速度 = 整个输入 ÷ 首字延迟（含网络与排队，偏保守）
  ROWS.forEach(r => { r.dec = r.dur >= .5 && r.out > 0 ? r.out / r.dur : 0; r.pre = r.ttft > .05 ? (r.in + r.cache) / r.ttft : 0; });
  ROWS.forEach(r => { r.cost = costOf(r); });
  const s = p.status;
  ACC = [s ? { l: esc((s.name || '?')[0].toUpperCase()), c: '#3b5bdb', n: esc(s.name), e: esc(s.email), p: esc((s.tier?.name || s.plan || '').replace(/^Google\s+AI\s*/i, '').toUpperCase()), tier: (s.tier?.id || '') + ' ' + (s.tier?.name || '') + ' ' + (s.tier?.teams || '') + ' ' + (s.plan || ''), pa: s.promptAvail, pb: s.promptTotal, fa: s.flowAvail, fb: s.flowTotal }
    : { l: '?', c: '#3f3f46', n: '未连接', e: '读不到账号状态', p: '', pa: null, pb: null, fa: null, fb: null }];
  buildQuota(p.models || {});
  if (st.fModel != null && st.fModel >= U.models.length) st.fModel = null;
  if (st.fSess != null && !SE[st.fSess]) st.fSess = null;
  if (st.lg.sel != null && !ROWS[st.lg.sel]) st.lg.sel = null;
}

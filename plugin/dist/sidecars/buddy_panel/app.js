'use strict';
/* ===== 数据层：全部来自 /api/data（Antigravity 本地接口 + 会话记录） ===== */
// 演示截图用：?at=16:40 把「现在」挪到今天 16:40（只影响显示，真实数据不会带这个参数）
const SHIFT = (() => { const a = new URLSearchParams(location.search).get('at'); if (!a) return 0; const [h, m] = a.split(':').map(Number), d = new Date(), t = new Date(d); t.setHours(h, m, 0, 0); return Math.round((t - d) / 1000); })();
const nowS = () => Math.floor(Date.now() / 1000) + SHIFT;
let U = { models: [], sessions: [], rows: [] }, LIVE = { at: 0 }, NOW = nowS(), SE = [], ROWS = [], WINS = [], ACC = [];
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
const LOGO = {gemini:'data:image/svg+xml,%3Csvg%20height%3D%221em%22%20style%3D%22flex%3Anone%3Bline-height%3A1%22%20viewBox%3D%220%200%2024%2024%22%20width%3D%221em%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Ctitle%3EGemini%3C/title%3E%3Cpath%20d%3D%22M20.616%2010.835a14.147%2014.147%200%2001-4.45-3.001%2014.111%2014.111%200%2001-3.678-6.452.503.503%200%2000-.975%200%2014.134%2014.134%200%2001-3.679%206.452%2014.155%2014.155%200%2001-4.45%203.001c-.65.28-1.318.505-2.002.678a.502.502%200%20000%20.975c.684.172%201.35.397%202.002.677a14.147%2014.147%200%20014.45%203.001%2014.112%2014.112%200%20013.679%206.453.502.502%200%2000.975%200c.172-.685.397-1.351.677-2.003a14.145%2014.145%200%20013.001-4.45%2014.113%2014.113%200%20016.453-3.678.503.503%200%20000-.975%2013.245%2013.245%200%2001-2.003-.678z%22%20fill%3D%22%233186FF%22%3E%3C/path%3E%3Cpath%20d%3D%22M20.616%2010.835a14.147%2014.147%200%2001-4.45-3.001%2014.111%2014.111%200%2001-3.678-6.452.503.503%200%2000-.975%200%2014.134%2014.134%200%2001-3.679%206.452%2014.155%2014.155%200%2001-4.45%203.001c-.65.28-1.318.505-2.002.678a.502.502%200%20000%20.975c.684.172%201.35.397%202.002.677a14.147%2014.147%200%20014.45%203.001%2014.112%2014.112%200%20013.679%206.453.502.502%200%2000.975%200c.172-.685.397-1.351.677-2.003a14.145%2014.145%200%20013.001-4.45%2014.113%2014.113%200%20016.453-3.678.503.503%200%20000-.975%2013.245%2013.245%200%2001-2.003-.678z%22%20fill%3D%22url%28%23lobe-icons-gemini-0-_R_0_%29%22%3E%3C/path%3E%3Cpath%20d%3D%22M20.616%2010.835a14.147%2014.147%200%2001-4.45-3.001%2014.111%2014.111%200%2001-3.678-6.452.503.503%200%2000-.975%200%2014.134%2014.134%200%2001-3.679%206.452%2014.155%2014.155%200%2001-4.45%203.001c-.65.28-1.318.505-2.002.678a.502.502%200%20000%20.975c.684.172%201.35.397%202.002.677a14.147%2014.147%200%20014.45%203.001%2014.112%2014.112%200%20013.679%206.453.502.502%200%2000.975%200c.172-.685.397-1.351.677-2.003a14.145%2014.145%200%20013.001-4.45%2014.113%2014.113%200%20016.453-3.678.503.503%200%20000-.975%2013.245%2013.245%200%2001-2.003-.678z%22%20fill%3D%22url%28%23lobe-icons-gemini-1-_R_0_%29%22%3E%3C/path%3E%3Cpath%20d%3D%22M20.616%2010.835a14.147%2014.147%200%2001-4.45-3.001%2014.111%2014.111%200%2001-3.678-6.452.503.503%200%2000-.975%200%2014.134%2014.134%200%2001-3.679%206.452%2014.155%2014.155%200%2001-4.45%203.001c-.65.28-1.318.505-2.002.678a.502.502%200%20000%20.975c.684.172%201.35.397%202.002.677a14.147%2014.147%200%20014.45%203.001%2014.112%2014.112%200%20013.679%206.453.502.502%200%2000.975%200c.172-.685.397-1.351.677-2.003a14.145%2014.145%200%20013.001-4.45%2014.113%2014.113%200%20016.453-3.678.503.503%200%20000-.975%2013.245%2013.245%200%2001-2.003-.678z%22%20fill%3D%22url%28%23lobe-icons-gemini-2-_R_0_%29%22%3E%3C/path%3E%3Cdefs%3E%3ClinearGradient%20gradientUnits%3D%22userSpaceOnUse%22%20id%3D%22lobe-icons-gemini-0-_R_0_%22%20x1%3D%227%22%20x2%3D%2211%22%20y1%3D%2215.5%22%20y2%3D%2212%22%3E%3Cstop%20stop-color%3D%22%2308B962%22%3E%3C/stop%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%2308B962%22%20stop-opacity%3D%220%22%3E%3C/stop%3E%3C/linearGradient%3E%3ClinearGradient%20gradientUnits%3D%22userSpaceOnUse%22%20id%3D%22lobe-icons-gemini-1-_R_0_%22%20x1%3D%228%22%20x2%3D%2211.5%22%20y1%3D%225.5%22%20y2%3D%2211%22%3E%3Cstop%20stop-color%3D%22%23F94543%22%3E%3C/stop%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23F94543%22%20stop-opacity%3D%220%22%3E%3C/stop%3E%3C/linearGradient%3E%3ClinearGradient%20gradientUnits%3D%22userSpaceOnUse%22%20id%3D%22lobe-icons-gemini-2-_R_0_%22%20x1%3D%223.5%22%20x2%3D%2217.5%22%20y1%3D%2213.5%22%20y2%3D%2212%22%3E%3Cstop%20stop-color%3D%22%23FABC12%22%3E%3C/stop%3E%3Cstop%20offset%3D%22.46%22%20stop-color%3D%22%23FABC12%22%20stop-opacity%3D%220%22%3E%3C/stop%3E%3C/linearGradient%3E%3C/defs%3E%3C/svg%3E',claude:'data:image/svg+xml,%3Csvg%20height%3D%221em%22%20style%3D%22flex%3Anone%3Bline-height%3A1%22%20viewBox%3D%220%200%2024%2024%22%20width%3D%221em%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Ctitle%3EClaude%3C/title%3E%3Cpath%20d%3D%22M4.709%2015.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0%2011.784l.055-.352.48-.321.686.06%201.52.103%202.278.158%201.652.097%202.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686%201.908%201.476%202.491%201.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97%202.97%200%2001-.104-.729L6.283.134%206.696%200l.996.134.42.364.62%201.414%201.002%202.229%201.555%203.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286%201.851-.559%202.903-.364%201.942h.212l.243-.242.985-1.306%201.652-2.064.73-.82.85-.904.547-.431h1.033l.76%201.129-.34%201.166-1.064%201.347-.881%201.142-1.264%201.7-.79%201.36.073.11.188-.02%202.856-.606%201.543-.28%201.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061%201.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093%201.068%202.006%201.81%202.509%202.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649%202.345%203.521.122%201.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674%207.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434%201.967-2.18%202.945-1.726%201.845-.414.164-.717-.37.067-.662.401-.589%202.388-3.036%201.44-1.882.93-1.086-.006-.158h-.055L4.132%2018.56l-1.13.146-.487-.456.061-.746.231-.243%201.908-1.312-.006.006z%22%20fill%3D%22%23D97757%22%20fill-rule%3D%22nonzero%22%3E%3C/path%3E%3C/svg%3E',openai:'data:image/svg+xml,%3Csvg%20fill%3D%22%23E6E6EA%22%20fill-rule%3D%22evenodd%22%20height%3D%221em%22%20style%3D%22flex%3Anone%3Bline-height%3A1%22%20viewBox%3D%220%200%2024%2024%22%20width%3D%221em%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Ctitle%3EOpenAI%3C/title%3E%3Cpath%20d%3D%22M9.205%208.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357%201.356-.523%202.117-.523%202.854%200%204.662%202.212%204.662%204.566%200%20.167%200%20.357-.024.547l-4.71-2.759a.797.797%200%2000-.856%200l-5.97%203.473zm10.609%208.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473%201.95-1.118a.433.433%200%2001.476%200l4.543%202.617c1.309.76%202.189%202.378%202.189%203.948%200%201.808-1.07%203.473-2.76%204.163zM7.802%2012.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545%201.95-4.472%204.591-4.472%201%200%201.927.333%202.712.928L8.23%205.067c-.285.166-.428.404-.428.737v6.898zM12%2015.128l-2.795-1.57v-3.33L12%208.658l2.795%201.57v3.33L12%2015.128zm1.796%207.23c-1%200-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974%201.142c.167.095.238.238.238.428v5.233c0%202.545-1.974%204.472-4.614%204.472zm-5.637-5.303l-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482%204.482%200%20014.21%206.327v5.423c0%20.333.143.571.428.738l5.947%203.449-1.95%201.118a.432.432%200%2001-.476%200zm-.262%203.9c-2.688%200-4.662-2.021-4.662-4.519%200-.19.024-.38.047-.57l4.686%202.71c.286.167.571.167.856%200l5.97-3.448v2.26c0%20.19-.07.333-.237.428l-4.543%202.616c-.619.357-1.356.523-2.117.523zm5.899%202.83a5.947%205.947%200%20005.827-4.756C22.287%2018.339%2024%2015.84%2024%2013.296c0-1.665-.713-3.282-1.998-4.448.119-.5.19-.999.19-1.498%200-3.401-2.759-5.947-5.946-5.947-.642%200-1.26.095-1.88.31A5.962%205.962%200%200010.205%200a5.947%205.947%200%2000-5.827%204.757C1.713%205.447%200%207.945%200%2010.49c0%201.666.713%203.283%201.998%204.448-.119.5-.19%201-.19%201.499%200%203.401%202.759%205.946%205.946%205.946.642%200%201.26-.095%201.88-.309a5.96%205.96%200%20004.162%201.713z%22%3E%3C/path%3E%3C/svg%3E'};
// 套餐标签：按层级名配色。免费灰、Pro 蓝、Ultra 金、团队/企业 青；试用加虚线框。只在 Pro 账号上实测过，其余按名称匹配
const planTag = a => { if (!a.p) return ''; const t = a.tier || '', cls = /ultra/i.test(t) ? 'ultra' : /team|enterprise|business|hybrid/i.test(t) && !/TEAMS_TIER_PRO\b/.test(t) ? 'team' : /pro/i.test(t) ? 'pro' : /free|standard/i.test(t) ? 'free' : 'std', trial = /trial/i.test(t); return `<span class="pill plan ${cls}${trial ? ' trial' : ''}">${a.p.replace(/\s*TRIAL\s*/i, '')}${trial ? ' · 试用' : ''}</span>`; };

function loadData(p) {
  LIVE = p; U = p.usage; NOW = nowS();
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

const st = {
  view: 'buddy', tab: 'overview', range: '24h', gran: 'auto', cr: null, fx: { prov: null, win: null, who: 'all', miss: false, big: false }, stack: 'type', ov: { hit: true, cum: true, avg: true }, fModel: null, fSess: null, metric: 'real', menu: null,
  sp: 'general', fullnum: false, syncInt: 1, keep: 2, clearAsk: false, al: { pin: true, cur: true, reset: false, hit: false, big: true, sys: true, dot: true },
  credits: 'abs', native: true, nCtx: true, nSpeed: true, nQuota: true, theme: 0, alert: 1, predict: true,
  q: { f: 'used', prov: null, s: '', open: null, pins: new Set(['gemini-4-neon-high', 'claude-opus-5-5-high', 'gemini-4-neon-xhigh']) },
  lg: { sort: 't', dir: -1, sel: null, s: '', miss: false, big: false, limit: 60, bucket: null },
  acc: { cur: 0, sw: null, step: 0, open: null, wait: true }, tz: 'auto',
  rep: { week: false, on: true, at: '18:30', last: '' }, ctype: 'bar',
  chat: { aux: true, pop: null, model: 'gemini-4-neon-high' },
};

// 时间范围：预设 + 自定义；粒度自动（≤2 天按小时，≤6 小时按 15 分钟，1 小时按 5 分钟），也可手动指定
const RANGES = { '1h': '近 1 小时', '6h': '近 6 小时', '24h': '近 24 小时', '48h': '近 48 小时', today: '今天', yday: '昨天', '7d': '近 7 天', '14d': '近 14 天', '30d': '近 30 天', wk: '本周', mo: '本月', lmo: '上月', all: '全部', custom: '自定义' };
const RANGE_GROUPS = [['1h', '6h', '24h', '48h'], ['today', 'yday', 'wk', 'mo', 'lmo'], ['7d', '14d', '30d', 'all']];
const dayOf = t => Math.floor((t + TZ) / 86400) * 86400 - TZ;
const monthStart = (t, back = 0) => { const d = L(t); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - back, 1) / 1000 - TZ; };
function span() {
  const d0 = dayOf(NOW), H = 3600, D = 86400, r = st.range;
  const rel = { '1h': H, '6h': 6 * H, '24h': 24 * H, '48h': 48 * H }[r];
  if (rel) { const step = rel <= H ? 300 : rel <= 6 * H ? 900 : H, end = Math.ceil(NOW / step) * step; return { a: end - rel, b: end, step }; }
  if (r === 'today') return { a: d0, b: d0 + D };
  if (r === 'yday') return { a: d0 - D, b: d0 };
  if (r === '7d' || r === '14d' || r === '30d') return { a: d0 + D - parseInt(r) * D, b: d0 + D };
  if (r === 'wk') return { a: d0 - ((L(NOW).getUTCDay() + 6) % 7) * D, b: d0 + D };
  if (r === 'mo') return { a: monthStart(NOW), b: d0 + D };
  if (r === 'lmo') return { a: monthStart(NOW, 1), b: monthStart(NOW) };
  if (r === 'custom' && st.cr) return { a: st.cr[0], b: st.cr[1] + D };
  return { a: Math.min(dayOf(ROWS.length ? ROWS[0].t : NOW), d0 - 6 * D), b: d0 + D };
}
const GRANS = { auto: '自动', '15m': '15 分钟', h: '小时', d: '天' };
function buckets() {
  const s = span(), len = s.b - s.a, g = st.gran;
  const auto = s.step || (len <= 2 * 86400 ? 3600 : 86400);
  let step = g === '15m' && len <= 3 * 86400 ? 900 : g === 'h' && len <= 14 * 86400 ? 3600 : g === 'd' ? 86400 : auto;
  if (step === 86400 && len < 86400) step = 3600;
  const out = [];
  for (let a = step === 86400 ? dayOf(s.a) : s.a; a < s.b; a += step) {
    const d = L(a), hm = `${hh(d.getUTCHours())}:${hh(d.getUTCMinutes())}`;
    out.push(step < 86400 ? { a, b: a + step, label: step < 3600 ? hm : hh(d.getUTCHours()), long: `${fD(a)} ${hm}–${fT(a + step).slice(0, 5)}`, mid: d.getUTCHours() === 0 && d.getUTCMinutes() === 0 } : { a, b: a + step, label: fD(a).slice(3), long: `${fD(a)} ${WD[d.getUTCDay()]}`, mid: d.getUTCDate() === 1 });
  }
  return out;
}
const rangeStart = () => span().a, rangeEnd = () => span().b;
const rangeLabel = () => st.range === 'custom' && st.cr ? `${fD(st.cr[0])} – ${fD(st.cr[1])}` : RANGES[st.range] || RANGES['24h'];
// 其它筛选：厂商、额度池、主会话/子代理、未命中缓存、大输入
const FX0 = () => ({ prov: null, win: null, who: 'all', miss: false, big: false });
const fxCount = () => { const f = st.fx; return (f.prov ? 1 : 0) + (f.win != null ? 1 : 0) + (f.who !== 'all' ? 1 : 0) + (f.miss ? 1 : 0) + (f.big ? 1 : 0) + (st.fModel != null ? 1 : 0) + (st.fSess != null ? 1 : 0); };
const provOf = r => r.m < 0 ? 'unk' : logoOf(MODEL_NAME(r.m));
function rowsIn(o = {}) {
  const a = o.a ?? rangeStart(), b = o.b ?? rangeEnd(), f = st.fx;
  return ROWS.filter(r => r.t >= a && r.t < b && (o.noModel || st.fModel == null || r.m === st.fModel) && (o.noSess || st.fSess == null || r.root === st.fSess)
    && (!f.prov || provOf(r) === f.prov) && (f.win == null || rowWin(r.m) === f.win) && (f.who === 'all' || (f.who === 'sub') === !!SE[r.s].child)
    && (!f.miss || r.cache === 0) && (!f.big || r.in > 100000));
}
const agg = rs => rs.reduce((x, r) => { x.n++; x.in += r.in; x.out += r.out; x.cache += r.cache; x.cost += r.cost; return x; }, { n: 0, in: 0, out: 0, cache: 0, cost: 0 });
const groupBy = (rs, k) => { const m = new Map(); rs.forEach(r => { const g = m.get(r[k]) || { key: r[k], n: 0, in: 0, out: 0, cache: 0, cost: 0 }; g.n++; g.in += r.in; g.out += r.out; g.cache += r.cache; g.cost += r.cost; m.set(r[k], g); }); return [...m.values()]; };

/* ===== 原语 ===== */
const ic = (n, s, x = '') => `<span class="ms ${x}"${s ? ` style="font-size:${s}px"` : ''}>${n}</span>`;
const logoOf = id => /claude|opus|sonnet/i.test(id) ? 'claude' : /gpt|openai/i.test(id) ? 'openai' : 'gemini';
const lg = (id, s) => id === '未标注' ? `<span style="width:14px;height:14px;display:grid;place-items:center;color:var(--fg-4);flex:none">${ic('label_off', 14)}</span>` : `<img class="lg" src="${LOGO[logoOf(id)]}"${s ? ` style="width:${s}px;height:${s}px"` : ''}>`;
const tipA = h => `data-tip="${h.replace(/"/g, '&quot;')}"`;
const A = (a, v) => `data-a="${a}"${v !== undefined ? ` data-v="${String(v).replace(/"/g, '&quot;')}"` : ''}`;
const sw = c => `<i style="display:inline-block;width:7px;height:7px;border-radius:2px;background:${c};margin-right:7px"></i>`;
const BLOGO = `<span class="blogo"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 8V5.5M5 8V2M8 8V4" stroke="#7BA7F2" stroke-width="1.5" stroke-linecap="round"/></svg></span>`;
function qm(f, w = 72) {
  const c = f <= .1 ? 'var(--crit)' : f <= .25 ? 'var(--warn)' : 'var(--s1)';
  return `<span style="display:block;width:${typeof w === 'number' ? w + 'px' : w};height:4px;border-radius:2px;background:var(--track);overflow:hidden;flex:none"><span style="display:block;width:${Math.max(f * 100, 2)}%;height:100%;border-radius:2px;background:${c};opacity:${f >= 1 ? .45 : 1}"></span></span>`;
}
const pc = f => `<span class="num" style="color:${f >= 1 ? 'var(--fg-4)' : f <= .25 ? 'var(--fg)' : 'var(--fg-2)'}">${Math.round(f * 100)}%</span>`;
const bar = (f, c = 'var(--s1)', w = '100%') => `<span style="display:block;width:${w};height:4px;border-radius:2px;background:var(--track)"><span style="display:block;width:${Math.min(1, f) * 100}%;height:100%;border-radius:2px;background:linear-gradient(90deg, color-mix(in srgb, ${c} 62%, transparent), ${c})"></span></span>`;
const niceMax = v => { if (v <= 0) return 4; const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; return (n <= 1.2 ? 1.2 : n <= 2 ? 2 : n <= 4 ? 4 : n <= 6 ? 6 : n <= 8 ? 8 : 12) * p; };

// 柱状图：rows=[{label, parts, tip, act}]；点击柱子触发 act
function chart({ rows, colors, w, h, pad = { l: 42, r: 0, t: 6, b: 22 }, barMax = 14, every = 1, yfmt = ax }) {
  const yMax = niceMax(Math.max(...rows.map(r => r.parts.reduce((a, b) => a + b, 0)), 1));
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b, band = iw / rows.length, bw = Math.min(barMax, band * .6); let g = '';
  [0, 1, 2, 3, 4].forEach(k => { const t = yMax * k / 4, y = Math.round(pad.t + ih - (k / 4) * ih) + .5;
    g += `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y}" y2="${y}" stroke="${k ? 'var(--grid)' : 'var(--axis)'}"/><text x="${pad.l - 10}" y="${y + 3.5}" fill="var(--fg-4)" font-size="10.5" text-anchor="end" class="num">${yfmt(t)}</text>`; });
  rows.forEach((r, i) => {
    const x = pad.l + band * i + (band - bw) / 2; let y = pad.t + ih, segs = '';
    const vis = r.parts.map((v, k) => [v, k]).filter(([v]) => v > 0);
    vis.forEach(([v, k], j) => { const hgt = Math.max(1, (v / yMax) * ih - (j ? 2 : 0)); y -= hgt + (j ? 2 : 0); const top = j === vis.length - 1, rr = top ? Math.min(3, hgt) : 0;
      segs += top ? `<path class="mk" d="M${x},${y + hgt}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + bw - rr}Q${x + bw},${y} ${x + bw},${y + rr}V${y + hgt}Z" fill="${colors[k]}"/>` : `<rect class="mk" x="${x}" y="${y}" width="${bw}" height="${hgt}" fill="${colors[k]}"/>`; });
    g += `<g class="hit" ${tipA(r.tip || '')} ${vis.length && r.act ? A(r.act[0], r.act[1]) : ''}><rect x="${pad.l + band * i}" y="${pad.t}" width="${band}" height="${ih}" fill="transparent"/>${segs}</g>`;
    if (i % every === 0) g += `<text x="${x + bw / 2}" y="${h - 5}" fill="var(--fg-4)" font-size="10.5" text-anchor="middle" class="num">${r.label}</text>`;
  });
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block">${g}</svg>`;
}
function spark(v, w, h, c = 'var(--s1)', o = {}) {
  if (v.length < 2) v = [v[0] || 0, v[0] || 0];
  const mx = Math.max(...v) || 1, mn = o.zero === false ? Math.min(...v) : 0, stp = w / (v.length - 1), p = v.map((x, i) => [i * stp, h - 3 - ((x - mn) / (mx - mn || 1)) * (h - 8)]);
  const d = p.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(''), m = p[o.mark != null ? o.mark : p.length - 1];
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;overflow:visible">${o.area ? `<path d="${d}L${w},${h}L0,${h}Z" fill="${c}" opacity=".1"/>` : ''}<path d="${d}" fill="none" stroke="${c}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${m[0]}" cy="${m[1]}" r="3.5" fill="${o.mark != null ? 'var(--fg)' : c}" stroke="var(--background)" stroke-width="2"/></svg>`;
}
function ring(f, size, c, s = 2.5) { const r = (size - s) / 2, C = 2 * Math.PI * r;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg);display:block"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="rgb(255 255 255 / .12)" stroke-width="${s}"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${c}" stroke-width="${s}" stroke-linecap="round" stroke-dasharray="${C * f} ${C}"/></svg>`; }
const seg = (opts, cur, act) => `<div class="seg">${opts.map(([v, l]) => `<span class="${v === cur ? 'on' : ''}" ${A(act, v)}>${l}</span>`).join('')}</div>`;
// 下拉菜单：id 相同则展开
function dd(id, label, items, o = {}) {
  const open = st.menu === id;
  return `<span style="position:relative"><span class="ctl ${o.b ? 'b' : ''}" ${A('menu', id)}>${o.icon ? ic(o.icon) : ''}${label}${ic('expand_more')}</span>${open ? `<div class="menu" style="top:32px;${o.right ? 'right:0' : 'left:0'}">${items}</div>` : ''}</span>`;
}
const mi = (act, v, inner, on) => `<div class="mi" ${A(act, v)}>${inner}${on ? `<span class="ck">${ic('check', 15)}</span>` : ''}</div>`;


/* ===== 外壳：插件页面只有内容区，侧栏与顶栏由 Antigravity 提供 ===== */
const credit = (a, b) => a == null || !b ? '—' : st.credits === 'abs' ? `${comma(a)}<small>/ ${comma(b)}</small>` : `${(a / b * 100).toFixed(a / b < .01 ? 2 : 1)}<small>%</small>`;
const TABS = [['overview', '概览'], ['quota', '额度'], ['tokens', '用量'], ['ledger', '明细'], ['accounts', '账号'], ['settings', '设置']];
function sub(right = '') {
  const a = ACC[0], bad = LIVE.error;
  return `<div class="sub"><nav class="tabs">${TABS.map(([k, v]) => `<a class="${k === st.tab ? 'on' : ''}" ${A('tab', k)}>${v}</a>`).join('')}<i class="ind"></i></nav>
  <div class="sub-r">${right}${right ? '<span class="vsep"></span>' : ''}<span class="sync" ${A('sync')} ${tipA(bad ? '读不到 Antigravity 本地接口：' + esc(bad) : '点击立即同步')} style="${bad ? 'color:var(--warn)' : ''}">${ic(bad ? 'warning' : 'sync', 14)}${fT((Math.floor(LIVE.at / 1000) + SHIFT)).slice(0, 5)}</span>
  <span class="ctl" ${A('tab', 'accounts')}><span class="who" style="background:${a.c}">${a.l}</span>${a.e.split('@')[0]}</span></div></div>`;
}
const shell = inner => `<div class="pane">${inner}</div>`;

/* ===== H2 视觉层：图标页签、主题、12 列网格、插画化图形件 ===== */
const ink = a => `rgb(var(--ink) / ${a})`;
const GAP = 24, COLW = () => (CW() - 11 * GAP) / 12, SPANW = k => Math.floor(k * COLW() + (k - 1) * GAP);
const TI = {
  overview: '<path d="M1.75 12.25h12.5"/><path d="M4.25 12.25a3.75 3.75 0 0 1 7.5 0"/><path d="M8 3v1.6M3.4 5.1l1.1 1.1M12.6 5.1l-1.1 1.1"/>',
  report: '<rect x="2" y="2.75" width="12" height="11.5" rx="2.5"/><path d="M2 6.25h12M5.5 1.5v2.5M10.5 1.5v2.5M5.75 10.1l1.5 1.5 3-3"/>',
  quota: '<rect x="1.75" y="4.75" width="11" height="6.5" rx="3.25"/><path d="M14.25 7v2"/><path d="M4.6 8h3.4" stroke-width="2.4"/>',
  tokens: '<path d="M1.75 13.25h12.5"/><path d="M4 10.5V8.25M8 10.5V3.5M12 10.5V6"/>',
  ledger: '<path d="M6 4h8M6 8h8M6 12h5.5"/><circle cx="2.75" cy="4" r=".9" fill="currentColor" stroke="none"/><circle cx="2.75" cy="8" r=".9" fill="currentColor" stroke="none"/><circle cx="2.75" cy="12" r=".9" fill="currentColor" stroke="none"/>',
  accounts: '<circle cx="6" cy="5.5" r="2.5"/><path d="M1.75 13.25c.6-2.3 2.3-3.5 4.25-3.5s3.65 1.2 4.25 3.5"/><path d="M10.25 3.2a2.5 2.5 0 0 1 0 4.6M11.75 9.9c1.2.55 2 1.6 2.5 3.35"/>',
  settings: '<path d="M1.75 5h7M12.25 5h2M1.75 11h2M7.25 11h7"/><circle cx="10.5" cy="5" r="1.75"/><circle cx="5.5" cy="11" r="1.75"/>',
  line: '<path d="M1.75 12l4-4.5 3 2.5 5.5-6.25"/>', bar: '<path d="M3 13.25V9M8 13.25V3.5M13 13.25V6.5"/>',
  area: '<path d="M1.75 12.5l4-5 3 2.5 5.5-6v10.25H1.75z" fill="currentColor" fill-opacity=".25"/>',
  copy: '<rect x="5" y="5" width="9" height="9" rx="2"/><path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5"/>',
};
const icon = (k, s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="display:block;flex:none">${TI[k]}</svg>`;
const ibg = (items, cur, act) => `<span class="ibg">${items.map(([v, k, t]) => `<span class="ib2 ${v === cur ? 'on' : ''}" ${A(act, v)} ${tipA(t)}>${icon(k, 15)}</span>`).join('')}</span>`;
// 覆盖 shell.js 的页签：图标 + 文字
TABS.splice(0, TABS.length, ['overview', '概览'], ['report', '日报'], ['quota', '额度'], ['tokens', '用量'], ['ledger', '明细'], ['accounts', '账号'], ['settings', '设置']);
sub = function (right = '') {
  const a = ACC[0], bad = LIVE.error;
  return `<div class="sub"><nav class="tabs tabs2">${TABS.map(([k, v]) => `<a class="${k === st.tab ? 'on' : ''}" ${A('tab', k)}>${icon(k)}${v}</a>`).join('')}<i class="ind"></i></nav>
  <div class="sub-r">${right}${right ? '<span class="vsep"></span>' : ''}<span class="sync" ${A('sync')} ${tipA(bad ? '读不到 Antigravity 本地接口：' + esc(bad) : '点击立即同步')} style="${bad ? 'color:var(--warn)' : ''}">${ic(bad ? 'warning' : 'sync', 14)}${fT((Math.floor(LIVE.at / 1000) + SHIFT)).slice(0, 5)}</span>
  <span class="ctl" ${A('tab', 'accounts')}><span class="who" style="background:${a.c}">${a.l}</span>${a.e.split('@')[0]}</span></div></div>`;
};
// 主题：0 跟随系统，1 深色，2 浅色
const isLight = () => st.theme === 2 || (st.theme === 0 && matchMedia('(prefers-color-scheme: light)').matches);
const applyTheme = () => document.body.classList.toggle('light', isLight());
matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', () => { applyTheme(); render(); });

const G3 = { gemini: ['#4C8DF6', '#8E7CF6', '#C76BD9'], claude: ['#D97757', '#E8955E', '#F2B35B'], week: ['#4C8DF6', '#4FB6E6', '#4FC3D9'], cyan: ['#3FA7C9', '#4FC3D9', '#7FD6E3'] };
const PAL = ['#5B9BFF', '#9D8CFF', '#4FC3D9', '#F2B35B', '#F27A9B', '#7FD6A0'];
const grayG = () => isLight() ? ['#D5D6DC', '#DCDDE2', '#E3E4E8'] : ['#3A3B42', '#43444B', '#4C4D54'];
const winG = w => w.kind === '每周' ? G3.week : w.provs.has('gemini') ? G3.gemini : G3.claude;
const tiles = logos => `<span class="lgs">${logos.map(l => `<img src="${LOGO[l]}" style="width:22px;height:22px;display:block">`).join('')}</span>`;
const winLogos = w => [...w.provs].sort((a, b) => a === 'claude' ? -1 : 1);
let _cid = 0;
// 渐变胶囊：f = 填充比例；win = 窗口时间（小三角）
function capsule(f, g, W, H = 26, win) {
  const id = 'cp' + (++_cid), fw = f <= 0 ? 0 : Math.max(H, W * Math.min(1, f));
  let ticks = ''; if (H >= 16 && f < 1) for (let i = 1; i < 20; i++) { const x = i * W / 20; if (x < fw - 6) ticks += `<line x1="${x}" x2="${x}" y1="${H * .25}" y2="${H * .75}" stroke="#fff" stroke-opacity=".28"/>`; }
  return `<svg width="${W}" height="${H + (win != null ? 12 : 0)}" style="display:block;overflow:visible"><defs><linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="${g[0]}"/><stop offset=".55" stop-color="${g[1]}"/><stop offset="1" stop-color="${g[2]}"/></linearGradient>
    <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
    <rect width="${W}" height="${H}" rx="${H / 2}" style="fill:${ink(.06)}"/>
    ${fw ? `<rect width="${fw}" height="${H}" rx="${H / 2}" fill="url(#${id})"/><rect x="2" y="2" width="${Math.max(0, fw - 4)}" height="${Math.max(0, H / 2 - 2)}" rx="${Math.max(0, H / 2 - 2)}" fill="url(#${id}s)"/>` : ''}
    ${ticks}${win != null ? `<path d="M${Math.max(4, W * win)},${H + 4} l4,6 h-8z" style="fill:var(--fg-3)"/>` : ''}</svg>`;
}
const curve = pts => { if (!pts.length) return ''; let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`; for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], m = ((x0 + x1) / 2).toFixed(1); d += `C${m},${y0.toFixed(1)} ${m},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`; } return d; };
const smooth = (v, k = 1) => v.map((_, i) => { let s = 0, w = 0; const n = Math.ceil(k * 2); for (let j = -n; j <= n; j++) { const x = v[i + j]; if (x == null) continue; const g = Math.exp(-(j * j) / (2 * k * k)); s += x * g; w += g; } return s / w; });
const aura = () => `<div class="aura">${isLight() ? '<i style="left:-120px;top:-180px;width:520px;height:340px;background:#CFE2FF;opacity:.7"></i><i style="right:-80px;top:-140px;width:420px;height:280px;background:#FFE2C4;opacity:.7"></i>' : '<i style="left:-140px;top:-220px;width:560px;height:340px;background:#2F5FB8;opacity:.16"></i><i style="right:-120px;top:-200px;width:460px;height:300px;background:#F2B35B;opacity:.08"></i>'}</div>`;
const pctS = f => Math.round(f * 100) + '%';
const unit = s => String(s).replace(/([KMB])$/, '<small>$1</small>');
// 一个额度池的展示数据：大数字、副标题、脚注
function poolView(k) {
  const w = WINS[k], x = winUse(k), used = x.all > 0;
  return { w, x, k, big: x.ok ? fUSD(x.leftCost) : `${Math.round(x.f * 100)}<small>%</small>`, bigLbl: x.ok ? '剩余' : used ? '剩余比例' : '未使用',
    foot: x.ok ? [`已用 <b>${fUSD(x.cost)}</b> · 剩 <b>${fUSD(x.leftCost)}</b>`, `共约 ${fUSD(x.capCost)}`] : used ? [`已用 <b>${fUSD(x.cost)}</b>`, '用得太少，暂无法估算总额'] : [`${w.n} 个模型 · 未使用`, '用了才开始计时'],
    tip: `<b>${w.kind} · ${w.who}</b><br>${x.ok ? `已用 ${fUSD(x.cost)} · 剩约 ${fUSD(x.leftCost)} · 共约 ${fUSD(x.capCost)}<br>` : used ? `已用 ${fUSD(x.cost)}<br>` : '未使用<br>'}剩 ${pctS(x.f)} · ${winAt(k)} 重置（${winCd(k)}）<br><span class="dim">总额按「本窗口已用金额 ÷ 已用比例」推算</span>` };
}
const pools3 = () => WINS.map((w, k) => k).sort((a, b) => (WINS[a].kind === '每周') - (WINS[b].kind === '每周') || winUse(a).f - winUse(b).f).slice(0, 3);
function poolRow(capH = 26) {
  const ks = pools3(), span = ks.length >= 3 ? 4 : ks.length === 2 ? 6 : 12, W = SPANW(span);
  if (!ks.length) return `<section class="rw"><div class="md" style="grid-column:1/-1"><div class="cap">读不到模型额度</div></div></section>`;
  return `<section class="rw">${ks.map(k => { const v = poolView(k); return `<div class="md" style="grid-column:span ${span}" ${A('tab', 'quota')}>
    <div class="qh">${tiles(winLogos(v.w))}<div style="min-width:0"><div class="n">${v.w.kind} · ${v.w.who}</div><div class="t num">${winAt(k)} 重置 · ${winCd(k)}</div></div><span class="qv"><span class="lb2">${v.bigLbl}</span><span class="kn num">${v.big}</span></span></div>
    <div style="margin-top:18px" ${tipA(v.tip)}>${capsule(v.x.f, v.x.f < 1 ? winG(v.w) : grayG(), W, capH, v.x.all ? winProg(k) : null)}</div>
    <div class="qf num"><span>${v.foot[0]}</span><span>${v.foot[1]}</span></div></div>`; }).join('')}</section>`;
}

// 共用筛选：一个按钮 + 悬浮面板（时间、粒度、厂商、额度池、来源、条件、模型、会话）。概览、用量、明细共用同一份筛选
const PROVS = [['gemini', 'Gemini'], ['claude', 'Claude'], ['openai', 'GPT'], ['unk', '未标注']];
const isoDay = t => { const d = L(t); return `${d.getUTCFullYear()}-${hh(d.getUTCMonth() + 1)}-${hh(d.getUTCDate())}`; };
const fromIso = v => { const m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(v || ''); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) / 1000 - TZ : null; };
function filterPanel() {
  const f = st.fx, all = rowsIn({ noModel: 1, noSess: 1 }), cur = rowsIn(), t = agg(cur);
  const ms = groupBy(rowsIn({ noModel: 1 }), 'm').sort((a, b) => b.in + b.out - a.in - a.out).slice(0, 8);
  const ss = groupBy(rowsIn({ noSess: 1 }), 'root').sort((a, b) => b.in + b.out - a.in - a.out).slice(0, 8);
  const has = new Set(all.map(provOf));
  const opt = (act, v, label, on, extra = '') => `<span class="fo ${on ? 'on' : ''}" ${A(act, v)}>${label}${extra}</span>`;
  const sec = (t, inner, x = '') => `<div class="fs"><div class="fh"><span>${t}</span>${x}</div>${inner}</div>`;
  const s = span(), cr = st.cr || [s.a, s.b - 86400];
  const time = RANGE_GROUPS.map(g => `<div class="fg">${g.map(k => `<div class="mi ${st.range === k ? 'on' : ''}" ${A('fr', k)}>${RANGES[k]}${st.range === k ? `<span class="ck">${ic('check', 15)}</span>` : ''}</div>`).join('')}</div>`).join('')
    + `<div class="fg"><div class="mi ${st.range === 'custom' ? 'on' : ''}" ${A('fr', 'custom')}>自定义${st.range === 'custom' ? `<span class="ck">${ic('check', 15)}</span>` : ''}</div>
      <div class="fdate"><span class="dim2">从</span><input type="date" data-i="d0" value="${isoDay(cr[0])}" max="${isoDay(NOW)}"></div><div class="fdate"><span class="dim2">到</span><input type="date" data-i="d1" value="${isoDay(cr[1])}" max="${isoDay(NOW)}"></div></div>`;
  const row = (act, key, on, label, v) => `<div class="mi ${on ? 'on' : ''}" ${A(act, on ? '' : key)}>${label}<span class="dim2 num" style="margin-left:auto;padding-left:12px">${fmt(v)}</span>${on ? `<span class="ck" style="padding-left:8px">${ic('check', 15)}</span>` : ''}</div>`;
  return `<div class="menu fpop" style="top:34px;right:0">
    <div class="fcol" style="width:200px;border-right:1px solid var(--border)">${sec('时间', time)}
      ${sec('粒度', `<div class="fos">${Object.entries(GRANS).map(([k, l]) => opt('fgran', k, l, st.gran === k)).join('')}</div>`)}</div>
    <div class="fcol" style="width:340px">
      ${sec('厂商', `<div class="fos">${opt('fx', 'prov=', '全部', !f.prov)}${PROVS.filter(([k]) => has.has(k) || f.prov === k).map(([k, l]) => opt('fx', 'prov=' + k, (k === 'unk' ? '' : lg(k === 'openai' ? 'gpt' : k, 13)) + l, f.prov === k)).join('')}</div>`)}
      ${WINS.length ? sec('额度池', `<div class="fos">${opt('fx', 'win=', '全部', f.win == null)}${WINS.map((w, k) => opt('fx', 'win=' + k, w.short, f.win === k)).join('')}</div>`) : ''}
      ${sec('来源', `<div class="fos">${[['all', '全部'], ['main', '主会话'], ['sub', '子代理']].map(([k, l]) => opt('fx', 'who=' + k, l, f.who === k)).join('')}</div>`)}
      ${sec('条件', `<div class="fos">${opt('fx', 'miss=!', ic('check', 14) + '未命中缓存', f.miss)}${opt('fx', 'big=!', ic('check', 14) + '单次输入 > 100K', f.big)}</div>`)}
      ${sec('模型', ms.map(g => row('fm', g.key, st.fModel === g.key, `${lg(MODEL_NAME(g.key))}<span class="mono el" style="max-width:210px">${MODEL_NAME(g.key)}</span>`, g.in + g.out)).join('') || '<div class="cap" style="margin:0 8px">没有记录</div>')}
      ${sec('会话', ss.map(g => row('fs', g.key, st.fSess === g.key, `<span class="el" style="max-width:230px">${SE[g.key].title}</span>`, g.in + g.out)).join('') || '<div class="cap" style="margin:0 8px">没有记录</div>')}
    </div>
    <div class="ffoot"><span class="dim num">${rangeLabel()} · ${comma(t.n)} 次调用 · ${fmt(t.in + t.out)} · 约 ${fUSD(t.cost)}</span><span class="row" style="gap:8px">${fxCount() ? `<span class="btn q" ${A('freset')}>重置</span>` : ''}<span class="btn p" ${A('fdone')}>完成</span></span></div>
  </div>`;
}
function filters(o = {}) {
  const n = fxCount(), f = st.fx;
  // 生效中的条件做成可单独移除的小标签
  const chips = [st.fModel != null && ['fModel', `${lg(MODEL_NAME(st.fModel))}<span class="mono el" style="max-width:150px">${MODEL_NAME(st.fModel)}</span>`],
    st.fSess != null && ['fSess', `<span class="el" style="max-width:150px">${SE[st.fSess].title}</span>`],
    f.prov && ['prov', PROVS.find(p => p[0] === f.prov)[1]], f.win != null && WINS[f.win] && ['win', WINS[f.win].short],
    f.who !== 'all' && ['who', f.who === 'sub' ? '子代理' : '主会话'], f.miss && ['miss', '未命中缓存'], f.big && ['big', '输入 > 100K']].filter(Boolean);
  const btn = `<span style="position:relative"><span class="ctl b" ${A('menu', 'flt')}>${ic('filter_list')}${rangeLabel()}${n ? `<span class="fbadge">${n}</span>` : ''}${ic('expand_more')}</span>${st.menu === 'flt' ? filterPanel() : ''}</span>`;
  return chips.map(([k, l]) => `<span class="fchip" ${A('fclr', k)}>${l}${ic('close', 13)}</span>`).join('') + btn + (o.extra || '');
}
const keepOpen = () => st.menu === 'flt' ? 'keep' : undefined;
const FILTER_ACT = {
  fr(v) { if (v === 'custom' && !st.cr) { const s = span(); st.cr = [s.a, s.b - 86400]; } st.range = v; st.lg.bucket = null; return keepOpen(); },
  fgran(v) { st.gran = v; return keepOpen(); },
  fx(v) { const [k, x] = v.split('='), f = st.fx; f[k] = x === '!' ? !f[k] : x === '' ? (k === 'win' || k === 'prov' ? null : x) : k === 'win' ? Number(x) : x; st.lg.bucket = null; return keepOpen(); },
  fm(v) { st.fModel = num(v); return keepOpen(); }, fs(v) { st.fSess = num(v); return keepOpen(); },
  fclr(k) { if (k === 'fModel' || k === 'fSess') st[k] = null; else st.fx[k] = FX0()[k]; },
  freset() { st.fx = FX0(); st.fModel = st.fSess = null; st.gran = 'auto'; return keepOpen(); },
  fdone() { st.menu = null; },
};
function setCustom(k, v) {
  const t = fromIso(v); if (t == null) return; const s = span(), cr = st.cr || [s.a, s.b - 86400];
  cr[k === 'd0' ? 0 : 1] = t; if (cr[0] > cr[1]) cr.reverse(); st.cr = cr; st.range = 'custom'; st.lg.bucket = null; saveSt();
}

/* ===== 概览：Tokens 地平线 + 三个额度池 + 会话光谱 / 缓存命中 ===== */
// 主视觉：每个时段的新增输入画成山脊，输出画成前景，远山是总量；最紧张的 5 小时窗口画成太阳弧，太阳在「现在」
function landscape(bs, rs, W, H = 330) {
  const G = H - 38, n = bs.length, at = bIdx(bs), B = bs.map(() => []); rs.forEach(r => B[at(r)].push(r));
  const g = B.map(agg), inp = g.map(x => x.in), out = g.map(x => x.out), tot = g.map(x => x.in + x.out);
  const mx = Math.max(...tot, 1), X = i => (i + .5) / n * W, sc = (G - 120);
  const ridge = (vals, k) => { const sm = smooth(vals, n > 30 ? 1.1 : .8), pts = sm.map((v, i) => [X(i), G - v / mx * sc * k]); pts.unshift([0, pts[0][1]]); pts.push([W, pts[pts.length - 1][1]]); return `M0,${G}L${pts[0][0]},${pts[0][1]}${curve(pts).replace(/^M[^C]*/, '')}L${W},${G}Z`; };
  const L2 = isLight(), s0 = bs[0].a, s1 = bs[n - 1].b, TX = t => (t - s0) / (s1 - s0) * W;
  let sun = '';
  const k5 = WINS.map((w, k) => k).filter(k => WINS[k].len === 5 * 3600 && winUse(k).all > 0).sort((a, b) => winUse(a).f - winUse(b).f)[0];
  if (k5 != null && NOW >= s0 && NOW <= s1 + 60) {
    const w = WINS[k5], t0 = Math.max(s0, w.t - w.len), a0 = TX(t0), a1 = Math.min(W, TX(w.t)), ar = Math.max(30, (a1 - a0) / 2), cx = a0 + ar, f = Math.max(0, Math.min(1, (NOW - t0) / (w.t - t0))), th = Math.PI * (1 - f), sx = cx + ar * Math.cos(th), sy = G - 40 - ar * .9 * Math.sin(th);
    sun = `<path d="M${a0},${G - 40} A${ar},${ar * .9} 0 0 1 ${a0 + 2 * ar},${G - 40}" fill="none" style="stroke:${ink(.25)}" stroke-dasharray="1 5" stroke-linecap="round" stroke-width="1.6"/>
      <circle cx="${sx}" cy="${sy}" r="34" fill="url(#sun)"/><circle cx="${sx}" cy="${sy}" r="7" fill="${L2 ? '#F7A93B' : '#FFF1D2'}"/>
      <text x="${a0 + 2 * ar - 4}" y="${G - 22}" text-anchor="end" style="fill:var(--fg-2);font-size:12px">${winAt(k5)} 重置</text><text x="${a0 + 4}" y="${G - 22}" style="fill:var(--fg-4);font-size:12px">${atLocal(t0)}</text>`;
  }
  let stars = ''; if (!L2) { let sd = 7; const rnd = () => (sd = (sd * 9301 + 49297) % 233280) / 233280; for (let i = 0; i < 46; i++) stars += `<circle cx="${(rnd() * W * .78 + 20).toFixed(0)}" cy="${(rnd() * 150 + 8).toFixed(0)}" r="${(rnd() + .4).toFixed(1)}" fill="#fff" opacity="${(rnd() * .35 + .08).toFixed(2)}"/>`; }
  const pk = tot.indexOf(Math.max(...tot)), px = X(pk), py = G - smooth(inp, n > 30 ? 1.1 : .8)[pk] / mx * sc - 4; const ly = Math.max(178, py - 36), l0 = Math.max(188, py - 46);
  const C = L2 ? { f0: '#7FB0FF', f1: .22, m1: '#D6E6FF', o1: '#FFE9CF', m2: .5, o2: .6 } : { f0: '#5B9BFF', f1: .16, m1: '#2F5FB8', o1: '#D95926', m2: .25, o2: .35 };
  const every = Math.max(1, Math.ceil(n / 6)), labels = bs.map((b, i) => i % every === 0 && i ? `<text x="${X(i)}" y="${H - 6}" text-anchor="middle">${b.label}${b.label.length <= 2 ? ':00' : ''}</text>` : '').join('');
  const hits = bs.map((b, i) => `<rect class="hb" x="${(i / n * W).toFixed(1)}" y="0" width="${(W / n).toFixed(1)}" height="${G}" fill="transparent" ${tipA(`<span class="dim">${b.long}</span><br>${sw('#5B9BFF')}新增输入 ${fmt(g[i].in)}<br>${sw('#F2B35B')}输出 ${fmt(g[i].out)}${g[i].n ? `<br><span class="dim">缓存命中 ${Math.round(pct(g[i].cache, g[i].cache + g[i].in) * 100)}% · ${g[i].n} 次 · 约 ${fUSD(g[i].cost)} · 点击查看明细</span>` : ''}`)} ${g[i].n ? A('bucket', b.a + ',' + b.b) : ''}/>`).join('');
  return `<svg width="${W}" height="${H}" style="display:block;overflow:visible;font-size:11.5px;fill:var(--fg-4)" class="land"><defs>
    <linearGradient id="far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.f0}" stop-opacity="${C.f1}"/><stop offset="1" stop-color="${C.f0}" stop-opacity=".02"/></linearGradient>
    <linearGradient id="mid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5B9BFF" stop-opacity=".92"/><stop offset="1" stop-color="${C.m1}" stop-opacity="${C.m2}"/></linearGradient>
    <linearGradient id="fr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${L2 ? '#F7B267' : '#F2B35B'}" stop-opacity=".95"/><stop offset="1" stop-color="${C.o1}" stop-opacity="${C.o2}"/></linearGradient>
    <radialGradient id="sun" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFE6B0"/><stop offset=".35" stop-color="#F2B35B" stop-opacity=".9"/><stop offset="1" stop-color="#F2B35B" stop-opacity="0"/></radialGradient></defs>
    <path d="${ridge(inp, 1)}" fill="url(#mid)" opacity=".82"/><path d="${ridge(out.map(v => v * 2.2), 1)}" fill="url(#fr)"/>
    ${tot[pk] > 0 ? `<line x1="${px}" x2="${px}" y1="${l0}" y2="${py}" style="stroke:${ink(.35)}"/><text x="${px > W - 180 ? px - 8 : px + 8}" y="${ly}" text-anchor="${px > W - 180 ? 'end' : 'start'}" style="fill:var(--fg-2);font-size:12px">峰值 ${fmt(tot[pk])} · ${bs[pk].long.split(' ').pop().split('–')[0]}</text>` : `<text x="${W / 2}" y="${G / 2}" text-anchor="middle" style="fill:var(--fg-4);font-size:13px">这段时间没有调用</text>`}
    <line x1="0" x2="${W}" y1="${G}" y2="${G}" style="stroke:${ink(.16)}"/>
    <text x="0" y="${H - 6}">${bs[0].long.split('–')[0]}</text>${labels}
    ${hits}</svg>`;
}
// 会话光谱带：宽度 = 真实消耗占比
function spectrum(ss, total, W, H = 46) {
  const g = 3, big = ss.slice(0, 2), rest = ss.slice(2); let x = 0, s = '', lab = '';
  const avail = W - g * Math.max(0, ss.length - 1);
  ss.forEach((se, i) => {
    const v = se.in + se.out, w = Math.max(4, avail * v / total), id = 'sp' + i, c1 = PAL[i % PAL.length], c2 = PAL[(i + 1) % PAL.length], r = i === 0 || i === ss.length - 1 ? 12 : 4;
    s += `<defs><linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}" stop-opacity=".85"/></linearGradient></defs><g class="hit" ${A('insSess', se.key)} ${tipA(`<b>${SE[se.key].title}</b><br>${fmt(v)} · ${pctS(v / total)} · ${comma(se.n)} 次 · 约 ${fUSD(se.cost)}${SE[se.key].kids ? ` · ${SE[se.key].kids} 个子代理` : ''}<br><span class="dim">点击查看这个会话的用量</span>`)}><rect x="${x}" width="${w}" height="${H}" rx="${r}" fill="url(#${id})"/>${i === 0 && ss.length > 1 ? `<rect x="${x + 12}" width="${Math.max(0, w - 12)}" height="${H}" fill="url(#${id})"/>` : ''}${i === ss.length - 1 && i > 0 ? `<rect x="${x}" width="${Math.max(0, Math.min(w, 12) + 4)}" height="${H}" rx="4" fill="${c1}"/>` : ''}</g>`;
    if (i < 2 && w > 110) lab += `<div style="position:absolute;left:${x}px;top:${H + 12}px;width:${w - 8}px"><div class="el" style="font-size:13px">${SE[se.key].title}</div><div class="num" style="font-size:12px;color:var(--fg-4);margin-top:2px">${fmt(v)} · ${pctS(v / total)}</div></div>`;
    x += w + g;
  });
  if (rest.length) lab += `<div style="position:absolute;right:0;top:${H + 12}px;display:flex;flex-direction:column;gap:3px;align-items:flex-end">${rest.slice(0, 3).map((se, k) => `<div class="row num" style="gap:7px;font-size:12px;color:var(--fg-3)"><i style="width:7px;height:7px;border-radius:2px;background:${PAL[(k + 2) % PAL.length]}"></i><span class="el" style="max-width:150px">${SE[se.key].title}</span><span style="color:var(--fg-4)">${fmt(se.in + se.out)}</span></div>`).join('')}</div>`;
  return `<div style="position:relative;height:${H + 76}px"><svg width="${W}" height="${H}" style="display:block">${s}</svg>${lab}</div>`;
}
// 缓存命中曲线：虚线是区间平均，末端标最近 6 小时
function cacheLine(bs, rs, W, H = 104) {
  const at = bIdx(bs), B = bs.map(() => []); rs.forEach(r => B[at(r)].push(r));
  const v = B.map(x => { const g = agg(x); return g.n ? pct(g.cache, g.cache + g.in) : null; }), pts = [];
  const all = agg(rs), avg = pct(all.cache, all.cache + all.in), rec = agg(rs.filter(r => r.t >= NOW - 6 * 3600)), rh = rec.n ? pct(rec.cache, rec.cache + rec.in) : null;
  const lo = Math.max(0, Math.min(...v.filter(x => x != null), avg) - .08), X = i => (i + .5) / bs.length * W, Y = x => 6 + (1 - (x - lo) / (1 - lo || 1)) * (H - 12);
  v.forEach((x, i) => { if (x != null) pts.push([X(i), Y(x)]); });
  if (pts.length < 2) return `<div class="cap" style="height:${H}px;display:grid;place-items:center">数据不足</div>`;
  const d = curve(pts), e = pts[pts.length - 1];
  return `<svg width="${W - 64}" height="${H}" style="display:block;overflow:visible;font-size:11.5px"><defs><linearGradient id="cl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4FC3D9" stop-opacity=".28"/><stop offset="1" stop-color="#4FC3D9" stop-opacity="0"/></linearGradient></defs>
    <line x1="0" x2="${W - 56}" y1="${Y(avg)}" y2="${Y(avg)}" style="stroke:${ink(.22)}" stroke-dasharray="2 4"/>${Math.abs(Y(avg) - e[1]) > 18 ? `<text x="${W - 70}" y="${Y(avg) - 6}" text-anchor="end" style="fill:var(--fg-4)">平均 ${pctS(avg)}</text>` : `<text x="0" y="${Y(avg) - 6}" style="fill:var(--fg-4)">平均 ${pctS(avg)}</text>`}
    <path d="${d}L${e[0]},${H}L${pts[0][0]},${H}Z" fill="url(#cl)"/><path d="${d}" fill="none" stroke="#4FC3D9" stroke-width="2"/>
    <circle cx="${e[0]}" cy="${e[1]}" r="4.5" fill="#4FC3D9" style="stroke:var(--background)" stroke-width="2.5"/>
    ${rh != null ? `<text x="${e[0] + 12}" y="${e[1] + 5}" style="fill:var(--fg);font-size:15px;font-weight:450">${pctS(rh)}</text><text x="${e[0] + 12}" y="${e[1] + 22}" style="fill:var(--fg-4)">近 6h</text>` : ''}</svg>`;
}
function vOverview() {
  const rs = rowsIn(), t = agg(rs), bs = buckets(), hit = pct(t.cache, t.cache + t.in), W = CW();
  const ss = groupBy(rs, 'root').sort((x, y) => y.in + y.out - x.in - x.out), real = t.in + t.out;
  return shell(sub(filters()) + `<div class="body h2"><div class="pg">
    <section class="rw hero-sec" style="height:330px"><img class="hero-img" src="/illus/hero-${isLight() ? 'light' : 'dark'}.jpg" alt=""><div class="md" style="grid-column:1/-1">${landscape(bs, rs, W)}
      <div class="hero-t" ${A('metric', 'real')}><div class="lb">${rangeLabel()} · Tokens</div><div class="herov num">${unit(fmt(real))}</div><div class="sub2 num">约 ${fUSD(t.cost)} · 输入 ${fmt(t.in)} · 输出 ${fmt(t.out)} · ${comma(t.n)} 次调用</div></div></div></section>
    ${poolRow()}
    <section class="rw">
      <div class="md" style="grid-column:span 8"><div class="hd"><span class="lb">会话 · 按真实消耗</span><span class="lb" style="color:var(--fg-4)">${ss.length} 个会话${(k => k ? ` · 含 ${k} 个子代理` : '')(new Set(rs.filter(r => SE[r.s].child).map(r => r.s)).size)}</span></div>
        <div style="margin-top:16px">${ss.length ? spectrum(ss.slice(0, 8), real || 1, SPANW(8)) : '<div class="cap">这段时间没有调用</div>'}</div></div>
      <div class="md" style="grid-column:span 4" ${A('metric', 'cache')}><div class="hd"><span class="lb">缓存命中 · ${rangeLabel()}</span><span class="kn num" style="font-size:28px">${(hit * 100).toFixed(1)}<small>%</small></span></div>
        <div style="margin-top:16px">${cacheLine(bs, rs, SPANW(4))}</div></div>
    </section>
  </div></div>`);
}

/* ===== 日报 / 周报：今天（或本周）做了什么，与上一段比较；下班提醒 ===== */
// 工作时长：相邻两次调用间隔不超过 15 分钟算连续工作，每段末尾补 2 分钟
const GAP_S = 15 * 60;
function workSpans(rs) {
  const ts = rs.map(r => r.t).sort((a, b) => a - b), out = [];
  ts.forEach(t => { const l = out[out.length - 1]; if (l && t - l[1] <= GAP_S) l[1] = t; else out.push([t, t]); });
  return out.map(([a, b]) => [a, b + 120]);
}
const spanSec = sp => sp.reduce((a, [x, y]) => a + y - x, 0);
const hm = s => `${Math.floor(s / 3600)}<small>h</small> ${hh(Math.floor(s % 3600 / 60))}<small>m</small>`;
const hmT = s => `${Math.floor(s / 3600)} 小时 ${Math.floor(s % 3600 / 60)} 分`;
const day0 = () => dayOf(NOW), wk0 = () => day0() - ((L(NOW).getUTCDay() + 6) % 7) * 86400;
function repRange(week) {
  const d = day0(), w = wk0();
  return week ? { a: w, b: NOW + 1, pa: w - 7 * 86400, pb: NOW + 1 - 7 * 86400, name: '本周', prev: '上周同期' } : { a: d, b: NOW + 1, pa: d - 86400, pb: NOW + 1 - 86400, name: '今天', prev: '昨天同时段' };
}
const rowsAB = (a, b) => ROWS.filter(r => r.t >= a && r.t < b);
// 插画：黄昏。活跃曲线是远山，太阳落在下班时刻，水面倒影
function dusk(rs, W, H = 176) {
  const d = day0(), G = 126, act = Array(24).fill(0); rs.forEach(r => { act[L(r.t).getUTCHours()] += r.in + r.out; });
  let h0 = act.findIndex(v => v > 0); if (h0 < 0) h0 = 9; h0 = Math.max(0, Math.min(h0, 9)); const h1 = Math.max(19, (23 - [...act].reverse().findIndex(v => v > 0)) + 1);
  const seg = act.slice(h0, h1), mx = Math.max(...seg, 1), sm = smooth(seg.map(v => v / mx), 1.2), X = i => i / Math.max(1, sm.length - 1) * W;
  const hill = (k, off) => { const pts = sm.map((v, i) => [X(i), G - v * 58 * k - off - 6]); return `M0,${G}L0,${pts[0][1]}${curve(pts).replace(/^M[^C]*/, '')}L${W},${G}Z`; };
  const [rh, rm] = (st.rep.at || '18:30').split(':').map(Number), sx = Math.min(W - 50, Math.max(50, ((rh + rm / 60) - h0) / (h1 - h0) * W)), L2 = isLight();
  let refl = ''; [[0, 104], [8, 78], [16, 54], [24, 32], [32, 16]].forEach(([dy, w]) => refl += `<rect x="${sx - w / 2}" y="${G + 10 + dy}" width="${w}" height="3" rx="1.5" fill="url(#dsun)" opacity="${(.75 - dy / 70).toFixed(2)}"/>`);
  let stars = ''; if (!L2) { let sd = 3; const rnd = () => (sd = (sd * 9301 + 49297) % 233280) / 233280; for (let i = 0; i < 18; i++) stars += `<circle cx="${(rnd() * W).toFixed(0)}" cy="${(rnd() * 60 + 4).toFixed(0)}" r="${(rnd() * .9 + .4).toFixed(1)}" fill="#fff" opacity="${(rnd() * .4 + .1).toFixed(2)}"/>`; }
  return `<svg width="${W}" height="${H}" style="display:block;overflow:hidden"><defs>
    <linearGradient id="dsun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD59A"/><stop offset=".6" stop-color="#F7A35C"/><stop offset="1" stop-color="#F27A9B"/></linearGradient>
    <radialGradient id="dglow" cx="50%" cy="100%" r="70%"><stop offset="0" stop-color="#F7A35C" stop-opacity=".35"/><stop offset="1" stop-color="#F7A35C" stop-opacity="0"/></radialGradient>
    <linearGradient id="dh1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8E7CF6" stop-opacity=".95"/><stop offset="1" stop-color="#4C8DF6" stop-opacity="${L2 ? .5 : .35}"/></linearGradient>
    <linearGradient id="dh2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5B9BFF" stop-opacity=".35"/><stop offset="1" stop-color="#5B9BFF" stop-opacity=".05"/></linearGradient>
    <clipPath id="dup"><rect width="${W}" height="${G}"/></clipPath></defs>
    ${stars}<ellipse cx="${sx}" cy="${G}" rx="170" ry="70" fill="url(#dglow)" clip-path="url(#dup)"/>
    ${[78, 102, 128].map((r, i) => `<path d="M${sx - r},${G} A${r},${r} 0 0 1 ${sx + r},${G}" fill="none" stroke="#F2B35B" stroke-opacity="${(.22 - i * .06).toFixed(2)}" ${i ? 'stroke-dasharray="2 6"' : ''}/>`).join('')}
    <path d="${hill(1.35, 6)}" fill="url(#dh2)"/><circle cx="${sx}" cy="${G + 6}" r="44" fill="url(#dsun)" clip-path="url(#dup)"/><path d="${hill(1, 0)}" fill="url(#dh1)"/>
    <line x1="0" x2="${W}" y1="${G}" y2="${G}" style="stroke:${ink(.25)}"/>${refl}
    <text x="0" y="${G + 22}" style="fill:var(--fg-4);font-size:11.5px">${hh(h0)}:00</text><text x="${W}" y="${G + 22}" text-anchor="end" style="fill:var(--fg-4);font-size:11.5px">${hh(h1 % 24)}:00</text></svg>`;
}
function vReport() {
  const week = st.rep.week, R = repRange(week), rs = rowsAB(R.a, R.b), ps = rowsAB(R.pa, R.pb), t = agg(rs), p = agg(ps);
  const ws = workSpans(rs), wp = workSpans(ps), sec = spanSec(ws), psec = spanSec(wp), hit = pct(t.cache, t.cache + t.in), phit = pct(p.cache, p.cache + p.in);
  const ss = groupBy(rs, 'root').sort((x, y) => y.in + y.out - x.in - x.out), proj = new Set(ss.map(g => SE[g.key].ws).filter(Boolean));
  const hour = L(NOW).getUTCHours(), [rh] = (st.rep.at || '18:30').split(':').map(Number);
  const hi = week ? '这一周辛苦了。' : !rs.length ? '今天还没开始。' : hour >= rh ? '今天辛苦了。' : hour < 12 ? '上午好，进展不错。' : '下午好，继续加油。';
  const more = sec - psec, say = rs.length ? `${R.name}工作了 <b>${hmT(sec)}</b>，和 Agent 一起推进了 <b>${ss.length} 个会话</b>，完成 <b>${comma(t.n)} 次调用</b>，花费约 <b>${fUSD(t.cost)}</b>。${psec ? `比${R.prev}${more >= 0 ? '多' : '少'}做了 ${hmT(Math.abs(more))}。` : ''}` : `${R.name}还没有调用记录，开始工作后这里会自动生成总结。`;
  const cmp = () => '';
  const dl = (a, b, f, unit = '%') => { if (!b) return ''; const d = unit === 'pt' ? (a - b) * 100 : (a / b - 1) * 100, up = d >= 0, pv = f === 'h' ? hmT(b) : unit === 'pt' ? (b * 100).toFixed(1) + '%' : f === '$' ? fUSD(b) : fmt(b); return `${R.prev} ${pv} · <b class="${up ? 'up' : 'dn'}">${up ? '▲' : '▼'} ${f === 'h' ? hmT(Math.abs(a - b)) : unit === 'pt' ? Math.abs(d).toFixed(1) + ' 个点' : Math.abs(Math.round(d)) + '%'}</b>`; };
  const stat = (l, v, a, b, g, d) => `<div class="md st" style="grid-column:span 3"><div class="lb">${l}</div><div class="kn num">${v}</div>${d ? `<div class="d num">${d}</div>` : ''}</div>`;
  // 时间轴：工作时段内每个会话的活跃段
  const tA = ws.length ? ws[0][0] : R.a, tB = Math.max(ws.length ? ws[ws.length - 1][1] : R.b, tA + 3600), TW = SPANW(12) - 210 - 90 - 32, TX = x => (x - tA) / (tB - tA) * TW;
  const top = ss.slice(0, 4), restN = ss.length - top.length, restV = ss.slice(4).reduce((a, g) => a + g.in + g.out, 0);
  // 本周：每个会话一行，七天各一格，颜色深浅 = 当天消耗；今天：工作时段时间轴
  const w0 = wk0(), dayCell = (g, i) => { const v = Array.from({ length: 7 }, (_, d) => { const x = agg(rs.filter(r => r.root === g.key && r.t >= w0 + d * 86400 && r.t < w0 + (d + 1) * 86400)); return x.in + x.out; }), mx = Math.max(...v, 1);
    return `<div class="wkg">${v.map((x, d) => `<i style="background:${x ? PAL[i % PAL.length] : ink(.05)};opacity:${x ? (.35 + .65 * x / mx).toFixed(2) : 1}" ${tipA(`${SE[g.key].title}<br>${WD[L(w0 + d * 86400).getUTCDay()]} · ${x ? fmt(x) : '没有调用'}`)}></i>`).join('')}</div>`; };
  const lanes = top.map((g, i) => { const sp = workSpans(rs.filter(r => r.root === g.key)); return `<div class="tlr"><span class="nm el">${SE[g.key].title}<span class="tg">${esc(SE[g.key].ws || '')}</span></span>
    ${week ? dayCell(g, i) : `<svg width="${TW}" height="14" style="display:block">${sp.map(([a, b]) => `<rect x="${TX(a).toFixed(1)}" y="2" width="${Math.max(8, TX(b) - TX(a)).toFixed(1)}" height="10" rx="5" fill="${PAL[i % PAL.length]}" ${tipA(`${SE[g.key].title}<br>${atLocal(a)} – ${fT(b).slice(0, 5)}`)}/>`).join('')}</svg>`}<span class="v num">${fmt(g.in + g.out)}</span></div>`; }).join('')
    + (restN ? `<div class="tlr" style="height:22px"><span class="nm" style="color:var(--fg-4);font-size:12.5px">其余 ${restN} 个会话</span><span></span><span class="v num" style="color:var(--fg-4)">${fmt(restV)}</span></div>` : '');
  const nt = Math.min(6, Math.max(2, Math.round((tB - tA) / 7200))), ticks = week ? Array.from({ length: 7 }, (_, d) => `<span style="flex:1;text-align:center">${WD[L(w0 + d * 86400).getUTCDay()]}</span>`).join('') : Array.from({ length: nt + 1 }, (_, i) => `<span>${fT(tA + (tB - tA) * i / nt).slice(0, 5)}</span>`).join('');
  // 本周每天
  const days = Array.from({ length: 7 }, (_, i) => { const a = w0 + i * 86400, r = rowsAB(a, a + 86400); return { i, a, s: spanSec(workSpans(r)), g: agg(r) }; }), dm = Math.max(...days.map(x => x.s), 3600), today = Math.floor((day0() - w0) / 86400);
  const wsum = days.reduce((a, x) => a + x.s, 0), wg = agg(rowsAB(w0, NOW + 1));
  const md = `## ${R.name}工作总结（${fD(NOW)}）\n\n- 工作时长：${hmT(sec)}\n- 会话：${ss.length} 个\n- 调用：${t.n} 次\n- 真实消耗：${fmt(t.in + t.out)} tokens\n- 花费：约 ${fUSD(t.cost)}\n- 缓存命中：${(hit * 100).toFixed(1)}%\n\n${ss.slice(0, 6).map(g => `- ${SE[g.key].title.replace(/&[^;]+;/g, '')}：${fmt(g.in + g.out)}`).join('\n')}`;
  window._repMd = md;
  return shell(sub() + `<div class="body h2"><div class="pg rep">${aura()}
    <section class="rw" style="height:180px">
      <div class="md" style="grid-column:span 6">
        <div class="kick">${fD(NOW)} · ${WD[L(NOW).getUTCDay()]} · ${fT(NOW).slice(0, 5)}</div>
        <div class="hi">${hi}</div><div class="say">${say}</div>
        <div class="row" style="gap:10px;margin-top:14px">${seg([['day', '今天'], ['week', '本周']], week ? 'week' : 'day', 'repw')}<span class="ibg"><span class="ib2" ${A('repcopy')} ${tipA('复制为 Markdown')}>${icon('copy', 15)}</span></span></div>
      </div>
      <div class="md" style="grid-column:7 / span 6">${dusk(week || !rs.length ? rowsAB(wk0(), NOW + 1) : rs, SPANW(6))}</div>
    </section>
    <section class="rw">
      ${stat('工作时长', hm(sec), sec, psec, G3.gemini, dl(sec, psec, 'h'))}
      ${stat('真实消耗', unit(fmt(t.in + t.out)), t.in + t.out, p.in + p.out, G3.week, dl(t.in + t.out, p.in + p.out))}
      ${stat('花费', fUSD(t.cost), t.cost, p.cost, G3.claude, dl(t.cost, p.cost, '$'))}
      ${stat('缓存命中', `${(hit * 100).toFixed(1)}<small>%</small>`, hit, phit, G3.cyan, dl(hit, phit, null, 'pt'))}
    </section>
    <section class="rw"><div class="md" style="grid-column:1/-1">
      <div class="hd" style="margin-bottom:8px"><span class="lb">${R.name}做了什么${week ? ' · 每格一天，越深用得越多' : ` · ${fT(tA).slice(0, 5)} – ${fT(tB).slice(0, 5)}`}</span><span class="lb" style="color:var(--fg-4)">${ss.length} 个会话 · ${proj.size} 个项目</span></div>
      ${lanes || '<div class="cap">还没有会话</div>'}
      ${lanes ? `<div class="tlr" style="height:20px"><span></span><div class="row num" style="justify-content:space-between;font-size:11.5px;color:var(--fg-4)">${ticks}</div><span></span></div>` : ''}
    </div></section>
    <section class="rw">
      <div class="md" style="grid-column:span 7"><div class="hd" style="margin-bottom:10px"><span class="lb">本周 · 已工作 ${hmT(wsum)}</span><span class="lb" style="color:var(--fg-4)">${fmt(wg.in + wg.out)} tokens · 约 ${fUSD(wg.cost)}</span></div>
        <div class="wk">${days.map(x => `<div class="${x.i === today ? 'on' : ''}" ${tipA(`${WD[L(x.a).getUTCDay()]} ${fD(x.a)}${x.s ? `<br>${hmT(x.s)} · ${fmt(x.g.in + x.g.out)} · 约 ${fUSD(x.g.cost)}` : ''}`)}><span class="num" style="font-size:11.5px">${x.s ? (x.s / 3600).toFixed(1) + 'h' : ''}</span><span class="bar" style="height:${x.s ? Math.max(6, x.s / dm * 52) : 4}px;background:${x.s ? (x.i === today ? 'linear-gradient(180deg,#8E7CF6,#4C8DF6)' : 'linear-gradient(180deg,rgb(91 155 255/.55),rgb(91 155 255/.2))') : ink(.06)}"></span>${WD[L(x.a).getUTCDay()]}</div>`).join('')}</div></div>
      <div class="md" style="grid-column:9 / span 4"><div class="hd" style="margin-bottom:12px"><span class="lb">下班提醒</span><span class="row" style="gap:8px;font-size:12.5px;color:var(--fg-3)">工作日 ${st.rep.at}<span class="sw ${st.rep.on ? 'on' : ''}" ${A('set', 'rep.on=!')}></span></span></div>
        <div class="nt"><span class="ap"><svg width="18" height="18" viewBox="0 0 10 10"><path d="M2 8V5.5M5 8V2M8 8V4" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg></span><div style="flex:1;min-width:0"><div class="row" style="justify-content:space-between"><span class="t">Buddy</span><span style="font-size:11.5px;color:var(--fg-4)">${st.rep.at}</span></div><div class="b">今天辛苦了，总结好了</div><div class="b" style="color:var(--fg-3)">${sec ? hmT(sec) : '—'} · ${ss.length} 个会话 · 约 ${fUSD(t.cost)}</div></div></div>
        <div style="font-size:12px;color:var(--fg-4);margin-top:12px">Buddy 打开时到点提醒；周五另附一周总结</div></div>
    </section>
  </div></div>`);
}
// 下班提醒：Buddy 页面开着时，到点弹一次（每天一次）
setInterval(() => {
  if (!st.rep.on || !LIVE.at) return; const d = L(nowS()), wd = d.getUTCDay(); if (wd === 0 || wd === 6) return;
  const [h, m] = st.rep.at.split(':').map(Number), key = fD(nowS());
  if (d.getUTCHours() * 60 + d.getUTCMinutes() < h * 60 + m || st.rep.last === key) return;
  st.rep.last = key; saveSt(); const rs = rowsAB(day0(), NOW + 1), msg = `今天辛苦了 · ${hmT(spanSec(workSpans(rs)))} · 约 ${fUSD(agg(rs).cost)}`;
  try { if (window.Notification && Notification.permission === 'granted') new Notification('Buddy', { body: msg }); } catch {}
  toast(msg + ' · 点「日报」看总结');
}, 60000);
const accPost = async (path, body) => { try { const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) }); return await r.json(); } catch (e) { return { ok: false, error: e.message }; } };
const ACC_ACT = {
  accAsk(v) { st.acc.ask = v || null; return 'keep'; },
  async accGo(v) { st.acc.ask = null; const r = await accPost('/api/accounts/switch', { email: v }); if (r && r.ok) { st.acc.busy = v; } else toast('切换失败：' + (r?.error || '未知错误')); render(); },
  async accAdd() { st.acc.ask = null; const r = await accPost('/api/accounts/add'); if (r && r.ok) st.acc.busy = '新账号'; else toast('无法添加：' + (r?.error || '未知错误')); render(); },
  async accDel(v) { if (!confirm(`从 Buddy 移除 ${v}？（不会影响这个 Google 账号本身）`)) return; const r = await accPost('/api/accounts/remove', { email: v }); toast(r?.ok ? '已移除' : '移除失败：' + (r?.error || '')); refresh(); },
};
const REPORT_ACT = { repw(v) { st.rep.week = v === 'week'; }, repcopy() { navigator.clipboard?.writeText(window._repMd || '').then(() => toast('已复制为 Markdown')).catch(() => toast('复制失败')); } };

/* ===== 用量：一行指标（同时是图表的指标切换器，带环比）+ 复合主图 + 三张走势折线 + 会话/模型/速度 ===== */
const METRICS = { n: ['调用', '次'], in: ['新增输入', '实际发出的输入'], cache: ['缓存复用', ''], out: ['输出', '模型生成'], real: ['真实消耗', '新增输入 + 输出'], cost: ['估算成本', '按 API 公开价'] };
const MCOL = { n: 'rgb(255 255 255 / .55)', in: 'var(--s1)', cache: 'var(--s3)', out: 'var(--s2)', real: 'var(--s1)', cost: 'rgb(255 255 255 / .55)' };
const STK = ['var(--s1)', 'var(--s2)', 'var(--s3)', '#9b7be0', '#c9a227', 'rgb(255 255 255 / .26)'];
const mval = (m, r) => m === 'n' ? 1 : m === 'real' ? r.in + r.out : r[m];
const mfmt = m => m === 'n' ? v => comma(v) : m === 'cost' ? v => fUSD(v) : fmt;
const yfmtOf = m => m === 'n' ? v => String(Math.round(v)) : m === 'cost' ? v => '$' + +v.toFixed(v < 10 ? 1 : 0) : ax;
const median = a => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[b.length >> 1] : 0; };
const bIdx = bs => { const a0 = bs[0].a, step = bs[0].b - bs[0].a; return r => Math.min(bs.length - 1, Math.floor((r.t - a0) / step)); };
// 主图的堆叠方式：按类型（输入/输出、成本三段）、按模型、按会话（前 5 个 + 其他）
function stackSeries(rs, m) {
  if (st.stack === 'model' || st.stack === 'sess') {
    const k = st.stack === 'model' ? 'm' : 'root', top = groupBy(rs, k).map(g => [g.key, rs.filter(r => r[k] === g.key).reduce((a, r) => a + mval(m, r), 0)]).sort((a, b) => b[1] - a[1]);
    const keep = top.slice(0, 5).map(x => x[0]), ser = keep.map((key, i) => ({ name: k === 'm' ? `<span class="mono">${MODEL_NAME(key)}</span>` : SE[key].title, c: STK[i], f: r => r[k] === key ? mval(m, r) : 0, act: [k === 'm' ? 'fmodel' : 'fsess', key] }));
    if (top.length > 5) ser.push({ name: `其他 ${top.length - 5} 个`, c: STK[5], f: r => keep.includes(r[k]) ? 0 : mval(m, r) });
    return ser;
  }
  if (m === 'real') return [{ name: '新增输入', c: 'var(--s1)', f: r => r.in, act: ['metric', 'in'] }, { name: '输出', c: 'var(--s2)', f: r => r.out, act: ['metric', 'out'] }];
  if (m === 'cost') return [['输入', 1, 'in', 'var(--s1)'], ['缓存读取', 2, 'cache', 'var(--s3)'], ['输出', 3, 'out', 'var(--s2)']].map(([name, j, f, c]) => ({ name, c, f: r => r[f] * rateOf(MODEL_NAME(r.m))[j] / 1e6 }));
  return [{ name: METRICS[m][0], c: MCOL[m], f: r => mval(m, r) }];
}
const xAxis = (bs, x0, band, h, every) => bs.map((b, i) => (b.mid && i ? `<line x1="${x0 + band * i}" x2="${x0 + band * i}" y1="4" y2="${h - 18}" stroke="rgb(255 255 255 / .07)" stroke-dasharray="2 3"/>` : '')
  + (i % every === 0 ? `<text x="${x0 + band * (i + .5)}" y="${h - 4}" fill="${b.mid ? 'var(--fg-3)' : 'var(--fg-4)'}" font-size="10.5" text-anchor="middle" class="num">${b.mid && b.b - b.a < 86400 ? fD(b.a).slice(3) + '日' : b.label}</text>` : '')).join('');
const everyOf = (n, w, px = 46) => Math.max(1, Math.ceil(n / Math.floor(w / px)));
function richChart(bs, rs, m, W) {
  const ser = stackSeries(rs, m), at = bIdx(bs), B = bs.map(() => ({ rows: [] }));
  rs.forEach(r => B[at(r)].rows.push(r));
  B.forEach(b => { b.g = agg(b.rows); b.parts = ser.map(s => b.rows.reduce((a, r) => a + s.f(r), 0)); b.tot = b.parts.reduce((a, x) => a + x, 0); b.hit = b.g.n ? pct(b.g.cache, b.g.cache + b.g.in) : null; b.dec = median(b.rows.filter(r => r.dec).map(r => r.dec)); });
  const H = 268, pad = { l: 44, r: st.ov.hit ? 40 : 8, t: 18, b: 22 }, iw = W - pad.l - pad.r, ih = H - pad.t - pad.b, band = iw / bs.length, bw = Math.max(2, Math.min(bs.length > 60 ? 7 : 18, band * .62));
  const tots = B.map(b => b.tot), total = tots.reduce((a, x) => a + x, 0), act = tots.filter(x => x > 0), avg = act.length ? total / act.length : 0;
  const yMax = niceMax(Math.max(...tots, 1)), Y = v => pad.t + ih - v / yMax * ih, Yr = f => pad.t + ih - f * ih, f1 = mfmt(m), yf = yfmtOf(m);
  const peak = tots.indexOf(Math.max(...tots)); let g = '';
  if (!total) g += `<text x="${W / 2}" y="${pad.t + ih / 2}" fill="var(--fg-4)" font-size="13" text-anchor="middle">这段时间没有调用</text>`;
  [0, 1, 2, 3, 4].forEach(k => { const v = yMax * k / 4, y = Math.round(Y(v)) + .5; g += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y}" y2="${y}" stroke="${k ? 'var(--grid)' : 'var(--axis)'}"/>${total ? `<text x="${pad.l - 10}" y="${y + 3.5}" fill="var(--fg-4)" font-size="10.5" text-anchor="end" class="num">${yf(v)}</text>` : ''}${st.ov.hit && total ? `<text x="${W - pad.r + 8}" y="${y + 3.5}" fill="var(--fg-4)" font-size="10.5" class="num">${k * 25}%</text>` : ''}`; });
  g += xAxis(bs, pad.l, band, H, everyOf(bs.length, iw));
  B.forEach((b, i) => {
    const x = pad.l + band * i + (band - bw) / 2; let y = pad.t + ih, segs = ''; const vis = b.parts.map((v, k) => [v, k]).filter(([v]) => v > 0);
    vis.forEach(([v, k], j) => { const hg = Math.max(1, v / yMax * ih - (j ? 1.5 : 0)); y -= hg + (j ? 1.5 : 0); const top = j === vis.length - 1, rr = top ? Math.min(2.5, hg, bw / 2) : 0;
      segs += `<path class="mk" d="M${x},${y + hg}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + bw - rr}Q${x + bw},${y} ${x + bw},${y + rr}V${y + hg}Z" fill="${ser[k].c}"/>`; });
    const tip = `<span class="dim">${bs[i].long}</span><br>${ser.map((s, k) => b.parts[k] ? `${sw(s.c)}${s.name} <b class="num">${f1(b.parts[k])}</b> <span class="dim num">${Math.round(b.parts[k] / b.tot * 100)}%</span>` : '').filter(Boolean).join('<br>') || '<span class="dim">没有调用</span>'}`
      + (b.g.n ? `<br><span class="dim num">${comma(b.g.n)} 次调用 · 缓存 ${fmt(b.g.cache)} · 命中 ${Math.round(b.hit * 100)}%<br>约 ${fUSD(b.g.cost)}${b.dec ? ` · 解码中位 ${Math.round(b.dec)} tok/s` : ''} · 点击查看明细</span>` : '');
    g += `<g class="hit" ${tipA(tip)} ${b.g.n ? A('bucket', bs[i].a + ',' + bs[i].b) : ''}><rect x="${pad.l + band * i}" y="${pad.t}" width="${band}" height="${ih}" fill="transparent"/>${st.ctype === 'bar' ? segs : ''}</g>`;
  });
  // 折线 / 堆叠面积：同一组数据换一种画法，末端标数值
  if (st.ctype !== 'bar' && total) { const X = i => pad.l + band * (i + .5), base = B.map(() => 0), area = st.ctype === 'area', paths = [];
    ser.forEach((se, k) => { const top = B.map((b, i) => (area ? base[i] : 0) + b.parts[k]), up = top.map((v, i) => [X(i), Y(v)]), d = curve(up);
      if (area) { const dn = base.map((v, i) => [X(i), Y(v)]).reverse(); paths.unshift(`<path d="${d}L${dn[0][0]},${dn[0][1]}${curve(dn).replace(/^M[^C]*/, '')}Z" fill="${se.c}" opacity=".55" pointer-events="none"/><path d="${d}" fill="none" stroke="${se.c}" stroke-width="1.5" pointer-events="none"/>`); top.forEach((v, i) => base[i] = v); }
      else paths.push(`<path d="${d}" fill="none" stroke="${se.c}" stroke-width="2" stroke-linejoin="round" pointer-events="none"/>` + (bs.length <= 40 ? up.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="${se.c}" stroke="var(--background)" stroke-width="1.5" pointer-events="none"/>`).join('') : ''));
    }); g += paths.join(''); }
  if (tots[peak] > 0 && bs.length > 1) g += `<text x="${pad.l + band * (peak + .5)}" y="${Y(tots[peak]) - 6}" fill="var(--fg-2)" font-size="10.5" text-anchor="middle" class="num">${f1(tots[peak])}</text>`;
  if (st.ov.avg && avg) g += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${Y(avg)}" y2="${Y(avg)}" stroke="var(--fg-3)" stroke-dasharray="4 4" opacity=".7" pointer-events="none"/><text x="${pad.l + 4}" y="${Y(avg) - 5}" fill="var(--fg-3)" font-size="10.5" class="num" pointer-events="none">均值 ${f1(avg)}</text>`;
  if (st.ov.cum && total) { let c = 0; const pts = B.map((b, i) => { c += b.tot; return [pad.l + band * (i + 1), pad.t + ih - c / total * ih]; });
    g += `<path d="M${pad.l},${pad.t + ih}${pts.map(p => `L${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('')}" fill="none" stroke="rgb(255 255 255 / .5)" stroke-width="1.25" stroke-dasharray="1 3" stroke-linecap="round" pointer-events="none"/><text x="${W - pad.r - 4}" y="${pad.t - 6}" fill="var(--fg-3)" font-size="10.5" text-anchor="end" class="num" pointer-events="none">累计 ${f1(total)}</text>`; }
  if (st.ov.hit) { let d = '', on = false; B.forEach((b, i) => { if (b.hit == null) { on = false; return; } const x = pad.l + band * (i + .5), y = Yr(b.hit); d += `${on ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`; on = true; });
    g += `<path d="${d}" fill="none" stroke="var(--s3)" stroke-width="1.5" stroke-linejoin="round" pointer-events="none"/>` + B.map((b, i) => b.hit != null && b.hit < .6 ? `<circle cx="${pad.l + band * (i + .5)}" cy="${Yr(b.hit)}" r="2.5" fill="var(--background)" stroke="var(--s3)" stroke-width="1.5" pointer-events="none"/>` : '').join(''); }
  // 下方细条：每个时段的调用次数
  const nMax = Math.max(...B.map(b => b.g.n), 1), CH = 30; let c2 = '';
  B.forEach((b, i) => { if (!b.g.n) return; const hg = Math.max(1.5, b.g.n / nMax * (CH - 8)); c2 += `<rect x="${pad.l + band * i + (band - bw) / 2}" y="${CH - hg}" width="${bw}" height="${hg}" rx="1" fill="rgb(255 255 255 / .22)" class="hit" ${tipA(`<span class="dim">${bs[i].long}</span><br>${comma(b.g.n)} 次调用`)}/>`; });
  const legend = ser.map((s, k) => { const v = B.reduce((a, b) => a + b.parts[k], 0); return `<span ${s.act ? A(s.act[0], s.act[1]) : ''} class="${s.act ? 'lk' : ''}"><i style="background:${s.c}"></i><span class="el" style="max-width:180px">${s.name}</span><b class="num">${f1(v)}</b><span class="dim2 num">${total ? Math.round(v / total * 100) : 0}%</span></span>`; }).join('');
  return { svg: `<svg width="${W}" height="${H}" style="display:block;overflow:visible">${g}</svg><div class="row" style="margin-top:6px"><svg width="${W}" height="${CH}" style="display:block"><text x="${pad.l - 10}" y="${CH - 4}" fill="var(--fg-4)" font-size="10.5" text-anchor="end" ${tipA(`每个时段的调用次数，最多 ${nMax} 次`)}>调用</text><line x1="${pad.l}" x2="${W - pad.r}" y1="${CH - .5}" y2="${CH - .5}" stroke="var(--axis)"/>${c2}</svg></div>`,
    legend, total, avg, peak: tots[peak] ? `${bs[peak].long} · ${f1(tots[peak])}` : '—', active: act.length };
}
// 小折线：多条线（左右轴），空桶断线；每个时段都能悬停、点击
function lineChart({ bs, series, W, H = 150, lfmt, rfmt, lmax, rmax, tips }) {
  const pad = { l: 40, r: rfmt ? 38 : 6, t: 10, b: 22 }, iw = W - pad.l - pad.r, ih = H - pad.t - pad.b, band = iw / bs.length;
  const mx = { l: lmax || niceMax(Math.max(1e-9, ...series.filter(s => s.axis !== 'r').flatMap(s => s.v.filter(v => v != null)))), r: rmax || niceMax(Math.max(1e-9, ...series.filter(s => s.axis === 'r').flatMap(s => s.v.filter(v => v != null)))) };
  const Y = (v, a) => pad.t + ih - v / mx[a] * ih; let g = '';
  [0, 1, 2, 3].forEach(k => { const y = Math.round(pad.t + ih - k / 3 * ih) + .5; g += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y}" y2="${y}" stroke="${k ? 'var(--grid)' : 'var(--axis)'}"/><text x="${pad.l - 8}" y="${y + 3.5}" fill="var(--fg-4)" font-size="10" text-anchor="end" class="num">${lfmt(mx.l * k / 3)}</text>${rfmt ? `<text x="${W - pad.r + 6}" y="${y + 3.5}" fill="var(--fg-4)" font-size="10" class="num">${rfmt(mx.r * k / 3)}</text>` : ''}`; });
  g += xAxis(bs, pad.l, band, H, everyOf(bs.length, iw, 52));
  series.forEach(s => { const a = s.axis === 'r' ? 'r' : 'l'; let d = '', on = false, pts = [];
    const segs = []; s.v.forEach((v, i) => { if (v == null) { on = false; return; } const x = pad.l + band * (i + .5), y = Y(Math.min(v, mx[a]), a); d += `${on ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`; if (!on) segs.push([]); segs[segs.length - 1].push([x, y]); on = true; pts.push([x, y]); });
    if (s.area) segs.filter(q => q.length > 1).forEach(q => { g += `<path d="M${q.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L')}L${q[q.length - 1][0]},${pad.t + ih}L${q[0][0]},${pad.t + ih}Z" fill="${s.c}" opacity=".1"/>`; });
    g += `<path d="${d}" fill="none" stroke="${s.c}" stroke-width="1.5" ${s.dash ? 'stroke-dasharray="3 3"' : ''} stroke-linejoin="round"/>` + (pts.length < 40 ? pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="2" fill="${s.c}"/>`).join('') : '');
    if (s.ref != null) g += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${Y(s.ref, a)}" y2="${Y(s.ref, a)}" stroke="${s.c}" stroke-dasharray="4 4" opacity=".45"/>`; });
  bs.forEach((b, i) => { g += `<rect class="hit" x="${pad.l + band * i}" y="${pad.t}" width="${band}" height="${ih}" fill="transparent" ${tipA(tips[i])} ${A('bucket', b.a + ',' + b.b)}/>`; });
  return `<svg width="${W}" height="${H}" style="display:block;overflow:visible">${g}</svg>`;
}
function vTokens() {
  const rs = rowsIn(), t = agg(rs), bs = buckets(), hit = pct(t.cache, t.cache + t.in), m = st.metric, s = span(), len = s.b - s.a;
  // 环比：与紧挨着的上一段等长时间比较
  const p = agg(rowsIn({ a: s.a - len, b: s.a })), V = x => ({ n: x.n, in: x.in, cache: x.cache, out: x.out, real: x.in + x.out, cost: x.cost }), cv = V(t), pv = V(p);
  const delta = k => { if (!pv[k] || st.range === 'all') return ''; const d = cv[k] / pv[k] - 1; return `<span class="dl num ${d > 0 ? 'up' : 'dn'}" ${tipA(`上一段同长时间：${mfmt(k)(pv[k])}`)}>${d > 0 ? '+' : ''}${Math.abs(d) >= 10 ? Math.round(d) + '×' : Math.round(d * 100) + '%'}</span>`; };
  const W = CW(), rc = richChart(bs, rs, m, W);
  const at = bIdx(bs), B = bs.map(() => []); rs.forEach(r => B[at(r)].push(r));
  const G = B.map(agg), hits = G.map(g => g.n ? pct(g.cache, g.cache + g.in) : null);
  const decs = B.map(x => { const d = x.filter(r => r.dec); return d.length ? median(d.map(r => r.dec)) : null; }), ttfts = B.map(x => { const d = x.filter(r => r.ttft); return d.length ? median(d.map(r => r.ttft)) : null; });
  const ctx = B.map(x => x.length ? median(x.map(r => r.in + r.cache)) : null), ctxMax = B.map(x => x.length ? Math.max(...x.map(r => r.in + r.cache)) : null);
  const allDec = median(rs.filter(r => r.dec).map(r => r.dec)), allTt = median(rs.filter(r => r.ttft).map(r => r.ttft)), allCtx = median(rs.map(r => r.in + r.cache));
  const lw = Math.floor((W - 2 * 40) / 3);
  const sp = [...new Set(rs.filter(r => r.dec).map(r => r.m))].map(k => { const x = rs.filter(r => r.m === k && r.dec); return { key: k, n: x.length, dec: median(x.map(r => r.dec)), ttft: median(x.map(r => r.ttft)), p90: x.map(r => r.dec).sort((a, b) => a - b)[Math.floor(x.length * .9)] || 0 }; }).sort((a, b) => b.n - a.n).slice(0, 6);
  const ms = groupBy(rowsIn({ noModel: 1 }), 'm').sort((a, b) => b.in + b.out - a.in - a.out).slice(0, 6), mm = ms.length ? ms[0].in + ms[0].out : 1;
  const ss = groupBy(rowsIn({ noSess: 1 }), 'root').sort((a, b) => b.in + b.out - a.in - a.out).slice(0, 6), sm = ss.length ? ss[0].in + ss[0].out : 1;
  const pair = (g, mx) => `<span style="flex:1;display:flex;height:4px;gap:2px"><span class="mk" style="width:${g.in / mx * 100}%;background:var(--s1);border-radius:2px"></span><span class="mk" style="width:${Math.max(g.out / mx * 100, 1)}%;background:var(--s2);border-radius:2px"></span></span>`;
  const tog = (k, l, c) => `<span class="chip ${st.ov[k] ? 'on' : ''}" ${A('ovt', k)}><i style="display:inline-block;width:10px;height:0;border-top:1.5px ${k === 'hit' ? 'solid' : k === 'cum' ? 'dotted' : 'dashed'} ${c};margin-right:6px;vertical-align:middle"></i>${l}</span>`;
  const val = { n: comma(t.n), in: fmt(t.in), cache: fmt(t.cache), out: fmt(t.out), real: fmt(t.in + t.out), cost: fUSD(t.cost) };
  return shell(sub(filters({ extra: `<span class="ctl" ${A('export')}>${ic('ios_share')}导出</span>` })) + `<div class="body">
    <div class="mstrip">${Object.keys(METRICS).map(k => `<div class="mcell ${k === m ? 'on' : ''}" ${A('metric', k)} style="--mc:${MCOL[k]}" ${tipA(k === 'cache' ? `占输入 ${(hit * 100).toFixed(1)}%` : METRICS[k][1])}><span class="ml">${METRICS[k][0]}</span><span class="mv num">${val[k]}</span>${delta(k)}</div>`).join('')}</div>
    <div class="h" style="margin-top:24px"><div class="row" style="gap:14px;align-items:baseline"><h3>${METRICS[m][0]}</h3><span class="dim num" style="font-size:12.5px">峰值 ${rc.peak} · 有调用的时段平均 ${mfmt(m)(rc.avg)} · ${rc.active}/${bs.length} 个时段</span></div>
      <div class="x">${ibg([['bar', 'bar', '柱状图'], ['line', 'line', '折线图'], ['area', 'area', '堆叠面积图']], st.ctype, 'ctype')}${seg([['type', '按类型'], ['model', '按模型'], ['sess', '按会话']], st.stack, 'stack')}<span class="row" style="gap:6px">${tog('hit', '命中率', 'var(--s3)')}${tog('cum', '累计', 'rgb(255 255 255 / .6)')}${tog('avg', '均值', 'var(--fg-3)')}</span></div></div>
    <div class="lgd2">${rc.legend}</div>
    ${rc.svg}
    <div class="hr"></div>
    <div class="cols" style="grid-template-columns:repeat(3,1fr);gap:40px">
      <div><div class="h"><h3>缓存命中率</h3><div class="x num">整体 ${(hit * 100).toFixed(1)}%</div></div>
        ${lineChart({ bs, W: lw, series: [{ v: hits, c: 'var(--s3)', area: 1, ref: hit }], lmax: 1, lfmt: v => Math.round(v * 100) + '%', tips: bs.map((b, i) => `<span class="dim">${b.long}</span><br>${hits[i] == null ? '没有调用' : `命中率 ${(hits[i] * 100).toFixed(1)}%<br><span class="dim num">复用 ${fmt(G[i].cache)} · 新增 ${fmt(G[i].in)}</span>`}`) })}</div>
      <div><div class="h"><h3>速度</h3><div class="x"><span class="lgd"><span><i style="background:var(--s1)"></i>解码 ${allDec ? Math.round(allDec) : '—'} tok/s</span><span><i style="background:var(--s2)"></i>首字 ${allTt ? allTt.toFixed(1) + 's' : '—'}</span></span></div></div>
        ${lineChart({ bs, W: lw, series: [{ v: decs, c: 'var(--s1)', ref: allDec || null }, { v: ttfts, c: 'var(--s2)', axis: 'r', dash: 1 }], lfmt: v => String(Math.round(v)), rfmt: v => v.toFixed(v < 10 ? 1 : 0) + 's', tips: bs.map((b, i) => `<span class="dim">${b.long}</span><br>${decs[i] == null ? '没有速度数据' : `${sw('var(--s1)')}解码中位 ${Math.round(decs[i])} tok/s<br>${sw('var(--s2)')}首字中位 ${(ttfts[i] || 0).toFixed(1)}s`}`) })}</div>
      <div><div class="h"><h3>单次上下文</h3><div class="x"><span class="lgd"><span><i style="background:#9b7be0"></i>中位 ${fmt(allCtx)}</span><span><i style="background:rgb(255 255 255 / .4)"></i>最大</span></span></div></div>
        ${lineChart({ bs, W: lw, series: [{ v: ctxMax, c: 'rgb(255 255 255 / .35)', dash: 1 }, { v: ctx, c: '#9b7be0', area: 1 }], lfmt: ax, tips: bs.map((b, i) => `<span class="dim">${b.long}</span><br>${ctx[i] == null ? '没有调用' : `单次输入（含缓存）中位 ${fmt(ctx[i])}<br>最大 ${fmt(ctxMax[i])}`}`) })}</div>
    </div>
    <div class="hr"></div>
    <div class="cols" style="grid-template-columns:1.15fr 1fr 340px">
      <div>
        <div class="h"><h3>会话</h3><div class="x">真实消耗 · 点击筛选</div></div>
        ${ss.map(g => `<div class="row rowh" ${A('fsess', st.fSess === g.key ? '' : g.key)} ${tipA(`${SE[g.key].title}<br><span class="dim num">${g.n} 次调用 · 输入 ${fmt(g.in)} · 输出 ${fmt(g.out)} · 缓存 ${fmt(g.cache)} · 约 ${fUSD(g.cost)}</span>`)} style="height:30px;gap:10px;${st.fSess === g.key ? 'background:var(--selected)' : ''}"><span class="el" style="width:170px;color:var(--fg-2)">${SE[g.key].title}</span>${pair(g, sm)}<span class="num r" style="width:44px;font-size:13px">${fmt(g.in + g.out)}</span><span class="num r dim2" style="width:46px;font-size:12px">${fUSD(g.cost)}</span></div>`).join('') || '<div class="cap">没有调用</div>'}
      </div>
      <div>
        <div class="h"><h3>模型</h3><div class="x">点击筛选</div></div>
        ${ms.map(g => `<div class="row rowh" ${A('fmodel', st.fModel === g.key ? '' : g.key)} ${tipA(`<span class="mono">${MODEL_NAME(g.key)}</span><br><span class="dim num">${g.n} 次调用 · 命中 ${Math.round(pct(g.cache, g.cache + g.in) * 100)}% · 约 ${fUSD(g.cost)}</span>`)} style="height:30px;gap:10px;${st.fModel === g.key ? 'background:var(--selected)' : ''}">${lg(MODEL_NAME(g.key))}<span class="mono el" style="width:150px;color:var(--fg-2)">${MODEL_NAME(g.key)}</span>${pair(g, mm)}<span class="num r" style="width:44px;font-size:13px">${fmt(g.in + g.out)}</span><span class="num r dim2" style="width:46px;font-size:12px">${fUSD(g.cost)}</span></div>`).join('') || '<div class="cap">没有调用</div>'}
      </div>
      <div>
        <div class="h"><h3>按模型的速度</h3><div class="x">中位 · P90 · 首字</div></div>
        ${sp.map(g => `<div class="row" style="height:30px;gap:10px">${lg(MODEL_NAME(g.key))}<span class="mono el" style="flex:1;color:var(--fg-2)">${MODEL_NAME(g.key)}</span><span class="num r" style="width:64px">${Math.round(g.dec)} <span class="dim2">tok/s</span></span><span class="num r dim" style="width:36px">${Math.round(g.p90)}</span><span class="num r dim" style="width:40px">${g.ttft.toFixed(1)}s</span></div>`).join('') || '<div class="cap">没有速度数据</div>'}
      </div>
    </div>
  </div>`);
}
const TOKENS_ACT = { stack(v) { st.stack = v; }, ovt(k) { st.ov = { ...st.ov, [k]: !st.ov[k] }; } };

/* ===== 额度：模型清单、剩余比例、重置时间全部来自 GetAvailableModels ===== */
const TIERS = ['Low', 'Medium', 'High', 'XHigh'];
let FAM = [], OTHER = [], QM = [];
// 一条调用算进哪个窗口：先按模型名对上额度里的模型；对不上的（如已下线的模型）归到同厂商的 5 小时窗口
const rowWinCache = new Map();
function rowWin(mi) {
  if (rowWinCache.has(mi)) return rowWinCache.get(mi);
  const name = MODEL_NAME(mi); let w = -1;
  if (mi >= 0) { const m = QM.find(q => q.aliases.some(a => a === name || a.startsWith(name + '-') || name.startsWith(a))); if (m) w = m.win; }
  if (w < 0) { const p = mi < 0 ? 'gemini' : logoOf(name); w = WINS.findIndex(x => x.len === 5 * 3600 && x.provs.has(p)); if (w < 0) w = WINS.findIndex(x => x.provs.has(p)); }
  rowWinCache.set(mi, w); return w;
}
// 窗口用量与剩余估算。额度很可能按成本计（缓存读取便宜得多），所以先估美元：
// 剩余美元 ≈ 本窗口已用美元 × 剩余比例 ÷ 已用比例；token 数再按近 24 小时的「每 token 成本」折算（含缓存）。已用不足 3% 不估
function winUse(k) {
  const w = WINS[k], g = agg(ROWS.filter(r => r.t >= w.t - w.len && rowWin(r.m) === k)), ms = QM.filter(m => m.win === k), f = ms.length ? Math.min(...ms.map(m => m.f)) : 1, u = 1 - f;
  const all = g.in + g.out + g.cache, ok = u >= .03 && g.cost > 0, d = agg(ROWS.filter(r => r.t >= NOW - 86400)), rate = d.cost / Math.max(1, d.in + d.out + d.cache);
  const capCost = ok ? g.cost / u : null, leftCost = ok ? capCost * f : null;
  return { ...g, tok: g.in + g.out, all, f, u, ok, capCost, leftCost, capAll: ok && rate ? capCost / rate : null, leftAll: ok && rate ? leftCost / rate : null, col: f <= .1 ? 'var(--crit)' : f <= .25 ? 'var(--warn)' : 'var(--s1)' };
}
// 燃尽图：窗口内累计花费（实线）+ 按本窗口平均速度外推到重置（虚线）+ 估算上限（横线）
function burn(k, W, H) {
  const w = WINS[k], x = winUse(k), t0 = w.t - w.len, rs = ROWS.filter(r => r.t >= t0 && rowWin(r.m) === k).sort((a, b) => a.t - b.t), el = NOW - t0;
  const rate = x.cost > 0 && el > 600 ? x.cost / el : 0, proj = x.cost + rate * Math.max(0, w.t - NOW), cap = x.capCost, top = Math.max(cap || 0, proj, x.cost, .01) * 1.12;
  const px = t => (t - t0) / w.len * W, py = v => H - 14 - v / top * (H - 26); let acc = 0, d = `M0,${py(0)}`;
  rs.forEach(r => { d += `L${px(r.t).toFixed(1)},${py(acc).toFixed(1)}`; acc += r.cost; d += `L${px(r.t).toFixed(1)},${py(acc).toFixed(1)}`; }); d += `L${px(NOW).toFixed(1)},${py(acc).toFixed(1)}`;
  const hit = cap && rate && proj > cap ? NOW + (cap - x.cost) / rate : null, endT = hit || w.t, endV = hit ? cap : proj;
  const note = !x.all ? '还没用过，用了才开始计时' : hit ? `按本窗口的平均速度，${atLocal(hit)} 用完` : cap ? `按本窗口的平均速度，到重置时用到 ${Math.round(proj / cap * 100)}%` : '用得太少，暂无法预测';
  const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block;overflow:visible">
    <line x1="0" x2="${W}" y1="${py(0)}" y2="${py(0)}" stroke="var(--axis)"/>
    ${cap ? `<line x1="0" x2="${W}" y1="${py(cap)}" y2="${py(cap)}" stroke="var(--fg-4)" stroke-dasharray="2 4"/><text x="${W}" y="${py(cap) - 5}" fill="var(--fg-4)" font-size="10.5" text-anchor="end">${fUSD(cap)}</text>` : ''}
    ${x.all ? `<defs><linearGradient id="bg${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${x.col}" stop-opacity=".28"/><stop offset="1" stop-color="${x.col}" stop-opacity="0"/></linearGradient></defs><path d="${d}L${px(NOW).toFixed(1)},${py(0)}L0,${py(0)}Z" fill="url(#bg${k})"/><path d="${d}" fill="none" stroke="${x.col}" stroke-width="1.75" stroke-linejoin="round"/>
    ${rate ? `<line x1="${px(NOW)}" y1="${py(acc)}" x2="${px(endT)}" y2="${py(endV)}" stroke="${hit ? 'var(--crit)' : 'var(--fg-3)'}" stroke-width="1.5" stroke-dasharray="3 4" stroke-linecap="round"/>` : ''}
    <circle cx="${px(NOW)}" cy="${py(acc)}" r="3.5" fill="${x.col}" stroke="var(--background)" stroke-width="2"/>` : ''}
    <text x="0" y="${H - 1}" fill="var(--fg-4)" font-size="10.5">${x.all ? atLocal(t0) : ''}</text><text x="${W}" y="${H - 1}" fill="var(--fg-4)" font-size="10.5" text-anchor="end">${x.all ? atLocal(w.t) : ''}</text>${hit ? `<text x="${px(hit)}" y="${py(cap) + 14}" fill="var(--crit)" font-size="10.5" text-anchor="middle">${atLocal(hit)} 用完</text>` : cap && rate ? `<text x="${W}" y="${py(proj) - 7}" fill="var(--fg-3)" font-size="10.5" text-anchor="end">${Math.round(proj / cap * 100)}%</text>` : ''}</svg>`;
  return { svg, note, x };
}
// 每个模型一次调用平均花多少（近 7 天），以及按所在额度池的估算余额还能调用几次
function perModel() {
  return groupBy(ROWS.filter(r => r.t >= NOW - 7 * 86400 && r.m >= 0), 'm').map(g => { const k = rowWin(g.key), x = k >= 0 ? winUse(k) : null, avg = g.cost / g.n;
    return { key: g.key, n: g.n, avg, tok: (g.in + g.out + g.cache) / g.n, win: k, left: x && x.ok ? Math.floor(x.leftCost / avg) : null, all: x && !x.all ? 0 : 1 }; }).sort((a, b) => b.n - a.n);
}
function buildQuota(models) {
  // 窗口：按重置时刻归组；剩余时间不超过 5 小时的算 5 小时窗口，其余算周窗口
  const wmap = new Map(), list = [];
  for (const [id, m] of Object.entries(models)) {
    if (m.disabled || !m.displayName || !m.quotaInfo || !m.quotaInfo.resetTime) continue;
    const t = Math.floor(Date.parse(m.quotaInfo.resetTime) / 1000), key = Math.round(t / 60);
    if (!wmap.has(key)) wmap.set(key, { t, provs: new Set(), n: 0 });
    const f = m.quotaInfo.remainingFraction ?? 0, dup = list.find(x => x.name === m.displayName && x.wkey === key);
    if (dup) { dup.aliases.push(id); dup.f = Math.min(dup.f, f); continue; }   // 同名别名合并
    list.push({ id, name: m.displayName, f, wkey: key, prov: logoOf(id), aliases: [id] });
  }
  WINS = [...wmap.entries()].sort((a, b) => a[1].t - b[1].t).map(([key, w]) => ({ key, ...w }));
  list.forEach(m => { const w = WINS.find(x => x.key === m.wkey); w.provs.add(m.prov); w.n++; m.win = WINS.indexOf(w); });
  WINS.forEach(w => { const five = w.t - NOW <= 5 * 3600 + 600; w.len = five ? 5 * 3600 : 7 * 86400; w.kind = five ? '5 小时' : '每周';
    const pv = [...w.provs].map(p => p === 'gemini' ? 'Gemini' : p === 'claude' ? 'Claude' : 'GPT'); w.who = pv.join('/'); w.short = `${w.kind} · ${w.who}`; w.tip = `${w.kind}窗口（${w.n} 个模型）`; });
  const calls = m => { const w = WINS[m.win], ids = m.aliases.map(a => U.models.indexOf(a)).filter(i => i >= 0); return ids.length ? ROWS.filter(r => r.raw && ids.includes(r.m) && r.t >= w.t - w.len).length : 0; };
  FAM = []; OTHER = []; QM = list; rowWinCache.clear();
  for (const m of list) {
    const mt = m.name.match(/^(.*?)\s*\((Low|Medium|High|XHigh)\)$/);
    m.calls = calls(m);
    Object.defineProperty(m, 'reset', { get: () => winAt(m.win) }); Object.defineProperty(m, 'cd', { get: () => winCd(m.win) });
    if (!mt) { OTHER.push(m); continue; }
    const famName = mt[1], famId = 'fam:' + famName + ':' + m.win; let fam = FAM.find(x => x[1] === famId);
    if (!fam) { fam = [famName, famId, [null, null, null, null], m.win, null, [0, 0, 0, 0], [null, null, null, null], m.prov]; FAM.push(fam); }
    const ti = TIERS.indexOf(mt[2]); fam[2][ti] = m.f; fam[5][ti] = m.calls; fam[6][ti] = m.id; m.fam = famId; m.name = `${famName} · ${mt[2]}`;
  }
  QM = list;
}

const qBy = id => QM.find(m => m.id === id);
const QF = { used: ['使用过', m => m.f < 1], attn: ['需留意', m => m.f <= .25], pin: ['已关注', m => st.q.pins.has(m.id)], all: ['全部', () => true] };
const qPass = m => QF[st.q.f][1](m) && (!st.q.prov || m.prov === st.q.prov) && (!st.q.s || (m.name + ' ' + m.id).toLowerCase().includes(st.q.s.toLowerCase()));

function qDetail(m, colspan) {
  const known = U.models.findIndex(x => m.aliases.includes(x)), d0 = Math.floor((NOW + TZ) / 86400) * 86400 - TZ - 6 * 86400;
  const days = [...Array(7)].map((_, i) => ROWS.filter(r => r.m === known && known >= 0 && r.t >= d0 + i * 86400 && r.t < d0 + (i + 1) * 86400).reduce((a, r) => a + r.in + r.out, 0));
  const total = days.reduce((a, b) => a + b, 0), pinned = st.q.pins.has(m.id);
  const kv = (k, v) => `<div><div class="lbl">${k}</div><div class="num" style="margin-top:6px;font-size:14px;font-weight:500">${v}</div></div>`;
  const inner = `<div data-xp style="background:var(--hover);border-radius:10px;padding:16px 18px;margin:6px 0 10px">
    <div class="row" style="gap:10px">${lg(m.id, 16)}<span style="font-weight:500">${m.name}</span><span class="mono dim">${m.id}</span><span class="sp"></span>
      <span class="btn" ${A('pin', m.id)}>${ic('keep', 14)}${pinned ? '取消关注' : '关注'}</span><span class="btn" ${A('usein', m.id)}>${ic('north_east', 14)}看它的调用</span><span class="ctl" ${A('qopen', '')}>${ic('close')}</span></div>
    <div style="display:grid;grid-template-columns:repeat(4,120px) 1fr;gap:24px;margin-top:16px;align-items:end">
      ${kv('剩余', Math.round(m.f * 100) + '%')}${kv('重置', `${m.reset} <span class="dim2" style="font-weight:400;font-size:12px">${m.cd}</span>`)}${kv('本窗口调用', m.calls || '—')}${kv('预计', m.eta ? m.eta + ' 用完' : m.f < 1 ? '暂无预测' : '—')}
      <div><div class="lbl" style="justify-content:space-between"><span>近 7 天真实消耗</span><span class="num">${total ? fmt(total) : '无记录'}</span></div><div style="margin-top:8px">${total ? spark(days, 300, 26, 'var(--s1)', { area: 1 }) : `<span style="display:block;height:1px;background:var(--axis);margin-top:25px"></span>`}</div></div>
    </div></div>`;
  return colspan ? `<tr><td colspan="${colspan}" style="height:auto;padding:0;border-bottom:1px solid var(--border)">${inner}</td></tr>` : `<div style="grid-column:1/-1">${inner}</div>`;
}
function vQuota() {
  const pm = perModel(), mxAvg = Math.max(...pm.map(p => p.avg), 1e-9), q = st.q.s.toLowerCase(), open = st.q.open && qBy(st.q.open);
  return shell(sub(`<span class="inp">${ic('search', 16)}<input data-i="qs" placeholder="搜索模型" value="${st.q.s}"><kbd>/</kbd></span>`) + `<div class="body scroll h2" style="overflow-y:auto">
    <div class="pg" style="padding:0;margin-bottom:8px">${aura()}${poolRow(30)}</div>
    <div class="hr"></div>
    <div class="h"><h3>还能用几次</h3><div class="x">近 7 天均值</div></div>
    ${pm.length ? pm.map(p => `<div class="row rowh" ${A('usein', MODEL_NAME(p.key))} style="height:38px;gap:14px">${lg(MODEL_NAME(p.key))}<span class="mono el" style="width:230px;color:var(--fg-2)">${MODEL_NAME(p.key)}</span>
        <span style="flex:1;display:flex;align-items:center;gap:10px"><span style="flex:1;max-width:340px">${bar(p.avg / mxAvg, 'var(--s1)')}</span><span class="num" style="width:150px">${fUSD(p.avg)}<span class="dim"> / 次 · ${fmt(p.tok)}</span></span></span>
        <span class="num dim" style="width:90px;font-size:13px">${comma(p.n)} 次样本</span>
        <span class="num r" style="width:150px">${p.left != null ? `约 ${comma(p.left)} 次` : `<span class="dim2">${p.win < 0 ? '已下线' : p.all ? '样本不足' : '未使用'}</span>`}</span></div>`).join('') : '<div class="cap">近 7 天没有调用</div>'}
    <div class="hr"></div>
    <div class="h"><h3>全部模型</h3><div class="x">${QM.length} 个</div></div>
    ${WINS.map((w, k) => { const ms = QM.filter(m => m.win === k && (!q || (m.name + ' ' + m.id).toLowerCase().includes(q))); if (!ms.length) return ''; const x = winUse(k);
      return `<div class="row" style="gap:10px;margin:14px 0 8px"><span style="width:150px">${w.kind} · ${w.who}</span><span style="width:120px">${bar(x.f, x.col)}</span><span class="num dim" style="font-size:13px">${Math.round(x.f * 100)}% 剩余</span></div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">${ms.map(m => `<span class="chip ${st.q.open === m.id ? 'on' : ''}" ${A('qopen', m.id)}>${lg(m.id, 13)}${m.name}</span>`).join('')}</div>${open && open.win === k && ms.includes(open) ? qDetail(open) : ''}`; }).join('')}
  </div>`);
}

/* ===== 明细：整宽表格；点一行在原位展开该步骤，不再占用右侧 ===== */
const CTX_MAX = 1e6;
function ledgerRows() {
  const g = st.lg; let rs = g.bucket ? rowsIn({ a: g.bucket[0], b: g.bucket[1] }) : rowsIn();
  if (g.s) { const q = g.s.toLowerCase(); rs = rs.filter(r => (SE[r.root].title + ' ' + MODEL_NAME(r.m)).toLowerCase().includes(q)); }
  const k = g.sort, v = r => k === 'hit' ? pct(r.cache, r.cache + r.in) : r[k];
  return rs.slice().sort((a, b) => (v(a) - v(b)) * g.dir || b.t - a.t);
}
// 上下文曲线：渐变面积，当前步骤高亮并标数值，上限画成虚线
function ctxCurve(ctx, at, max, W, H = 92) {
  const top = Math.max(max * .25, ...ctx) * 1.1, X = i => ctx.length < 2 ? W / 2 : i / (ctx.length - 1) * W, Y = v => H - 4 - v / top * (H - 14), pts = ctx.map((v, i) => [X(i), Y(v)]);
  const d = curve(pts), c = pts[at] || pts[pts.length - 1], cap = max <= top ? `<line x1="0" x2="${W}" y1="${Y(max)}" y2="${Y(max)}" style="stroke:${ink(.25)}" stroke-dasharray="2 4"/>` : '';
  return `<svg width="${W}" height="${H}" style="display:block;overflow:visible"><defs><linearGradient id="cxg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5B9BFF" stop-opacity=".32"/><stop offset="1" stop-color="#5B9BFF" stop-opacity="0"/></linearGradient><linearGradient id="cxl" x1="0" x2="1"><stop offset="0" stop-color="#4C8DF6"/><stop offset="1" stop-color="#8E7CF6"/></linearGradient></defs>
    ${cap}<path d="${d}L${W},${H}L0,${H}Z" fill="url(#cxg)"/><path d="${d}" fill="none" stroke="url(#cxl)" stroke-width="2"/>
    <line x1="${c[0]}" x2="${c[0]}" y1="${c[1]}" y2="${H}" style="stroke:${ink(.25)}" stroke-dasharray="2 3"/><circle cx="${c[0]}" cy="${c[1]}" r="4.5" fill="#8E7CF6" style="stroke:var(--background)" stroke-width="2.5"/></svg>`;
}
function stepDetail(r) {
  const same = ROWS.filter(x => x.s === r.s), ctx = same.map(x => x.in + x.cache), at = same.findIndex(x => x.idx === r.idx);
  const drops = ctx.filter((v, i) => i && v < ctx[i - 1] * .6).length, cur = r.in + r.cache, s = SE[r.s], p = rateOf(MODEL_NAME(r.m)), max = r.maxCtx || CTX_MAX;
  const parts = [['#4FC3D9', '缓存命中', r.cache, p[2]], ['#5B9BFF', '新增输入', r.in, p[1]], ['#F2B35B', '输出', r.out, p[3]]], tot = parts.reduce((a, x) => a + x[2], 0) || 1;
  const kv = (k, v) => `<div class="kv2"><span>${k}</span><b class="el">${v}</b></div>`;
  return `<tr class="xd"><td colspan="10"><div data-xp class="stepd">
    <div><div class="hd"><span class="lb">Token 构成</span><span class="kn num" style="font-size:22px">${fUSD(r.cost)}</span></div>
      <div class="seg3">${parts.map(([c, , v]) => v ? `<i style="flex:${v / tot};background:${c}"></i>` : '').join('')}</div>
      ${parts.map(([c, l, v, pr]) => `<div class="kv2"><span><i class="dot" style="background:${c}"></i>${l}</span><b class="num">${comma(v)}<em>${fUSD(v * pr / 1e6)}</em></b></div>`).join('')}</div>
    <div><div class="hd"><span class="lb">上下文 · 第 ${at + 1} / ${same.length} 步${drops ? ` · 压缩过 ${drops} 次` : ''}</span><span class="num" style="font-size:13px;color:var(--fg-2)">${fmt(cur)} <span class="dim">/ ${fmt(max)} · ${(cur / max * 100).toFixed(1)}%</span></span></div>
      <div style="margin-top:14px" ${tipA('本会话每一步的上下文大小；圆点是这一步，虚线是上限')}>${ctxCurve(ctx, at, max, Math.max(220, CW() - 700))}</div></div>
    <div style="display:flex;flex-direction:column">
      ${kv('模型', `<span class="row" style="gap:7px;justify-content:flex-end">${lg(MODEL_NAME(r.m))}<span class="mono">${MODEL_NAME(r.m)}</span></span>`)}
      ${kv('步骤 · 工具', `第 ${r.step} 步 · ${r.tools ? r.tools + ' 次工具' : '无工具'}${s.child ? ` · 子代理 ${s.agent}` : ''}`)}
      ${kv('首字延迟', r.ttft ? `${r.ttft.toFixed(2)} s${r.pre ? ` · prefill ${fmt(r.pre)} tok/s` : ''}` : '—')}${kv('流式耗时', r.dur ? `${r.dur.toFixed(1)} s${r.dec ? ` · 解码 ${Math.round(r.dec)} tok/s` : ''}` : '—')}${kv('思考 / 回答', r.dur ? `${comma(r.tk)} / ${comma(Math.max(0, r.out - r.tk))} tokens` : '—')}
      <div class="row" style="gap:8px;margin-top:auto;padding-top:12px;justify-content:flex-end"><span class="btn2" ${A('fsess', r.root)}>${ic('filter_list', 15)}只看本会话</span><span class="btn2" ${A('copy', r.idx)}>${ic('content_copy', 15)}复制 JSON</span></div>
    </div></div></td></tr>`;
}
// 顶部时间带：每格一根细柱，按会话分色堆叠；选中时段高亮，点击筛选
function ledgerStrip(rs, W, H = 92) {
  const sp = span(), len = sp.b - sp.a, step = len <= 2 * 86400 ? 900 : len <= 14 * 86400 ? 3600 : 86400, N = Math.ceil(len / step), bw = W / N, base = H - 20;
  const top = groupBy(rs, 'root').sort((x, y) => y.in + y.out - x.in - x.out).slice(0, 5).map(g => g.key), bins = Array.from({ length: N }, () => Array(6).fill(0)), cnt = Array(N).fill(0);
  rs.forEach(r => { const i = Math.floor((r.t - sp.a) / step); if (i < 0 || i >= N) return; const k = top.indexOf(r.root); bins[i][k < 0 ? 5 : k] += r.in + r.out; cnt[i]++; });
  const mx = Math.max(...bins.map(b => b.reduce((a, x) => a + x, 0)), 1), sel = st.lg.bucket; let s = '';
  bins.forEach((b, i) => { const a0 = sp.a + i * step, on = !sel || (a0 >= sel[0] && a0 < sel[1]), tot = b.reduce((a, x) => a + x, 0), x = i * bw + Math.min(1, bw * .15), w = Math.max(1, bw - Math.min(2, bw * .3));
    if (!tot) { s += `<rect x="${x}" y="${base - 1.5}" width="${w}" height="1.5" style="fill:${ink(.08)}"/>`; return; }
    let y = base; b.forEach((v, k) => { if (!v) return; const h = Math.max(1.5, v / mx * (base - 6)); y -= h; s += `<rect x="${x}" y="${y}" width="${w}" height="${Math.max(1, h - .8)}" rx="1.5" fill="${k === 5 ? ink(.3) : PAL[k]}" opacity="${on ? 1 : .35}"/>`; });
    s += `<rect x="${i * bw}" y="0" width="${bw}" height="${base}" fill="transparent" ${A('bucket', a0 + ',' + (a0 + step))} ${tipA(`<span class="dim">${atLocal(a0)} 起 ${step === 900 ? '15 分钟' : step === 3600 ? '1 小时' : '1 天'}</span><br>${b.map((v, k) => v ? `${sw(k === 5 ? 'var(--fg-4)' : PAL[k])}${k === 5 ? '其他' : SE[top[k]].title} ${fmt(v)}` : '').filter(Boolean).join('<br>')}<br><span class="dim">${cnt[i]} 次 · 点击只看这段</span>`)}/>`; });
  if (sel) { const x0 = (sel[0] - sp.a) / len * W, x1 = (sel[1] - sp.a) / len * W; s = `<rect x="${x0 - 3}" y="-4" width="${x1 - x0 + 6}" height="${base + 8}" rx="8" style="fill:${ink(.05)};stroke:${ink(.28)}"/>` + s; }
  const lg = top.map((k, i) => `<span class="row" style="gap:5px"><i style="width:7px;height:7px;border-radius:50%;background:${PAL[i]}"></i><span class="el" style="max-width:120px">${SE[k].title}</span></span>`).join('');
  return `<div class="row" style="justify-content:space-between;margin-bottom:8px;flex:none"><span class="lb">${comma(rs.length)} 次调用 · 点击柱子筛选时段</span><span class="row" style="gap:12px;font-size:12px;color:var(--fg-3)">${lg}</span></div>
    <svg width="${W}" height="${H}" style="display:block;overflow:visible;flex:none;font-size:11px;fill:var(--fg-4)">${s}<text x="0" y="${H - 3}">${atLocal(sp.a)}</text><text x="${W}" y="${H - 3}" text-anchor="end">${atLocal(Math.min(sp.b, NOW))}</text></svg>`;
}
function vLedger() {
  const g = st.lg, rs = ledgerRows(), t = agg(rs), view = rs.slice(0, g.limit), ds = rs.filter(r => r.dec).map(r => r.dec).sort((a, b) => a - b), med = ds.length ? ds[ds.length >> 1] : 0;
  const arrow = k => g.sort === k ? `<span class="ms" style="font-size:13px;margin-left:2px">${g.dir < 0 ? 'arrow_downward' : 'arrow_upward'}</span>` : '';
  const th = (k, l, r, x = '') => `<th class="${r ? 'r' : ''}" ${A('sort', k)} style="${x}">${l}${arrow(k)}</th>`;
  const tr = r => { const h = pct(r.cache, r.cache + r.in), s = SE[r.s], on = g.sel === r.idx;
    return `<tr class="${on ? 'sel' : ''}" ${A('sel', r.idx)}><td class="num dim" style="padding-left:8px">${fD(r.t) === fD(NOW) ? '' : `<span class="dim2">${fD(r.t)}</span> `}${fT(r.t)}</td><td><span class="row" style="gap:6px"><span class="el" style="max-width:220px">${SE[r.root].title}</span>${s.child ? `<span class="dim2" ${tipA(`子代理 ${s.agent}`)}>${ic('hub', 13)}</span>` : ''}</span></td><td><span class="row" style="gap:8px">${lg(MODEL_NAME(r.m))}<span class="mono el" style="max-width:210px;color:${r.m < 0 ? 'var(--fg-4)' : 'var(--fg-2)'}">${MODEL_NAME(r.m)}</span></span></td><td class="r num">${fmt(r.in)}</td><td class="r num">${r.cache ? fmt(r.cache) : '<span class="dim2">—</span>'}</td><td><span class="row" style="gap:8px;justify-content:flex-end"><span style="width:40px">${bar(h, 'var(--s3)')}</span><span class="num r" style="width:32px;color:${r.cache ? 'var(--fg-2)' : 'var(--fg-4)'}">${Math.round(h * 100)}%</span></span></td><td class="r num">${fmt(r.out)}</td><td class="r num" style="color:var(--fg-2)">${r.ttft ? r.ttft.toFixed(1) + '<span class="dim2">s</span>' : '<span class="dim2">—</span>'}</td><td class="r num">${r.dec ? Math.round(r.dec) + ' <span class="dim2">tok/s</span>' : '<span class="dim2">—</span>'}</td><td class="r num dim" style="padding-right:8px">${fUSD(r.cost)}</td></tr>${on ? stepDetail(r) : ''}`; };
  const chip = (k, l) => `<span class="chip ${(k === 'kids' ? st.fx.who === 'sub' : st.fx[k]) ? 'on' : ''}" ${A('lgf', k)}>${l}</span>`;
  const bk = g.bucket ? `<span class="chip on" ${A('unbucket')}>${fD(g.bucket[0])} ${fT(g.bucket[0]).slice(0, 5)}–${fT(g.bucket[1]).slice(0, 5)}${ic('close', 13)}</span>` : '';
  return shell(sub(filters({ extra: `<span class="ctl" ${A('export')}>${ic('ios_share')}CSV</span>` })) + `<div class="body" style="padding:20px 32px 0;display:flex;flex-direction:column;overflow:hidden">
      <div style="flex:none;margin-bottom:16px">${ledgerStrip(rowsIn(), CW())}</div><div class="row" style="gap:8px;height:28px;margin-bottom:10px;flex:none"><span class="inp">${ic('search', 16)}<input data-i="ls" placeholder="搜索会话或模型" value="${g.s}"></span>${bk}${chip('miss', '未命中缓存')}${chip('big', '输入 > 100K')}${chip('kids', '子代理')}
        <span class="dim num" style="margin-left:auto;font-size:13px">${comma(t.n)} 条 · 新增输入 ${fmt(t.in)} · 输出 ${fmt(t.out)} · 约 ${fUSD(t.cost)}${med ? ` · 解码中位 ${Math.round(med)} tok/s` : ''}</span></div>
      <div class="scroll" id="lgscroll" style="flex:1;min-height:0">
      <table class="t"><thead style="position:sticky;top:0;background:var(--background);z-index:2"><tr>${th('t', '时间', 0, 'padding-left:8px')}<th>会话</th><th>模型</th>${th('in', '新增输入', 1)}${th('cache', '缓存', 1)}${th('hit', '命中', 1)}${th('out', '输出', 1)}${th('ttft', '首字', 1)}${th('dec', '解码', 1)}${th('cost', '成本', 1, 'padding-right:8px')}</tr></thead>
      <tbody>${view.map(tr).join('')}</tbody></table>
      ${!rs.length ? `<div class="cap" style="padding:48px 0;text-align:center">没有符合条件的记录　<span class="lk" ${A('lgreset')}>清除筛选</span></div>` : ''}
      ${rs.length > g.limit ? `<div class="row rowh" ${A('more')} style="height:40px;justify-content:center;color:var(--fg-3);font-size:13px;margin:0">已显示 ${g.limit} / ${comma(rs.length)} · 加载更多</div>` : rs.length ? `<div class="cap" style="text-align:center;padding:14px 0 20px;margin:0">共 ${comma(rs.length)} 条</div>` : ''}
      </div>
  </div>`);
}

/* ===== 账号：当前账号的真实状态。多账号切换与固定出口尚未实现，如实标出 ===== */
// 每天一格，53 周。悬停看当天用量，点击跳到当天的明细
function calGrid() {
  const day = t => Math.floor((t + TZ) / 86400), today = day(NOW), weeks = 53, start = today - L(NOW).getUTCDay() - (weeks - 1) * 7, m = new Map(), key = st.cal || 'cost';
  ROWS.forEach(r => { const d = day(r.t), g = m.get(d) || { tok: 0, cost: 0, n: 0 }; g.tok += r.in + r.out; g.cost += r.cost; g.n++; m.set(d, g); });
  const mx = Math.max(1e-9, ...[...m.values()].map(g => g[key])), steps = ['rgb(255 255 255 / .05)', '#184f95', '#256abf', '#3987e5', '#9ec5f4'], cs = 13, gap = 3, lx = 30, ty = 20;
  let g = '', lastMo = -1;
  for (let w = 0; w < weeks; w++) { const d0 = new Date((start + w * 7) * 86400000), mo = d0.getUTCMonth();
    if (mo !== lastMo && d0.getUTCDate() <= 7) { g += `<text x="${lx + w * (cs + gap)}" y="11" fill="var(--fg-4)" font-size="11">${mo + 1} 月</text>`; lastMo = mo; }
    for (let i = 0; i < 7; i++) { const d = start + w * 7 + i; if (d > today) continue; const v = m.get(d), a = d * 86400 - TZ, lv = v ? Math.min(4, 1 + Math.floor(Math.sqrt(v[key] / mx) * 3.99)) : 0;
      g += `<rect class="cal" ${tipA(`<span class="dim">${fD(a + 43200)} ${WD[i]}</span><br>${v ? `${fUSD(v.cost)} · ${fmt(v.tok)} tokens<br><span class="dim">${comma(v.n)} 次调用 · 点击查看明细</span>` : '没有调用'}`)} ${v ? A('bucket', a + ',' + (a + 86400)) : ''} x="${lx + w * (cs + gap)}" y="${ty + i * (cs + gap)}" width="${cs}" height="${cs}" rx="3" fill="${steps[lv]}"/>`; } }
  [1, 3, 5].forEach(i => g += `<text x="0" y="${ty + i * (cs + gap) + 10.5}" fill="var(--fg-4)" font-size="11">${WD[i]}</text>`);
  const ds = [...m.keys()].sort((a, b) => a - b); let best = 0, run = 0; ds.forEach((d, i) => { run = i && d === ds[i - 1] + 1 ? run + 1 : 1; best = Math.max(best, run); });
  const top = [...m.entries()].sort((a, b) => b[1][key] - a[1][key])[0];
  return `<div class="h"><h3>每天的用量</h3><div class="x">${seg([['cost', '成本'], ['tok', 'Token'], ['n', '调用']], key, 'cal')}</div></div>
    <svg width="${lx + weeks * (cs + gap)}" height="${ty + 7 * (cs + gap)}" style="display:block;max-width:100%">${g}</svg>
    <div class="row" style="margin-top:10px;font-size:12.5px;color:var(--fg-3);gap:16px"><span>${ds.length} 天有活动</span><span>最长连续 ${best} 天</span>${top ? `<span>最忙的一天 ${fD(top[0] * 86400 - TZ + 43200)} · ${fUSD(top[1].cost)}</span>` : ''}<span class="sp"></span><span class="row" style="gap:4px;color:var(--fg-4)">少${steps.map(c => `<i style="width:11px;height:11px;border-radius:3px;background:${c}"></i>`).join('')}多</span></div>`;
}
// 本月每天的花费：面积 + 末端标数值
function monthArea(W, H = 220) {
  const m0 = monthStart(NOW), nd = Math.floor((day0() - m0) / 86400) + 1, v = Array.from({ length: nd }, (_, i) => agg(rowsAB(m0 + i * 86400, m0 + (i + 1) * 86400)));
  const c = v.map(x => x.cost), mx = Math.max(...c, .01) * 1.15, X = i => nd < 2 ? W / 2 : i / (nd - 1) * W, Y = x => H - 22 - x / mx * (H - 34), pts = c.map((x, i) => [X(i), Y(x)]);
  if (nd < 2) return '<div class="cap">本月数据还不够画图</div>';
  const d = curve(pts), e = pts[pts.length - 1];
  return `<svg width="${W + 90}" height="${H}" style="display:block;overflow:visible;font-size:11.5px;fill:var(--fg-4)"><defs><linearGradient id="ma" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8E7CF6" stop-opacity=".55"/><stop offset="1" stop-color="#4C8DF6" stop-opacity=".04"/></linearGradient><linearGradient id="ml" x1="0" x2="1"><stop offset="0" stop-color="#4C8DF6"/><stop offset="1" stop-color="#C76BD9"/></linearGradient></defs>
    <line x1="0" x2="${W}" y1="${H - 22}" y2="${H - 22}" style="stroke:${ink(.14)}"/><path d="${d}L${W},${H - 22}L0,${H - 22}Z" fill="url(#ma)"/><path d="${d}" fill="none" stroke="url(#ml)" stroke-width="2.2"/>
    <circle cx="${e[0]}" cy="${e[1]}" r="4.5" fill="#C76BD9" style="stroke:var(--background)" stroke-width="2.5"/><text x="${e[0] + 12}" y="${e[1] + 5}" style="fill:var(--fg);font-size:15px;font-weight:450">${fUSD(c[nd - 1])}</text><text x="${e[0] + 12}" y="${e[1] + 22}">今天</text>
    ${v.map((x, i) => `<rect x="${(X(i) - W / nd / 2).toFixed(1)}" y="0" width="${(W / nd).toFixed(1)}" height="${H - 22}" fill="transparent" ${tipA(`${fD(m0 + i * 86400)} ${WD[L(m0 + i * 86400).getUTCDay()]}<br>约 ${fUSD(x.cost)} · ${fmt(x.in + x.out)} · ${comma(x.n)} 次`)}/>`).join('')}
    ${[0, Math.floor((nd - 1) / 2), nd - 1].map(i => `<text x="${X(i)}" y="${H - 4}" text-anchor="${i === 0 ? 'start' : i === nd - 1 ? 'end' : 'middle'}">${fD(m0 + i * 86400)}</text>`).join('')}</svg>`;
}
// 其他账号：最近一次看到的额度（重置时刻已过的视为已恢复）
const accPools = e => (e.pools || []).map(p => { const done = p.t <= NOW; return { ...p, f: done ? 1 : p.f, done }; });
function accRow(e) {
  const ps = accPools(e), worst = ps.length ? Math.min(...ps.map(p => p.f)) : null, next = ps.filter(p => !p.done && p.f < 1).sort((a, b) => a.t - b.t)[0];
  const ago = e.seen ? Math.max(1, Math.round((Date.now() - e.seen) / 60000)) : null, agoS = ago == null ? '' : ago < 60 ? `${ago} 分钟前` : ago < 1440 ? `${Math.round(ago / 60)} 小时前` : `${Math.round(ago / 1440)} 天前`;
  const on = st.acc.ask === e.email;
  return `<div class="ar ${on ? 'hov' : ''}"><span class="av sm" style="background:linear-gradient(135deg,${accCol(e.email)})">${esc((e.name || e.email)[0].toUpperCase())}</span>
    <div style="min-width:0;flex:1"><div class="em el">${esc(e.email)}</div><div class="meta" style="margin-top:3px">${e.saved ? '' : '<i class="bad"></i>需要重新登录 · '}${esc(e.plan || '')}${agoS ? ` · ${agoS}看到` : ''}</div></div>
    ${ps.length ? `<span ${tipA(ps.map(p => `${p.provs.map(x => x === 'claude' ? 'Claude' : x === 'openai' ? 'GPT' : 'Gemini').join('/')} · 剩 ${Math.round(p.f * 100)}% · ${p.done ? '已重置' : atLocal(p.t) + ' 重置'}`).join('<br>') + '<br><span class="dim">最近一次使用这个账号时的读数</span>')}>${capsule(worst, worst < 1 ? G3.gemini : grayG(), 90, 6)}</span><span class="pc num">${Math.round(worst * 100)}%</span>` : ''}
    <span class="num dim" style="width:92px;text-align:right;font-size:12px">${next ? atLocal(next.t) + ' 恢复' : ps.length ? '额度已满' : ''}</span>
    <span class="btn2" ${A('accAsk', e.email)}>${e.saved ? '切换' : '登录'}</span><span class="ib2" ${A('accDel', e.email)} ${tipA('从 Buddy 移除这个账号')}>${ic('close', 15)}</span></div>`;
}
const accCol = e => { const P = [['#4C8DF6', '#8E7CF6'], ['#3FB97D', '#4FC3D9'], ['#E8955E', '#F27A9B'], ['#9D8CFF', '#C76BD9']]; let h = 0; for (const c of e) h = (h * 31 + c.charCodeAt(0)) >>> 0; return P[h % P.length].join(','); };
function accPop() {
  const k = st.acc.ask; if (!k) return '';
  const add = k === '+', list = LIVE.accounts?.list || [], i = add ? 0 : Math.max(0, list.filter(e => !e.active).findIndex(e => e.email === k)), top = add ? 40 : 92 + i * 62;
  const li = (icn, t, w) => `<div class="li ${w ? 'w' : ''}">${ic(icn, 16)}<span>${t}</span></div>`;
  return `<div class="pop2" style="top:${top}px">
    <h4>${add ? '添加账号' : `切换到 ${esc(k)}`}</h4>
    ${li('warning', 'Antigravity 会关闭并重新打开，正在生成的回复会中断', 1)}
    ${add ? li('login', '重新打开后是登录页，用另一个 Google 账号登录即可') + li('bookmark_added', '当前账号已保存，随时可以切回来') : li('key', '用已保存的登录，不需要重新输入密码') + li('history', '会话、项目和设置都保留')}
    <div class="ft"><span class="dim" style="font-size:12px">约 10 秒</span><span class="row" style="gap:8px"><span class="btn2" ${A('accAsk', '')}>取消</span><span class="btn2 p" ${A(add ? 'accAdd' : 'accGo', k)}>${add ? '重启并登录' : '切换'}</span></span></div></div>`;
}
// 套餐：以 tier.id 为准（plan 字段在会员到期后仍可能写着 Pro）
function tierPill(stt) {
  if (!stt) return ''; const id = (stt.tier?.id || '') + ' ' + (stt.tier?.name || ''), [cls, l] = /ultra/i.test(id) ? ['ultra', 'Ultra'] : /free|starter|standard/i.test(id) ? ['free', '免费'] : /pro/i.test(id) ? ['pro', 'Pro'] : stt.plan ? ['std', stt.plan] : [];
  return cls ? `<span class="pill plan ${cls}" ${tipA(esc(stt.tier?.name || stt.plan || ''))}>${esc(l)}</span>` : '';
}
function vAccounts() {
  const a = ACC[0], d0 = day0(), m0 = monthStart(NOW), W5 = SPANW(5), others = (LIVE.accounts?.list || []).filter(e => !e.active);
  if (st.acc.busy) return shell(sub() + `<div class="body h2"><div class="pg" style="height:70vh;display:grid;place-items:center;text-align:center">${aura()}<div><div class="hi" style="font-size:28px">正在切换到 ${esc(st.acc.busy)}</div><div class="say" style="margin-top:10px">Antigravity 即将关闭并重新打开，约 10 秒。</div></div></div></div>`);
  const u = [['今天', d0], ['近 7 天', d0 - 6 * 86400], ['本月', m0]].map(([l, t0]) => [l, agg(ROWS.filter(r => r.t >= t0))]), mo = u[2][1];
  return shell(sub() + `<div class="body h2"><div class="pg">${aura()}
    <section class="rw">
      <div class="md" style="grid-column:span 5">
        <div class="lb">当前账号</div>
        <div class="row" style="gap:16px;margin-top:16px"><span class="av lg" style="background:linear-gradient(135deg,#4C8DF6,#8E7CF6)">${a.l}</span><div style="min-width:0"><div class="row" style="gap:8px;font-size:19px;font-weight:450">${a.n || a.e}${tierPill(LIVE.status)}</div><div class="meta"><i class="${LIVE.error ? 'bad' : ''}"></i>${LIVE.error ? '未连接' : '使用中'} · ${a.e}</div></div></div>
        ${WINS.map((w, k) => { const v = poolView(k); return `<div class="cr num"><span class="row" style="gap:6px">${winLogos(w).map(l => `<img src="${LOGO[l]}" style="width:14px;height:14px">`).join('')}${w.kind} · ${w.who}</span><b>${v.x.ok ? `剩 ${fUSD(v.x.leftCost)}` : pctS(v.x.f)}<span style="color:var(--fg-4)"> · ${winAt(k)}</span></b></div><div ${tipA(v.tip)}>${capsule(v.x.f, v.x.f < 1 ? winG(w) : grayG(), W5, 12)}</div>`; }).join('') || '<div class="cap">读不到模型额度</div>'}
      </div>
      <div class="md" style="grid-column:7 / span 6;position:relative">
        <div class="hd"><span class="lb">其他账号 · 点切换会重启 Antigravity</span><span class="lk" style="font-size:12.5px" ${A('accAsk', '+')}>${ic('add', 15)}添加账号</span></div>
        ${others.length ? others.map(e => accRow(e)).join('') : `<div class="acc-empty"><img src="/illus/accounts-${isLight() ? 'light' : 'dark'}.jpg" alt=""><div><div style="font-size:17px;font-weight:450">把常用的账号都放进来</div><ol style="margin-top:14px"><li>点「添加账号」，Antigravity 重启到登录页</li><li>用另一个 Google 账号登录</li><li>回到这里，一键切换，不用再输密码</li></ol><span class="btn2 p" style="margin-top:18px" ${A('accAsk', '+')}>${ic('add', 15)}添加账号</span></div></div>`}
        ${accPop()}
        <div class="ur" style="border:0;height:auto;margin-top:22px;gap:24px">${u.map(([l, g]) => `<div><div class="lb">${l}</div><div class="kn num" style="font-size:22px;margin-top:6px">${fUSD(g.cost)}</div><div class="num dim" style="font-size:12px;margin-top:4px">${fmt(g.in + g.out)} · ${comma(g.n)} 次</div></div>`).join('')}</div>
      </div>
    </section>
    <section class="rw"><div class="md" style="grid-column:1/-1">
      <div class="hd" style="align-items:flex-end"><div><div class="lb">本月 · 每天花费</div><div class="kn num" style="margin-top:10px;font-size:40px">${fUSD(mo.cost)} <span style="font-size:15px;color:var(--fg-3);letter-spacing:0">${fmt(mo.in + mo.out)} tokens · ${comma(mo.n)} 次</span></div></div></div>
      <div style="margin-top:16px">${monthArea(SPANW(12) - 90)}</div>
    </div></section>
  </div></div>`);
}

/* ===== 设置 ===== */
const SP = [['general', '通用'], ['native', '输入框控件'], ['data', '数据'], ['about', '关于']];
const nsw = (k, on, off) => `<span class="sw ${on ? 'on' : ''}" ${off ? '' : A('nat', k)}></span>`;
const gr = (t, d, c, cls = '') => `<div class="gr ${cls}"><div style="min-width:0"><div>${t}</div>${d ? `<div class="d">${d}</div>` : ''}</div><div style="flex:none">${c || ''}</div></div>`;
const grp = (title, desc, rows) => `<div style="margin-top:28px"><h3 style="font-size:15px">${title}</h3>${desc ? `<div class="dim" style="font-size:13px;margin-top:4px">${desc}</div>` : ''}<div class="grp" style="margin-top:12px">${rows}</div></div>`;
const getPath = k => k.split('.').reduce((o, p) => o[p], st);
function setPath(k, v) { const ps = k.split('.'), last = ps.pop(), o = ps.reduce((x, p) => x[p], st); o[last] = v === '!' ? !o[last] : v === 'true' ? true : v === 'false' ? false : isNaN(v) || v === '' ? v : Number(v); }
const segSet = (key, opts) => `<div class="seg">${opts.map(([v, l]) => `<span class="${String(getPath(key)) === String(v) ? 'on' : ''}" ${A('set', key + '=' + v)}>${l}</span>`).join('')}</div>`;
const dot = () => '';
// 主题缩略图：小窗口插画
const thumb = v => { const win = (b, p, l) => `<rect width="112" height="72" fill="${b}"/><rect x="22" y="8" width="84" height="58" rx="5" fill="${p}"/><path d="M30,52 C45,30 55,48 68,36 S85,44 100,40 L100,58 L30,58Z" fill="#5B9BFF" opacity=".8"/><rect x="30" y="16" width="26" height="5" rx="2.5" fill="${l}"/><rect x="6" y="10" width="11" height="3" rx="1.5" fill="${l}"/><rect x="6" y="17" width="11" height="3" rx="1.5" fill="${l}"/>`;
  const L = win('#F4F4F6', '#fff', 'rgb(0 0 0/.08)'), Dk = win('#111114', '#070708', 'rgb(255 255 255/.08)');
  return `<svg width="112" height="72" viewBox="0 0 112 72">${v === 0 ? `<clipPath id="th0"><rect width="56" height="72"/></clipPath><clipPath id="th1"><rect x="56" width="56" height="72"/></clipPath><g clip-path="url(#th0)">${L}</g><g clip-path="url(#th1)">${Dk}</g>` : v === 2 ? L : Dk}<rect x=".5" y=".5" width="111" height="71" rx="9" fill="none" style="stroke:${ink(.12)}"/></svg>`; };
const SPV = {
  general: () => ['通用', '显示方式与默认视图。设置保存在本机。',
    grp('外观', '', `<div class="gr" style="display:block"><div>主题</div><div class="d">跟随系统，或单独指定深色 / 浅色</div><div class="th">${[[0, '跟随系统'], [1, '深色'], [2, '浅色']].map(([v, l]) => `<div class="${st.theme === v ? 'on' : ''}" ${A('theme', v)}>${thumb(v)}${l}</div>`).join('')}</div></div>`)
    + grp('日报', '每天下班时总结今天做了什么', gr('下班提醒', '工作日到点提醒一次（Buddy 开着时）', `<span class="sw ${st.rep.on ? 'on' : ''}" ${A('set', 'rep.on=!')}></span>`) + gr('提醒时间', '', segSet('rep.at', [['17:30', '17:30'], ['18:00', '18:00'], ['18:30', '18:30'], ['19:00', '19:00'], ['20:00', '20:00']])))
    + grp('显示', '', gr('时区', '重置时间、图表和明细都按这个时区显示', segSet('tz', [['auto', '跟随系统 · ' + (TZ_AUTO >= 0 ? 'GMT+' : 'GMT') + TZ_AUTO / 3600], ['sh', '北京时间'], ['utc', 'UTC']]))
      + gr('数字格式', `当前示例：${fmt(5890123)}`, segSet('fullnum', [[false, '5.89M'], [true, '5,890,123']])))
    + grp('默认视图', '', gr('时间范围', '', segSet('range', [['6h', '近 6 小时'], ['24h', '近 24 小时'], ['7d', '近 7 天'], ['30d', '近 30 天'], ['mo', '本月']]))
      + gr('额度页默认显示', '模型很多时，只看用过的更清楚', segSet('q.f', [['used', '使用过'], ['pin', '已关注'], ['all', '全部']])))
    + grp('估算成本', '按 API 公开价把用量换算成美元，单位为每百万 token。订阅本身不按此计费。价格引自 agy-powertools 的价格表，未独立核实。', PRICE.map(p => gr(`<span class="row" style="gap:8px">${lg(p[0])}<span class="mono">${p[0]}</span></span>`, '', `<span class="num dim" style="font-size:13px">输入 $${p[1]} · 缓存 $${p[2]} · 输出 $${p[3]}</span>`)).join('') + gr('未标注或没有价格的模型', '按 gemini-4-neon 的价格估算'))],
  native: () => { const n = LIVE.native || {}, on = n.native, ok = n.status === 'on';
    return ['输入框控件', '把上下文、解码速度、当前模型额度放进 Antigravity 的输入框。官方插件接口做不到，需要通过 Antigravity 的调试接口注入，所以单独放在这里，默认关闭。',
    grp('状态', '', gr(`<span class="row" style="gap:8px">${ok ? '已连接，控件已显示' : on ? '已开启，等待连接' : '未开启'}</span>`, ok ? '切到任意对话，在输入框右下角可以看到' : on ? esc(n.detail || '正在连接…') : '', nsw('native', on))
      + (on && !ok ? gr('以调试模式重启 Antigravity', '会关闭并重新打开 Antigravity，正在生成的回复会中断', st.relAsk ? `<span class="row" style="gap:8px"><span class="btn q" ${A('set', 'relAsk=false')}>取消</span><span class="btn p" ${A('relaunch')}>确认重启</span></span>` : `<span class="btn" ${A('set', 'relAsk=true')}>重启…</span>`) : ''))
    + grp('显示哪些控件', '', gr('上下文', '圆环显示占用比例；点开看缓存、走势、压缩次数', nsw('ctx', on && n.ctx, !on), on ? '' : 'off') + gr('解码速度', '上一次调用的 tok/s；点开看首字延迟、prefill、本会话中位数', nsw('speed', on && n.speed, !on), on ? '' : 'off') + gr('当前模型额度', '剩余比例；点开看重置时间', nsw('quota', on && n.quota, !on), on ? '' : 'off'))
    + grp('需要知道', '', gr('只在调试模式下可用', '从程序坞正常打开的 Antigravity 没有调试接口，控件不会出现。需要用上面的按钮重启，或用命令 <span class="mono">open -a Antigravity --args --remote-debugging-port=0</span> 启动')
      + gr('调试接口对本机开放', '开启期间，本机其他程序也能连接并控制 Antigravity。只在你信任这台电脑上运行的软件时使用')
      + gr('Antigravity 更新后可能失效', '界面结构变了控件就挂不上，不影响 Buddy 其余功能') + gr('数据每次调用结束后更新', '速度和上下文来自 Antigravity 写下的记录，不是逐字实时'))]; },
  data: () => ['数据', 'Buddy 只读取本机数据，不上传任何内容。',
    grp('数据源', '', gr(`<span class="row" style="gap:8px">${dot(!LIVE.error)}Antigravity 本地接口</span>`, `账号、积分、模型额度 · <span class="mono">${esc(LIVE.ls || '未知')}</span>${LIVE.error ? ' · ' + esc(LIVE.error) : ''}`, `<span class="pill ${LIVE.error ? '' : 'ok'}">${LIVE.error ? '未连接' : '已连接'}</span>`)
      + gr(`<span class="row" style="gap:8px">${dot(ROWS.length)}会话记录</span>`, `<span class="mono">${esc(LIVE.paths?.brain || '')}</span> · ${SE.length} 个会话，${comma(ROWS.length)} 条调用`, `<span class="btn" ${A('copyText', LIVE.paths?.brain || '')}>${ic('content_copy')}复制路径</span>`))
    + grp('同步', '', gr('自动同步', '每 30 秒读取一次', `<span class="btn" ${A('sync')}>${ic('sync')}立即同步</span>`) + gr('上次同步', `${fD(Math.floor(LIVE.at / 1000))} ${fT(Math.floor(LIVE.at / 1000))}`))
    + grp('存储', '', gr('本地存档', `Antigravity 只保留近期会话，Buddy 把解析过的记录另存一份，会话被清掉后统计仍在。<br><span class="mono">${esc(LIVE.paths?.store || '')}</span>`, `<span class="btn" ${A('copyText', LIVE.paths?.store || '')}>${ic('content_copy')}复制路径</span>`)
      + gr('导出全部记录', `${comma(ROWS.length)} 条，CSV 格式`, `<span class="btn" ${A('exportAll')}>${ic('ios_share')}导出</span>`))],
  about: () => ['关于', '',
    grp('版本', '', gr('Buddy', '0.3.0'))
    + grp('它是怎么工作的', '', gr('额度与账号', '读取 Antigravity 自带的本地接口，不保存密码或令牌') + gr('用量统计', '读取 Antigravity 自己写下的会话记录，不经过代理') + gr('模型与速度', '每次调用的确切模型、首字延迟、流式耗时来自 Antigravity 的调用元数据；会话被清掉后拿不到的记录标为「未标注」'))
    + grp('还没做的', '', gr('多账号切换') + gr('按账号固定出口 IP') + gr('额度低时的系统通知与耗尽预测', '需要先积累一段时间的额度记录'))],
};
function vSettings() {
  const [title, desc, body] = SPV[st.sp]();
  return shell(sub() + `<div class="body" style="display:flex;padding:0;overflow:hidden">
    <div style="width:188px;flex:none;padding:24px 12px 24px 20px;border-right:1px solid var(--border)">${SP.map(([k, l]) => `<div class="nv ${st.sp === k ? 'on' : ''}" ${A('set', 'sp=' + k)} style="margin-bottom:2px">${l}</div>`).join('')}</div>
    <div class="scroll" id="spscroll" style="flex:1;overflow-y:auto;padding:28px 0 48px"><div style="max-width:1100px;padding:0 36px">
      <h1 style="font-size:22px">${title}</h1>${desc ? `<div class="dim" style="margin-top:6px;line-height:1.6">${desc}</div>` : ''}${body}
    </div></div>
  </div>`);
}
const SETTINGS_ACT = {
  set(v) { const i = v.indexOf('='), k = v.slice(0, i); setPath(k, v.slice(i + 1)); if (k === 'tz') TZ = TZ_OPT[st.tz]; if (k === 'sp') requestAnimationFrame(() => { const e = document.getElementById('spscroll'); if (e) e.scrollTop = 0; }); },
  copyText(v) { navigator.clipboard?.writeText(v).catch(() => {}); toast('已复制'); },
  async nat(k) { const n = LIVE.native || {}; try { const r = await fetch('/api/native', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [k]: !n[k] }) }); LIVE.native = await r.json(); } catch (e) { toast('设置失败：' + e.message); } render(); setTimeout(() => refresh(), 2500); },
  async relaunch() { st.relAsk = false; try { await fetch('/api/relaunch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); toast('正在重启 Antigravity…'); } catch (e) { toast('重启失败：' + e.message); } },
  exportAll() { downloadCsv(ROWS, 'buddy-all.csv'); },
};

/* ===== 动作、渲染、事件 ===== */
const VIEWS = { overview: vOverview, report: vReport, quota: vQuota, tokens: vTokens, ledger: vLedger, accounts: vAccounts, settings: vSettings };
let toastT;
function toast(msg) { st.toast = msg; clearTimeout(toastT); toastT = setTimeout(() => { st.toast = null; render(); }, 2600); }
const num = v => v === '' || v == null ? null : Number(v);
function go(tab) { st.view = 'buddy'; st.tab = tab; st.menu = null; }
function startSwitch(i) {
  if (i === st.acc.cur || st.acc.sw != null) return;
  st.acc.sw = i; st.acc.step = 0; st.menu = null;
  [1, 2].forEach(k => setTimeout(() => { st.acc.step = k; render(); }, k * 1100));
  setTimeout(() => { st.acc.cur = i; st.acc.sw = null; ACC.forEach((a, j) => { if (j !== i && !a.exp && !a.seen) a.seen = '刚刚'; }); toast(`已切换到 ${ACC[i].e}`); render(); }, 3400);
}
const ACT = {
  noop() {}, buddy() { st.view = 'buddy'; }, chat() { st.view = 'chat'; st.menu = null; }, tab: v => go(v),
  menu(v) { st.menu = st.menu === v ? null : v; return 'keep'; },
  range(v) { st.range = v; st.lg.bucket = null; }, fmodel(v) { st.fModel = num(v); }, fsess(v) { st.fSess = num(v); }, clearf() { st.fModel = st.fSess = null; st.fx = FX0(); },
  metric(v) { go('tokens'); st.metric = v; },
  bucket(v) { go('ledger'); st.lg.bucket = v.split(',').map(Number); st.lg.sel = null; st.lg.limit = 60; }, unbucket() { st.lg.bucket = null; },
  qf(v) { st.q.f = v; st.q.open = null; }, qprov(v) { st.q.prov = v || null; }, qreset() { st.q.f = 'all'; st.q.prov = null; st.q.s = ''; },
  qopen(v) { st.tab = 'quota'; st.menu = null; st.q.open = !v || st.q.open === v ? null : v; },
  pin(v) { const p = st.q.pins; p.has(v) ? p.delete(v) : p.add(v); toast(p.has(v) ? '已关注，会显示在概览和辅助面板' : '已取消关注'); },
  usein(v) { const k = U.models.findIndex(x => (qBy(v)?.aliases || [v]).includes(x)); if (k < 0) return toast('这段时间没有该模型的调用记录'); st.fModel = k; st.fSess = null; go('ledger'); },
  sort(v) { const g = st.lg; if (g.sort === v) g.dir = -g.dir; else { g.sort = v; g.dir = -1; } },
  sel(v) { const n = num(v); st.lg.sel = st.lg.sel === n ? null : n; }, lgf(v) { if (v === 'kids') st.fx.who = st.fx.who === 'sub' ? 'all' : 'sub'; else st.fx[v] = !st.fx[v]; st.lg.limit = 60; },
  lgreset() { Object.assign(st.lg, { s: '', bucket: null }); st.fx = FX0(); st.fModel = st.fSess = null; }, more() { st.lg.limit += 60; },
  insSess(v) { st.fSess = num(v); st.fModel = null; go('tokens'); st.metric = 'real'; },
  insMiss() { go('ledger'); Object.assign(st.fx, { miss: true, big: true, who: 'all' }); Object.assign(st.lg, { sort: 'in', dir: -1, sel: null, bucket: null }); },
  insHit() { go('tokens'); st.metric = 'cache'; }, insKids() { go('ledger'); Object.assign(st.fx, { who: 'sub', miss: false, big: false }); Object.assign(st.lg, { sel: null, bucket: null }); },
  insUnl() { st.fModel = -1; st.fSess = null; go('ledger'); },
  switch: v => startSwitch(Number(v)), relogin() { toast('将打开浏览器重新完成 Google 登录'); }, toast: v => toast(v), sync() { toast('已同步，没有新的记录'); },
  export() { toast(`原型：将把当前筛选的 ${comma(st.tab === 'ledger' ? ledgerRows().length : rowsIn().length)} 条记录导出为 CSV`); },
  copy(v) { const r = ROWS[v], j = JSON.stringify({ created_at: new Date(r.t * 1000).toISOString(), session: SE[r.s].id, step_index: r.step, model: MODEL_NAME(r.m), input_tokens: r.in, cache_read_tokens: r.cache, output_tokens: r.out, tool_calls: r.tools }, null, 2); navigator.clipboard?.writeText(j).catch(() => {}); toast('已复制这一步的 JSON'); },
  aux() { st.chat.aux = !st.chat.aux; st.chat.pop = null; }, pop(v) { st.chat.pop = st.chat.pop === v ? null : v; return 'keep'; },
  usemodel(v) { st.chat.model = v; st.chat.pop = null; toast(`已换用 ${qBy(v).name}`); },
  toggle(v) { st[v] = !st[v]; if (v === 'native' && !st.native) st.chat.pop = null; }, theme(v) { st.theme = Number(v); applyTheme(); }, credits(v) { st.credits = v; }, alert(v) { st.alert = Number(v); },
};
function render() {
  applyTheme();
  const sc = {}; document.querySelectorAll('#lgscroll,#spscroll,.body.scroll').forEach(e => sc[e.id || 'body'] = e.scrollTop);
  const f = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.i, pos = f ? document.activeElement.selectionStart : 0;
  const lightFix = h => isLight() ? h.replace(/rgb\(255 255 255 \/ /g, 'rgb(0 0 0 / ') : h;
  document.getElementById('app').innerHTML = lightFix(VIEWS[st.tab]()) + (st.toast ? `<div style="position:absolute;left:50%;bottom:28px;transform:translateX(-50%);z-index:80;background:var(--glass);border:1px solid var(--glass-border);border-radius:10px;padding:9px 14px;font-size:13px;box-shadow:0 16px 40px -12px rgb(0 0 0 / .6);white-space:nowrap">${st.toast}</div>` : '');
  const toastEl = document.querySelector('#app > div:last-child'); if (st.toast && toastEl) document.querySelector('.pane').appendChild(toastEl);
  document.querySelectorAll('#lgscroll,#spscroll,.body.scroll').forEach(e => { e.scrollTop = sc[e.id || 'body'] || 0; });
  if (f) { const el = document.querySelector(`[data-i="${f}"]`); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch {} } }
}
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); let keep;
  if (el) { if (e.target.closest('input')) return; keep = ACT[el.dataset.a](el.dataset.v); }
  else if (e.target.closest('.menu,input')) return;
  if (keep !== 'keep') { if (!el || !['menu', 'pop'].includes(el.dataset.a)) { st.menu = null; if (!el || !e.target.closest('.pane')) st.chat.pop = st.chat.pop; } }
  if (!el && !e.target.closest('[style*="pointer-events:auto"]')) st.chat.pop = null;
  render();
});
document.addEventListener('input', e => { const k = e.target.dataset && e.target.dataset.i; if (!k) return; if (k === 'qs') { st.q.s = e.target.value; st.q.open = null; if (st.q.s && st.q.f !== 'all') st.q.f = 'all'; } if (k === 'ls') { st.lg.s = e.target.value; st.lg.limit = 60; } if (k === 'd0' || k === 'd1') setCustom(k, e.target.value); render(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { st.menu = null; st.chat.pop = null; st.q.open = null; if (document.activeElement.blur) document.activeElement.blur(); return render(); }
  if (e.target.tagName === 'INPUT') return;
  if (e.key === '/' && st.view === 'buddy' && (st.tab === 'quota' || st.tab === 'ledger')) { e.preventDefault(); document.querySelector('[data-i]')?.focus(); }
  if (st.view === 'buddy' && st.tab === 'ledger' && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); const rs = ledgerRows(), i = rs.findIndex(r => r.idx === st.lg.sel), n = Math.max(0, Math.min(rs.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1))); if (rs[n]) { st.lg.sel = rs[n].idx; if (n >= st.lg.limit) st.lg.limit += 60; render(); document.querySelector('tr.sel')?.scrollIntoView({ block: 'nearest' }); } }
});
const tip = document.getElementById('tip');
document.addEventListener('mousemove', e => { const t = e.target.closest && e.target.closest('[data-tip]'); if (!t || !t.dataset.tip) { tip.style.display = 'none'; return; }
  tip.innerHTML = t.dataset.tip; tip.style.display = 'block'; tip.style.left = Math.min(e.clientX + 14, innerWidth - tip.offsetWidth - 8) + 'px'; tip.style.top = (e.clientY + 14 + tip.offsetHeight > innerHeight ? e.clientY - tip.offsetHeight - 10 : e.clientY + 14) + 'px'; });


/* ===== 启动、同步、设置持久化、导出 ===== */
function downloadCsv(rs, name) {
  const q = s => '"' + String(s).replace(/"/g, '""') + '"';
  const csv = '﻿' + ['time,session,model,model_inferred,input_tokens,cache_read_tokens,output_tokens,tool_calls,step_index,est_cost_usd']
    .concat(rs.map(r => [new Date(r.t * 1000).toISOString(), q(U.sessions[r.root].title), MODEL_NAME(r.m), r.m >= 0 && !r.raw ? 1 : 0, r.in, r.cache, r.out, r.tools, r.step, r.cost.toFixed(4)].join(','))).join('\n');
  try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); toast(`已导出 ${comma(rs.length)} 条记录`); }
  catch { navigator.clipboard?.writeText(csv).catch(() => {}); toast('无法下载，已把 CSV 复制到剪贴板'); }
}
const KEEP = ['range', 'gran', 'cr', 'stack', 'ov', 'fullnum', 'tz', 'metric', 'cal', 'theme', 'rep', 'ctype'];
function saveSt() { try { localStorage.setItem('buddy.st', JSON.stringify({ ...Object.fromEntries(KEEP.map(k => [k, st[k]])), qf: st.q.f, pins: [...st.q.pins] })); } catch {} }
function loadSt() { try { const s = JSON.parse(localStorage.getItem('buddy.st') || 'null'); if (!s) return; KEEP.forEach(k => { if (s[k] !== undefined) st[k] = s[k]; }); if (s.qf) st.q.f = s.qf; if (s.pins) st.q.pins = new Set(s.pins); TZ = TZ_OPT[st.tz] ?? TZ_AUTO; } catch {} }
let busy = false;
async function refresh(manual) {
  if (busy) return; busy = true;
  try { const res = await fetch('/api/data', { cache: 'no-store' }); if (!res.ok) throw new Error('HTTP ' + res.status);
    const before = ROWS.length; loadData(await res.json());
    if (manual) toast(ROWS.length > before ? `已同步，新增 ${ROWS.length - before} 条记录` : '已同步，没有新的记录');
    // 正在输入或菜单打开时不打断
    if (manual || (!st.menu && !(document.activeElement && document.activeElement.tagName === 'INPUT'))) render();
  } catch (e) { if (!LIVE.at) document.getElementById('app').innerHTML = `<div class="pane"><div class="cap" style="padding:80px 0;text-align:center">读不到数据：${esc(e.message)}<br><br><span class="btn" onclick="refresh(true)">重试</span></div></div>`; else if (manual) toast('同步失败：' + e.message); }
  finally { busy = false; }
}
Object.assign(ACT, SETTINGS_ACT, FILTER_ACT, TOKENS_ACT, REPORT_ACT, ACC_ACT, { ctype(v) { st.ctype = v; }, chat() {}, fmodelGo0() { st.range = '24h'; st.fModel = st.fSess = null; st.tab = 'tokens'; st.metric = 'cost'; }, ovPool(v) { st.ovPool = Number(v); }, fmodelGo(v) { st.fModel = Number(v); st.fSess = null; st.range = 'mo'; st.tab = 'tokens'; st.metric = 'cost'; }, cal(v) { st.cal = v; }, sync() { refresh(true); },
  export() { downloadCsv(st.tab === 'ledger' ? ledgerRows() : rowsIn(), 'buddy-usage.csv'); } });
Object.keys(ACT).forEach(k => { const f = ACT[k]; ACT[k] = v => { const r = f(v); saveSt(); return r; }; });
loadSt();
// 动效：只在真的发生变化时播放（切页签、展开详情、打开菜单），30 秒自动刷新不会重播
{ const base = render; let lastTab = null, lastOpen = '', lastMenu = null, lastInd = null;
  render = function () { base();
    const pane = document.querySelector('.pane'), on = document.querySelector('.tabs a.on'), ind = document.querySelector('.tabs .ind'), open = `${st.tab}|${st.lg.sel}|${st.q.open}`;
    if (pane && lastTab !== null && lastTab !== st.tab + st.sp) pane.classList.add('enter');
    if (open !== lastOpen) document.querySelectorAll('[data-xp]').forEach(e => e.classList.add('xp'));
    if (st.menu && st.menu !== lastMenu) document.querySelectorAll('.menu').forEach(e => e.classList.add('pop'));
    if (on && ind) { const to = { l: on.offsetLeft, w: on.offsetWidth };
      if (lastInd && (lastInd.l !== to.l)) { ind.style.transition = 'none'; ind.style.left = lastInd.l + 'px'; ind.style.width = lastInd.w + 'px'; ind.offsetWidth; ind.style.transition = ''; }
      ind.style.left = to.l + 'px'; ind.style.width = to.w + 'px'; lastInd = to; }
    lastTab = st.tab + st.sp; lastOpen = open; lastMenu = st.menu; }; }
{ const q = new URLSearchParams(location.search), t = q.get('tab'), m = q.get('menu'); if (t && VIEWS[t]) st.tab = t; if (q.get('range')) st.range = q.get('range'); if (q.get('theme')) st.theme = Number(q.get('theme')); if (q.get('repw')) st.rep.week = q.get('repw') === '1'; if (q.get('sel')) setTimeout(() => { const r = ledgerRows()[+q.get('sel')]; if (r) { st.lg.sel = r.idx; render(); } }, 1500); if (m) setTimeout(() => { st.menu = m; render(); }, 1200); }
let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (LIVE.at) render(); }, 120); });
refresh(); setInterval(refresh, 30000);

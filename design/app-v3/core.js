/* ===== 数据层：全部由本机 transcript 实测记录计算 ===== */
const U = window.USAGE, TZ = -5 * 3600;            // 本机时区 EST
const NOW = Math.ceil(Math.max(...U.rows.map(r => r[0])) / 60) * 60;
const hh = n => String(n).padStart(2, '0');
const L = t => new Date((t + TZ) * 1000);
const fT = t => { const d = L(t); return `${hh(d.getUTCHours())}:${hh(d.getUTCMinutes())}:${hh(d.getUTCSeconds())}`; };
const fD = t => { const d = L(t); return `${hh(d.getUTCMonth() + 1)}-${hh(d.getUTCDate())}`; };
const fmt = n => n >= 1e9 ? (n / 1e9).toFixed(2) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(n >= 1e8 ? 0 : 2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e5 ? 0 : 1) + 'K' : String(Math.round(n));
const ax = n => n >= 1e6 ? +(n / 1e6).toFixed(n < 1e7 ? 1 : 0) + 'M' : n >= 1e3 ? +(n / 1e3).toFixed(0) + 'K' : String(n);
const comma = n => Math.round(n).toLocaleString('en-US');
const pct = (a, b) => b ? a / b : 0;

// 会话：子代理归并到父会话
const SE = U.sessions;
SE.forEach((s, i) => { s.i = i; });
SE.forEach(s => { const p = s.parent && SE.find(x => x.id === s.parent); s.root = p ? p.i : s.i; s.child = !!p; });
SE.forEach(s => { if (s.title === '未命名会话') s.title = s.child ? `子代理 · ${s.agent}` : `后台任务 ${s.id}`; });
SE.forEach(s => { s.kids = SE.filter(x => x.child && x.root === s.i).length; });
const MODEL_NAME = i => i < 0 ? '未标注' : U.models[i];
// 行：补上推断出的模型（记录缺字段时取所属会话的已知模型）
const ROWS = U.rows.map((r, idx) => ({ idx, t: r[0], s: r[1], root: SE[r[1]].root, m: r[2] >= 0 ? r[2] : SE[r[1]].known, raw: r[2] >= 0, in: r[3], out: r[4], cache: r[5], tools: r[6], step: r[7], think: r[8] }));

const st = {
  view: 'buddy', tab: 'overview', range: '24h', fModel: null, fSess: null, metric: 'real', menu: null,
  credits: 'abs', native: true, nCtx: true, nSpeed: true, nQuota: true, theme: 0, alert: 1, predict: true,
  q: { f: 'used', prov: null, s: '', open: null, pins: new Set(['gemini-4-neon-high', 'claude-opus-5-5-high', 'gemini-4-neon-xhigh']) },
  lg: { sort: 't', dir: -1, sel: null, s: '', miss: false, big: false, limit: 60, bucket: null },
  acc: { cur: 0, sw: null, step: 0 },
  chat: { aux: true, pop: null, model: 'gemini-4-neon-high' },
};

const RANGES = { '24h': '近 24 小时', '7d': '近 7 天', 'all': '全部' };
function buckets() {
  const out = [];
  if (st.range === '24h') { const end = Math.ceil(NOW / 3600) * 3600; for (let i = 23; i >= 0; i--) { const a = end - (i + 1) * 3600; out.push({ a, b: a + 3600, label: hh(L(a).getUTCHours()), long: `${fD(a)} ${hh(L(a).getUTCHours())}:00` }); } }
  else { const day = t => Math.floor((t + TZ) / 86400) * 86400 - TZ; const end = day(NOW) + 86400; const n = st.range === '7d' ? 7 : Math.max(7, Math.ceil((end - day(ROWS[0].t)) / 86400)); for (let i = n - 1; i >= 0; i--) { const a = end - (i + 1) * 86400; out.push({ a, b: a + 86400, label: fD(a).slice(3), long: fD(a) }); } }
  return out;
}
const rangeStart = () => buckets()[0].a;
function rowsIn(o = {}) {
  const a = rangeStart();
  return ROWS.filter(r => r.t >= a && (o.noModel || st.fModel == null || r.m === st.fModel) && (o.noSess || st.fSess == null || r.root === st.fSess));
}
const agg = rs => rs.reduce((x, r) => { x.n++; x.in += r.in; x.out += r.out; x.cache += r.cache; return x; }, { n: 0, in: 0, out: 0, cache: 0 });
const groupBy = (rs, k) => { const m = new Map(); rs.forEach(r => { const g = m.get(r[k]) || { key: r[k], n: 0, in: 0, out: 0, cache: 0 }; g.n++; g.in += r.in; g.out += r.out; g.cache += r.cache; m.set(r[k], g); }); return [...m.values()]; };

/* ===== 原语 ===== */
const ic = (n, s, x = '') => `<span class="ms ${x}"${s ? ` style="font-size:${s}px"` : ''}>${n}</span>`;
const logoOf = id => /claude|opus|sonnet/i.test(id) ? 'claude' : /gpt|openai/i.test(id) ? 'openai' : 'gemini';
const lg = (id, s) => id === '未标注' ? `<span style="width:14px;height:14px;display:grid;place-items:center;color:var(--fg-4);flex:none">${ic('label_off', 14)}</span>` : `<img class="lg" src="assets/${logoOf(id)}.svg"${s ? ` style="width:${s}px;height:${s}px"` : ''}>`;
const tipA = h => `data-tip="${h.replace(/"/g, '&quot;')}"`;
const A = (a, v) => `data-a="${a}"${v !== undefined ? ` data-v="${String(v).replace(/"/g, '&quot;')}"` : ''}`;
const sw = c => `<i style="display:inline-block;width:7px;height:7px;border-radius:2px;background:${c};margin-right:7px"></i>`;
const BLOGO = `<span class="blogo"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 8V5.5M5 8V2M8 8V4" stroke="#7BA7F2" stroke-width="1.5" stroke-linecap="round"/></svg></span>`;
function qm(f, w = 72) {
  const c = f <= .1 ? 'var(--crit)' : f <= .25 ? 'var(--warn)' : 'var(--s1)';
  return `<span style="display:block;width:${typeof w === 'number' ? w + 'px' : w};height:3px;border-radius:2px;background:var(--track);overflow:hidden;flex:none"><span style="display:block;width:${Math.max(f * 100, 2)}%;height:100%;border-radius:2px;background:${c};opacity:${f >= 1 ? .45 : 1}"></span></span>`;
}
const pc = f => `<span class="num" style="color:${f >= 1 ? 'var(--fg-4)' : f <= .25 ? 'var(--fg)' : 'var(--fg-2)'}">${Math.round(f * 100)}%</span>`;
const bar = (f, c = 'var(--s1)', w = '100%') => `<span style="display:block;width:${w};height:3px;border-radius:2px;background:var(--track)"><span style="display:block;width:${Math.min(1, f) * 100}%;height:100%;border-radius:2px;background:${c}"></span></span>`;
const niceMax = v => { if (v <= 0) return 4; const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; return (n <= 1.2 ? 1.2 : n <= 2 ? 2 : n <= 4 ? 4 : n <= 6 ? 6 : n <= 8 ? 8 : 12) * p; };

// 柱状图：rows=[{label, parts, tip, act}]；点击柱子触发 act
function chart({ rows, colors, w, h, pad = { l: 42, r: 0, t: 6, b: 22 }, barMax = 14, every = 1, yfmt = ax }) {
  const yMax = niceMax(Math.max(...rows.map(r => r.parts.reduce((a, b) => a + b, 0)), 1));
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b, band = iw / rows.length, bw = Math.min(barMax, band * .6); let g = '';
  [0, 1, 2, 3, 4].forEach(k => { const t = yMax * k / 4, y = Math.round(pad.t + ih - (k / 4) * ih) + .5;
    g += `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y}" y2="${y}" stroke="${k ? 'var(--grid)' : 'var(--axis)'}"/><text x="${pad.l - 10}" y="${y + 3.5}" fill="var(--fg-4)" font-size="10.5" text-anchor="end" class="num">${yfmt(Math.round(t))}</text>`; });
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

/* ===== 账号（演示） ===== */
const ACC = [
  { l: 'M', c: '#3b5bdb', n: 'Ming Mike', e: 'lmkbnb1@gmail.com', p: 'PRO', pa: 500, pb: 50000, fa: 100, fb: 150000, neon: .18, seen: '' },
  { l: 'M', c: '#0f8a5f', n: 'Ming', e: 'lmkbnb0@gmail.com', p: 'PRO', pa: 41200, pb: 50000, fa: 128000, fb: 150000, neon: .92, tok: 1240000, seen: '3 分钟前' },
  { l: 'S', c: '#c2410c', n: 'MK Studio', e: 'mk.studio@gmail.com', p: 'PRO', pa: 18800, pb: 50000, fa: 62000, fb: 150000, neon: .55, tok: 3910000, seen: '12 分钟前' },
  { l: 'L', c: '#3f3f46', n: 'Lab', e: 'lmk.lab@gmail.com', p: 'FREE', exp: true },
];
const credit = (a, b) => st.credits === 'abs' ? `${comma(a)}<small>/ ${comma(b)}</small>` : `${(a / b * 100).toFixed(a / b < .01 ? 2 : 1)}<small>%</small>`;

/* ===== 外壳 ===== */
const CHAT_ROOT = SE.find(s => s.title === 'Neox UI Design Optimization').i;
function sidebar() {
  const by = ws => SE.filter(s => !s.child && s.ws === ws && !s.title.startsWith('后台任务')).sort((a, b) => lastT(b.i) - lastT(a.i)).slice(0, 5);
  const cv = s => { const age = NOW - lastT(s.i), m = age < 3600 ? '•' : age < 86400 ? Math.round(age / 3600) + 'h' : Math.round(age / 86400) + 'd';
    return `<div class="cv" ${A('chat', s.i)} style="${st.view === 'chat' && s.i === CHAT_ROOT ? 'background:var(--selected)' : ''}"><span>${s.title}</span>${m === '•' ? '<i class="dot"></i>' : `<em>${m}</em>`}</div>`; };
  return `<aside class="side">
    <div class="tl"><i></i><i></i><i></i><div class="ic">${ic('side_navigation')}${ic('arrow_back')}<span style="opacity:.45">${ic('arrow_forward')}</span>${ic('search')}</div></div>
    <div class="newc">${ic('add')} New Conversation</div>
    <div class="nv">${ic('schedule')} Automations</div><div class="nv">${ic('business_center')} Customizations</div>
    <div class="nh">Extensions ${ic('filter_list')}</div>
    <div class="nv${st.view === 'buddy' ? ' on' : ''}" ${A('buddy')}>${BLOGO} Buddy</div>
    <div class="nh">Projects <span style="display:flex;gap:10px">${ic('filter_list')}${ic('create_new_folder')}</span></div>
    <div class="pj">${ic('folder_open')} Neox</div>${by('Neox').map(cv).join('')}
    <div class="pj">${ic('folder_open')} KYDev</div>${by('KYDev').map(cv).join('')}
    <div class="pj">${ic('folder_open')} PlanMD</div>${by('PlanMD').map(cv).join('')}
    <div class="nv foot">${ic('settings')} Settings</div></aside>`;
}
const lastT = root => Math.max(...ROWS.filter(r => r.root === root).map(r => r.t));
const TABS = [['overview', '概览'], ['quota', '额度'], ['tokens', '用量'], ['ledger', '明细'], ['accounts', '账号'], ['settings', '设置']];
function sub(right = '') {
  const a = ACC[st.acc.cur];
  const acct = `<span style="position:relative"><span class="ctl" ${A('menu', 'acct')}><span class="who" style="background:${a.c}">${a.l}</span>${a.e.split('@')[0]}${ic('unfold_more')}</span>${st.menu === 'acct' ? `<div class="menu" style="top:32px;right:0"><div class="mh">切换账号</div>${ACC.map((x, i) => mi(x.exp ? 'noop' : 'switch', i, `<span class="who" style="background:${x.c}">${x.l}</span>${x.e}${x.exp ? ' <span class="dim2">已过期</span>' : ` <span class="dim2 num">${comma(x.pa)}</span>`}`, i === st.acc.cur)).join('')}<div style="height:1px;background:var(--border);margin:4px 0"></div>${mi('tab', 'accounts', `${ic('account_tree', 16)}管理账号`)}</div>` : ''}</span>`;
  return `<div class="sub"><nav class="tabs">${TABS.map(([k, v]) => `<a class="${k === st.tab ? 'on' : ''}" ${A('tab', k)}>${v}</a>`).join('')}</nav>
  <div class="sub-r">${right}${right ? '<span class="vsep"></span>' : ''}<span class="sync" ${A('sync')} ${tipA('已同步 · 每 30 秒自动同步，点击立即同步')}><i></i>${fT(NOW).slice(0, 5)}</span>${acct}</div></div>`;
}
const shell = inner => `<div class="win">${sidebar()}<div class="main"><div class="topbar"><div class="t">${BLOGO} Buddy</div><div class="tbtn">Open IDE</div></div><div class="pane">${inner}</div></div></div>`;
// 共用的范围 / 模型 / 会话筛选器（概览、用量、明细保持一致）
function filters(o = {}) {
  const rs = rowsIn({ noModel: 1, noSess: 1 });
  const ms = groupBy(rs, 'm').sort((a, b) => b.in + b.out - a.in - a.out), ss = groupBy(rs, 'root').sort((a, b) => b.in + b.out - a.in - a.out);
  const r = dd('range', RANGES[st.range], Object.entries(RANGES).map(([k, v]) => mi('range', k, v, k === st.range)).join(''), { b: 1, icon: 'calendar_today' });
  const m = dd('model', st.fModel == null ? '全部模型' : `${lg(MODEL_NAME(st.fModel))}<span class="mono">${MODEL_NAME(st.fModel)}</span>`, mi('fmodel', '', '全部模型', st.fModel == null) + ms.map(g => mi('fmodel', g.key, `${lg(MODEL_NAME(g.key))}<span class="mono">${MODEL_NAME(g.key)}</span><span class="dim2 num" style="margin-left:auto;padding-left:16px">${fmt(g.in + g.out)}</span>`, st.fModel === g.key)).join(''));
  const s = dd('sess', st.fSess == null ? '全部会话' : `<span class="el" style="max-width:150px">${SE[st.fSess].title}</span>`, mi('fsess', '', '全部会话', st.fSess == null) + ss.map(g => mi('fsess', g.key, `<span class="el" style="max-width:230px">${SE[g.key].title}</span><span class="dim2 num" style="margin-left:auto;padding-left:16px">${fmt(g.in + g.out)}</span>`, st.fSess === g.key)).join(''), { right: 1 });
  const clear = st.fModel != null || st.fSess != null ? `<span class="ctl" ${A('clearf')} ${tipA('清除筛选')}>${ic('close')}</span>` : '';
  return r + m + s + clear + (o.extra || '');
}

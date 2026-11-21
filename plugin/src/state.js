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


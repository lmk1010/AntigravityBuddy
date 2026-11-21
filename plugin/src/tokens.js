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

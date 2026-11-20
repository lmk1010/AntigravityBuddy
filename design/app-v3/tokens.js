/* ===== 用量：顶部六个数字本身就是图表的指标切换器 ===== */
const METRICS = { n: ['调用', '次数'], in: ['新增输入', '实际发出的输入'], cache: ['缓存复用', ''], out: ['输出', '模型生成'], real: ['真实消耗', '新增输入 + 输出'], total: ['合计', '含缓存复用'] };
const MCOL = { n: 'rgb(255 255 255 / .55)', in: 'var(--s1)', cache: 'var(--s3)', out: 'var(--s2)', total: 'rgb(255 255 255 / .55)' };
function heat(W) {
  const day0 = Math.floor((NOW + TZ) / 86400) * 86400 - TZ - 6 * 86400, wd = ['日', '一', '二', '三', '四', '五', '六'];
  const rs = ROWS.filter(r => r.t >= day0 && (st.fModel == null || r.m === st.fModel) && (st.fSess == null || r.root === st.fSess));
  const v = {}; rs.forEach(r => { const k = Math.floor((r.t - day0) / 3600); v[k] = (v[k] || 0) + r.in + r.out; });
  const mx = Math.max(...Object.values(v), 1), steps = ['rgb(255 255 255 / .05)', '#184f95', '#256abf', '#3987e5', '#6da7ec', '#9ec5f4'];
  const lx = 22, gap = 2.5, cs = (W - lx - 23 * gap) / 24; let g = '';
  for (let d = 0; d < 7; d++) { const t0 = day0 + d * 86400;
    if (d % 2 === 0) g += `<text x="0" y="${d * (cs + gap) + cs - 1.5}" fill="var(--fg-4)" font-size="10.5">${wd[L(t0).getUTCDay()]}</text>`;
    for (let h = 0; h < 24; h++) { const x = v[d * 24 + h] || 0, s = x ? Math.min(5, 1 + Math.floor(Math.sqrt(x / mx) * 4.99)) : 0, a = t0 + h * 3600;
      g += `<rect class="hit" ${tipA(`<span class="dim">${fD(a)} ${hh(h)}:00</span><br>真实消耗 ${x ? fmt(x) : '—'}${x ? '<br><span class="dim">点击查看明细</span>' : ''}`)} ${x ? A('bucket', a + ',' + (a + 3600)) : ''} x="${lx + h * (cs + gap)}" y="${d * (cs + gap)}" width="${cs}" height="${cs}" rx="2.5" fill="${steps[s]}"/>`; } }
  [0, 6, 12, 18].forEach(h => g += `<text x="${lx + h * (cs + gap)}" y="${7 * (cs + gap) + 11}" fill="var(--fg-4)" font-size="10.5" class="num">${hh(h)}</text>`);
  return `<svg width="${W}" height="${7 * (cs + gap) + 14}" style="display:block">${g}</svg>`;
}
function vTokens() {
  const rs = rowsIn(), t = agg(rs), bs = buckets(), hit = pct(t.cache, t.cache + t.in), m = st.metric;
  const val = { n: comma(t.n), in: fmt(t.in), cache: fmt(t.cache), out: fmt(t.out), real: fmt(t.in + t.out), total: fmt(t.in + t.out + t.cache) };
  const capOf = k => k === 'cache' ? `占输入 ${(hit * 100).toFixed(1)}%` : METRICS[k][1];
  const rows = bs.map(b => { const g = agg(rs.filter(r => r.t >= b.a && r.t < b.b));
    const parts = m === 'real' ? [g.in, g.out] : [m === 'n' ? g.n : m === 'total' ? g.in + g.out + g.cache : g[m]];
    return { label: st.range === '24h' ? b.label + ':00' : b.label, parts, act: ['bucket', b.a + ',' + b.b], tip: `<span class="dim">${b.long}</span><br>${sw('var(--s1)')}新增输入 ${fmt(g.in)}<br>${sw('var(--s2)')}输出 ${fmt(g.out)}<br>${sw('var(--s3)')}缓存 ${fmt(g.cache)}<br><span class="dim">${g.n} 次调用 · 点击查看明细</span>` }; });
  const hits = bs.map(b => { const g = agg(rs.filter(r => r.t >= b.a && r.t < b.b)); return g.n ? pct(g.cache, g.cache + g.in) : null; }).filter(x => x != null);
  // 模型 / 会话列表不受自身筛选影响，这样点了还能换别的
  const ms = groupBy(rowsIn({ noModel: 1 }), 'm').sort((a, b) => b.in + b.out - a.in - a.out), mm = ms.length ? ms[0].in + ms[0].out : 1;
  const ss = groupBy(rowsIn({ noSess: 1 }), 'root').sort((a, b) => b.in + b.out - a.in - a.out).slice(0, 6), sm = ss.length ? ss[0].in + ss[0].out : 1;
  const pair = (g, mx) => `<span style="flex:1;display:flex;height:3px;gap:2px"><span class="mk" style="width:${g.in / mx * 100}%;background:var(--s1);border-radius:2px"></span><span class="mk" style="width:${Math.max(g.out / mx * 100, 1)}%;background:var(--s2);border-radius:2px"></span></span>`;
  return shell(sub(filters({ extra: `<span class="ctl" ${A('export')}>${ic('ios_share')}导出</span>` })) + `<div class="body">
    <div class="cols" style="grid-template-columns:repeat(6,1fr);gap:32px">${Object.keys(METRICS).map(k => `<div class="stat ${k === m ? 'on' : ''}" ${A('metric', k)}><div class="lbl" style="${k === m ? 'color:var(--fg)' : ''}">${METRICS[k][0]}</div><div class="big num" style="font-size:24px">${val[k]}</div><div class="cap" style="margin-top:6px">${capOf(k)}</div></div>`).join('')}</div>
    <div class="hr" style="margin-top:22px"></div>
    <div class="h"><h3>${METRICS[m][0]}</h3><div class="x">${m === 'real' ? `<span class="lgd"><span><i style="background:var(--s1)"></i>新增输入</span><span><i style="background:var(--s2)"></i>输出</span></span>` : ''}<span>点击柱子查看明细</span></div></div>
    ${chart({ rows, colors: m === 'real' ? ['var(--s1)', 'var(--s2)'] : [MCOL[m]], w: 1086, h: 226, every: st.range === '24h' ? 2 : 1, barMax: st.range === '24h' ? 18 : 30, yfmt: m === 'n' ? String : ax })}
    <div class="hr"></div>
    <div class="cols" style="grid-template-columns:1.15fr 1fr 322px">
      <div>
        <div class="h"><h3>会话</h3><div class="x">点击筛选</div></div>
        ${ss.map(g => `<div class="row rowh" ${A('fsess', st.fSess === g.key ? '' : g.key)} style="height:30px;gap:10px;${st.fSess === g.key ? 'background:var(--selected)' : ''}"><span class="el" style="width:170px;color:var(--fg-2)">${SE[g.key].title}</span>${pair(g, sm)}<span class="num r" style="width:44px;font-size:12.5px">${fmt(g.in + g.out)}</span></div>`).join('') || '<div class="cap">没有调用</div>'}
      </div>
      <div>
        <div class="h"><h3>模型</h3><div class="x">点击筛选</div></div>
        ${ms.map(g => `<div class="row rowh" ${A('fmodel', st.fModel === g.key ? '' : g.key)} style="height:30px;gap:10px;${st.fModel === g.key ? 'background:var(--selected)' : ''}">${lg(MODEL_NAME(g.key))}<span class="mono el" style="width:150px;color:var(--fg-2)">${MODEL_NAME(g.key)}</span>${pair(g, mm)}<span class="num r" style="width:44px;font-size:12.5px">${fmt(g.in + g.out)}</span></div>`).join('')}
        <div class="row" style="justify-content:space-between;margin-top:18px"><span class="lbl">缓存命中率</span><span class="num" style="font-size:12.5px">${(hit * 100).toFixed(1)}%</span></div>
        <div style="margin-top:10px">${spark(hits.length ? hits : [0, 0], 300, 34, 'var(--s3)', { area: 1 })}</div>
      </div>
      <div>
        <div class="h"><h3>活跃时段</h3><div class="x">近 7 天</div></div>
        ${heat(322)}
      </div>
    </div>
  </div>`);
}

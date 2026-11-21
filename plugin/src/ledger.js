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

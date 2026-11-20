/* ===== 明细：整宽表格；点一行在原位展开该步骤，不再占用右侧 ===== */
const CTX_MAX = 1e6;
function ledgerRows() {
  const g = st.lg; let rs = g.bucket ? rowsIn({ a: g.bucket[0], b: g.bucket[1] }) : rowsIn();
  if (g.s) { const q = g.s.toLowerCase(); rs = rs.filter(r => (SE[r.root].title + ' ' + MODEL_NAME(r.m)).toLowerCase().includes(q)); }
  const k = g.sort, v = r => k === 'hit' ? pct(r.cache, r.cache + r.in) : r[k];
  return rs.slice().sort((a, b) => (v(a) - v(b)) * g.dir || b.t - a.t);
}
function stepDetail(r) {
  // 同一会话的上下文走势：能看出增长与压缩
  const same = ROWS.filter(x => x.s === r.s), ctx = same.map(x => x.in + x.cache), at = same.findIndex(x => x.idx === r.idx);
  const drops = ctx.filter((v, i) => i && v < ctx[i - 1] * .6).length, cur = r.in + r.cache, s = SE[r.s], p = rateOf(MODEL_NAME(r.m));
  const parts = [['var(--s3)', '缓存命中', r.cache, p[2]], ['var(--s1)', '新增输入', r.in, p[1]], ['var(--s2)', '输出', r.out, p[3]]];
  const kv = (k, v) => `<div class="row" style="height:26px;justify-content:space-between;gap:12px"><span class="dim" style="flex:none">${k}</span><span class="el" style="color:var(--fg-2)">${v}</span></div>`;
  return `<tr><td colspan="10" style="height:auto;padding:0;border-bottom:1px solid var(--border)"><div data-xp style="background:var(--hover);border-radius:10px;padding:16px 18px;margin:6px 0 10px;display:grid;grid-template-columns:250px 1fr 250px;gap:40px">
    <div><div class="lbl" style="justify-content:space-between"><span>Token 构成</span><span class="num">约 ${fUSD(r.cost)}</span></div>
      <div style="display:flex;height:4px;gap:2px;margin:12px 0 8px">${parts.map(([c, , v]) => `<span style="flex:${v || 0.0001};background:${c};border-radius:2px"></span>`).join('')}</div>
      ${parts.map(([c, l, v, pr]) => `<div class="row" style="height:26px;justify-content:space-between"><span style="color:var(--fg-2)">${sw(c)}${l}</span><span class="num">${comma(v)} <span class="dim2" style="font-size:12px;display:inline-block;width:52px;text-align:right">${fUSD(v * pr / 1e6)}</span></span></div>`).join('')}</div>
    <div><div class="lbl" style="justify-content:space-between"><span>上下文 · 本会话第 ${at + 1} / ${same.length} 步${drops ? ` · 压缩过 ${drops} 次` : ''}</span><span class="num">${fmt(cur)} / ${fmt(r.maxCtx || CTX_MAX)} · ${(cur / (r.maxCtx || CTX_MAX) * 100).toFixed(1)}%</span></div>
      <div style="margin-top:16px" ${tipA('本会话每一步的上下文大小，白点为当前步骤')}>${spark(ctx, Math.max(220, CW() - 652), 64, 'var(--s1)', { area: 1, mark: at })}</div></div>
    <div style="display:flex;flex-direction:column">
      <div class="row" style="height:26px;justify-content:space-between"><span class="dim">模型</span><span class="row" style="gap:7px">${lg(MODEL_NAME(r.m))}<span class="mono" style="color:var(--fg-2)">${MODEL_NAME(r.m)}</span></span></div>
      ${kv('步骤 · 工具', `第 ${r.step} 步 · ${r.tools ? r.tools + ' 次工具' : '无工具'}${s.child ? ` · 子代理 ${s.agent}` : ''}`)}
      ${kv('首字延迟', r.ttft ? `${r.ttft.toFixed(2)} s${r.pre ? ` · prefill ${fmt(r.pre)} tok/s` : ''}` : '—')}${kv('流式耗时', r.dur ? `${r.dur.toFixed(1)} s${r.dec ? ` · 解码 ${Math.round(r.dec)} tok/s` : ''}` : '—')}${kv('思考 / 回答', r.dur ? `${comma(r.tk)} / ${comma(Math.max(0, r.out - r.tk))} tokens` : '—')}
      <div class="row" style="gap:8px;margin-top:auto;padding-top:10px"><span class="btn" style="flex:1;justify-content:center" ${A('fsess', r.root)}>${ic('filter_list')}只看本会话</span><span class="btn" ${A('copy', r.idx)}>${ic('content_copy')}JSON</span></div>
    </div></div></td></tr>`;
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
      <div class="row" style="gap:8px;height:28px;margin-bottom:10px;flex:none"><span class="inp">${ic('search', 16)}<input data-i="ls" placeholder="搜索会话或模型" value="${g.s}"></span>${bk}${chip('miss', '未命中缓存')}${chip('big', '输入 > 100K')}${chip('kids', '子代理')}
        <span class="dim num" style="margin-left:auto;font-size:13px">${comma(t.n)} 条 · 新增输入 ${fmt(t.in)} · 输出 ${fmt(t.out)} · 约 ${fUSD(t.cost)}${med ? ` · 解码中位 ${Math.round(med)} tok/s` : ''}</span></div>
      <div class="scroll" id="lgscroll" style="flex:1;min-height:0">
      <table class="t"><thead style="position:sticky;top:0;background:var(--background);z-index:2"><tr>${th('t', '时间', 0, 'padding-left:8px')}<th>会话</th><th>模型</th>${th('in', '新增输入', 1)}${th('cache', '缓存', 1)}${th('hit', '命中', 1)}${th('out', '输出', 1)}${th('ttft', '首字', 1)}${th('dec', '解码', 1)}${th('cost', '成本', 1, 'padding-right:8px')}</tr></thead>
      <tbody>${view.map(tr).join('')}</tbody></table>
      ${!rs.length ? `<div class="cap" style="padding:48px 0;text-align:center">没有符合条件的记录　<span class="lk" ${A('lgreset')}>清除筛选</span></div>` : ''}
      ${rs.length > g.limit ? `<div class="row rowh" ${A('more')} style="height:40px;justify-content:center;color:var(--fg-3);font-size:13px;margin:0">已显示 ${g.limit} / ${comma(rs.length)} · 加载更多</div>` : rs.length ? `<div class="cap" style="text-align:center;padding:14px 0 20px;margin:0">共 ${comma(rs.length)} 条</div>` : ''}
      </div>
  </div>`);
}

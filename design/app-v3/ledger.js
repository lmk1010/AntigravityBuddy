/* ===== 明细：可搜索、可排序；右侧检查器在没选中时显示当前筛选结果的汇总 ===== */
const CTX_MAX = 1e6;
function ledgerRows() {
  const g = st.lg; let rs = g.bucket ? ROWS.filter(r => r.t >= g.bucket[0] && r.t < g.bucket[1] && (st.fModel == null || r.m === st.fModel) && (st.fSess == null || r.root === st.fSess)) : rowsIn();
  if (g.miss) rs = rs.filter(r => r.cache === 0);
  if (g.big) rs = rs.filter(r => r.in > 100000);
  if (g.kids) rs = rs.filter(r => SE[r.s].child);
  if (g.s) { const q = g.s.toLowerCase(); rs = rs.filter(r => (SE[r.root].title + ' ' + MODEL_NAME(r.m)).toLowerCase().includes(q)); }
  const k = g.sort, v = r => k === 'hit' ? pct(r.cache, r.cache + r.in) : r[k];
  return rs.slice().sort((a, b) => (v(a) - v(b)) * g.dir || b.t - a.t);
}
function inspector(rs) {
  const r = st.lg.sel != null && ROWS[st.lg.sel];
  const kv = (k, v) => `<div class="row" style="height:28px;justify-content:space-between;gap:12px"><span class="dim" style="flex:none">${k}</span><span class="el" style="color:var(--fg-2)">${v}</span></div>`;
  const comp = (parts) => `<div style="display:flex;height:4px;gap:2px;margin:12px 0 10px">${parts.map(([c, , v]) => `<span style="flex:${v || 0.0001};background:${c};border-radius:2px"></span>`).join('')}</div>${parts.map(([c, l, v]) => `<div class="row" style="height:26px;justify-content:space-between"><span style="color:var(--fg-2)">${sw(c)}${l}</span><span class="num">${comma(v)}</span></div>`).join('')}`;
  if (!r) { // 汇总：检查器永远有内容
    const t = agg(rs), top = groupBy(rs, 'root').sort((a, b) => b.in + b.out - a.in - a.out).slice(0, 5), mx = top.length ? top[0].in + top[0].out : 1;
    return `<div style="font-weight:500">当前结果</div><div class="dim num" style="font-size:12px;margin-top:4px">${comma(t.n)} 次调用 · 点击任意一行查看该步骤</div>
      <div class="hr" style="margin:18px 0"></div><div class="lbl">Token 构成</div>${comp([['var(--s3)', '缓存命中', t.cache], ['var(--s1)', '新增输入', t.in], ['var(--s2)', '输出', t.out]])}
      <div class="hr" style="margin:18px 0"></div>${kv('缓存命中率', (pct(t.cache, t.cache + t.in) * 100).toFixed(1) + '%')}${kv('平均每次新增输入', fmt(t.n ? t.in / t.n : 0))}${kv('带工具调用', comma(rs.filter(x => x.tools).length) + ' 次')}
      <div class="hr" style="margin:18px 0"></div><div class="lbl" style="margin-bottom:8px">占比最高的会话</div>
      ${top.map(g => `<div class="row rowh" ${A('fsess', g.key)} style="height:28px;gap:10px"><span class="el" style="flex:1;color:var(--fg-2);font-size:12.5px">${SE[g.key].title}</span><span style="width:48px">${bar((g.in + g.out) / mx, 'rgb(255 255 255 / .38)')}</span><span class="num r" style="width:42px;font-size:12px">${fmt(g.in + g.out)}</span></div>`).join('')}`;
  }
  // 同一会话的上下文走势：能看出增长与压缩
  const same = ROWS.filter(x => x.s === r.s), ctx = same.map(x => x.in + x.cache), at = same.findIndex(x => x.idx === r.idx);
  const drops = ctx.filter((v, i) => i && v < ctx[i - 1] * .6).length, cur = r.in + r.cache, s = SE[r.s];
  return `<div class="row" style="justify-content:space-between"><span style="font-weight:500">步骤 ${r.step}</span><span class="ctl" ${A('sel', '')} style="margin-right:-8px">${ic('close')}</span></div>
    <div class="dim num el" style="font-size:12px;margin-top:2px">${fD(r.t)} ${fT(r.t)} · ${SE[r.root].title}</div>
    <div class="hr" style="margin:16px 0"></div><div class="lbl">Token 构成</div>${comp([['var(--s3)', '缓存命中', r.cache], ['var(--s1)', '新增输入', r.in], ['var(--s2)', '输出', r.out]])}
    <div class="hr" style="margin:16px 0"></div>
    <div class="row" style="justify-content:space-between"><span class="lbl">上下文</span><span class="num dim" style="font-size:12px">${fmt(cur)} / 1M · ${(cur / CTX_MAX * 100).toFixed(1)}%</span></div>
    <div style="margin:12px 0 8px" ${tipA(`本会话 ${same.length} 步的上下文大小，白点为当前步骤`)}>${spark(ctx, 252, 36, 'var(--s1)', { area: 1, mark: at })}</div>
    <div class="cap" style="margin-top:0">本会话第 ${at + 1} / ${same.length} 步${drops ? ` · 期间压缩过 ${drops} 次` : ''}</div>
    <div class="hr" style="margin:16px 0"></div>
    <div class="row" style="height:28px;justify-content:space-between"><span class="dim">模型</span><span class="row" style="gap:7px">${lg(MODEL_NAME(r.m))}<span class="mono" style="color:var(--fg-2)">${MODEL_NAME(r.m)}</span></span></div>
    ${r.m >= 0 && !r.raw ? kv('', '<span class="dim2" style="font-size:12px">记录未写模型，按所属会话推断</span>') : ''}
    ${kv('工具调用', r.tools ? r.tools + ' 次' : '无')}${kv('思考', r.think ? '有' : '无')}${s.child ? kv('来源', `子代理 ${s.agent}`) : ''}
    <div class="row" style="gap:8px;margin-top:auto;padding-top:16px"><span class="btn" style="flex:1;justify-content:center" ${A('chat', r.root)}>${ic('open_in_new', 14)}打开会话</span><span class="btn" ${A('copy', r.idx)}>${ic('content_copy', 14)}JSON</span></div>`;
}
function vLedger() {
  const g = st.lg, rs = ledgerRows(), t = agg(rs), view = rs.slice(0, g.limit);
  const th = (k, l, r) => `<th class="${r ? 'r' : ''}" ${A('sort', k)}>${l}${g.sort === k ? `<span class="ms" style="font-size:13px;margin-left:2px">${g.dir < 0 ? 'arrow_downward' : 'arrow_upward'}</span>` : ''}</th>`;
  const tr = r => { const h = pct(r.cache, r.cache + r.in), s = SE[r.s]; return `<tr class="${g.sel === r.idx ? 'sel' : ''}" ${A('sel', r.idx)}><td class="num dim">${fD(r.t) === fD(NOW) ? '' : `<span class="dim2">${fD(r.t)}</span> `}${fT(r.t)}</td><td><span class="row" style="gap:6px"><span class="el" style="max-width:${s.child ? 130 : 170}px">${SE[r.root].title}</span>${s.child ? `<span class="dim2" ${tipA(`子代理 ${s.agent}`)}>${ic('hub', 13)}</span>` : ''}</span></td><td><span class="row" style="gap:8px">${lg(MODEL_NAME(r.m))}<span class="mono el" style="max-width:150px;color:${r.m < 0 ? 'var(--fg-4)' : 'var(--fg-2)'}">${MODEL_NAME(r.m)}</span></span></td><td class="r num">${fmt(r.in)}</td><td class="r num">${r.cache ? fmt(r.cache) : '<span class="dim2">—</span>'}</td><td><span class="row" style="gap:8px;justify-content:flex-end"><span style="width:36px">${bar(h, 'var(--s3)')}</span><span class="num r" style="width:30px;color:${r.cache ? 'var(--fg-2)' : 'var(--fg-4)'}">${Math.round(h * 100)}%</span></span></td><td class="r num">${fmt(r.out)}</td><td class="r num" style="color:${r.tools ? 'var(--fg-2)' : 'var(--fg-4)'}">${r.tools || '—'}</td></tr>`; };
  const chip = (k, l) => `<span class="chip ${g[k] ? 'on' : ''}" ${A('lgf', k)}>${l}</span>`;
  const base = (() => { const x = { ...g }; return x; })();
  const bk = g.bucket ? `<span class="chip on" ${A('unbucket')}>${fD(g.bucket[0])} ${fT(g.bucket[0]).slice(0, 5)}–${fT(g.bucket[1]).slice(0, 5)}${ic('close', 13)}</span>` : '';
  return shell(sub(filters({ extra: `<span class="ctl" ${A('export')}>${ic('ios_share')}CSV</span>` })) + `<div class="body" style="padding:0;display:flex">
    <div style="flex:1;min-width:0;padding:20px 28px 0 32px;display:flex;flex-direction:column">
      <div class="row" style="gap:8px;height:28px;margin-bottom:10px;flex:none"><span class="inp">${ic('search', 16)}<input data-i="ls" placeholder="搜索会话或模型" value="${g.s}"></span>${bk}${chip('miss', '未命中缓存', '')}${chip('big', '输入 > 100K', '')}${chip('kids', '子代理', '')}
        <span class="dim num" style="margin-left:auto;font-size:12px">${comma(t.n)} 条 · 新增输入 ${fmt(t.in)} · 输出 ${fmt(t.out)}</span></div>
      <div class="scroll" id="lgscroll" style="flex:1;min-height:0">
      <table class="t"><thead style="position:sticky;top:0;background:var(--background);z-index:2"><tr>${th('t', '时间')}<th>会话</th><th>模型</th>${th('in', '新增输入', 1)}${th('cache', '缓存', 1)}${th('hit', '命中', 1)}${th('out', '输出', 1)}${th('tools', '工具', 1)}</tr></thead>
      <tbody>${view.map(tr).join('')}</tbody></table>
      ${!rs.length ? `<div class="cap" style="padding:48px 0;text-align:center">没有符合条件的记录　<span class="lk" ${A('lgreset')}>清除筛选</span></div>` : ''}
      ${rs.length > g.limit ? `<div class="row rowh" ${A('more')} style="height:40px;justify-content:center;color:var(--fg-3);font-size:12.5px;margin:0">已显示 ${g.limit} / ${comma(rs.length)} · 加载更多</div>` : rs.length ? `<div class="cap" style="text-align:center;padding:14px 0 20px;margin:0">共 ${comma(rs.length)} 条 · <kbd>↑</kbd> <kbd>↓</kbd> 切换步骤</div>` : ''}
      </div>
    </div>
    <div class="scroll" style="width:308px;flex:none;border-left:1px solid var(--border);padding:22px 28px;display:flex;flex-direction:column">${inspector(rs)}</div>
  </div>`);
}

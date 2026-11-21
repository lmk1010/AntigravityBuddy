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

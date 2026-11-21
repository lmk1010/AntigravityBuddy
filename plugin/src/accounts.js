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

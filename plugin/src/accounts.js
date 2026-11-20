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
function vAccounts() {
  const a = ACC[0], day0 = Math.floor((NOW + TZ) / 86400) * 86400 - TZ, mo0 = day0 - (L(NOW).getUTCDate() - 1) * 86400;
  const u = [['今天', day0], ['近 7 天', day0 - 6 * 86400], ['本月', mo0]].map(([l, t0]) => { const g = agg(ROWS.filter(r => r.t >= t0)); return [l, g.in + g.out, g.cost, g.n]; });
  const mx = Math.max(u[2][1], 1), first = ROWS.length ? fD(ROWS[0].t) : '—';
  const cr = (l, x, y) => `<div style="flex:1"><div class="lbl">${l}</div><div class="big num">${credit(x, y)}</div><div style="margin-top:14px">${x != null && y ? qm(x / y, '100%') : ''}</div></div>`;
  const todo = (i, t, d) => `<div class="row" style="gap:12px;align-items:flex-start;padding:9px 0"><span style="color:var(--fg-3);margin-top:1px">${ic(i, 17)}</span><div style="flex:1"><div class="row" style="gap:8px">${t}<span class="pill">尚未实现</span></div></div></div>`;
  return shell(sub() + `<div class="body">
    <div class="row" style="gap:14px"><span class="who" style="width:40px;height:40px;font-size:16px;background:${a.c}">${a.l}</span><div><div class="row" style="gap:8px;font-size:16px;font-weight:var(--w-medium)">${a.n}${planTag(a)}</div><div class="dim" style="margin-top:2px">${a.e}</div></div>
      <span class="sp"></span><span class="pill ${LIVE.error ? '' : 'ok'}">${LIVE.error ? '未连接' : '使用中'}</span></div>
    <div class="hr"></div>
    ${calGrid()}
    <div class="hr"></div>
    <div class="cols" style="grid-template-columns:1fr 1fr">
      <div><div class="h"><h3>额度窗口</h3><div class="x">${tzLabel()}</div></div>
        ${WINS.map((w, k) => `<div class="row" style="height:34px;gap:12px"><span class="dim" style="width:132px;white-space:nowrap">${w.short}</span><span style="flex:1">${bar(winUse(k).u, winUse(k).col)}</span><span class="num r" style="width:44px">${Math.round(winUse(k).u * 100)}%</span><span class="num r dim" style="width:150px;font-size:13px">${winAt(k)} <span class="dim2">· ${winCd(k)}</span></span></div>`).join('') || '<div class="cap">读不到模型额度</div>'}
      </div>
      <div><div class="h"><h3>用量</h3></div>
        ${u.map(([l, tok, cost, n]) => `<div class="row" style="height:38px;gap:14px;border-bottom:1px solid var(--border)"><span class="dim" style="width:60px">${l}</span><span style="flex:1">${bar(tok / mx, 'var(--s1)')}</span><span class="num r dim" style="width:70px;font-size:13px">${comma(n)} 次</span><span class="num r" style="width:70px">${fmt(tok)}</span><span class="num r" style="width:70px;font-weight:var(--w-medium)">${fUSD(cost)}</span></div>`).join('')}
      </div>
    </div>
    <div class="hr"></div>
    <div class="h"><h3>计划中</h3></div>
    <div class="cols" style="grid-template-columns:1fr 1fr">
      ${todo('swap_horiz', '多账号与切换', '')}
      ${todo('hub', '按账号固定出口 IP', '')}
    </div>
  </div>`);
}

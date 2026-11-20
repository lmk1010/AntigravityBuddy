/* ===== 账号：每个号的 5 小时 / 周窗口、7 天与本月用量、出口 IP；点一行展开网络设置 ===== */
// 当前账号的用量来自本机实测；其余账号、各账号的额度与出口 IP 为演示数据
Object.assign(ACC[0], { w5: { f: .07, k: 'c5', m: 'Opus 5.5 High' }, wk: { f: .76, k: 'wk', m: 'Argon High' }, net: { mode: 'sys', proxy: '', ip: '198.51.100.7', loc: '纽约' } });
Object.assign(ACC[1], { w5: { f: .92, in: 2 * 3600 + 600, m: 'Neon High' }, wk: { f: .88, in: 4 * 86400 + 3 * 3600, m: 'Argon High' }, d7: [9.8e6, 71], mo: [31.2e6, 240], td: [1.24e6, 9.2], net: { mode: 'fixed', proxy: 'socks5://127.0.0.1:7891', ip: '203.0.113.24', loc: '东京' } });
Object.assign(ACC[2], { w5: { f: .55, in: 4 * 3600 + 2400, m: 'Neon High' }, wk: { f: .34, in: 2 * 86400 + 6 * 3600, m: 'Argon High' }, d7: [14.6e6, 118], mo: [52.3e6, 410], td: [3.91e6, 31.5], net: { mode: 'fixed', proxy: 'http://127.0.0.1:7892', ip: '203.0.113.87', loc: '新加坡' } });
Object.assign(ACC[3], { net: { mode: 'sys', proxy: '', ip: '', loc: '' } });
const accWin = w => w.k ? [WIN[w.k].t, WIN[w.k].t - NOW] : [NOW + w.in, w.in];
function accUse(i) {   // [今天, 近 7 天, 本月] → [tokens, 美元]
  const a = ACC[i]; if (a.exp) return null;
  if (i !== 0) return [a.td, a.d7, a.mo];
  const day0 = Math.floor((NOW + TZ) / 86400) * 86400 - TZ, mo0 = day0 - (L(NOW).getUTCDate() - 1) * 86400;
  return [day0, day0 - 6 * 86400, mo0].map(t0 => { const g = agg(ROWS.filter(r => r.t >= t0)); return [g.in + g.out, g.cost]; });
}
function accDetail(a, i) {
  const n = a.net, u = accUse(i), fixed = n.mode === 'fixed';
  return `<tr><td colspan="7" style="height:auto;padding:0;border-bottom:1px solid var(--border)"><div style="background:var(--hover);border-radius:10px;padding:16px 18px;margin:6px 0 10px;display:grid;grid-template-columns:1fr 1fr;gap:48px">
    <div><div class="lbl" style="margin-bottom:10px">用量 · 按 API 公开价估算</div>
      ${u ? [['今天', u[0]], ['近 7 天', u[1]], ['本月', u[2]]].map(([l, v]) => `<div class="row" style="height:30px;gap:12px"><span class="dim" style="width:64px">${l}</span><span style="flex:1">${bar(v[0] / (u[2][0] || 1), 'var(--s1)')}</span><span class="num r" style="width:64px">${fmt(v[0])}</span><span class="num r dim" style="width:64px">${fUSD(v[1])}</span></div>`).join('') : '<div class="cap">重新登录后恢复统计</div>'}
      <div class="cap" style="margin-top:8px">真实消耗 = 新增输入 + 输出；成本另计入缓存读取</div></div>
    <div><div class="row" style="justify-content:space-between;margin-bottom:10px"><span class="lbl">网络出口</span>${seg([['sys', '跟随系统'], ['fixed', '固定代理']], n.mode, 'accNet' + i)}</div>
      ${fixed ? `<div class="row" style="gap:8px"><span class="inp" style="flex:1"><input data-i="px${i}" value="${n.proxy}" placeholder="socks5://127.0.0.1:7890" style="width:100%;font-family:var(--mono);font-size:12.5px"></span><span class="btn" ${A('accTest', i)}>${ic('sync')}检测</span></div>` : ''}
      <div class="row" style="height:32px;justify-content:space-between;margin-top:${fixed ? 8 : 0}px"><span class="dim">出口 IP</span><span class="num" style="color:var(--fg-2)">${n.ip ? `${n.ip} · ${n.loc}` : '—'}</span></div>
      <div class="cap" style="margin-top:2px;line-height:1.6">${fixed ? '切到这个账号时，Buddy 让 Antigravity 改走这个代理后再登录；出口 IP 与上面不一致就不登录。需要重启 Antigravity。' : '和系统网络一致。多个账号共用同一个出口。'}</div></div>
  </div></td></tr>`;
}
function vAccounts() {
  const cur = st.acc.cur, valid = ACC.map((a, i) => [a, i]).filter(([a]) => !a.exp), cols = ['var(--s1)', 'var(--s2)', 'var(--s3)'];
  const win = w => { const [t, left] = accWin(w); return `<td ${tipA(`最紧的模型：${w.m}`)}><div class="row" style="gap:10px;margin-bottom:6px">${qm(w.f, 64)}<span style="font-size:13px">${pc(w.f)}</span></div><div class="num dim" style="font-size:12.5px">${atLocal(t)} <span class="dim2">· ${cdStr(left)}</span></div></td>`; };
  const use = v => `<td class="r"><div class="num">${fmt(v[0])}</div><div class="num dim" style="font-size:12.5px;margin-top:3px">${fUSD(v[1])}</div></td>`;
  const row = (a, i) => { const u = accUse(i), sw_ = st.acc.sw === i, open = st.acc.open === i;
    const right = i === cur ? `<span class="row" style="gap:7px;justify-content:flex-end;color:var(--fg-2);font-size:13px"><i style="width:6px;height:6px;border-radius:50%;background:var(--good)"></i>使用中</span>`
      : sw_ ? `<span class="row" style="gap:8px;justify-content:flex-end;color:var(--fg-2);font-size:13px"><span class="ms spin" style="font-size:15px">progress_activity</span>${SW_STEPS[st.acc.step]}</span>`
      : a.exp ? `<span class="btn" ${A('relogin', i)}>重新登录</span>` : `<span class="btn" ${A('switch', i)}>切换</span>`;
    return `<tr class="${open ? 'sel' : ''}" ${A('accOpen', i)}><td style="height:62px;padding-left:8px"><span class="row" style="gap:12px"><span class="who" style="width:28px;height:28px;font-size:12px;background:${a.c}">${a.l}</span><span><span class="row" style="gap:8px">${a.n}<span class="pill">${a.p}</span></span><span class="dim" style="font-size:12.5px;display:block;margin-top:2px">${a.e}</span></span></span></td>
      ${a.exp ? `<td colspan="4" class="dim">登录已过期，额度与用量未知</td>` : win(a.w5) + win(a.wk) + use(u[1]) + use(u[2])}
      <td>${a.net.ip ? `<div class="row" style="gap:7px">${a.net.loc}${a.net.mode === 'fixed' ? `<span class="pill">固定</span>` : ''}</div><div class="num dim" style="font-size:12.5px;margin-top:3px">${a.net.ip}</div>` : '<span class="dim2">—</span>'}</td>
      <td class="r" style="padding-right:8px">${right}</td></tr>${open ? accDetail(a, i) : ''}`; };
  const tot = [0, 1, 2].map(k => valid.reduce((s, [, i]) => { const u = accUse(i)[k]; return [s[0] + u[0], s[1] + u[1]]; }, [0, 0]));
  const fact = (i, t, d, tag) => `<div class="row" style="gap:12px;align-items:flex-start;padding:8px 0"><span style="color:var(--fg-3);margin-top:1px">${ic(i, 17)}</span><div style="flex:1"><div class="row" style="gap:8px">${t}${tag ? `<span class="pill">${tag}</span>` : ''}</div><div class="dim" style="font-size:13px;margin-top:3px;line-height:1.55">${d}</div></div></div>`;
  return shell(sub() + `<div class="body">
    <div class="h"><h3>账号</h3><div class="x"><span>时间按 ${tzLabel()} 显示 · 点击一行设置网络出口</span><span class="btn" ${A('toast', '将打开浏览器完成 Google 登录')}>${ic('add')}添加账号</span></div></div>
    <table class="t"><thead><tr><th style="padding-left:8px">账号</th><th style="width:170px">5 小时窗口</th><th style="width:170px">周窗口</th><th class="r" style="width:96px">近 7 天</th><th class="r" style="width:96px">本月</th><th style="width:150px;padding-left:28px">出口</th><th class="r" style="width:210px;padding-right:8px"></th></tr></thead><tbody>${ACC.map(row).join('')}</tbody></table>
    <div class="cols" style="grid-template-columns:1fr 1.15fr;margin-top:30px">
      <div>
        <div class="h"><h3>全部账号合计</h3><div class="x">真实消耗 · 按 API 价估算</div></div>
        ${[['今天', 0], ['近 7 天', 1], ['本月', 2]].map(([l, k]) => `<div class="row" style="height:38px;gap:14px;border-bottom:1px solid var(--border)"><span class="dim" style="width:60px">${l}</span><span style="flex:1;display:flex;height:4px;gap:2px">${valid.map(([, i], j) => `<span class="hit mk" ${tipA(`${ACC[i].e}<br>${fmt(accUse(i)[k][0])} · ${fUSD(accUse(i)[k][1])}`)} style="width:${accUse(i)[k][0] / tot[2][0] * 100}%;min-width:2px;background:${cols[j]};border-radius:2px"></span>`).join('')}</span><span class="num r" style="width:70px">${fmt(tot[k][0])}</span><span class="num r" style="width:70px;font-weight:var(--w-medium)">${fUSD(tot[k][1])}</span></div>`).join('')}
        <div class="lgd num" style="margin-top:12px">${valid.map(([a], j) => `<span><i style="background:${cols[j]}"></i>${a.e.split('@')[0]}</span>`).join('')}</div>
      </div>
      <div>
        <div class="h"><h3>切换账号会怎样</h3><div class="x"><span>有回复在生成时，等它结束再切</span><span class="sw ${st.acc.wait ? 'on' : ''}" ${A('set', 'acc.wait=!')}></span></div></div>
        ${fact('forum', '正在生成的回复会中断', '切换要先登出。打开上面的开关后，Buddy 会等所有会话空闲再动手。历史对话存在本机，不随账号走，切回来还在。')}
        ${fact('open_in_new', '每次切换都要过一次 Google 登录', 'Antigravity 有登出和浏览器登录接口，但没有「多账号」接口。Buddy 不保存密码或令牌，所以做不到无感秒切，预计十秒左右。', '尚未实测')}
        ${fact('hub', '按账号固定出口 IP', 'Antigravity 的后台进程支持走代理，所以能在切换时一并换出口。它只保证这个账号始终从同一个 IP 出去，不保证账号不被风控。', '待验证')}
      </div>
    </div>
  </div>`);
}
const ACC_ACT = {
  accOpen(v) { const i = Number(v); st.acc.open = st.acc.open === i ? null : i; },
  accTest(v) { toast(`原型：将经该代理请求一次，核对出口 IP 是否为 ${ACC[v].net.ip}`); return 'keep'; },
};
[0, 1, 2, 3].forEach(i => { ACC_ACT['accNet' + i] = v => { const n = ACC[i].net; n.mode = v; if (v === 'fixed' && !n.proxy) n.proxy = 'socks5://127.0.0.1:7890'; st.acc.open = i; }; });

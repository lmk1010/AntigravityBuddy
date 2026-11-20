/* ===== 账号 ===== */
const SW_STEPS = ['正在登出当前账号', '等待浏览器完成 Google 授权', '回读账号与额度'];
function vAccounts() {
  const cur = st.acc.cur, best = ACC.map((a, i) => [a, i]).filter(([a, i]) => !a.exp && i !== cur).sort((x, y) => y[0].pa - x[0].pa)[0];
  const valid = ACC.filter(a => !a.exp), tot = valid.reduce((s, a) => s + a.pa, 0), cap = valid.reduce((s, a) => s + a.pb, 0), cols = ['var(--s1)', 'var(--s2)', 'var(--s3)'];
  const q = (a, b) => a == null ? `<td class="dim2">—</td>` : `<td><div class="num" style="font-size:12.5px;margin-bottom:7px">${st.credits === 'abs' ? `${comma(a)} <span class="dim2">/ ${comma(b)}</span>` : (a / b * 100).toFixed(1) + '%'}</div>${qm(a / b, 150)}</td>`;
  const real24 = agg(rowsIn({ noModel: 1, noSess: 1 })), realTok = real24.in + real24.out;
  const row = (a, i) => { const sw_ = st.acc.sw === i;
    const right = i === cur ? `<span class="row" style="gap:7px;justify-content:flex-end;color:var(--fg-2);font-size:12px"><i style="width:6px;height:6px;border-radius:50%;background:var(--good)"></i>使用中</span>`
      : sw_ ? `<span class="row" style="gap:8px;justify-content:flex-end;color:var(--fg-2);font-size:12px"><span class="ms spin" style="font-size:15px">progress_activity</span>${SW_STEPS[st.acc.step]}</span>`
      : a.exp ? `<span class="btn" ${A('relogin', i)}>重新登录</span>` : `<span class="row" style="gap:12px;justify-content:flex-end"><span class="dim2" style="font-size:12px">${a.seen}</span><span class="btn" ${A('switch', i)}>切换</span></span>`;
    return `<tr><td style="height:60px"><span class="row" style="gap:12px"><span class="who" style="width:28px;height:28px;font-size:12px;background:${a.c}">${a.l}</span><span><span class="row" style="gap:8px">${a.n}<span class="pill">${a.p}</span></span><span class="dim" style="font-size:12px;display:block;margin-top:2px">${a.e}</span></span></span></td>
      ${a.exp ? `<td colspan="3" class="dim">登录已过期，额度未知</td>` : q(a.pa, a.pb) + q(a.fa, a.fb) + `<td><div style="font-size:12.5px;margin-bottom:7px">${pc(a.neon)}</div>${qm(a.neon, 72)}</td>`}
      <td class="r num" style="color:var(--fg-2)">${i === 0 ? fmt(realTok) : a.tok ? fmt(a.tok) : '<span class="dim2">—</span>'}</td><td class="r">${right}</td></tr>`; };
  const sug = ACC[cur].pa / ACC[cur].pb < .05 && best && st.acc.sw == null;
  return shell(sub() + `<div class="body">
    <div class="h"><h3>账号</h3><div class="x"><span class="btn" ${A('toast', '将打开浏览器完成 Google 登录')}>${ic('add', 15)}添加账号</span></div></div>
    <table class="t"><thead><tr><th style="width:300px">账号</th><th style="width:200px">Prompt 积分</th><th style="width:200px">Flow 积分</th><th style="width:120px">Neon High</th><th class="r">近 24h</th><th class="r" style="width:230px"></th></tr></thead><tbody>${ACC.map(row).join('')}</tbody></table>
    <div class="cols" style="grid-template-columns:1fr 1fr;margin-top:32px">
      <div>
        <div class="h"><h3>合计可用 Prompt 积分</h3><div class="x">${valid.length} 个有效账号</div></div>
        <div class="big num" style="margin-top:0">${comma(tot)}<small>/ ${comma(cap)}</small></div>
        <div style="display:flex;height:4px;gap:2px;margin:16px 0 12px">${valid.map((a, i) => `<span class="hit mk" ${tipA(`${a.e}<br>${comma(a.pa)}`)} style="flex:${a.pa};min-width:3px;background:${cols[i]};border-radius:2px"></span>`).join('')}<span style="flex:${cap - tot};background:var(--track);border-radius:2px"></span></div>
        <div class="lgd num">${valid.map((a, i) => `<span><i style="background:${cols[i]}"></i>${a.e.split('@')[0]} ${comma(a.pa)}</span>`).join('')}</div>
        ${sug ? `<div class="row" style="margin-top:20px;gap:12px;padding:12px 14px;border:1px solid var(--card-border);border-radius:10px"><span style="flex:1;color:var(--fg-2);line-height:1.6">当前账号 Prompt 积分仅剩 ${(ACC[cur].pa / ACC[cur].pb * 100).toFixed(0)}%。<span style="color:var(--fg)">${best[0].e.split('@')[0]}</span> 余量最多，切换约需 10 秒，经官方登录流程完成。</span><span class="btn p" ${A('switch', best[1])}>切换</span></div>` : ''}
      </div>
      <div>
        <div class="h"><h3>切换时会发生什么</h3></div>
        ${[['logout', '登出当前账号', '进行中的对话会保留在本机'], ['open_in_new', '浏览器完成 Google 授权', '走 Antigravity 官方登录，Buddy 不保存密码或令牌'], ['sync', '回读账号与额度', '用量统计按账号分开记录，互不混淆']].map(([i, t, d], k) => `<div class="row" style="gap:12px;align-items:flex-start;padding:9px 0;opacity:${st.acc.sw != null && st.acc.step < k ? .4 : 1}"><span style="color:${st.acc.sw != null && st.acc.step === k ? 'var(--fg)' : 'var(--fg-3)'};margin-top:1px">${st.acc.sw != null && st.acc.step > k ? ic('check', 17) : ic(i === 'logout' ? 'arrow_forward' : i, 17)}</span><div><div>${t}</div><div class="dim" style="font-size:12px;margin-top:3px">${d}</div></div></div>`).join('')}
      </div>
    </div>
  </div>`);
}

/* ===== 对话视图：辅助面板 + 输入框控件 ===== */
function chatData() {
  const main = ROWS.filter(r => r.s === CHAT_ROOT), all = ROWS.filter(r => r.root === CHAT_ROOT), last = main[main.length - 1], t = agg(all);
  return { main, all, last, t, ctx: last.in + last.cache, ctxs: main.map(r => r.in + r.cache), kids: SE[CHAT_ROOT].kids };
}
const CHAT = `<div style="align-self:flex-end;background:var(--raised);border-radius:16px;padding:9px 14px;max-width:72%;font-size:14px;line-height:1.55">帮我把 sidecar 的端口发现改成每次启动动态读取，别写死。</div>
  <div style="font-size:14px;line-height:1.7;color:var(--fg-2);max-width:660px">
    <div class="dim" style="font-size:12.5px;margin-bottom:8px;display:flex;align-items:center;gap:4px">Worked for 24s${ic('chevron_right', 15)}</div>
    好的。我会在 <code class="mono" style="background:var(--muted);padding:1px 5px;border-radius:4px">main.mjs</code> 启动时读取 <code class="mono" style="background:var(--muted);padding:1px 5px;border-radius:4px">webPort</code>，并在 language_server 重启后自动重连：
    <div style="background:var(--raised);border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin:12px 0;font-family:var(--mono);font-size:12.5px;line-height:1.7"><span style="color:#8ea8ff">const</span> port = <span style="color:#8ea8ff">await</span> discoverPort(pid);<br><span style="color:#8ea8ff">if</span> (!port) <span style="color:#8ea8ff">return</span> retryLater(<span style="color:#e0a370">3000</span>);<br>rpc.connect(<span style="color:#7fc8a2">\`http://127.0.0.1:\${port}\`</span>, { csrf });</div>
    已修改 2 个文件。需要我顺便加上 <code class="mono" style="background:var(--muted);padding:1px 5px;border-radius:4px">/healthz</code> 探活吗？
  </div>`;
function popover(d) {
  const p = st.chat.pop, m = qBy(st.chat.model); if (!p) return '';
  const box = (right, inner, w = 304) => `<div style="position:absolute;right:${right}px;bottom:124px;width:${w}px;background:var(--glass);border:1px solid var(--glass-border);border-radius:14px;box-shadow:0 16px 40px -12px rgb(0 0 0 / .6),0 2px 8px -2px rgb(0 0 0 / .4);padding:16px 16px 12px;pointer-events:auto">${inner}</div>`;
  const ln = (k, v) => `<div class="row" style="height:26px;justify-content:space-between;font-size:12.5px"><span class="dim">${k}</span><span class="num" style="color:var(--fg-2)">${v}</span></div>`;
  if (p === 'ctx') return box(212, `<div class="row" style="justify-content:space-between"><span class="lbl">上下文</span><span class="num dim2" style="font-size:12px">${(d.ctx / CTX_MAX * 100).toFixed(1)}%</span></div>
    <div class="num" style="font-size:22px;font-weight:500;letter-spacing:-.02em;margin-top:6px">${fmt(d.ctx)}<span class="dim2" style="font-size:12.5px;font-weight:400;letter-spacing:0"> / 1M</span></div>
    <div style="display:flex;height:4px;gap:2px;margin:14px 0 10px"><span style="flex:${d.last.cache};background:var(--s3);border-radius:2px"></span><span style="flex:${d.last.in};min-width:3px;background:var(--s1);border-radius:2px"></span><span style="flex:${CTX_MAX - d.ctx};background:var(--track);border-radius:2px"></span></div>
    <div class="row" style="height:26px;justify-content:space-between;font-size:12.5px"><span style="color:var(--fg-2)">${sw('var(--s3)')}已缓存</span><span class="num">${fmt(d.last.cache)}</span></div>
    <div class="row" style="height:26px;justify-content:space-between;font-size:12.5px"><span style="color:var(--fg-2)">${sw('var(--s1)')}上一步新增</span><span class="num">${fmt(d.last.in)}</span></div>
    <div style="margin:10px 0 4px">${spark(d.ctxs, 270, 32, 'var(--s1)', { area: 1 })}</div><div class="cap" style="margin-top:6px">本会话 ${d.main.length} 步的上下文走势</div>
    <div style="height:1px;background:var(--border);margin:10px 0 6px"></div>${ln('按当前速度还能聊', `约 ${Math.max(1, Math.round((CTX_MAX - d.ctx) / Math.max(1, d.ctx / d.main.length)))} 步`)}
    <div class="row rowh" ${A('insSess', CHAT_ROOT)} style="height:30px;font-size:12.5px;color:var(--fg-2);gap:6px;margin-top:2px">在 Buddy 里查看本会话${ic('chevron_right', 15)}</div>`);
  if (p === 'speed') return box(128, `<div class="lbl">生成速度</div><div class="num" style="font-size:22px;font-weight:500;letter-spacing:-.02em;margin-top:6px">44<span class="dim2" style="font-size:12.5px;font-weight:400;letter-spacing:0"> tok/s</span></div>
    <div style="margin:12px 0 8px">${spark([44, 40, 83, 55, 30, 97, 78, 32, 44], 230, 30, 'var(--s1)')}</div>${ln('首字延迟', '1.8 s')}${ln('本轮耗时', '模型 19s · 工具 5s')}<div class="cap" style="margin-top:6px">速度来自原生增强的实时采样，仅本次运行期间有效</div>`, 264);
  const alts = QM.filter(x => x.id !== m.id && x.f > .5 && (st.q.pins.has(x.id) || x.calls > 0)).sort((a, b) => b.f - a.f).slice(0, 3);
  return box(56, `<div class="row" style="gap:8px">${lg(m.id)}<span style="font-weight:500">${m.name}</span></div>
    <div class="row" style="gap:10px;margin:12px 0 4px"><span style="flex:1">${bar(m.f, m.f <= .1 ? 'var(--crit)' : m.f <= .25 ? 'var(--warn)' : 'var(--s1)')}</span><span style="font-size:12.5px;flex:none">${pc(m.f)}</span></div>
    ${ln('重置', `${m.reset} · ${m.cd}`)}${m.eta ? ln('按当前速率', `${m.eta} 用完`) : ''}
    ${m.f <= .25 && alts.length ? `<div style="height:1px;background:var(--border);margin:8px 0 4px"></div><div class="mh" style="font-size:11.5px;color:var(--fg-4);padding:6px 0 2px">额度更充足的模型</div>${alts.map(x => `<div class="row rowh" ${A('usemodel', x.id)} style="height:32px;gap:9px;font-size:12.5px">${lg(x.id)}<span class="el" style="flex:1">${x.name}</span>${qm(x.f, 40)}<span style="width:32px" class="r">${pc(x.f)}</span><span class="dim2">换用</span></div>`).join('')}` : ''}`, 348);
}
function vChat() {
  const d = chatData(), m = qBy(st.chat.model), [mn, mt] = m.name.split(' · ');
  const chip = (id, inner) => `<span class="ctl" ${A('pop', id)} style="gap:7px;padding:0 8px;color:var(--fg-2);${st.chat.pop === id ? 'background:var(--selected)' : ''}">${inner}</span>`;
  const extra = !st.native ? '' : (st.nCtx ? chip('ctx', `${ring(d.ctx / CTX_MAX, 15, 'var(--fg-2)')}<span class="num">${fmt(d.ctx)}</span>`) : '') + (st.nSpeed ? chip('speed', `${ic('speed', 16)}<span class="num">44 <span class="dim2">tok/s</span></span>`) : '') + (st.nQuota ? chip('quota', `${qm(m.f, 22)}<span class="num">${Math.round(m.f * 100)}%</span>`) : '');
  const composer = `<div style="position:relative"><div style="position:relative;margin:0 auto 18px;width:calc(100% - 64px);max-width:760px;border:1px solid var(--card-border);border-radius:20px;padding:14px 14px 10px 16px;background:var(--glass)">
    <div style="color:var(--fg-4);font-size:14px;height:22px">Ask anything, @ to mention</div>
    <div class="row" style="margin-top:14px;gap:4px;height:30px"><span class="ctl" style="padding:0 6px">${ic('add', 19)}</span><span class="ctl" style="color:var(--fg-2)">${lg(m.id)}${mn}<span class="dim2">${mt || ''}</span>${ic('keyboard_arrow_down', 16)}</span><span class="sp"></span>${extra}<span class="ctl" style="padding:0 6px">${ic('mic', 19)}</span><span style="width:30px;height:30px;border-radius:50%;background:var(--fg);display:grid;place-items:center;color:#0a0a0c">${ic('arrow_upward', 18)}</span></div></div>
    <div style="position:absolute;inset:0;width:calc(100% - 64px);max-width:760px;margin:0 auto;pointer-events:none">${popover(d)}</div></div>`;
  const sec = (t, x, b, act) => `<div ${act ? A(act[0], act[1]) : ''} class="${act ? 'auxs' : ''}" style="padding:18px 20px;border-bottom:1px solid var(--border)"><div class="row" style="justify-content:space-between;margin-bottom:12px"><span class="lbl">${t}</span><span class="num dim2" style="font-size:12px">${x}</span></div>${b}</div>`;
  const hit = pct(d.t.cache, d.t.cache + d.t.in), a = ACC[st.acc.cur];
  const watch = QM.filter(x => x.id === m.id || st.q.pins.has(x.id) || x.f <= .25).sort((x, y) => (y.id === m.id) - (x.id === m.id) || x.f - y.f).slice(0, 4);
  const aux = !st.chat.aux ? '' : `<div style="width:320px;flex:none;border-left:1px solid var(--border);display:flex;flex-direction:column">
    <div class="row" style="height:44px;padding:0 10px 0 20px;justify-content:space-between;border-bottom:1px solid var(--border);flex:none"><span style="font-weight:500">Buddy</span><span class="row dim"><span class="ctl" ${A('buddy')} ${tipA('打开完整页面')}>${ic('open_in_new')}</span><span class="ctl" ${A('aux')}>${ic('close')}</span></span></div>
    ${sec('上下文', (d.ctx / CTX_MAX * 100).toFixed(1) + '%', `<div class="num" style="font-size:22px;font-weight:500;letter-spacing:-.02em">${fmt(d.ctx)}<span class="dim2" style="font-size:12.5px;font-weight:400;letter-spacing:0"> / 1M</span></div><div style="margin-top:12px">${spark(d.ctxs, 280, 34, 'var(--s1)', { area: 1 })}</div><div class="lgd num" style="margin-top:10px"><span><i style="background:var(--s3)"></i>已缓存 ${fmt(d.last.cache)}</span><span><i style="background:var(--s1)"></i>新增 ${fmt(d.last.in)}</span></div>`)}
    ${sec('本会话', `${d.all.length} 次调用${d.kids ? ` · ${d.kids} 个子代理` : ''}`, `<div style="display:grid;grid-template-columns:repeat(3,1fr)">${[[fmt(d.t.in), '新增输入'], [fmt(d.t.out), '输出'], [Math.round(hit * 100) + '%', '缓存命中']].map(([v, k]) => `<div><div class="num" style="font-size:15px;font-weight:500">${v}</div><div class="dim" style="font-size:12px;margin-top:3px">${k}</div></div>`).join('')}</div><div class="row rowh" ${A('insSess', CHAT_ROOT)} style="height:28px;margin-top:10px;font-size:12.5px;color:var(--fg-2);gap:4px">查看逐步明细${ic('chevron_right', 15)}</div>`)}
    ${sec('额度', m.cd + ' 后重置', watch.map(x => `<div class="row rowh" ${A('qopen', x.id)} style="height:30px;gap:9px">${lg(x.id)}<span class="el" style="flex:1;font-size:12.5px;color:${x.id === m.id ? 'var(--fg)' : 'var(--fg-2)'}">${x.name}${x.id === m.id ? ' <span class="dim2">当前</span>' : ''}</span>${qm(x.f, 48)}<span class="r" style="width:32px;font-size:12.5px">${pc(x.f)}</span></div>`).join(''))}
    <div class="row rowh" ${A('tab', 'accounts')} style="margin:6px 12px;height:36px;justify-content:space-between;font-size:12.5px"><span class="dim">Prompt 积分</span><span class="num">${st.credits === 'abs' ? `${comma(a.pa)} <span class="dim2">/ ${comma(a.pb)}</span>` : (a.pa / a.pb * 100).toFixed(1) + '%'}</span></div>
  </div>`;
  return `<div class="win">${sidebar()}<div class="main"><div class="topbar"><div class="t" style="padding-left:4px">Neox UI Design Optimization <span class="dim" style="font-weight:400;font-size:12.5px">Neox</span></div><div class="row" style="gap:6px"><div class="tbtn" ${A('aux')} style="${st.chat.aux ? 'background:var(--selected);border-color:transparent' : ''}">${BLOGO}Buddy</div><div class="tbtn">Open IDE</div></div></div>
    <div class="pane" style="flex-direction:row"><div style="flex:1;min-width:0;display:flex;flex-direction:column"><div style="flex:1;padding:28px 0;display:flex;flex-direction:column;gap:20px;overflow:hidden;width:calc(100% - 64px);max-width:760px;margin:0 auto">${CHAT}</div>${composer}</div>${aux}</div></div></div>`;
}

/* ===== 设置：每个开关都真的生效 ===== */
function vSettings() {
  const tg = (k, on) => `<span ${A('toggle', k)} style="width:30px;height:18px;border-radius:9px;background:${on ? 'var(--primary)' : 'rgb(255 255 255 / .14)'};position:relative;flex:none;display:block"><span style="position:absolute;top:2px;${on ? 'right:2px' : 'left:2px'};width:14px;height:14px;border-radius:50%;background:#fff"></span></span>`;
  const ln = (t, d, c, ind, off) => `<div class="row" style="min-height:52px;padding:8px 0 8px ${ind ? 28 : 0}px;justify-content:space-between;gap:24px;border-bottom:1px solid var(--border);opacity:${off ? .4 : 1}"><div><div>${t}</div>${d ? `<div class="dim" style="font-size:12px;margin-top:3px">${d}</div>` : ''}</div>${c}</div>`;
  const hd = (t, d) => `<div style="margin:26px 0 6px"><div style="font-size:14px;font-weight:500">${t}</div>${d ? `<div class="dim" style="font-size:12px;margin-top:4px">${d}</div>` : ''}</div>`;
  const n = st.native;
  return shell(sub() + `<div class="body scroll" style="display:flex;gap:56px;padding-top:6px;overflow-y:auto">
    <div style="width:150px;flex:none;padding-top:22px">${['通用', '提醒', '原生增强', '数据'].map((s, i) => `<div class="row" style="height:30px;padding:0 10px;border-radius:7px;margin-bottom:2px;${i === 0 ? 'background:var(--selected)' : 'color:var(--fg-3)'}">${s}</div>`).join('')}</div>
    <div style="flex:1;max-width:680px;padding-bottom:24px">
      ${hd('通用')}
      ${ln('主题', '', seg([[0, '跟随 Antigravity'], [1, '深色'], [2, '浅色']], st.theme, 'theme'))}
      ${ln('积分显示', '概览、账号、辅助面板里同步生效', seg([['abs', '500 / 50,000'], ['pct', '1%']], st.credits, 'credits'))}
      ${hd('提醒')}
      ${ln('模型额度低于', '只对关注的模型和正在使用的模型发送系统通知', seg([[0, '10%'], [1, '20%'], [2, '30%']], st.alert, 'alert'))}
      ${ln('预计在重置前用完', '按近 3 小时速率预测', tg('predict', st.predict))}
      ${hd('原生增强', '通过本机调试接口把控件放进 Antigravity 的输入框。默认关闭。')}
      ${ln('启用原生增强', '需以调试模式重启 Antigravity；开启期间本机其他程序也能连接该接口', tg('native', n))}
      ${ln('上下文圆环', '', tg('nCtx', n && st.nCtx), 1, !n)}${ln('生成速度', '', tg('nSpeed', n && st.nSpeed), 1, !n)}${ln('当前模型额度', '额度偏低时会给出可换用的模型', tg('nQuota', n && st.nQuota), 1, !n)}
      <div class="row rowh" ${A('chat', CHAT_ROOT)} style="height:36px;gap:6px;color:var(--fg-2);font-size:12.5px;margin-top:4px">到对话里看效果${ic('chevron_right', 15)}</div>
      ${hd('数据')}
      <div class="cols" style="grid-template-columns:repeat(4,1fr);gap:32px;margin-top:14px">${[['已入库会话', SE.length], ['记录', comma(ROWS.length)], ['最早记录', fD(ROWS[0].t)], ['上次同步', '12 秒前']].map(([k, v]) => `<div><div class="lbl">${k}</div><div class="num" style="font-size:15px;font-weight:500;margin-top:6px">${v}</div></div>`).join('')}</div>
    </div>
  </div>`);
}

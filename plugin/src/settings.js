/* ===== 设置 ===== */
const SP = [['general', '通用'], ['native', '输入框控件'], ['data', '数据'], ['about', '关于']];
const nsw = (k, on, off) => `<span class="sw ${on ? 'on' : ''}" ${off ? '' : A('nat', k)}></span>`;
const gr = (t, d, c, cls = '') => `<div class="gr ${cls}"><div style="min-width:0"><div>${t}</div>${d ? `<div class="d">${d}</div>` : ''}</div><div style="flex:none">${c || ''}</div></div>`;
const grp = (title, desc, rows) => `<div style="margin-top:28px"><h3 style="font-size:15px">${title}</h3>${desc ? `<div class="dim" style="font-size:13px;margin-top:4px">${desc}</div>` : ''}<div class="grp" style="margin-top:12px">${rows}</div></div>`;
const getPath = k => k.split('.').reduce((o, p) => o[p], st);
function setPath(k, v) { const ps = k.split('.'), last = ps.pop(), o = ps.reduce((x, p) => x[p], st); o[last] = v === '!' ? !o[last] : v === 'true' ? true : v === 'false' ? false : isNaN(v) || v === '' ? v : Number(v); }
const segSet = (key, opts) => `<div class="seg">${opts.map(([v, l]) => `<span class="${String(getPath(key)) === String(v) ? 'on' : ''}" ${A('set', key + '=' + v)}>${l}</span>`).join('')}</div>`;
const dot = () => '';
// 主题缩略图：小窗口插画
const thumb = v => { const win = (b, p, l) => `<rect width="112" height="72" fill="${b}"/><rect x="22" y="8" width="84" height="58" rx="5" fill="${p}"/><path d="M30,52 C45,30 55,48 68,36 S85,44 100,40 L100,58 L30,58Z" fill="#5B9BFF" opacity=".8"/><rect x="30" y="16" width="26" height="5" rx="2.5" fill="${l}"/><rect x="6" y="10" width="11" height="3" rx="1.5" fill="${l}"/><rect x="6" y="17" width="11" height="3" rx="1.5" fill="${l}"/>`;
  const L = win('#F4F4F6', '#fff', 'rgb(0 0 0/.08)'), Dk = win('#111114', '#070708', 'rgb(255 255 255/.08)');
  return `<svg width="112" height="72" viewBox="0 0 112 72">${v === 0 ? `<clipPath id="th0"><rect width="56" height="72"/></clipPath><clipPath id="th1"><rect x="56" width="56" height="72"/></clipPath><g clip-path="url(#th0)">${L}</g><g clip-path="url(#th1)">${Dk}</g>` : v === 2 ? L : Dk}<rect x=".5" y=".5" width="111" height="71" rx="9" fill="none" style="stroke:${ink(.12)}"/></svg>`; };
const SPV = {
  general: () => ['通用', '显示方式与默认视图。设置保存在本机。',
    grp('外观', '', `<div class="gr" style="display:block"><div>主题</div><div class="d">跟随系统，或单独指定深色 / 浅色</div><div class="th">${[[0, '跟随系统'], [1, '深色'], [2, '浅色']].map(([v, l]) => `<div class="${st.theme === v ? 'on' : ''}" ${A('theme', v)}>${thumb(v)}${l}</div>`).join('')}</div></div>`)
    + grp('日报', '每天下班时总结今天做了什么', gr('下班提醒', '工作日到点提醒一次（Buddy 开着时）', `<span class="sw ${st.rep.on ? 'on' : ''}" ${A('set', 'rep.on=!')}></span>`) + gr('提醒时间', '', segSet('rep.at', [['17:30', '17:30'], ['18:00', '18:00'], ['18:30', '18:30'], ['19:00', '19:00'], ['20:00', '20:00']])))
    + grp('显示', '', gr('时区', '重置时间、图表和明细都按这个时区显示', segSet('tz', [['auto', '跟随系统 · ' + (TZ_AUTO >= 0 ? 'GMT+' : 'GMT') + TZ_AUTO / 3600], ['sh', '北京时间'], ['utc', 'UTC']]))
      + gr('数字格式', `当前示例：${fmt(5890123)}`, segSet('fullnum', [[false, '5.89M'], [true, '5,890,123']])))
    + grp('默认视图', '', gr('时间范围', '', segSet('range', [['6h', '近 6 小时'], ['24h', '近 24 小时'], ['7d', '近 7 天'], ['30d', '近 30 天'], ['mo', '本月']]))
      + gr('额度页默认显示', '模型很多时，只看用过的更清楚', segSet('q.f', [['used', '使用过'], ['pin', '已关注'], ['all', '全部']])))
    + grp('估算成本', '按 API 公开价把用量换算成美元，单位为每百万 token。订阅本身不按此计费。价格引自 agy-powertools 的价格表，未独立核实。', PRICE.map(p => gr(`<span class="row" style="gap:8px">${lg(p[0])}<span class="mono">${p[0]}</span></span>`, '', `<span class="num dim" style="font-size:13px">输入 $${p[1]} · 缓存 $${p[2]} · 输出 $${p[3]}</span>`)).join('') + gr('未标注或没有价格的模型', '按 gemini-4-neon 的价格估算'))],
  native: () => { const n = LIVE.native || {}, on = n.native, ok = n.status === 'on';
    return ['输入框控件', '把上下文、解码速度、当前模型额度放进 Antigravity 的输入框。官方插件接口做不到，需要通过 Antigravity 的调试接口注入，所以单独放在这里，默认关闭。',
    grp('状态', '', gr(`<span class="row" style="gap:8px">${ok ? '已连接，控件已显示' : on ? '已开启，等待连接' : '未开启'}</span>`, ok ? '切到任意对话，在输入框右下角可以看到' : on ? esc(n.detail || '正在连接…') : '', nsw('native', on))
      + (on && !ok ? gr('以调试模式重启 Antigravity', '会关闭并重新打开 Antigravity，正在生成的回复会中断', st.relAsk ? `<span class="row" style="gap:8px"><span class="btn q" ${A('set', 'relAsk=false')}>取消</span><span class="btn p" ${A('relaunch')}>确认重启</span></span>` : `<span class="btn" ${A('set', 'relAsk=true')}>重启…</span>`) : ''))
    + grp('显示哪些控件', '', gr('上下文', '圆环显示占用比例；点开看缓存、走势、压缩次数', nsw('ctx', on && n.ctx, !on), on ? '' : 'off') + gr('解码速度', '上一次调用的 tok/s；点开看首字延迟、prefill、本会话中位数', nsw('speed', on && n.speed, !on), on ? '' : 'off') + gr('当前模型额度', '剩余比例；点开看重置时间', nsw('quota', on && n.quota, !on), on ? '' : 'off'))
    + grp('需要知道', '', gr('只在调试模式下可用', '从程序坞正常打开的 Antigravity 没有调试接口，控件不会出现。需要用上面的按钮重启，或用命令 <span class="mono">open -a Antigravity --args --remote-debugging-port=0</span> 启动')
      + gr('调试接口对本机开放', '开启期间，本机其他程序也能连接并控制 Antigravity。只在你信任这台电脑上运行的软件时使用')
      + gr('Antigravity 更新后可能失效', '界面结构变了控件就挂不上，不影响 Buddy 其余功能') + gr('数据每次调用结束后更新', '速度和上下文来自 Antigravity 写下的记录，不是逐字实时'))]; },
  data: () => ['数据', 'Buddy 只读取本机数据，不上传任何内容。',
    grp('数据源', '', gr(`<span class="row" style="gap:8px">${dot(!LIVE.error)}Antigravity 本地接口</span>`, `账号、积分、模型额度 · <span class="mono">${esc(LIVE.ls || '未知')}</span>${LIVE.error ? ' · ' + esc(LIVE.error) : ''}`, `<span class="pill ${LIVE.error ? '' : 'ok'}">${LIVE.error ? '未连接' : '已连接'}</span>`)
      + gr(`<span class="row" style="gap:8px">${dot(ROWS.length)}会话记录</span>`, `<span class="mono">${esc(LIVE.paths?.brain || '')}</span> · ${SE.length} 个会话，${comma(ROWS.length)} 条调用`, `<span class="btn" ${A('copyText', LIVE.paths?.brain || '')}>${ic('content_copy')}复制路径</span>`))
    + grp('同步', '', gr('自动同步', '每 30 秒读取一次', `<span class="btn" ${A('sync')}>${ic('sync')}立即同步</span>`) + gr('上次同步', `${fD(Math.floor(LIVE.at / 1000))} ${fT(Math.floor(LIVE.at / 1000))}`))
    + grp('存储', '', gr('本地存档', `Antigravity 只保留近期会话，Buddy 把解析过的记录另存一份，会话被清掉后统计仍在。<br><span class="mono">${esc(LIVE.paths?.store || '')}</span>`, `<span class="btn" ${A('copyText', LIVE.paths?.store || '')}>${ic('content_copy')}复制路径</span>`)
      + gr('导出全部记录', `${comma(ROWS.length)} 条，CSV 格式`, `<span class="btn" ${A('exportAll')}>${ic('ios_share')}导出</span>`))],
  about: () => ['关于', '',
    grp('版本', '', gr('Buddy', '0.3.0'))
    + grp('它是怎么工作的', '', gr('额度与账号', '读取 Antigravity 自带的本地接口，不保存密码或令牌') + gr('用量统计', '读取 Antigravity 自己写下的会话记录，不经过代理') + gr('模型与速度', '每次调用的确切模型、首字延迟、流式耗时来自 Antigravity 的调用元数据；会话被清掉后拿不到的记录标为「未标注」'))
    + grp('还没做的', '', gr('多账号切换') + gr('按账号固定出口 IP') + gr('额度低时的系统通知与耗尽预测', '需要先积累一段时间的额度记录'))],
};
function vSettings() {
  const [title, desc, body] = SPV[st.sp]();
  return shell(sub() + `<div class="body" style="display:flex;padding:0;overflow:hidden">
    <div style="width:188px;flex:none;padding:24px 12px 24px 20px;border-right:1px solid var(--border)">${SP.map(([k, l]) => `<div class="nv ${st.sp === k ? 'on' : ''}" ${A('set', 'sp=' + k)} style="margin-bottom:2px">${l}</div>`).join('')}</div>
    <div class="scroll" id="spscroll" style="flex:1;overflow-y:auto;padding:28px 0 48px"><div style="max-width:1100px;padding:0 36px">
      <h1 style="font-size:22px">${title}</h1>${desc ? `<div class="dim" style="margin-top:6px;line-height:1.6">${desc}</div>` : ''}${body}
    </div></div>
  </div>`);
}
const SETTINGS_ACT = {
  set(v) { const i = v.indexOf('='), k = v.slice(0, i); setPath(k, v.slice(i + 1)); if (k === 'tz') TZ = TZ_OPT[st.tz]; if (k === 'sp') requestAnimationFrame(() => { const e = document.getElementById('spscroll'); if (e) e.scrollTop = 0; }); },
  copyText(v) { navigator.clipboard?.writeText(v).catch(() => {}); toast('已复制'); },
  async nat(k) { const n = LIVE.native || {}; try { const r = await fetch('/api/native', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [k]: !n[k] }) }); LIVE.native = await r.json(); } catch (e) { toast('设置失败：' + e.message); } render(); setTimeout(() => refresh(), 2500); },
  async relaunch() { st.relAsk = false; try { await fetch('/api/relaunch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); toast('正在重启 Antigravity…'); } catch (e) { toast('重启失败：' + e.message); } },
  exportAll() { downloadCsv(ROWS, 'buddy-all.csv'); },
};

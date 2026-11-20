/* ===== 设置：五个分页，版式照 Antigravity 自己的设置页（标题 + 说明 + 分组容器） ===== */
const SP = [['general', '通用'], ['alerts', '提醒'], ['native', '原生增强'], ['data', '数据'], ['about', '关于']];
const sw_ = (key, on) => `<span class="sw ${on ? 'on' : ''}" ${A('set', key + '=!')}></span>`;
const gr = (t, d, c, cls = '') => `<div class="gr ${cls}"><div style="min-width:0"><div>${t}</div>${d ? `<div class="d">${d}</div>` : ''}</div><div style="flex:none">${c || ''}</div></div>`;
const grp = (title, desc, rows) => `<div style="margin-top:28px"><h3 style="font-size:15px">${title}</h3>${desc ? `<div class="dim" style="font-size:13px;margin-top:4px">${desc}</div>` : ''}<div class="grp" style="margin-top:12px">${rows}</div></div>`;
const segSet = (key, opts) => `<div class="seg">${opts.map(([v, l]) => `<span class="${String(getPath(key)) === String(v) ? 'on' : ''}" ${A('set', key + '=' + v)}>${l}</span>`).join('')}</div>`;
const getPath = k => k.split('.').reduce((o, p) => o[p], st);
function setPath(k, v) { const ps = k.split('.'), last = ps.pop(), o = ps.reduce((x, p) => x[p], st); o[last] = v === '!' ? !o[last] : v === 'true' ? true : v === 'false' ? false : isNaN(v) || v === '' ? v : Number(v); }

const SPV = {
  general: () => [ '通用', '显示方式与默认视图。',
    grp('显示', '', gr('时区', '重置时间、图表和明细都按这个时区显示', segSet('tz', [['auto', '跟随系统 · ' + (TZ_AUTO >= 0 ? 'GMT+' : 'GMT') + TZ_AUTO / 3600], ['sh', '北京时间'], ['utc', 'UTC']]))
      + gr('主题', '', segSet('theme', [[0, '跟随 Antigravity'], [1, '深色'], [2, '浅色']]))
      + gr('积分显示', '概览、账号、辅助面板里同步生效', segSet('credits', [['abs', '500 / 50,000'], ['pct', '1%']]))
      + gr('数字格式', `当前示例：${fmt(5890123)}`, segSet('fullnum', [[false, '5.89M'], [true, '5,890,123']])))
    + grp('默认视图', '', gr('时间范围', '打开 Buddy 时概览、用量、明细使用的范围', segSet('range', [['24h', '近 24 小时'], ['7d', '近 7 天'], ['all', '全部']]))
      + gr('额度页默认显示', '模型很多时，只看用过的更清楚', segSet('q.f', [['used', '使用过'], ['pin', '已关注'], ['all', '全部']])))
    + grp('估算成本', '按 API 公开价把用量换算成美元，单位为每百万 token。订阅本身不按此计费。', PRICE.map(p => gr(`<span class="row" style="gap:8px">${lg(p[0])}<span class="mono">${p[0]}</span></span>`, '', `<span class="num dim" style="font-size:13px">输入 $${p[1]} · 缓存 $${p[2]} · 输出 $${p[3]}</span>`)).join('') + gr('未标注模型的记录', '按 gemini-4-neon 的价格估算', `<span class="btn" ${A('toast', '原型：将打开价格表编辑')}>编辑价格</span>`))],

  alerts: () => { const a = st.al, m = qBy('claude-opus-5-5-high'); return ['提醒', '额度快用完或用量异常时通知你。',
    grp('额度', '', gr('模型额度低于', '', segSet('alert', [[0, '10%'], [1, '20%'], [2, '30%']]))
      + gr('关注的模型', `当前关注 ${st.q.pins.size} 个`, sw_('al.pin', a.pin), 'sub2') + gr('正在使用的模型', '', sw_('al.cur', a.cur), 'sub2')
      + gr('预计在重置前用完', '按近 3 小时的消耗速率预测', sw_('predict', st.predict))
      + gr('额度重置时', '重置后提醒可以继续使用', sw_('al.reset', a.reset)))
    + grp('用量', '', gr('大输入未命中缓存', '单次新增输入超过 100K 且没有命中缓存', sw_('al.big', a.big))
      + gr('缓存命中率骤降', '低于近 24 小时平均 30 个百分点', sw_('al.hit', a.hit)))
    + grp('通知方式', '', gr('系统通知', '', sw_('al.sys', a.sys)) + gr('侧栏 Buddy 图标上的提示点', '', sw_('al.dot', a.dot))
      + gr('预览', '按当前设置，你会收到这样的通知', `<span class="btn" ${A('toast', '已发送一条测试通知')}>发送测试通知</span>`))
    + `<div style="margin-top:14px;display:flex;gap:12px;align-items:flex-start;padding:12px 14px;border-radius:14px;background:var(--glass);border:1px solid var(--glass-border);max-width:380px;opacity:${a.sys ? 1 : .35}">${BLOGO.replace('width:18px;height:18px', '')}<div style="min-width:0"><div class="row" style="justify-content:space-between;gap:12px"><span style="font-weight:var(--w-medium)">Buddy</span><span class="dim2" style="font-size:12px">现在</span></div><div style="color:var(--fg-2);font-size:13px;margin-top:2px">${m.name} 剩余 ${Math.round(m.f * 100)}%${st.predict ? `，预计 ${m.eta} 用完` : ''}</div></div></div>`]; },

  native: () => { const n = st.native, m = qBy(st.chat.model), d = chatData();
    const prev = `<div style="border:1px solid var(--card-border);border-radius:16px;padding:10px 10px 10px 14px;background:var(--glass);display:flex;align-items:center;gap:4px;height:48px"><span class="ctl" style="color:var(--fg-2);padding-left:0">${lg(m.id)}${m.name.split(' · ')[0]}<span class="dim2">${m.name.split(' · ')[1] || ''}</span></span><span class="sp"></span>
      ${n && st.nCtx ? `<span class="ctl" style="gap:7px">${ring(d.ctx / CTX_MAX, 15, 'var(--fg-2)')}<span class="num">${fmt(d.ctx)}</span></span>` : ''}${n && st.nSpeed ? `<span class="ctl" style="gap:7px">${ic('speed', 16)}<span class="num">44 <span class="dim2">tok/s</span></span></span>` : ''}${n && st.nQuota ? `<span class="ctl" style="gap:7px">${qm(m.f, 22)}<span class="num">${Math.round(m.f * 100)}%</span></span>` : ''}
      ${!n || !(st.nCtx || st.nSpeed || st.nQuota) ? '<span class="dim2" style="font-size:13px;padding-right:8px">未显示任何控件</span>' : ''}<span style="width:28px;height:28px;border-radius:50%;background:var(--primary);display:grid;place-items:center;color:#fff">${ic('arrow_forward', 17)}</span></div>`;
    return ['原生增强', '把上下文、速度、额度直接放进 Antigravity 的输入框。官方插件接口做不到这一点，所以单独放在这里，默认关闭。',
    grp('状态', '', gr(`<span class="row" style="gap:8px"><i style="width:7px;height:7px;border-radius:50%;background:${n ? 'var(--good)' : 'var(--fg-4)'}"></i>${n ? '已连接' : '未启用'}</span>`, n ? '调试接口 127.0.0.1（随机端口）· 已适配 Antigravity 2.33.0' : '启用后需要以调试模式重启一次 Antigravity', n ? `<span class="btn" ${A('set', 'native=false')}>停用</span>` : `<span class="btn p" ${A('nativeOn')}>启用并重启</span>`))
    + grp('输入框控件', '下方为实时预览，开关会立即反映。', gr('上下文', '圆环显示占用比例，点开看缓存与走势', sw_('nCtx', n && st.nCtx), n ? '' : 'off') + gr('生成速度', '当前 tok/s、首字延迟、模型与工具耗时', sw_('nSpeed', n && st.nSpeed), n ? '' : 'off') + gr('当前模型额度', '额度偏低时列出可换用的模型', sw_('nQuota', n && st.nQuota), n ? '' : 'off'))
    + `<div style="margin-top:12px">${prev}</div><div class="row" style="margin-top:10px"><span class="lnk" ${A('chat', CHAT_ROOT)} style="font-size:13px">到对话里看实际效果</span></div>`
    + grp('启用前需要知道', '', gr('需要重启 Antigravity', '以调试模式启动，Buddy 会替你改好启动方式，停用时恢复') + gr('调试接口对本机开放', '开启期间，本机其他程序也能连接并控制 Antigravity。只在你信任这台电脑上运行的软件时启用') + gr('Antigravity 更新后可能暂时失效', '界面结构变了控件就挂不上。Buddy 检测到不兼容会自动停用并提示，不影响其余功能'))]; },

  data: () => ['数据', 'Buddy 只读取本机数据，不上传任何内容。',
    grp('数据源', '', gr(`<span class="row" style="gap:8px"><i style="width:7px;height:7px;border-radius:50%;background:var(--good)"></i>Antigravity 本地接口</span>`, '账号、积分、模型额度 · <span class="mono">127.0.0.1:61498</span>', `<span class="dim" style="font-size:13px">已连接</span>`)
      + gr(`<span class="row" style="gap:8px"><i style="width:7px;height:7px;border-radius:50%;background:var(--good)"></i>会话记录</span>`, `<span class="mono">~/.gemini/antigravity/brain</span> · ${SE.length} 个会话，${comma(ROWS.length)} 条调用`, `<span class="btn" ${A('copyText', '~/.gemini/antigravity/brain')}>${ic('content_copy')}复制路径</span>`))
    + grp('同步', '', gr('同步间隔', 'Antigravity 只保留近期会话，Buddy 会及时存下来避免丢失', segSet('syncInt', [[0, '10 秒'], [1, '30 秒'], [2, '1 分钟']])) + gr('上次同步', `${fT(NOW)} · 没有新记录`, `<span class="btn" ${A('sync')}>${ic('sync')}立即同步</span>`))
    + grp('存储', '', gr('保留期限', `最早一条记录在 ${fD(ROWS[0].t)}`, segSet('keep', [[0, '30 天'], [1, '90 天'], [2, '永久']]))
      + gr('导出全部记录', `${comma(ROWS.length)} 条，CSV 格式`, `<span class="btn" ${A('toast', '原型：将导出全部 ' + comma(ROWS.length) + ' 条记录')}>${ic('ios_share')}导出</span>`)
      + gr('清空本地统计', '只删除 Buddy 自己存的数据，不影响 Antigravity 的会话', st.clearAsk ? `<span class="row" style="gap:8px"><span class="btn q" ${A('set', 'clearAsk=false')}>取消</span><span class="btn" style="background:rgb(208 59 59 / .18);color:#f08a8a" ${A('clearDone')}>确认清空</span></span>` : `<span class="btn" ${A('set', 'clearAsk=true')}>清空…</span>`))],

  about: () => ['关于', '',
    grp('版本', '', gr('Buddy', '0.1.0 · 原型', `<span class="btn" ${A('toast', '已是最新版本')}>检查更新</span>`) + gr('Antigravity', '2.33.0 · 稳定版', `<span class="pill blue">已适配</span>`))
    + grp('它是怎么工作的', '', gr('额度与账号', '读取 Antigravity 自带的本地接口，不保存密码或令牌') + gr('用量统计', '读取 Antigravity 自己写下的会话记录，不经过代理，不会漏记') + gr('输入框控件', '需要单独启用「原生增强」', `<span class="lnk" ${A('set', 'sp=native')} style="font-size:13px">去设置</span>`))],
};
function vSettings() {
  const [title, desc, body] = SPV[st.sp]();
  return shell(sub() + `<div class="body" style="display:flex;padding:0">
    <div style="width:208px;flex:none;padding:24px 12px 24px 24px;border-right:1px solid var(--border)">${SP.map(([k, l]) => `<div class="nv ${st.sp === k ? 'on' : ''}" ${A('set', 'sp=' + k)} style="margin-bottom:2px">${l}</div>`).join('')}</div>
    <div class="scroll" id="spscroll" style="flex:1;overflow-y:auto;padding:28px 0 48px"><div style="max-width:680px;margin:0 auto;padding:0 32px">
      <h1 style="font-size:22px">${title}</h1>${desc ? `<div class="dim" style="margin-top:6px;line-height:1.6">${desc}</div>` : ''}${body}
    </div></div>
  </div>`);
}
const SETTINGS_ACT = {
  set(v) { const i = v.indexOf('='), k = v.slice(0, i), val = v.slice(i + 1); setPath(k, val); if (k === 'tz') TZ = TZ_OPT[st.tz]; if (k === 'native' && !st.native) st.chat.pop = null; if (k === 'theme' && st.theme === 2) toast('浅色主题待设计，原型暂只提供深色'); if (k === 'sp') requestAnimationFrame(() => { const e = document.getElementById('spscroll'); if (e) e.scrollTop = 0; }); },
  nativeOn() { st.native = true; toast('原型：将以调试模式重启 Antigravity'); },
  clearDone() { st.clearAsk = false; toast('原型：已清空 Buddy 的本地统计'); },
  copyText(v) { navigator.clipboard?.writeText(v).catch(() => {}); toast('已复制'); },
};

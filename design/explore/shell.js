// 概览探索稿共用：窗口外壳 + 一份固定的演示数据（取自 11-20 11:00 的真实面板读数）
const ic = (n, s, st = '') => `<span class="ms"${s || st ? ` style="${s ? `font-size:${s}px;` : ''}${st}"` : ''}>${n}</span>`;
const LG = (n, s = 15) => `<img src="../assets/${n}.svg" style="width:${s}px;height:${s}px;display:block;flex:none">`;
const BLOGO = `<span class="blogo"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 8V5.5M5 8V2M8 8V4" stroke="#7BA7F2" stroke-width="1.5" stroke-linecap="round"/></svg></span>`;

const D = {
  now: '11:00', tz: 'GMT-5',
  pools: [
    { k: 'g5', name: '5 小时 · Gemini', short: 'Gemini', logos: ['gemini'], left: .81, usd: 20.8, cap: 25.8, used: 4.94, at: '12:00', cd: '1h 00m', win: .8, models: 4 },
    { k: 'c5', name: '5 小时 · Claude / GPT', short: 'Claude', logos: ['claude', 'openai'], left: 1, at: '15:58', cd: '4h 57m', win: .01, models: 7 },
    { k: 'wk', name: '每周 · Gemini', short: '每周', logos: ['gemini'], left: 1, at: '周五 10:58', cd: '6d 23h', win: .002, models: 4 },
  ],
  real: 5.16, cost: 35.8, inp: 4.56, out: .595, calls: 411, hit: .951, reuse: 89.01,
  // 昨天 12:00 → 今天 11:00，每小时 [新增输入 K, 输出 K, 缓存命中率]
  hours: [[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[540,70,.97],[900,125,.97],[720,65,.96],[640,28,.97],[40,12,.95],[0,0],[180,150,.9],[60,15,.92],[0,0],[0,0],[1000,20,.62],[120,20,.58],[0,0],[0,0],[0,0],[160,40,.61],[200,50,.6]],
  hourLabel: i => String((12 + i) % 24).padStart(2, '0'),
  sessions: [
    { t: 'Casual Greeting', v: 3.00, n: 288, span: [7, 11] },
    { t: 'Server Deployment And File Transfer', v: 1.02, n: 61, span: [17, 19] },
    { t: 'Neox UI Design Optimization', v: .472, n: 34, kids: 4, span: [13, 15] },
    { t: 'Future Trends And Personal Agent Career Breakthrough', v: .414, n: 18, span: [22, 24] },
    { t: '国考申论实时批改', v: .251, n: 10, span: [10, 11] },
  ],
  models: [
    { n: 'Gemini 4 Neon · High', l: 'gemini', f: .81, cd: '1h 00m' },
    { n: 'Gemini 4 Neon · XHigh', l: 'gemini', f: .81, cd: '1h 00m' },
    { n: 'Claude Opus 5.5 · High', l: 'claude', f: 1, cd: '4h 57m' },
    { n: 'Gemini 3.5 Flash Lite', l: 'gemini', f: .81, cd: '1h 00m' },
  ],
  modelsTotal: 29,
  ins: [
    { i: 'forum', h: '「Casual Greeting」占了 58% 的真实消耗', d: '288 次调用，3.00M tokens' },
    { i: 'cached', h: '4 次调用没有命中缓存，且单次输入超过 100K', d: '共 1.10M 新增输入，是这段时间最贵的调用' },
    { i: 'trending_down', h: '近 6 小时缓存命中率 60%，低于区间平均的 95%', d: '通常是新开会话或上下文被压缩' },
  ],
};
const fmtK = k => k >= 1000 ? (k / 1000).toFixed(2).replace(/0$/, '') + 'M' : k + 'K';

function sidebar() {
  const cv = (t, m) => `<div class="cv"><span>${t}</span>${m === '•' ? '<i class="dot"></i>' : `<em>${m}</em>`}</div>`;
  return `<aside class="side">
    <div class="tl"><i></i><i></i><i></i><div class="ic">${ic('side_navigation')}${ic('arrow_back')}<span style="opacity:.45">${ic('arrow_forward')}</span>${ic('search')}</div></div>
    <div class="newc">${ic('add')} New Conversation</div>
    <div class="nv">${ic('schedule')} Automations</div><div class="nv">${ic('business_center')} Customizations</div>
    <div class="nh">Extensions ${ic('filter_list')}</div>
    <div class="nv on">${BLOGO} Buddy</div>
    <div class="nh">Projects <span style="display:flex;gap:10px">${ic('filter_list')}${ic('create_new_folder')}</span></div>
    <div class="pj">${ic('folder_open')} PlanMD</div>${cv('国考申论实时批改', '2h')}
    <div class="pj">${ic('folder_open')} Neox</div>${cv('Future Trends And Personal Agent', '3h')}${cv('Server Deployment And File Transfer', '3h')}${cv('Neox UI Design Optimization', '8h')}${cv('Casual Greeting', '12h')}${cv('Neox Edu Legal Deep Research', '•')}
    <div class="pj">${ic('folder_open')} KYDev</div>${cv('OA审批队长选择限制排查', '3d')}${cv('工程类型识别与解析', '3d')}
    <div class="foot nv">${ic('settings')} Settings</div>
  </aside>`;
}
function sub(right = '') {
  return `<div class="sub"><nav class="tabs">${['概览', '额度', '用量', '明细', '账号', '设置'].map((t, i) => `<a class="${i ? '' : 'on'}">${t}</a>`).join('')}</nav>
  <div class="sub-r">${right}${right ? '<span class="vsep"></span>' : ''}<span class="sync"><i></i>${D.now}</span><span class="ctl"><span class="who">M</span>lmkbnb1${ic('unfold_more')}</span></div></div>`;
}
const rangeCtl = `<span class="ctl b">${ic('calendar_today')}近 24 小时${ic('expand_more')}</span>`;
function mount(inner, right = rangeCtl) {
  document.body.classList.add('single');
  document.getElementById('app').innerHTML = `<div class="win">${sidebar()}<div class="main"><div class="topbar"><div class="t"><span class="dim">Extensions</span><span class="dim2">/</span>Buddy</div><div class="row" style="gap:10px;color:var(--fg-3)">${ic('more_horiz')}<div class="tbtn">Open IDE</div></div></div><div class="pane">${sub(right)}<div class="body">${inner}</div></div></div></div>`;
}

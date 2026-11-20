/* ===== 外壳：插件页面只有内容区，侧栏与顶栏由 Antigravity 提供 ===== */
const credit = (a, b) => a == null || !b ? '—' : st.credits === 'abs' ? `${comma(a)}<small>/ ${comma(b)}</small>` : `${(a / b * 100).toFixed(a / b < .01 ? 2 : 1)}<small>%</small>`;
const TABS = [['overview', '概览'], ['quota', '额度'], ['tokens', '用量'], ['ledger', '明细'], ['accounts', '账号'], ['settings', '设置']];
function sub(right = '') {
  const a = ACC[0], bad = LIVE.error;
  return `<div class="sub"><nav class="tabs">${TABS.map(([k, v]) => `<a class="${k === st.tab ? 'on' : ''}" ${A('tab', k)}>${v}</a>`).join('')}<i class="ind"></i></nav>
  <div class="sub-r">${right}${right ? '<span class="vsep"></span>' : ''}<span class="sync" ${A('sync')} ${tipA(bad ? '读不到 Antigravity 本地接口：' + esc(bad) : '点击立即同步')} style="${bad ? 'color:var(--warn)' : ''}">${ic(bad ? 'warning' : 'sync', 14)}${fT(Math.floor(LIVE.at / 1000)).slice(0, 5)}</span>
  <span class="ctl" ${A('tab', 'accounts')}><span class="who" style="background:${a.c}">${a.l}</span>${a.e.split('@')[0]}</span></div></div>`;
}
const shell = inner => `<div class="pane">${inner}</div>`;

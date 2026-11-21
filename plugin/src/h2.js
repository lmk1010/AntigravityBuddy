/* ===== H2 视觉层：图标页签、主题、12 列网格、插画化图形件 ===== */
const ink = a => `rgb(var(--ink) / ${a})`;
const GAP = 24, COLW = () => (CW() - 11 * GAP) / 12, SPANW = k => Math.floor(k * COLW() + (k - 1) * GAP);
const TI = {
  overview: '<path d="M1.75 12.25h12.5"/><path d="M4.25 12.25a3.75 3.75 0 0 1 7.5 0"/><path d="M8 3v1.6M3.4 5.1l1.1 1.1M12.6 5.1l-1.1 1.1"/>',
  report: '<rect x="2" y="2.75" width="12" height="11.5" rx="2.5"/><path d="M2 6.25h12M5.5 1.5v2.5M10.5 1.5v2.5M5.75 10.1l1.5 1.5 3-3"/>',
  quota: '<rect x="1.75" y="4.75" width="11" height="6.5" rx="3.25"/><path d="M14.25 7v2"/><path d="M4.6 8h3.4" stroke-width="2.4"/>',
  tokens: '<path d="M1.75 13.25h12.5"/><path d="M4 10.5V8.25M8 10.5V3.5M12 10.5V6"/>',
  ledger: '<path d="M6 4h8M6 8h8M6 12h5.5"/><circle cx="2.75" cy="4" r=".9" fill="currentColor" stroke="none"/><circle cx="2.75" cy="8" r=".9" fill="currentColor" stroke="none"/><circle cx="2.75" cy="12" r=".9" fill="currentColor" stroke="none"/>',
  accounts: '<circle cx="6" cy="5.5" r="2.5"/><path d="M1.75 13.25c.6-2.3 2.3-3.5 4.25-3.5s3.65 1.2 4.25 3.5"/><path d="M10.25 3.2a2.5 2.5 0 0 1 0 4.6M11.75 9.9c1.2.55 2 1.6 2.5 3.35"/>',
  settings: '<path d="M1.75 5h7M12.25 5h2M1.75 11h2M7.25 11h7"/><circle cx="10.5" cy="5" r="1.75"/><circle cx="5.5" cy="11" r="1.75"/>',
  line: '<path d="M1.75 12l4-4.5 3 2.5 5.5-6.25"/>', bar: '<path d="M3 13.25V9M8 13.25V3.5M13 13.25V6.5"/>',
  area: '<path d="M1.75 12.5l4-5 3 2.5 5.5-6v10.25H1.75z" fill="currentColor" fill-opacity=".25"/>',
  copy: '<rect x="5" y="5" width="9" height="9" rx="2"/><path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5"/>',
};
const icon = (k, s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="display:block;flex:none">${TI[k]}</svg>`;
const ibg = (items, cur, act) => `<span class="ibg">${items.map(([v, k, t]) => `<span class="ib2 ${v === cur ? 'on' : ''}" ${A(act, v)} ${tipA(t)}>${icon(k, 15)}</span>`).join('')}</span>`;
// 覆盖 shell.js 的页签：图标 + 文字
TABS.splice(0, TABS.length, ['overview', '概览'], ['report', '日报'], ['quota', '额度'], ['tokens', '用量'], ['ledger', '明细'], ['accounts', '账号'], ['settings', '设置']);
sub = function (right = '') {
  const a = ACC[0], bad = LIVE.error;
  return `<div class="sub"><nav class="tabs tabs2">${TABS.map(([k, v]) => `<a class="${k === st.tab ? 'on' : ''}" ${A('tab', k)}>${icon(k)}${v}</a>`).join('')}<i class="ind"></i></nav>
  <div class="sub-r">${right}${right ? '<span class="vsep"></span>' : ''}<span class="sync" ${A('sync')} ${tipA(bad ? '读不到 Antigravity 本地接口：' + esc(bad) : '点击立即同步')} style="${bad ? 'color:var(--warn)' : ''}">${ic(bad ? 'warning' : 'sync', 14)}${fT((Math.floor(LIVE.at / 1000) + SHIFT)).slice(0, 5)}</span>
  <span class="ctl" ${A('tab', 'accounts')}><span class="who" style="background:${a.c}">${a.l}</span>${a.e.split('@')[0]}</span></div></div>`;
};
// 主题：0 跟随系统，1 深色，2 浅色
const isLight = () => st.theme === 2 || (st.theme === 0 && matchMedia('(prefers-color-scheme: light)').matches);
const applyTheme = () => document.body.classList.toggle('light', isLight());
matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', () => { applyTheme(); render(); });

const G3 = { gemini: ['#4C8DF6', '#8E7CF6', '#C76BD9'], claude: ['#D97757', '#E8955E', '#F2B35B'], week: ['#4C8DF6', '#4FB6E6', '#4FC3D9'], cyan: ['#3FA7C9', '#4FC3D9', '#7FD6E3'] };
const PAL = ['#5B9BFF', '#9D8CFF', '#4FC3D9', '#F2B35B', '#F27A9B', '#7FD6A0'];
const grayG = () => isLight() ? ['#D5D6DC', '#DCDDE2', '#E3E4E8'] : ['#3A3B42', '#43444B', '#4C4D54'];
const winG = w => w.kind === '每周' ? G3.week : w.provs.has('gemini') ? G3.gemini : G3.claude;
const tiles = logos => `<span class="tile">${logos.map(l => `<img src="${LOGO[l]}" style="width:22px;height:22px;display:block">`).join('')}</span>`;
const winLogos = w => [...w.provs].sort((a, b) => a === 'claude' ? -1 : 1);
let _cid = 0;
// 渐变胶囊：f = 填充比例；win = 窗口时间（小三角）
function capsule(f, g, W, H = 26, win) {
  const id = 'cp' + (++_cid), fw = f <= 0 ? 0 : Math.max(H, W * Math.min(1, f));
  let ticks = ''; if (H >= 16 && f < 1) for (let i = 1; i < 20; i++) { const x = i * W / 20; if (x < fw - 6) ticks += `<line x1="${x}" x2="${x}" y1="${H * .25}" y2="${H * .75}" stroke="#fff" stroke-opacity=".28"/>`; }
  return `<svg width="${W}" height="${H + (win != null ? 12 : 0)}" style="display:block;overflow:visible"><defs><linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="${g[0]}"/><stop offset=".55" stop-color="${g[1]}"/><stop offset="1" stop-color="${g[2]}"/></linearGradient>
    <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
    <rect width="${W}" height="${H}" rx="${H / 2}" style="fill:${ink(.06)}"/>
    ${fw ? `<rect width="${fw}" height="${H}" rx="${H / 2}" fill="url(#${id})"/><rect x="2" y="2" width="${Math.max(0, fw - 4)}" height="${Math.max(0, H / 2 - 2)}" rx="${Math.max(0, H / 2 - 2)}" fill="url(#${id}s)"/>` : ''}
    ${ticks}${win != null ? `<path d="M${Math.max(4, W * win)},${H + 4} l4,6 h-8z" style="fill:var(--fg-3)"/>` : ''}</svg>`;
}
const curve = pts => { if (!pts.length) return ''; let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`; for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], m = ((x0 + x1) / 2).toFixed(1); d += `C${m},${y0.toFixed(1)} ${m},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`; } return d; };
const smooth = (v, k = 1) => v.map((_, i) => { let s = 0, w = 0; const n = Math.ceil(k * 2); for (let j = -n; j <= n; j++) { const x = v[i + j]; if (x == null) continue; const g = Math.exp(-(j * j) / (2 * k * k)); s += x * g; w += g; } return s / w; });
const aura = () => `<div class="aura">${isLight() ? '<i style="left:-120px;top:-180px;width:520px;height:340px;background:#CFE2FF;opacity:.7"></i><i style="right:-80px;top:-140px;width:420px;height:280px;background:#FFE2C4;opacity:.7"></i>' : '<i style="left:-140px;top:-220px;width:560px;height:340px;background:#2F5FB8;opacity:.16"></i><i style="right:-120px;top:-200px;width:460px;height:300px;background:#F2B35B;opacity:.08"></i>'}</div>`;
const pctS = f => Math.round(f * 100) + '%';
const unit = s => String(s).replace(/([KMB])$/, '<small>$1</small>');
// 一个额度池的展示数据：大数字、副标题、脚注
function poolView(k) {
  const w = WINS[k], x = winUse(k), used = x.all > 0;
  return { w, x, k, big: x.ok ? fUSD(x.leftCost) : `${Math.round(x.f * 100)}<small>%</small>`, bigLbl: x.ok ? '剩余' : used ? '剩余比例' : '未使用',
    foot: x.ok ? [`已用 <b>${fUSD(x.cost)}</b> · 剩 <b>${fUSD(x.leftCost)}</b>`, `共约 ${fUSD(x.capCost)}`] : used ? [`已用 <b>${fUSD(x.cost)}</b>`, '用得太少，暂无法估算总额'] : [`${w.n} 个模型 · 未使用`, '用了才开始计时'],
    tip: `<b>${w.kind} · ${w.who}</b><br>${x.ok ? `已用 ${fUSD(x.cost)} · 剩约 ${fUSD(x.leftCost)} · 共约 ${fUSD(x.capCost)}<br>` : used ? `已用 ${fUSD(x.cost)}<br>` : '未使用<br>'}剩 ${pctS(x.f)} · ${winAt(k)} 重置（${winCd(k)}）<br><span class="dim">总额按「本窗口已用金额 ÷ 已用比例」推算</span>` };
}
const pools3 = () => WINS.map((w, k) => k).sort((a, b) => (WINS[a].kind === '每周') - (WINS[b].kind === '每周') || winUse(a).f - winUse(b).f).slice(0, 3);
function poolRow(capH = 26) {
  const ks = pools3(), span = ks.length >= 3 ? 4 : ks.length === 2 ? 6 : 12, W = SPANW(span);
  if (!ks.length) return `<section class="rw"><div class="md" style="grid-column:1/-1"><div class="cap">读不到模型额度</div></div></section>`;
  return `<section class="rw">${ks.map(k => { const v = poolView(k); return `<div class="md" style="grid-column:span ${span}" ${A('tab', 'quota')}>
    <div class="qh">${tiles(winLogos(v.w))}<div style="min-width:0"><div class="n">${v.w.kind} · ${v.w.who}</div><div class="t num">${winAt(k)} 重置 · ${winCd(k)}</div></div><span class="qv"><span class="lb2">${v.bigLbl}</span><span class="kn num">${v.big}</span></span></div>
    <div style="margin-top:18px" ${tipA(v.tip)}>${capsule(v.x.f, v.x.f < 1 ? winG(v.w) : grayG(), W, capH, v.x.all ? winProg(k) : null)}</div>
    <div class="qf num"><span>${v.foot[0]}</span><span>${v.foot[1]}</span></div></div>`; }).join('')}</section>`;
}

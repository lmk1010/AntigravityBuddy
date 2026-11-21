// H2 风格的公共层：页签（手绘细线图标 + 文字）、主题、通用插画件。放在 shell.js / kit.js / art.js 之后加载
const UI = {};
UI.light = location.search.includes('light');
if (UI.light) document.body.classList.add('light');
UI.ink = a => `rgb(var(--ink) / ${a})`;

// 页签图标：16px，1.5 描边，currentColor
const TI = {
  overview: '<path d="M1.75 12.25h12.5"/><path d="M4.25 12.25a3.75 3.75 0 0 1 7.5 0"/><path d="M8 3v1.6M3.4 5.1l1.1 1.1M12.6 5.1l-1.1 1.1"/>',
  quota: '<rect x="1.75" y="4.75" width="11" height="6.5" rx="3.25"/><path d="M14.25 7v2"/><path d="M4.6 8h3.4" stroke-width="2.4" stroke-linecap="round"/>',
  usage: '<path d="M1.75 13.25h12.5"/><path d="M4 10.5V8.25M8 10.5V3.5M12 10.5V6"/>',
  ledger: '<path d="M6 4h8M6 8h8M6 12h5.5"/><circle cx="2.75" cy="4" r=".9" fill="currentColor" stroke="none"/><circle cx="2.75" cy="8" r=".9" fill="currentColor" stroke="none"/><circle cx="2.75" cy="12" r=".9" fill="currentColor" stroke="none"/>',
  accounts: '<circle cx="6" cy="5.5" r="2.5"/><path d="M1.75 13.25c.6-2.3 2.3-3.5 4.25-3.5s3.65 1.2 4.25 3.5"/><path d="M10.25 3.2a2.5 2.5 0 0 1 0 4.6M11.75 9.9c1.2.55 2 1.6 2.5 3.35"/>',
  settings: '<path d="M1.75 5h7M12.25 5h2M1.75 11h2M7.25 11h7"/><circle cx="10.5" cy="5" r="1.75"/><circle cx="5.5" cy="11" r="1.75"/>',
  report: '<rect x="2" y="2.75" width="12" height="11.5" rx="2.5"/><path d="M2 6.25h12M5.5 1.5v2.5M10.5 1.5v2.5M5.75 10.1l1.5 1.5 3-3"/>',
  line: '<path d="M1.75 12l4-4.5 3 2.5 5.5-6.25"/>',
  bar: '<path d="M3 13.25V9M8 13.25V3.5M13 13.25V6.5"/>',
  area: '<path d="M1.75 12.5l4-5 3 2.5 5.5-6v10.25H1.75z" fill="currentColor" fill-opacity=".25"/>',
  filter: '<path d="M2 3.25h12l-4.5 5.25v4.25l-3 1.5V8.5z"/>',
  stack: '<rect x="2.5" y="2.5" width="11" height="11" rx="2"/><path d="M2.5 8h11M8 8v5.5"/>',
};
UI.icon = (k, s = 16, extra = '') => `<svg width="${s}" height="${s}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="display:block;flex:none" ${extra}>${TI[k]}</svg>`;
const TABS2 = [['overview', '概览', 'h2-horizon'], ['report', '日报', 'p-report'], ['quota', '额度', 'p-quota'], ['usage', '用量', 'p-usage'], ['ledger', '明细', 'p-ledger'], ['accounts', '账号', 'p-accounts'], ['settings', '设置', 'p-settings']];
// 覆盖 shell.js 的 sub()
function sub(right = '') {
  const cur = window.TAB || 0;
  return `<div class="sub"><nav class="tabs tabs2">${TABS2.map(([k, t, f], i) => `<a href="${f}.html${UI.light ? '?light' : ''}" class="${i === cur ? 'on' : ''}">${UI.icon(k)}${t}</a>`).join('')}</nav>
  <div class="sub-r">${right}${right ? '<span class="vsep"></span>' : ''}<span class="sync"><i></i>${D.now}</span><span class="ctl"><span class="who">M</span>lmkbnb1${ic('unfold_more')}</span></div></div>`;
}
(() => { const st = document.createElement('style'); st.textContent = `
.tabs2{gap:22px}.tabs2 a{gap:7px}.tabs2 a svg{color:var(--fg-4)}
.tabs2 a.on svg{color:#5B9BFF}body.light .tabs2 a.on svg{color:#2F71E3}
.tile{display:flex;align-items:center;gap:5px;flex:none}
.tabs2 a{color:var(--fg-3);text-decoration:none}.tabs2 a:hover{color:var(--fg-2)}
.ib2{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;color:var(--fg-3);cursor:pointer}
.ib2:hover{background:var(--hover);color:var(--fg)}.ib2.on{background:var(--secondary);color:var(--fg)}
.ibg{display:flex;gap:2px;padding:2px;border-radius:10px;box-shadow:inset 0 0 0 1px var(--card-border)}
.tip2{position:fixed;z-index:99;pointer-events:none;background:var(--glass);border:1px solid var(--glass-border);border-radius:10px;padding:9px 12px;font-size:12.5px;line-height:1.7;box-shadow:0 16px 40px -12px rgb(0 0 0/.55),0 2px 8px -2px rgb(0 0 0/.3);white-space:nowrap;display:none;color:var(--fg-2)}
.tip2 b{color:var(--fg);font-weight:450}.tip2 .k{display:inline-block;width:7px;height:7px;border-radius:2px;margin-right:7px}
[data-tip]{cursor:default}
.aura{position:absolute;inset:-36px -41px auto;height:420px;pointer-events:none;overflow:hidden;z-index:0}
.aura i{position:absolute;border-radius:50%;filter:blur(70px)}
.pg>section{position:relative;z-index:1}
.ttl{font-size:26px;font-weight:450;letter-spacing:-.015em;font-variation-settings:"ROND" 20,"wdth" 100}
.dsc{font-size:13.5px;color:var(--fg-3);margin-top:6px}
.kn{font-size:34px;font-weight:350;letter-spacing:-.03em;line-height:1;font-variation-settings:"ROND" 20,"wdth" 100}
.kn small{font-size:14px;color:var(--fg-4);margin-left:2px;letter-spacing:0}
.chips{display:flex;gap:6px}.chips span{height:28px;padding:0 12px;border-radius:14px;display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--fg-3);background:var(--muted)}
.chips span.on{background:var(--fg);color:var(--background)}
`; document.head.appendChild(st); })();

UI.G = { gemini: ['#4C8DF6', '#8E7CF6', '#C76BD9'], claude: ['#D97757', '#E8955E', '#F2B35B'], week: ['#4C8DF6', '#4FB6E6', '#4FC3D9'], gray: UI.light ? ['#D5D6DC', '#DCDDE2', '#E3E4E8'] : ['#3A3B42', '#43444B', '#4C4D54'] };
UI.tile = (logos, s = '') => `<span class="tile">${logos.map(l => LG(l, s ? 18 : 22)).join('')}</span>`;
UI.aura = () => `<div class="aura">${UI.light ? '<i style="left:-120px;top:-180px;width:520px;height:340px;background:#CFE2FF;opacity:.7"></i><i style="right:-80px;top:-140px;width:420px;height:280px;background:#FFE2C4;opacity:.7"></i>' : '<i style="left:-140px;top:-220px;width:560px;height:340px;background:#2F5FB8;opacity:.16"></i><i style="right:-120px;top:-200px;width:460px;height:300px;background:#F2B35B;opacity:.08"></i>'}</div>`;
// 渐变胶囊：f = 剩余；win = 窗口时间（可选小三角）
UI.capsule = (f, g, W = 344, H = 26, win) => {
  const id = 'cp' + Math.random().toString(36).slice(2, 7), fw = f <= 0 ? 0 : Math.max(H, W * f);
  let ticks = ''; if (H >= 16) for (let i = 1; i < 20; i++) { const x = i * W / 20; if (x < fw - 6) ticks += `<line x1="${x}" x2="${x}" y1="${H * .25}" y2="${H * .75}" stroke="#fff" stroke-opacity=".28"/>`; }
  return `<svg width="${W}" height="${H + (win != null ? 12 : 0)}" style="display:block;overflow:visible"><defs><linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="${g[0]}"/><stop offset=".55" stop-color="${g[1]}"/><stop offset="1" stop-color="${g[2]}"/></linearGradient>
    <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
    <rect width="${W}" height="${H}" rx="${H / 2}" style="fill:${UI.ink(.06)}"/>
    ${fw ? `<rect width="${fw}" height="${H}" rx="${H / 2}" fill="url(#${id})"/><rect x="2" y="2" width="${Math.max(0, fw - 4)}" height="${H / 2 - 2}" rx="${H / 2 - 2}" fill="url(#${id}s)"/>` : ''}
    ${ticks}${win != null ? `<path d="M${Math.max(4, W * win)},${H + 4} l4,6 h-8z" style="fill:var(--fg-3)"/>` : ''}</svg>`;
};
UI.curve = pts => { let d = `M${pts[0][0]},${pts[0][1]}`; for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], m = (x0 + x1) / 2; d += `C${m},${y0} ${m},${y1} ${x1},${y1}`; } return d; };
UI.tabs = (TAB) => { window.TAB = TAB; };

// 悬停提示：元素带 data-tip 即可；UI.pin(x, y, html) 用于出图时固定展示一个
UI.tipEl = null;
UI.tipShow = (x, y, html) => { if (!UI.tipEl) { UI.tipEl = document.createElement('div'); UI.tipEl.className = 'tip2'; document.body.appendChild(UI.tipEl); } UI.tipEl.innerHTML = html; UI.tipEl.style.display = 'block'; const r = UI.tipEl.getBoundingClientRect(); UI.tipEl.style.left = Math.min(x + 14, innerWidth - r.width - 12) + 'px'; UI.tipEl.style.top = Math.max(8, y - r.height - 12) + 'px'; };
UI.tipHide = () => UI.tipEl && (UI.tipEl.style.display = 'none');
document.addEventListener('mousemove', e => { const t = e.target.closest && e.target.closest('[data-tip]'); if (t) UI.tipShow(e.clientX, e.clientY, t.dataset.tip); else if (!UI.pinned) UI.tipHide(); });
document.addEventListener('mousemove', () => { UI.pinned = false; }, { once: true });
UI.pin = (sel, html, dx = .5, dy = .2) => { const el = document.querySelector(sel); if (!el) return; const r = el.getBoundingClientRect(); UI.pinned = true; UI.tipShow(r.left + r.width * dx, r.top + r.height * dy, html); };
UI.ibg = (items, on, attr = '') => `<span class="ibg" ${attr}>${items.map(([k, t], i) => `<span class="ib2 ${i === on ? 'on' : ''}" data-i="${i}" data-tip="${t}">${UI.icon(k, 15)}</span>`).join('')}</span>`;
UI.q = new URLSearchParams(location.search);

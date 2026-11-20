/* ===== 启动、同步、设置持久化、导出 ===== */
function downloadCsv(rs, name) {
  const q = s => '"' + String(s).replace(/"/g, '""') + '"';
  const csv = '﻿' + ['time,session,model,model_inferred,input_tokens,cache_read_tokens,output_tokens,tool_calls,step_index,est_cost_usd']
    .concat(rs.map(r => [new Date(r.t * 1000).toISOString(), q(U.sessions[r.root].title), MODEL_NAME(r.m), r.m >= 0 && !r.raw ? 1 : 0, r.in, r.cache, r.out, r.tools, r.step, r.cost.toFixed(4)].join(','))).join('\n');
  try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); toast(`已导出 ${comma(rs.length)} 条记录`); }
  catch { navigator.clipboard?.writeText(csv).catch(() => {}); toast('无法下载，已把 CSV 复制到剪贴板'); }
}
const KEEP = ['range', 'gran', 'cr', 'stack', 'ov', 'fullnum', 'tz', 'metric', 'cal'];
function saveSt() { try { localStorage.setItem('buddy.st', JSON.stringify({ ...Object.fromEntries(KEEP.map(k => [k, st[k]])), qf: st.q.f, pins: [...st.q.pins] })); } catch {} }
function loadSt() { try { const s = JSON.parse(localStorage.getItem('buddy.st') || 'null'); if (!s) return; KEEP.forEach(k => { if (s[k] !== undefined) st[k] = s[k]; }); if (s.qf) st.q.f = s.qf; if (s.pins) st.q.pins = new Set(s.pins); TZ = TZ_OPT[st.tz] ?? TZ_AUTO; } catch {} }
let busy = false;
async function refresh(manual) {
  if (busy) return; busy = true;
  try { const res = await fetch('/api/data', { cache: 'no-store' }); if (!res.ok) throw new Error('HTTP ' + res.status);
    const before = ROWS.length; loadData(await res.json());
    if (manual) toast(ROWS.length > before ? `已同步，新增 ${ROWS.length - before} 条记录` : '已同步，没有新的记录');
    // 正在输入或菜单打开时不打断
    if (manual || (!st.menu && !(document.activeElement && document.activeElement.tagName === 'INPUT'))) render();
  } catch (e) { if (!LIVE.at) document.getElementById('app').innerHTML = `<div class="pane"><div class="cap" style="padding:80px 0;text-align:center">读不到数据：${esc(e.message)}<br><br><span class="btn" onclick="refresh(true)">重试</span></div></div>`; else if (manual) toast('同步失败：' + e.message); }
  finally { busy = false; }
}
Object.assign(ACT, SETTINGS_ACT, FILTER_ACT, TOKENS_ACT, { chat() {}, fmodelGo0() { st.range = '24h'; st.fModel = st.fSess = null; st.tab = 'tokens'; st.metric = 'cost'; }, ovPool(v) { st.ovPool = Number(v); }, fmodelGo(v) { st.fModel = Number(v); st.fSess = null; st.range = 'mo'; st.tab = 'tokens'; st.metric = 'cost'; }, cal(v) { st.cal = v; }, sync() { refresh(true); },
  export() { downloadCsv(st.tab === 'ledger' ? ledgerRows() : rowsIn(), 'buddy-usage.csv'); } });
Object.keys(ACT).forEach(k => { const f = ACT[k]; ACT[k] = v => { const r = f(v); saveSt(); return r; }; });
loadSt();
// 动效：只在真的发生变化时播放（切页签、展开详情、打开菜单），30 秒自动刷新不会重播
{ const base = render; let lastTab = null, lastOpen = '', lastMenu = null, lastInd = null;
  render = function () { base();
    const pane = document.querySelector('.pane'), on = document.querySelector('.tabs a.on'), ind = document.querySelector('.tabs .ind'), open = `${st.tab}|${st.lg.sel}|${st.q.open}`;
    if (pane && lastTab !== null && lastTab !== st.tab + st.sp) pane.classList.add('enter');
    if (open !== lastOpen) document.querySelectorAll('[data-xp]').forEach(e => e.classList.add('xp'));
    if (st.menu && st.menu !== lastMenu) document.querySelectorAll('.menu').forEach(e => e.classList.add('pop'));
    if (on && ind) { const to = { l: on.offsetLeft, w: on.offsetWidth };
      if (lastInd && (lastInd.l !== to.l)) { ind.style.transition = 'none'; ind.style.left = lastInd.l + 'px'; ind.style.width = lastInd.w + 'px'; ind.offsetWidth; ind.style.transition = ''; }
      ind.style.left = to.l + 'px'; ind.style.width = to.w + 'px'; lastInd = to; }
    lastTab = st.tab + st.sp; lastOpen = open; lastMenu = st.menu; }; }
{ const q = new URLSearchParams(location.search), t = q.get('tab'), m = q.get('menu'); if (t && VIEWS[t]) st.tab = t; if (q.get('range')) st.range = q.get('range'); if (m) setTimeout(() => { st.menu = m; render(); }, 1200); }
let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (LIVE.at) render(); }, 120); });
refresh(); setInterval(refresh, 30000);

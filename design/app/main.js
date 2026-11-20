/* ===== 动作、渲染、事件 ===== */
const VIEWS = { overview: vOverview, quota: vQuota, tokens: vTokens, ledger: vLedger, accounts: vAccounts, settings: vSettings };
let toastT;
function toast(msg) { st.toast = msg; clearTimeout(toastT); toastT = setTimeout(() => { st.toast = null; render(); }, 2600); }
const num = v => v === '' || v == null ? null : Number(v);
function go(tab) { st.view = 'buddy'; st.tab = tab; st.menu = null; }
function startSwitch(i) {
  if (i === st.acc.cur || st.acc.sw != null) return;
  st.acc.sw = i; st.acc.step = 0; st.menu = null;
  [1, 2].forEach(k => setTimeout(() => { st.acc.step = k; render(); }, k * 1100));
  setTimeout(() => { st.acc.cur = i; st.acc.sw = null; ACC.forEach((a, j) => { if (j !== i && !a.exp && !a.seen) a.seen = '刚刚'; }); toast(`已切换到 ${ACC[i].e}`); render(); }, 3400);
}
const ACT = {
  noop() {}, buddy() { st.view = 'buddy'; }, chat() { st.view = 'chat'; st.menu = null; }, tab: v => go(v),
  menu(v) { st.menu = st.menu === v ? null : v; return 'keep'; },
  range(v) { st.range = v; st.lg.bucket = null; }, fmodel(v) { st.fModel = num(v); }, fsess(v) { st.fSess = num(v); }, clearf() { st.fModel = st.fSess = null; },
  metric(v) { go('tokens'); st.metric = v; },
  bucket(v) { go('ledger'); st.lg.bucket = v.split(',').map(Number); st.lg.sel = null; st.lg.limit = 60; }, unbucket() { st.lg.bucket = null; },
  qf(v) { st.q.f = v; st.q.open = null; }, qprov(v) { st.q.prov = v || null; }, qreset() { st.q.f = 'all'; st.q.prov = null; st.q.s = ''; },
  qopen(v) { if (!v) { st.q.open = null; return; } go('quota'); const m = qBy(v); st.q.open = st.q.open === v && st.tab === 'quota' ? null : v; if (m && !qPass(m)) { st.q.f = 'all'; st.q.prov = null; st.q.s = ''; } st.q.open = v; },
  pin(v) { const p = st.q.pins; p.has(v) ? p.delete(v) : p.add(v); toast(p.has(v) ? '已关注，会显示在概览和辅助面板' : '已取消关注'); },
  usein(v) { const k = U.models.indexOf(v); if (k < 0) return toast('这段时间没有该模型的调用记录'); st.fModel = k; st.fSess = null; go('ledger'); },
  sort(v) { const g = st.lg; if (g.sort === v) g.dir = -g.dir; else { g.sort = v; g.dir = -1; } },
  sel(v) { const n = num(v); st.lg.sel = st.lg.sel === n ? null : n; }, lgf(v) { st.lg[v] = !st.lg[v]; st.lg.limit = 60; },
  lgreset() { Object.assign(st.lg, { s: '', miss: false, big: false, kids: false, bucket: null }); st.fModel = st.fSess = null; }, more() { st.lg.limit += 60; },
  insSess(v) { st.fSess = num(v); st.fModel = null; go('tokens'); st.metric = 'real'; },
  insMiss() { go('ledger'); Object.assign(st.lg, { miss: true, big: true, kids: false, sort: 'in', dir: -1, sel: null, bucket: null }); },
  insHit() { go('tokens'); st.metric = 'cache'; }, insKids() { go('ledger'); Object.assign(st.lg, { kids: true, miss: false, big: false, sel: null, bucket: null }); },
  insUnl() { st.fModel = -1; st.fSess = null; go('ledger'); },
  switch: v => startSwitch(Number(v)), relogin() { toast('将打开浏览器重新完成 Google 登录'); }, toast: v => toast(v), sync() { toast('已同步，没有新的记录'); },
  export() { toast(`原型：将把当前筛选的 ${comma(st.tab === 'ledger' ? ledgerRows().length : rowsIn().length)} 条记录导出为 CSV`); },
  copy(v) { const r = ROWS[v], j = JSON.stringify({ created_at: new Date(r.t * 1000).toISOString(), session: SE[r.s].id, step_index: r.step, model: MODEL_NAME(r.m), input_tokens: r.in, cache_read_tokens: r.cache, output_tokens: r.out, tool_calls: r.tools }, null, 2); navigator.clipboard?.writeText(j).catch(() => {}); toast('已复制这一步的 JSON'); },
  aux() { st.chat.aux = !st.chat.aux; st.chat.pop = null; }, pop(v) { st.chat.pop = st.chat.pop === v ? null : v; return 'keep'; },
  usemodel(v) { st.chat.model = v; st.chat.pop = null; toast(`已换用 ${qBy(v).name}`); },
  toggle(v) { st[v] = !st[v]; if (v === 'native' && !st.native) st.chat.pop = null; }, theme(v) { st.theme = Number(v); if (st.theme === 2) toast('浅色主题待设计，原型暂只提供深色'); }, credits(v) { st.credits = v; }, alert(v) { st.alert = Number(v); },
};
function render() {
  const sc = {}; document.querySelectorAll('#lgscroll,#spscroll,.body.scroll').forEach(e => sc[e.id || 'body'] = e.scrollTop);
  const f = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.i, pos = f ? document.activeElement.selectionStart : 0;
  document.getElementById('app').innerHTML = (st.view === 'chat' ? vChat() : VIEWS[st.tab]()) + (st.toast ? `<div style="position:absolute;left:50%;bottom:28px;transform:translateX(-50%);z-index:80;background:var(--glass);border:1px solid var(--glass-border);border-radius:10px;padding:9px 14px;font-size:13px;box-shadow:0 16px 40px -12px rgb(0 0 0 / .6);white-space:nowrap">${st.toast}</div>` : '');
  const toastEl = document.querySelector('#app > div:last-child'); if (st.toast && toastEl) document.querySelector('.win').appendChild(toastEl);
  document.querySelectorAll('#lgscroll,#spscroll,.body.scroll').forEach(e => { e.scrollTop = sc[e.id || 'body'] || 0; });
  if (f) { const el = document.querySelector(`[data-i="${f}"]`); if (el) { el.focus(); el.setSelectionRange(pos, pos); } }
}
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); let keep;
  if (el) { if (e.target.closest('input')) return; keep = ACT[el.dataset.a](el.dataset.v); }
  else if (e.target.closest('.menu,input')) return;
  if (keep !== 'keep') { if (!el || !['menu', 'pop'].includes(el.dataset.a)) { st.menu = null; if (!el || !e.target.closest('.pane')) st.chat.pop = st.chat.pop; } }
  if (!el && !e.target.closest('[style*="pointer-events:auto"]')) st.chat.pop = null;
  render();
});
document.addEventListener('input', e => { const k = e.target.dataset && e.target.dataset.i; if (!k) return; if (k === 'qs') { st.q.s = e.target.value; st.q.open = null; if (st.q.s && st.q.f !== 'all') st.q.f = 'all'; } if (k === 'ls') { st.lg.s = e.target.value; st.lg.limit = 60; } render(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { st.menu = null; st.chat.pop = null; st.q.open = null; if (document.activeElement.blur) document.activeElement.blur(); return render(); }
  if (e.target.tagName === 'INPUT') return;
  if (e.key === '/' && st.view === 'buddy' && (st.tab === 'quota' || st.tab === 'ledger')) { e.preventDefault(); document.querySelector('[data-i]')?.focus(); }
  if (st.view === 'buddy' && st.tab === 'ledger' && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); const rs = ledgerRows(), i = rs.findIndex(r => r.idx === st.lg.sel), n = Math.max(0, Math.min(rs.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1))); if (rs[n]) { st.lg.sel = rs[n].idx; if (n >= st.lg.limit) st.lg.limit += 60; render(); document.querySelector('tr.sel')?.scrollIntoView({ block: 'nearest' }); } }
});
const tip = document.getElementById('tip');
document.addEventListener('mousemove', e => { const t = e.target.closest && e.target.closest('[data-tip]'); if (!t || !t.dataset.tip) { tip.style.display = 'none'; return; }
  tip.innerHTML = t.dataset.tip; tip.style.display = 'block'; tip.style.left = Math.min(e.clientX + 14, innerWidth - tip.offsetWidth - 8) + 'px'; tip.style.top = (e.clientY + 14 + tip.offsetHeight > innerHeight ? e.clientY - tip.offsetHeight - 10 : e.clientY + 14) + 'px'; });

// 出图用的预设状态：?s=xxx
const PRESET = {
  overview() {}, quota() { st.tab = 'quota'; }, 'quota-open'() { st.tab = 'quota'; st.q.open = 'claude-opus-5-5-high'; }, 'quota-all'() { st.tab = 'quota'; st.q.f = 'all'; },
  tokens() { st.tab = 'tokens'; }, 'tokens-filtered'() { st.tab = 'tokens'; st.range = '7d'; st.metric = 'cache'; st.fSess = SE.find(s => s.title === 'Casual Greeting').i; },
  ledger() { st.tab = 'ledger'; }, 'ledger-step'() { st.tab = 'ledger'; ACT.insMiss(); st.lg.sel = ledgerRows()[2].idx; },
  accounts() { st.tab = 'accounts'; }, 'accounts-open'() { st.tab = 'accounts'; st.acc.open = 1; }, 'tokens-month'() { st.tab = 'tokens'; st.range = 'mo'; st.metric = 'cost'; }, 'accounts-switching'() { st.tab = 'accounts'; st.acc.sw = 1; st.acc.step = 1; }, settings() { st.tab = 'settings'; }, 'settings-alerts'() { st.tab = 'settings'; st.sp = 'alerts'; }, 'settings-native'() { st.tab = 'settings'; st.sp = 'native'; }, 'settings-data'() { st.tab = 'settings'; st.sp = 'data'; }, 'settings-about'() { st.tab = 'settings'; st.sp = 'about'; },
  chat() { st.view = 'chat'; }, composer() { st.view = 'chat'; st.chat.aux = false; st.chat.pop = 'ctx'; }, 'composer-quota'() { st.view = 'chat'; st.chat.aux = false; st.chat.pop = 'quota'; },
};
Object.assign(ACT, SETTINGS_ACT, ACC_ACT);
const qs = new URLSearchParams(location.search).get('s');
if (qs && PRESET[qs]) { PRESET[qs](); document.body.classList.add('single'); }
render();

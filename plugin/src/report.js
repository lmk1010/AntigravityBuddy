/* ===== 日报 / 周报：今天（或本周）做了什么，与上一段比较；下班提醒 ===== */
// 工作时长：相邻两次调用间隔不超过 15 分钟算连续工作，每段末尾补 2 分钟
const GAP_S = 15 * 60;
function workSpans(rs) {
  const ts = rs.map(r => r.t).sort((a, b) => a - b), out = [];
  ts.forEach(t => { const l = out[out.length - 1]; if (l && t - l[1] <= GAP_S) l[1] = t; else out.push([t, t]); });
  return out.map(([a, b]) => [a, b + 120]);
}
const spanSec = sp => sp.reduce((a, [x, y]) => a + y - x, 0);
const hm = s => `${Math.floor(s / 3600)}<small>h</small> ${hh(Math.floor(s % 3600 / 60))}<small>m</small>`;
const hmT = s => `${Math.floor(s / 3600)} 小时 ${Math.floor(s % 3600 / 60)} 分`;
const day0 = () => dayOf(NOW), wk0 = () => day0() - ((L(NOW).getUTCDay() + 6) % 7) * 86400;
function repRange(week) {
  const d = day0(), w = wk0();
  return week ? { a: w, b: NOW + 1, pa: w - 7 * 86400, pb: NOW + 1 - 7 * 86400, name: '本周', prev: '上周同期' } : { a: d, b: NOW + 1, pa: d - 86400, pb: NOW + 1 - 86400, name: '今天', prev: '昨天同时段' };
}
const rowsAB = (a, b) => ROWS.filter(r => r.t >= a && r.t < b);
// 插画：黄昏。活跃曲线是远山，太阳落在下班时刻，水面倒影
function dusk(rs, W, H = 176) {
  const d = day0(), G = 126, act = Array(24).fill(0); rs.forEach(r => { const h = Math.floor((r.t - d) / 3600); if (h >= 0 && h < 24) act[h] += r.in + r.out; });
  let h0 = act.findIndex(v => v > 0); if (h0 < 0) h0 = 9; h0 = Math.max(0, Math.min(h0, 9)); const h1 = Math.max(19, Math.ceil((NOW - d) / 3600));
  const seg = act.slice(h0, h1), mx = Math.max(...seg, 1), sm = smooth(seg.map(v => v / mx), 1.2), X = i => i / Math.max(1, sm.length - 1) * W;
  const hill = (k, off) => { const pts = sm.map((v, i) => [X(i), G - v * 58 * k - off - 6]); return `M0,${G}L0,${pts[0][1]}${curve(pts).replace(/^M[^C]*/, '')}L${W},${G}Z`; };
  const [rh, rm] = (st.rep.at || '18:30').split(':').map(Number), sx = Math.min(W - 50, Math.max(50, ((rh + rm / 60) - h0) / (h1 - h0) * W)), L2 = isLight();
  let refl = ''; [[0, 104], [8, 78], [16, 54], [24, 32], [32, 16]].forEach(([dy, w]) => refl += `<rect x="${sx - w / 2}" y="${G + 10 + dy}" width="${w}" height="3" rx="1.5" fill="url(#dsun)" opacity="${(.75 - dy / 70).toFixed(2)}"/>`);
  let stars = ''; if (!L2) { let sd = 3; const rnd = () => (sd = (sd * 9301 + 49297) % 233280) / 233280; for (let i = 0; i < 18; i++) stars += `<circle cx="${(rnd() * W).toFixed(0)}" cy="${(rnd() * 60 + 4).toFixed(0)}" r="${(rnd() * .9 + .4).toFixed(1)}" fill="#fff" opacity="${(rnd() * .4 + .1).toFixed(2)}"/>`; }
  return `<svg width="${W}" height="${H}" style="display:block;overflow:hidden"><defs>
    <linearGradient id="dsun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD59A"/><stop offset=".6" stop-color="#F7A35C"/><stop offset="1" stop-color="#F27A9B"/></linearGradient>
    <radialGradient id="dglow" cx="50%" cy="100%" r="70%"><stop offset="0" stop-color="#F7A35C" stop-opacity=".35"/><stop offset="1" stop-color="#F7A35C" stop-opacity="0"/></radialGradient>
    <linearGradient id="dh1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8E7CF6" stop-opacity=".95"/><stop offset="1" stop-color="#4C8DF6" stop-opacity="${L2 ? .5 : .35}"/></linearGradient>
    <linearGradient id="dh2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5B9BFF" stop-opacity=".35"/><stop offset="1" stop-color="#5B9BFF" stop-opacity=".05"/></linearGradient>
    <clipPath id="dup"><rect width="${W}" height="${G}"/></clipPath></defs>
    ${stars}<ellipse cx="${sx}" cy="${G}" rx="170" ry="70" fill="url(#dglow)" clip-path="url(#dup)"/>
    ${[78, 102, 128].map((r, i) => `<path d="M${sx - r},${G} A${r},${r} 0 0 1 ${sx + r},${G}" fill="none" stroke="#F2B35B" stroke-opacity="${(.22 - i * .06).toFixed(2)}" ${i ? 'stroke-dasharray="2 6"' : ''}/>`).join('')}
    <path d="${hill(1.35, 6)}" fill="url(#dh2)"/><circle cx="${sx}" cy="${G + 6}" r="44" fill="url(#dsun)" clip-path="url(#dup)"/><path d="${hill(1, 0)}" fill="url(#dh1)"/>
    <line x1="0" x2="${W}" y1="${G}" y2="${G}" style="stroke:${ink(.25)}"/>${refl}
    <text x="0" y="${G + 22}" style="fill:var(--fg-4);font-size:11.5px">${hh(h0)}:00</text><text x="${W}" y="${G + 22}" text-anchor="end" style="fill:var(--fg-4);font-size:11.5px">${hh(h1 % 24)}:00</text></svg>`;
}
function vReport() {
  const week = st.rep.week, R = repRange(week), rs = rowsAB(R.a, R.b), ps = rowsAB(R.pa, R.pb), t = agg(rs), p = agg(ps);
  const ws = workSpans(rs), wp = workSpans(ps), sec = spanSec(ws), psec = spanSec(wp), hit = pct(t.cache, t.cache + t.in), phit = pct(p.cache, p.cache + p.in);
  const ss = groupBy(rs, 'root').sort((x, y) => y.in + y.out - x.in - x.out), proj = new Set(ss.map(g => SE[g.key].ws).filter(Boolean));
  const hour = L(NOW).getUTCHours(), [rh] = (st.rep.at || '18:30').split(':').map(Number);
  const hi = week ? '这一周辛苦了。' : !rs.length ? '今天还没开始。' : hour >= rh ? '今天辛苦了。' : hour < 12 ? '上午好，进展不错。' : '下午好，继续加油。';
  const more = sec - psec, say = rs.length ? `${R.name}工作了 <b>${hmT(sec)}</b>，和 Agent 一起推进了 <b>${ss.length} 个会话</b>，完成 <b>${comma(t.n)} 次调用</b>，花费约 <b>${fUSD(t.cost)}</b>。${psec ? `比${R.prev}${more >= 0 ? '多' : '少'}做了 ${hmT(Math.abs(more))}。` : ''}` : `${R.name}还没有调用记录，开始工作后这里会自动生成总结。`;
  const cmp = (a, b, g) => { const m = Math.max(a, b, 1e-9); return `<div class="vs"><div><span>${week ? '本周' : '今天'}</span>${capsule(a / m, g, SPANW(3) - 46, 5)}</div><div><span>${week ? '上周' : '昨天'}</span>${capsule(b / m, grayG(), SPANW(3) - 46, 5)}</div></div>`; };
  const dl = (a, b, f, unit = '%') => { if (!b) return `<span class="dim">${R.prev}没有数据</span>`; const d = unit === 'pt' ? (a - b) * 100 : (a / b - 1) * 100; const up = d >= 0; return `<b class="${up ? 'up' : 'dn'}">${up ? '▲' : '▼'} ${f ? f(Math.abs(a - b)) : Math.abs(Math.round(d)) + (unit === 'pt' ? ' 个点' : '%')}</b> 比${R.prev}`; };
  const stat = (l, v, a, b, g, d) => `<div class="md st" style="grid-column:span 3"><div class="lb">${l}</div><div class="kn num">${v}</div>${cmp(a, b, g)}<div class="d num">${d}</div></div>`;
  // 时间轴：工作时段内每个会话的活跃段
  const tA = ws.length ? ws[0][0] : R.a, tB = Math.max(ws.length ? ws[ws.length - 1][1] : R.b, tA + 3600), TW = SPANW(12) - 210 - 90 - 32, TX = x => (x - tA) / (tB - tA) * TW;
  const lanes = ss.slice(0, 6).map((g, i) => { const sp = workSpans(rs.filter(r => r.root === g.key)); return `<div class="tlr"><span class="nm el">${SE[g.key].title}<span class="tg">${esc(SE[g.key].ws || '')}${SE[g.key].kids ? ` · ${SE[g.key].kids} 个子代理` : ''}</span></span>
    <svg width="${TW}" height="14" style="display:block">${sp.map(([a, b]) => `<rect x="${TX(a).toFixed(1)}" y="2" width="${Math.max(8, TX(b) - TX(a)).toFixed(1)}" height="10" rx="5" fill="${PAL[i % PAL.length]}" ${tipA(`${SE[g.key].title}<br>${atLocal(a)} – ${fT(b).slice(0, 5)}`)}/>`).join('')}</svg><span class="v num">${fmt(g.in + g.out)}</span></div>`; }).join('');
  const nt = Math.min(6, Math.max(2, Math.round((tB - tA) / 7200))), ticks = Array.from({ length: nt + 1 }, (_, i) => `<span>${week ? fD(tA + (tB - tA) * i / nt) : fT(tA + (tB - tA) * i / nt).slice(0, 5)}</span>`).join('');
  // 本周每天
  const w0 = wk0(), days = Array.from({ length: 7 }, (_, i) => { const a = w0 + i * 86400, r = rowsAB(a, a + 86400); return { i, a, s: spanSec(workSpans(r)), g: agg(r) }; }), dm = Math.max(...days.map(x => x.s), 3600), today = Math.floor((day0() - w0) / 86400);
  const wsum = days.reduce((a, x) => a + x.s, 0), wg = agg(rowsAB(w0, NOW + 1));
  const md = `## ${R.name}工作总结（${fD(NOW)}）\n\n- 工作时长：${hmT(sec)}\n- 会话：${ss.length} 个\n- 调用：${t.n} 次\n- 真实消耗：${fmt(t.in + t.out)} tokens\n- 花费：约 ${fUSD(t.cost)}\n- 缓存命中：${(hit * 100).toFixed(1)}%\n\n${ss.slice(0, 6).map(g => `- ${SE[g.key].title.replace(/&[^;]+;/g, '')}：${fmt(g.in + g.out)}`).join('\n')}`;
  window._repMd = md;
  return shell(sub() + `<div class="body h2"><div class="pg rep">${aura()}
    <section class="rw" style="height:180px">
      <div class="md" style="grid-column:span 6">
        <div class="kick">${fD(NOW)} · ${WD[L(NOW).getUTCDay()]} · ${fT(NOW).slice(0, 5)}</div>
        <div class="hi">${hi}</div><div class="say">${say}</div>
        <div class="row" style="gap:10px;margin-top:14px">${seg([['day', '今天'], ['week', '本周']], week ? 'week' : 'day', 'repw')}<span class="ibg"><span class="ib2" ${A('repcopy')} ${tipA('复制为 Markdown')}>${icon('copy', 15)}</span></span></div>
      </div>
      <div class="md" style="grid-column:7 / span 6">${dusk(rowsAB(day0(), NOW + 1), SPANW(6))}</div>
    </section>
    <section class="rw">
      ${stat('工作时长', hm(sec), sec, psec, G3.gemini, dl(sec, psec, d => hmT(d)))}
      ${stat('真实消耗', unit(fmt(t.in + t.out)), t.in + t.out, p.in + p.out, G3.week, dl(t.in + t.out, p.in + p.out))}
      ${stat('花费', fUSD(t.cost), t.cost, p.cost, G3.claude, dl(t.cost, p.cost))}
      ${stat('缓存命中', `${(hit * 100).toFixed(1)}<small>%</small>`, hit, phit, G3.cyan, dl(hit, phit, null, 'pt'))}
    </section>
    <section class="rw"><div class="md" style="grid-column:1/-1">
      <div class="hd" style="margin-bottom:8px"><span class="lb">${R.name}做了什么 · ${week ? fD(tA) + ' – ' + fD(tB) : fT(tA).slice(0, 5) + ' – ' + fT(tB).slice(0, 5)}</span><span class="lb" style="color:var(--fg-4)">${ss.length} 个会话 · ${proj.size} 个项目</span></div>
      ${lanes || '<div class="cap">还没有会话</div>'}
      ${lanes ? `<div class="tlr" style="height:20px"><span></span><div class="row num" style="justify-content:space-between;font-size:11.5px;color:var(--fg-4)">${ticks}</div><span></span></div>` : ''}
    </div></section>
    <section class="rw">
      <div class="md" style="grid-column:span 7"><div class="hd" style="margin-bottom:10px"><span class="lb">本周 · 已工作 ${hmT(wsum)}</span><span class="lb" style="color:var(--fg-4)">${fmt(wg.in + wg.out)} tokens · 约 ${fUSD(wg.cost)}</span></div>
        <div class="wk">${days.map(x => `<div class="${x.i === today ? 'on' : ''}" ${tipA(`${WD[L(x.a).getUTCDay()]} ${fD(x.a)}${x.s ? `<br>${hmT(x.s)} · ${fmt(x.g.in + x.g.out)} · 约 ${fUSD(x.g.cost)}` : ''}`)}><span class="num" style="font-size:11.5px">${x.s ? (x.s / 3600).toFixed(1) + 'h' : ''}</span><span class="bar" style="height:${x.s ? Math.max(6, x.s / dm * 52) : 4}px;background:${x.s ? (x.i === today ? 'linear-gradient(180deg,#8E7CF6,#4C8DF6)' : 'linear-gradient(180deg,rgb(91 155 255/.55),rgb(91 155 255/.2))') : ink(.06)}"></span>${WD[L(x.a).getUTCDay()]}</div>`).join('')}</div></div>
      <div class="md" style="grid-column:9 / span 4"><div class="hd" style="margin-bottom:12px"><span class="lb">下班提醒</span><span class="row" style="gap:8px;font-size:12.5px;color:var(--fg-3)">工作日 ${st.rep.at}<span class="sw ${st.rep.on ? 'on' : ''}" ${A('set', 'rep.on=!')}></span></span></div>
        <div class="nt"><span class="ap"><svg width="18" height="18" viewBox="0 0 10 10"><path d="M2 8V5.5M5 8V2M8 8V4" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg></span><div style="flex:1;min-width:0"><div class="row" style="justify-content:space-between"><span class="t">Buddy</span><span style="font-size:11.5px;color:var(--fg-4)">${st.rep.at}</span></div><div class="b">今天辛苦了，总结好了</div><div class="b" style="color:var(--fg-3)">${sec ? hmT(sec) : '—'} · ${ss.length} 个会话 · 约 ${fUSD(t.cost)}</div></div></div>
        <div style="font-size:12px;color:var(--fg-4);margin-top:12px">Buddy 打开时到点提醒；周五另附一周总结</div></div>
    </section>
  </div></div>`);
}
// 下班提醒：Buddy 页面开着时，到点弹一次（每天一次）
setInterval(() => {
  if (!st.rep.on || !LIVE.at) return; const d = L(nowS()), wd = d.getUTCDay(); if (wd === 0 || wd === 6) return;
  const [h, m] = st.rep.at.split(':').map(Number), key = fD(nowS());
  if (d.getUTCHours() * 60 + d.getUTCMinutes() < h * 60 + m || st.rep.last === key) return;
  st.rep.last = key; saveSt(); const rs = rowsAB(day0(), NOW + 1), msg = `今天辛苦了 · ${hmT(spanSec(workSpans(rs)))} · 约 ${fUSD(agg(rs).cost)}`;
  try { if (window.Notification && Notification.permission === 'granted') new Notification('Buddy', { body: msg }); } catch {}
  toast(msg + ' · 点「日报」看总结');
}, 60000);
const accPost = async (path, body) => { try { const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) }); return await r.json(); } catch (e) { return { ok: false, error: e.message }; } };
const ACC_ACT = {
  accAsk(v) { st.acc.ask = v || null; return 'keep'; },
  async accGo(v) { st.acc.ask = null; const r = await accPost('/api/accounts/switch', { email: v }); if (r && r.ok) { st.acc.busy = v; } else toast('切换失败：' + (r?.error || '未知错误')); render(); },
  async accAdd() { st.acc.ask = null; const r = await accPost('/api/accounts/add'); if (r && r.ok) st.acc.busy = '新账号'; else toast('无法添加：' + (r?.error || '未知错误')); render(); },
  async accDel(v) { if (!confirm(`从 Buddy 移除 ${v}？（不会影响这个 Google 账号本身）`)) return; const r = await accPost('/api/accounts/remove', { email: v }); toast(r?.ok ? '已移除' : '移除失败：' + (r?.error || '')); refresh(); },
};
const REPORT_ACT = { repw(v) { st.rep.week = v === 'week'; }, repcopy() { navigator.clipboard?.writeText(window._repMd || '').then(() => toast('已复制为 Markdown')).catch(() => toast('复制失败')); } };

/* ===== 额度：模型清单、剩余比例、重置时间全部来自 GetAvailableModels ===== */
const TIERS = ['Low', 'Medium', 'High', 'XHigh'];
let FAM = [], OTHER = [], QM = [];
// 一条调用算进哪个窗口：先按模型名对上额度里的模型；对不上的（如已下线的模型）归到同厂商的 5 小时窗口
const rowWinCache = new Map();
function rowWin(mi) {
  if (rowWinCache.has(mi)) return rowWinCache.get(mi);
  const name = MODEL_NAME(mi); let w = -1;
  if (mi >= 0) { const m = QM.find(q => q.aliases.some(a => a === name || a.startsWith(name + '-') || name.startsWith(a))); if (m) w = m.win; }
  if (w < 0) { const p = mi < 0 ? 'gemini' : logoOf(name); w = WINS.findIndex(x => x.len === 5 * 3600 && x.provs.has(p)); if (w < 0) w = WINS.findIndex(x => x.provs.has(p)); }
  rowWinCache.set(mi, w); return w;
}
// 窗口用量与剩余估算。额度很可能按成本计（缓存读取便宜得多），所以先估美元：
// 剩余美元 ≈ 本窗口已用美元 × 剩余比例 ÷ 已用比例；token 数再按近 24 小时的「每 token 成本」折算（含缓存）。已用不足 3% 不估
function winUse(k) {
  const w = WINS[k], g = agg(ROWS.filter(r => r.t >= w.t - w.len && rowWin(r.m) === k)), ms = QM.filter(m => m.win === k), f = ms.length ? Math.min(...ms.map(m => m.f)) : 1, u = 1 - f;
  const all = g.in + g.out + g.cache, ok = u >= .03 && g.cost > 0, d = agg(ROWS.filter(r => r.t >= NOW - 86400)), rate = d.cost / Math.max(1, d.in + d.out + d.cache);
  const capCost = ok ? g.cost / u : null, leftCost = ok ? capCost * f : null;
  return { ...g, tok: g.in + g.out, all, f, u, ok, capCost, leftCost, capAll: ok && rate ? capCost / rate : null, leftAll: ok && rate ? leftCost / rate : null, col: f <= .1 ? 'var(--crit)' : f <= .25 ? 'var(--warn)' : 'var(--s1)' };
}
// 燃尽图：窗口内累计花费（实线）+ 按本窗口平均速度外推到重置（虚线）+ 估算上限（横线）
function burn(k, W, H) {
  const w = WINS[k], x = winUse(k), t0 = w.t - w.len, rs = ROWS.filter(r => r.t >= t0 && rowWin(r.m) === k).sort((a, b) => a.t - b.t), el = NOW - t0;
  const rate = x.cost > 0 && el > 600 ? x.cost / el : 0, proj = x.cost + rate * Math.max(0, w.t - NOW), cap = x.capCost, top = Math.max(cap || 0, proj, x.cost, .01) * 1.12;
  const px = t => (t - t0) / w.len * W, py = v => H - 14 - v / top * (H - 26); let acc = 0, d = `M0,${py(0)}`;
  rs.forEach(r => { d += `L${px(r.t).toFixed(1)},${py(acc).toFixed(1)}`; acc += r.cost; d += `L${px(r.t).toFixed(1)},${py(acc).toFixed(1)}`; }); d += `L${px(NOW).toFixed(1)},${py(acc).toFixed(1)}`;
  const hit = cap && rate && proj > cap ? NOW + (cap - x.cost) / rate : null, endT = hit || w.t, endV = hit ? cap : proj;
  const note = !x.all ? '还没用过，用了才开始计时' : hit ? `按本窗口的平均速度，${atLocal(hit)} 用完` : cap ? `按本窗口的平均速度，到重置时用到 ${Math.round(proj / cap * 100)}%` : '用得太少，暂无法预测';
  const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block;overflow:visible">
    <line x1="0" x2="${W}" y1="${py(0)}" y2="${py(0)}" stroke="var(--axis)"/>
    ${cap ? `<line x1="0" x2="${W}" y1="${py(cap)}" y2="${py(cap)}" stroke="var(--fg-4)" stroke-dasharray="2 4"/><text x="${W}" y="${py(cap) - 5}" fill="var(--fg-4)" font-size="10.5" text-anchor="end">${fUSD(cap)}</text>` : ''}
    ${x.all ? `<defs><linearGradient id="bg${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${x.col}" stop-opacity=".28"/><stop offset="1" stop-color="${x.col}" stop-opacity="0"/></linearGradient></defs><path d="${d}L${px(NOW).toFixed(1)},${py(0)}L0,${py(0)}Z" fill="url(#bg${k})"/><path d="${d}" fill="none" stroke="${x.col}" stroke-width="1.75" stroke-linejoin="round"/>
    ${rate ? `<line x1="${px(NOW)}" y1="${py(acc)}" x2="${px(endT)}" y2="${py(endV)}" stroke="${hit ? 'var(--crit)' : 'var(--fg-3)'}" stroke-width="1.5" stroke-dasharray="3 4" stroke-linecap="round"/>` : ''}
    <circle cx="${px(NOW)}" cy="${py(acc)}" r="3.5" fill="${x.col}" stroke="var(--background)" stroke-width="2"/>` : ''}
    <text x="0" y="${H - 1}" fill="var(--fg-4)" font-size="10.5">${x.all ? atLocal(t0) : ''}</text><text x="${W}" y="${H - 1}" fill="var(--fg-4)" font-size="10.5" text-anchor="end">${x.all ? atLocal(w.t) : ''}</text>${hit ? `<text x="${px(hit)}" y="${py(cap) + 14}" fill="var(--crit)" font-size="10.5" text-anchor="middle">${atLocal(hit)} 用完</text>` : cap && rate ? `<text x="${W}" y="${py(proj) - 7}" fill="var(--fg-3)" font-size="10.5" text-anchor="end">${Math.round(proj / cap * 100)}%</text>` : ''}</svg>`;
  return { svg, note, x };
}
// 每个模型一次调用平均花多少（近 7 天），以及按所在额度池的估算余额还能调用几次
function perModel() {
  return groupBy(ROWS.filter(r => r.t >= NOW - 7 * 86400 && r.m >= 0), 'm').map(g => { const k = rowWin(g.key), x = k >= 0 ? winUse(k) : null, avg = g.cost / g.n;
    return { key: g.key, n: g.n, avg, tok: (g.in + g.out + g.cache) / g.n, win: k, left: x && x.ok ? Math.floor(x.leftCost / avg) : null, all: x && !x.all ? 0 : 1 }; }).sort((a, b) => b.n - a.n);
}
function buildQuota(models) {
  // 窗口：按重置时刻归组；剩余时间不超过 5 小时的算 5 小时窗口，其余算周窗口
  const wmap = new Map(), list = [];
  for (const [id, m] of Object.entries(models)) {
    if (m.disabled || !m.displayName || !m.quotaInfo || !m.quotaInfo.resetTime) continue;
    const t = Math.floor(Date.parse(m.quotaInfo.resetTime) / 1000), key = Math.round(t / 60);
    if (!wmap.has(key)) wmap.set(key, { t, provs: new Set(), n: 0 });
    const f = m.quotaInfo.remainingFraction ?? 0, dup = list.find(x => x.name === m.displayName && x.wkey === key);
    if (dup) { dup.aliases.push(id); dup.f = Math.min(dup.f, f); continue; }   // 同名别名合并
    list.push({ id, name: m.displayName, f, wkey: key, prov: logoOf(id), aliases: [id] });
  }
  WINS = [...wmap.entries()].sort((a, b) => a[1].t - b[1].t).map(([key, w]) => ({ key, ...w }));
  list.forEach(m => { const w = WINS.find(x => x.key === m.wkey); w.provs.add(m.prov); w.n++; m.win = WINS.indexOf(w); });
  WINS.forEach(w => { const five = w.t - NOW <= 5 * 3600 + 600; w.len = five ? 5 * 3600 : 7 * 86400; w.kind = five ? '5 小时' : '每周';
    const pv = [...w.provs].map(p => p === 'gemini' ? 'Gemini' : p === 'claude' ? 'Claude' : 'GPT'); w.who = pv.join('/'); w.short = `${w.kind} · ${w.who}`; w.tip = `${w.kind}窗口（${w.n} 个模型）`; });
  const calls = m => { const w = WINS[m.win], ids = m.aliases.map(a => U.models.indexOf(a)).filter(i => i >= 0); return ids.length ? ROWS.filter(r => r.raw && ids.includes(r.m) && r.t >= w.t - w.len).length : 0; };
  FAM = []; OTHER = []; QM = list; rowWinCache.clear();
  for (const m of list) {
    const mt = m.name.match(/^(.*?)\s*\((Low|Medium|High|XHigh)\)$/);
    m.calls = calls(m);
    Object.defineProperty(m, 'reset', { get: () => winAt(m.win) }); Object.defineProperty(m, 'cd', { get: () => winCd(m.win) });
    if (!mt) { OTHER.push(m); continue; }
    const famName = mt[1], famId = 'fam:' + famName + ':' + m.win; let fam = FAM.find(x => x[1] === famId);
    if (!fam) { fam = [famName, famId, [null, null, null, null], m.win, null, [0, 0, 0, 0], [null, null, null, null], m.prov]; FAM.push(fam); }
    const ti = TIERS.indexOf(mt[2]); fam[2][ti] = m.f; fam[5][ti] = m.calls; fam[6][ti] = m.id; m.fam = famId; m.name = `${famName} · ${mt[2]}`;
  }
  QM = list;
}

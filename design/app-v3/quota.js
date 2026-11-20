/* ===== 额度：默认只看用过的；其余折叠成一行，不分页 ===== */
// 剩余比例为演示状态（本机实测当前全部 100%）；模型清单与重置时间来自 GetAvailableModels
const TIERS = ['Low', 'Medium', 'High', 'XHigh'];
const FAM = [
  ['Gemini 4 Neon', 'gemini-4-neon', [1, .94, .18, .62], '12:00', '3h 53m', [0, 6, 172, 41]],
  ['Gemini 4 Hydrogen', 'gemini-4-hydrogen', [1, 1, .85, 1], '12:00', '3h 53m', [0, 0, 38, 0]],
  ['Gemini 4 Argon', 'gemini-4-argon', [1, 1, .76, null], '11-27 07:12', '6d 23h', [0, 0, 18, 0]],
  ['Gemini 3.8 Flash', 'gemini-3.8-flash', [1, 1, 1, null], '12:00', '3h 53m', [0, 0, 0, 0]],
  ['Claude Opus 5.5', 'claude-opus-5-5', [1, .71, .07, null], '12:12', '4h 05m', [0, 9, 64, 0]],
  ['Claude Sonnet 5.5', 'claude-sonnet-5-5', [1, 1, .9, null], '12:12', '4h 05m', [0, 0, 4, 0]],
];
const OTHER = [['Gemini 3.1 Flash Image', 'gemini-3.1-flash-image', .55, '12:00', '3h 53m', 23], ['Gemini 4 Hydrogen · Orchestrator', 'gemini-flash-worker-agy', .97, '12:00', '3h 53m', 12], ['Gemini 3.5 Flash Lite', 'gemini-3.5-flash-lite', 1, '12:00', '3h 53m', 0], ['Gemini 3.1 Flash Lite', 'gemini-3.1-flash-lite', 1, '12:00', '3h 53m', 0], ['Gemini 3 Flash', 'gemini-3-flash', 1, '12:00', '3h 53m', 0], ['Gemini 2.5 Pro', 'gemini-2.5-pro', 1, '12:00', '3h 53m', 0], ['Orchestrator · Neon', 'gemini-pro-orchestrator-neon', 1, '12:00', '3h 53m', 0], ['Orchestrator · Argon', 'gemini-pro-orchestrator-g1-pro', 1, '11-27 07:12', '6d 23h', 0], ['Gemini 4 Hydrogen · Sonar', 'gemini-4-hydrogen-sonar', 1, '12:00', '3h 53m', 0], ['GPT-OSS 120B', 'gpt-oss-120b-medium', 1, '12:12', '4h 05m', 0]];
const QM = [];
FAM.forEach(([n, id, fs, reset, cd, calls]) => fs.forEach((f, i) => { if (f != null) QM.push({ id: `${id}-${TIERS[i].toLowerCase()}`, name: `${n} · ${TIERS[i]}`, fam: id, f, reset, cd, calls: calls[i], prov: logoOf(id) }); }));
OTHER.forEach(([n, id, f, reset, cd, calls]) => QM.push({ id, name: n, f, reset, cd, calls, prov: logoOf(id) }));
QM.find(m => m.id === 'claude-opus-5-5-high').eta = '09:45';
const qBy = id => QM.find(m => m.id === id);
const QF = { used: ['使用过', m => m.f < 1], attn: ['需留意', m => m.f <= .25], pin: ['已关注', m => st.q.pins.has(m.id)], all: ['全部', () => true] };
const qPass = m => QF[st.q.f][1](m) && (!st.q.prov || m.prov === st.q.prov) && (!st.q.s || (m.name + ' ' + m.id).toLowerCase().includes(st.q.s.toLowerCase()));

function qDetail(m, colspan) {
  const known = U.models.indexOf(m.id), d0 = Math.floor((NOW + TZ) / 86400) * 86400 - TZ - 6 * 86400;
  const days = [...Array(7)].map((_, i) => ROWS.filter(r => r.m === known && known >= 0 && r.t >= d0 + i * 86400 && r.t < d0 + (i + 1) * 86400).reduce((a, r) => a + r.in + r.out, 0));
  const total = days.reduce((a, b) => a + b, 0), pinned = st.q.pins.has(m.id);
  const kv = (k, v) => `<div><div class="lbl">${k}</div><div class="num" style="margin-top:6px;font-size:14px;font-weight:500">${v}</div></div>`;
  const inner = `<div style="background:var(--hover);border-radius:10px;padding:16px 18px;margin:6px 0 10px">
    <div class="row" style="gap:10px">${lg(m.id, 16)}<span style="font-weight:500">${m.name}</span><span class="mono dim">${m.id}</span><span class="sp"></span>
      <span class="btn" ${A('pin', m.id)}>${ic('keep', 14)}${pinned ? '取消关注' : '关注'}</span><span class="btn" ${A('usein', m.id)}>${ic('north_east', 14)}看它的调用</span><span class="ctl" ${A('qopen', '')}>${ic('close')}</span></div>
    <div style="display:grid;grid-template-columns:repeat(4,120px) 1fr;gap:24px;margin-top:16px;align-items:end">
      ${kv('剩余', Math.round(m.f * 100) + '%')}${kv('重置', `${m.reset} <span class="dim2" style="font-weight:400;font-size:12px">${m.cd}</span>`)}${kv('今日调用', m.calls || '—')}${kv('预计', m.eta ? m.eta + ' 用完' : m.f < 1 ? '撑到重置' : '—')}
      <div><div class="lbl" style="justify-content:space-between"><span>近 7 天真实消耗</span><span class="num">${total ? fmt(total) : '无记录'}</span></div><div style="margin-top:8px">${total ? spark(days, 300, 26, 'var(--s1)', { area: 1 }) : `<span style="display:block;height:1px;background:var(--axis);margin-top:25px"></span>`}</div></div>
    </div></div>`;
  return colspan ? `<tr><td colspan="${colspan}" style="height:auto;padding:0;border-bottom:1px solid var(--border)">${inner}</td></tr>` : `<div style="grid-column:1/-1">${inner}</div>`;
}
function vQuota() {
  const cnt = k => QM.filter(m => QF[k][1](m)).length, shown = QM.filter(qPass), hidden = QM.length - shown.length, open = st.q.open && qBy(st.q.open);
  const fams = FAM.filter(([, id]) => shown.some(m => m.fam === id)), others = shown.filter(m => !m.fam);
  const mark = f => f <= .1 ? `<span class="ms" style="font-size:14px;color:var(--crit);margin-left:-4px">error</span>` : f <= .25 ? `<span class="ms" style="font-size:14px;color:var(--warn);margin-left:-4px">warning</span>` : '';
  const cell = (f, id) => f == null ? `<td class="dim2">—</td>` : `<td ${A('qopen', id)} ${tipA(`<span class="mono dim">${id}</span><br>点击查看详情`)} style="${st.q.open === id ? 'box-shadow:inset 0 -1.5px 0 var(--fg)' : ''}"><span class="row" style="gap:10px;opacity:${qPass(qBy(id)) ? 1 : .35}">${qm(f, 72)}<span style="font-size:12.5px;width:30px">${pc(f)}</span>${mark(f)}${st.q.pins.has(id) ? `<span class="dim2">${ic('keep', 13)}</span>` : ''}</span></td>`;
  const provs = ['gemini', 'claude', 'openai'].map(p => `<span class="ctl ${st.q.prov === p ? '' : ''}" ${A('qprov', st.q.prov === p ? '' : p)} style="padding:0 7px;${st.q.prov === p ? 'background:var(--selected)' : ''}" ${tipA(`只看 ${p === 'gemini' ? 'Gemini' : p === 'claude' ? 'Claude' : 'OpenAI'}`)}><img class="lg" src="assets/${p}.svg"></span>`).join('');
  return shell(sub(`${provs}<span class="inp">${ic('search', 16)}<input data-i="qs" placeholder="搜索模型" value="${st.q.s}"><kbd>/</kbd></span>`) + `<div class="body scroll" style="overflow-y:auto">
    <div class="cols" style="grid-template-columns:repeat(4,1fr)">
      ${[['used', '今天动用过额度的模型'], ['attn', '剩余不足 25%'], ['pin', '固定显示在概览和输入框'], ['all', '已合并 6 个同名别名，3 个停用或补全专用未计入']].map(([k, c]) => `<div class="stat ${st.q.f === k ? 'on' : ''}" ${A('qf', k)}><div class="lbl" style="${st.q.f === k ? 'color:var(--fg)' : ''}">${QF[k][0]}</div><div class="big num">${cnt(k)}</div><div class="cap">${c}</div></div>`).join('')}
    </div>
    <div class="hr" style="margin-top:22px"></div>
    ${fams.length ? `<div class="h"><h3>按推理强度</h3><div class="x num">每日窗口 12:00 重置 · Claude / GPT 12:12 · Argon 每周</div></div>
    <table class="t"><thead><tr><th style="width:230px">模型</th>${TIERS.map(t => `<th style="width:156px">${t}</th>`).join('')}<th class="r">今日调用</th><th class="r" style="width:150px">重置</th></tr></thead><tbody>
      ${fams.map(([n, id, fs, rt, cd, calls]) => `<tr><td><span class="row" style="gap:10px">${lg(id)}${n}</span></td>${fs.map((f, i) => cell(f, `${id}-${TIERS[i].toLowerCase()}`)).join('')}<td class="r num" style="color:${calls.some(Boolean) ? 'var(--fg-2)' : 'var(--fg-4)'}">${calls.reduce((a, b) => a + b, 0) || '—'}</td><td class="r num dim">${rt} <span class="dim2">· ${cd}</span></td></tr>${open && open.fam === id ? qDetail(open, 7) : ''}`).join('')}
    </tbody></table>` : ''}
    ${others.length ? `<div class="h" style="margin-top:${fams.length ? 28 : 0}px"><h3>其他模型</h3></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;column-gap:48px">
      ${others.map(m => `<div class="row rowh" ${A('qopen', m.id)} style="height:36px;gap:10px;border-bottom:1px solid var(--border);border-radius:0">${lg(m.id)}<span class="el" style="flex:1">${m.name}</span>${st.q.pins.has(m.id) ? `<span class="dim2">${ic('keep', 13)}</span>` : ''}${qm(m.f, 72)}<span class="r" style="width:36px;font-size:12.5px">${pc(m.f)}</span><span class="num dim2 r" style="width:84px;font-size:12px">${m.reset}</span></div>${open && open.id === m.id ? qDetail(open) : ''}`).join('')}
    </div>` : ''}
    ${!shown.length ? `<div class="cap" style="padding:40px 0;text-align:center">没有符合条件的模型　<span class="lk" ${A('qreset')}>清除筛选</span></div>` : ''}
    ${hidden && shown.length ? `<div class="row rowh" ${A('qreset')} style="height:40px;margin-top:14px;gap:8px;color:var(--fg-3);font-size:12.5px">${ic('expand_more', 17)}另有 ${hidden} 个模型未显示${st.q.f === 'used' && !st.q.prov && !st.q.s ? '，额度均为 100%' : ''}<span class="sp"></span><span class="lk">显示全部</span></div>` : ''}
  </div>`);
}

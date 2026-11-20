// 共用筛选：一个按钮 + 悬浮面板（时间、粒度、厂商、额度池、来源、条件、模型、会话）。概览、用量、明细共用同一份筛选
const PROVS = [['gemini', 'Gemini'], ['claude', 'Claude'], ['openai', 'GPT'], ['unk', '未标注']];
const isoDay = t => { const d = L(t); return `${d.getUTCFullYear()}-${hh(d.getUTCMonth() + 1)}-${hh(d.getUTCDate())}`; };
const fromIso = v => { const m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(v || ''); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) / 1000 - TZ : null; };
function filterPanel() {
  const f = st.fx, all = rowsIn({ noModel: 1, noSess: 1 }), cur = rowsIn(), t = agg(cur);
  const ms = groupBy(rowsIn({ noModel: 1 }), 'm').sort((a, b) => b.in + b.out - a.in - a.out).slice(0, 8);
  const ss = groupBy(rowsIn({ noSess: 1 }), 'root').sort((a, b) => b.in + b.out - a.in - a.out).slice(0, 8);
  const has = new Set(all.map(provOf));
  const opt = (act, v, label, on, extra = '') => `<span class="fo ${on ? 'on' : ''}" ${A(act, v)}>${label}${extra}</span>`;
  const sec = (t, inner, x = '') => `<div class="fs"><div class="fh"><span>${t}</span>${x}</div>${inner}</div>`;
  const s = span(), cr = st.cr || [s.a, s.b - 86400];
  const time = RANGE_GROUPS.map(g => `<div class="fg">${g.map(k => `<div class="mi ${st.range === k ? 'on' : ''}" ${A('fr', k)}>${RANGES[k]}${st.range === k ? `<span class="ck">${ic('check', 15)}</span>` : ''}</div>`).join('')}</div>`).join('')
    + `<div class="fg"><div class="mi ${st.range === 'custom' ? 'on' : ''}" ${A('fr', 'custom')}>自定义${st.range === 'custom' ? `<span class="ck">${ic('check', 15)}</span>` : ''}</div>
      <div class="fdate"><span class="dim2">从</span><input type="date" data-i="d0" value="${isoDay(cr[0])}" max="${isoDay(NOW)}"></div><div class="fdate"><span class="dim2">到</span><input type="date" data-i="d1" value="${isoDay(cr[1])}" max="${isoDay(NOW)}"></div></div>`;
  const row = (act, key, on, label, v) => `<div class="mi ${on ? 'on' : ''}" ${A(act, on ? '' : key)}>${label}<span class="dim2 num" style="margin-left:auto;padding-left:12px">${fmt(v)}</span>${on ? `<span class="ck" style="padding-left:8px">${ic('check', 15)}</span>` : ''}</div>`;
  return `<div class="menu fpop" style="top:34px;right:0">
    <div class="fcol" style="width:200px;border-right:1px solid var(--border)">${sec('时间', time)}
      ${sec('粒度', `<div class="fos">${Object.entries(GRANS).map(([k, l]) => opt('fgran', k, l, st.gran === k)).join('')}</div>`)}</div>
    <div class="fcol" style="width:340px">
      ${sec('厂商', `<div class="fos">${opt('fx', 'prov=', '全部', !f.prov)}${PROVS.filter(([k]) => has.has(k) || f.prov === k).map(([k, l]) => opt('fx', 'prov=' + k, (k === 'unk' ? '' : lg(k === 'openai' ? 'gpt' : k, 13)) + l, f.prov === k)).join('')}</div>`)}
      ${WINS.length ? sec('额度池', `<div class="fos">${opt('fx', 'win=', '全部', f.win == null)}${WINS.map((w, k) => opt('fx', 'win=' + k, w.short, f.win === k)).join('')}</div>`) : ''}
      ${sec('来源', `<div class="fos">${[['all', '全部'], ['main', '主会话'], ['sub', '子代理']].map(([k, l]) => opt('fx', 'who=' + k, l, f.who === k)).join('')}</div>`)}
      ${sec('条件', `<div class="fos">${opt('fx', 'miss=!', ic('check', 14) + '未命中缓存', f.miss)}${opt('fx', 'big=!', ic('check', 14) + '单次输入 > 100K', f.big)}</div>`)}
      ${sec('模型', ms.map(g => row('fm', g.key, st.fModel === g.key, `${lg(MODEL_NAME(g.key))}<span class="mono el" style="max-width:210px">${MODEL_NAME(g.key)}</span>`, g.in + g.out)).join('') || '<div class="cap" style="margin:0 8px">没有记录</div>')}
      ${sec('会话', ss.map(g => row('fs', g.key, st.fSess === g.key, `<span class="el" style="max-width:230px">${SE[g.key].title}</span>`, g.in + g.out)).join('') || '<div class="cap" style="margin:0 8px">没有记录</div>')}
    </div>
    <div class="ffoot"><span class="dim num">${rangeLabel()} · ${comma(t.n)} 次调用 · ${fmt(t.in + t.out)} · 约 ${fUSD(t.cost)}</span><span class="row" style="gap:8px">${fxCount() ? `<span class="btn q" ${A('freset')}>重置</span>` : ''}<span class="btn p" ${A('fdone')}>完成</span></span></div>
  </div>`;
}
function filters(o = {}) {
  const n = fxCount(), f = st.fx;
  // 生效中的条件做成可单独移除的小标签
  const chips = [st.fModel != null && ['fModel', `${lg(MODEL_NAME(st.fModel))}<span class="mono el" style="max-width:150px">${MODEL_NAME(st.fModel)}</span>`],
    st.fSess != null && ['fSess', `<span class="el" style="max-width:150px">${SE[st.fSess].title}</span>`],
    f.prov && ['prov', PROVS.find(p => p[0] === f.prov)[1]], f.win != null && WINS[f.win] && ['win', WINS[f.win].short],
    f.who !== 'all' && ['who', f.who === 'sub' ? '子代理' : '主会话'], f.miss && ['miss', '未命中缓存'], f.big && ['big', '输入 > 100K']].filter(Boolean);
  const btn = `<span style="position:relative"><span class="ctl b" ${A('menu', 'flt')}>${ic('filter_list')}${rangeLabel()}${n ? `<span class="fbadge">${n}</span>` : ''}${ic('expand_more')}</span>${st.menu === 'flt' ? filterPanel() : ''}</span>`;
  return chips.map(([k, l]) => `<span class="fchip" ${A('fclr', k)}>${l}${ic('close', 13)}</span>`).join('') + btn + (o.extra || '');
}
const keepOpen = () => st.menu === 'flt' ? 'keep' : undefined;
const FILTER_ACT = {
  fr(v) { if (v === 'custom' && !st.cr) { const s = span(); st.cr = [s.a, s.b - 86400]; } st.range = v; st.lg.bucket = null; return keepOpen(); },
  fgran(v) { st.gran = v; return keepOpen(); },
  fx(v) { const [k, x] = v.split('='), f = st.fx; f[k] = x === '!' ? !f[k] : x === '' ? (k === 'win' || k === 'prov' ? null : x) : k === 'win' ? Number(x) : x; st.lg.bucket = null; return keepOpen(); },
  fm(v) { st.fModel = num(v); return keepOpen(); }, fs(v) { st.fSess = num(v); return keepOpen(); },
  fclr(k) { if (k === 'fModel' || k === 'fSess') st[k] = null; else st.fx[k] = FX0()[k]; },
  freset() { st.fx = FX0(); st.fModel = st.fSess = null; st.gran = 'auto'; return keepOpen(); },
  fdone() { st.menu = null; },
};
function setCustom(k, v) {
  const t = fromIso(v); if (t == null) return; const s = span(), cr = st.cr || [s.a, s.b - 86400];
  cr[k === 'd0' ? 0 : 1] = t; if (cr[0] > cr[1]) cr.reverse(); st.cr = cr; st.range = 'custom'; st.lg.bucket = null; saveSt();
}

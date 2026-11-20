/* ===== 概览：只回答三件事 —— 还剩多少、花在哪、有什么值得注意 ===== */
// 洞察：全部由当前范围内的真实记录算出，每条都能点进证据
function insights() {
  const rs = rowsIn({ noModel: 1, noSess: 1 }), t = agg(rs), real = t.in + t.out, out = [];
  if (!rs.length) return out;
  const top = groupBy(rs, 'root').sort((a, b) => b.in + b.out - a.in - a.out)[0];
  if (top && (top.in + top.out) / real > .3) out.push({ i: 'forum', h: `「${SE[top.key].title}」占了 ${Math.round((top.in + top.out) / real * 100)}% 的真实消耗`, d: `${top.n} 次调用，${fmt(top.in + top.out)} tokens`, a: ['insSess', top.key] });
  const miss = rs.filter(r => r.cache === 0 && r.in > 100000);
  if (miss.length) out.push({ i: 'cached', h: `${miss.length} 次调用没有命中缓存，且单次输入超过 100K`, d: `共 ${fmt(miss.reduce((a, r) => a + r.in, 0))} 新增输入，是这段时间最贵的调用`, a: ['insMiss'] });
  const recent = agg(rs.filter(r => r.t >= NOW - 6 * 3600)), hr = pct(recent.cache, recent.cache + recent.in), ha = pct(t.cache, t.cache + t.in);
  if (recent.n > 5 && ha - hr > .08) out.push({ i: 'trending_down', h: `近 6 小时缓存命中率 ${Math.round(hr * 100)}%，低于区间平均的 ${Math.round(ha * 100)}%`, d: '通常是新开会话或上下文被压缩', a: ['insHit'] });
  const kids = rs.filter(r => SE[r.s].child), ka = agg(kids);
  if (kids.length) out.push({ i: 'hub', h: `${new Set(kids.map(r => r.s)).size} 个子代理用了 ${fmt(ka.in + ka.out)}`, d: '已计入各自的父会话', a: ['insKids'] });
  const un = rs.filter(r => r.m < 0).length;
  if (un / rs.length > .2) out.push({ i: 'label_off', h: `${Math.round(un / rs.length * 100)}% 的记录无法确定模型`, d: 'Antigravity 没有写入模型字段，所属会话里也没有可参考的记录', a: ['insUnl'] });
  return out.slice(0, 4);
}
function vOverview() {
  const rs = rowsIn(), t = agg(rs), real = t.in + t.out, hit = pct(t.cache, t.cache + t.in), a = ACC[st.acc.cur], bs = buckets();
  const rows = bs.map(b => { const g = agg(rs.filter(r => r.t >= b.a && r.t < b.b)); return { label: b.label, parts: [g.in, g.out], act: ['bucket', b.a + ',' + b.b], tip: `<span class="dim">${b.long}</span><br>${sw('var(--s1)')}新增输入 ${fmt(g.in)}<br>${sw('var(--s2)')}输出 ${fmt(g.out)}<br><span class="dim">缓存 ${fmt(g.cache)} · ${g.n} 次调用 · 点击查看明细</span>` }; });
  const prio = m => m.f <= .25 || st.q.pins.has(m.id) ? 0 : 1;
  const watch = QM.filter(m => m.f < 1 || st.q.pins.has(m.id)).sort((x, y) => prio(x) - prio(y) || x.f - y.f).slice(0, 6);
  const rest = QM.filter(m => m.f >= 1).length;
  const ss = groupBy(rs, 'root').sort((x, y) => y.in + y.out - x.in - x.out).slice(0, 5), sm = ss.length ? ss[0].in + ss[0].out : 1;
  const ins = insights();
  const stat = (act, v, lbl, big, mid, cap) => `<div class="stat" ${A(act, v)}><span class="go">${ic('north_east', 15)}</span><div class="lbl">${lbl}</div><div class="big num">${big}</div><div style="margin-top:14px">${mid}</div><div class="cap num">${cap}</div></div>`;
  return shell(sub(filters()) + `<div class="body">
    <div class="cols" style="grid-template-columns:repeat(4,1fr)">
      ${stat('tab', 'quota', 'Prompt 积分', credit(a.pa, a.pb), qm(a.pa / a.pb, '100%'), `剩余 ${(a.pa / a.pb * 100).toFixed(1)}% · 本月已用 ${comma(a.pb - a.pa)}`)}
      ${stat('tab', 'quota', 'Flow 积分', credit(a.fa, a.fb), qm(a.fa / a.fb, '100%'), `剩余 ${(a.fa / a.fb * 100).toFixed(2)}% · 本月已用 ${comma(a.fb - a.fa)}`)}
      ${stat('metric', 'real', `真实消耗 · ${RANGES[st.range]}`, fmt(real), `<span style="display:flex;height:3px;gap:2px"><span style="flex:${t.in || 1};background:var(--s1);border-radius:2px"></span><span style="flex:${t.out || 1};background:var(--s2);border-radius:2px"></span></span>`, `输入 ${fmt(t.in)} · 输出 ${fmt(t.out)}`)}
      ${stat('metric', 'cache', `缓存命中率 · ${RANGES[st.range]}`, `${(hit * 100).toFixed(1)}<small>%</small>`, bar(hit, 'var(--s3)'), `复用 ${fmt(t.cache)} · 仅 ${fmt(t.in)} 为新增输入`)}
    </div>
    <div class="hr"></div>
    <div class="cols" style="grid-template-columns:1fr 388px">
      <div>
        <div class="h"><h3>Tokens</h3><div class="x"><span class="num">${comma(t.n)} 次调用</span><span class="lgd"><span><i style="background:var(--s1)"></i>新增输入</span><span><i style="background:var(--s2)"></i>输出</span></span>${seg([['24h', '24h'], ['7d', '7d'], ['all', '全部']], st.range, 'range')}</div></div>
        ${chart({ rows, colors: ['var(--s1)', 'var(--s2)'], w: 652, h: 250, every: st.range === '24h' ? 3 : 1, barMax: st.range === '24h' ? 14 : 22 })}
      </div>
      <div>
        <div class="h"><h3>模型额度</h3><div class="x"><span class="lk" ${A('tab', 'quota')}>全部 ${QM.length} 个${ic('chevron_right')}</span></div></div>
        ${watch.map(m => `<div class="row rowh" ${A('qopen', m.id)} style="height:36px;gap:10px">${lg(m.id)}<span class="el" style="flex:1">${m.name}</span>${st.q.pins.has(m.id) ? `<span class="dim2">${ic('keep', 13)}</span>` : ''}${qm(m.f, 64)}<span class="r" style="width:34px;font-size:12.5px">${pc(m.f)}</span><span class="num r" style="width:72px;font-size:12px;color:${m.eta ? 'var(--fg)' : 'var(--fg-4)'}">${m.eta ? m.eta + ' 用完' : m.cd}</span></div>`).join('')}
        <div class="cap" style="margin-top:10px">${rest} 个模型未动用，额度 100%　·　${ic('keep', 13)} 为已关注，固定显示</div>
      </div>
    </div>
    <div class="hr"></div>
    <div class="cols" style="grid-template-columns:1fr 1.25fr">
      <div>
        <div class="h"><h3>会话</h3><div class="x">真实消耗 · 点击筛选</div></div>
        ${ss.map(g => `<div class="row rowh" ${A('insSess', g.key)} style="height:32px;gap:12px"><span class="el" style="flex:1;color:var(--fg-2)">${SE[g.key].title}</span>${SE[g.key].kids ? `<span class="dim2" style="font-size:11.5px;display:flex;align-items:center;gap:3px" ${tipA(`含 ${SE[g.key].kids} 个子代理`)}>${ic('hub', 13)}${SE[g.key].kids}</span>` : ''}<span style="width:72px">${bar((g.in + g.out) / sm, 'rgb(255 255 255 / .38)')}</span><span class="num r" style="width:46px;font-size:12.5px">${fmt(g.in + g.out)}</span></div>`).join('') || '<div class="cap">这段时间没有调用</div>'}
      </div>
      <div>
        <div class="h"><h3>洞察</h3><div class="x">由${RANGES[st.range]}的记录算出</div></div>
        ${ins.map(x => `<div class="ins" ${A(x.a[0], x.a[1])}>${ic(x.i, 17)}<div><div>${x.h}</div><div class="dim" style="font-size:12px;margin-top:3px">${x.d}</div></div><span class="go">${ic('chevron_right', 16)}</span></div>`).join('') || '<div class="cap">没有需要注意的情况</div>'}
      </div>
    </div>
  </div>`);
}

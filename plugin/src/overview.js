/* ===== 概览：Tokens 地平线 + 三个额度池 + 会话光谱 / 缓存命中 ===== */
// 主视觉：每个时段的新增输入画成山脊，输出画成前景，远山是总量；最紧张的 5 小时窗口画成太阳弧，太阳在「现在」
function landscape(bs, rs, W, H = 330) {
  const G = H - 38, n = bs.length, at = bIdx(bs), B = bs.map(() => []); rs.forEach(r => B[at(r)].push(r));
  const g = B.map(agg), inp = g.map(x => x.in), out = g.map(x => x.out), tot = g.map(x => x.in + x.out);
  const mx = Math.max(...tot, 1), X = i => (i + .5) / n * W, sc = (G - 120);
  const ridge = (vals, k) => { const sm = smooth(vals, n > 30 ? 1.1 : .8), pts = sm.map((v, i) => [X(i), G - v / mx * sc * k]); pts.unshift([0, pts[0][1]]); pts.push([W, pts[pts.length - 1][1]]); return `M0,${G}L${pts[0][0]},${pts[0][1]}${curve(pts).replace(/^M[^C]*/, '')}L${W},${G}Z`; };
  const L2 = isLight(), s0 = bs[0].a, s1 = bs[n - 1].b, TX = t => (t - s0) / (s1 - s0) * W;
  let sun = '';
  const k5 = WINS.map((w, k) => k).filter(k => WINS[k].len === 5 * 3600 && winUse(k).all > 0).sort((a, b) => winUse(a).f - winUse(b).f)[0];
  if (k5 != null && NOW >= s0 && NOW <= s1 + 60) {
    const w = WINS[k5], t0 = Math.max(s0, w.t - w.len), a0 = TX(t0), a1 = Math.min(W, TX(w.t)), ar = Math.max(30, (a1 - a0) / 2), cx = a0 + ar, f = Math.max(0, Math.min(1, (NOW - t0) / (w.t - t0))), th = Math.PI * (1 - f), sx = cx + ar * Math.cos(th), sy = G - 40 - ar * .9 * Math.sin(th);
    sun = `<path d="M${a0},${G - 40} A${ar},${ar * .9} 0 0 1 ${a0 + 2 * ar},${G - 40}" fill="none" style="stroke:${ink(.25)}" stroke-dasharray="1 5" stroke-linecap="round" stroke-width="1.6"/>
      <circle cx="${sx}" cy="${sy}" r="34" fill="url(#sun)"/><circle cx="${sx}" cy="${sy}" r="7" fill="${L2 ? '#F7A93B' : '#FFF1D2'}"/>
      <text x="${a0 + 2 * ar - 4}" y="${G - 22}" text-anchor="end" style="fill:var(--fg-2);font-size:12px">${winAt(k5)} 重置</text><text x="${a0 + 4}" y="${G - 22}" style="fill:var(--fg-4);font-size:12px">${atLocal(t0)}</text>`;
  }
  let stars = ''; if (!L2) { let sd = 7; const rnd = () => (sd = (sd * 9301 + 49297) % 233280) / 233280; for (let i = 0; i < 46; i++) stars += `<circle cx="${(rnd() * W * .78 + 20).toFixed(0)}" cy="${(rnd() * 150 + 8).toFixed(0)}" r="${(rnd() + .4).toFixed(1)}" fill="#fff" opacity="${(rnd() * .35 + .08).toFixed(2)}"/>`; }
  const pk = tot.indexOf(Math.max(...tot)), px = X(pk), py = G - smooth(inp, n > 30 ? 1.1 : .8)[pk] / mx * sc - 4; const ly = Math.max(178, py - 36), l0 = Math.max(188, py - 46);
  const C = L2 ? { f0: '#7FB0FF', f1: .22, m1: '#D6E6FF', o1: '#FFE9CF', m2: .5, o2: .6 } : { f0: '#5B9BFF', f1: .16, m1: '#2F5FB8', o1: '#D95926', m2: .25, o2: .35 };
  const every = Math.max(1, Math.ceil(n / 6)), labels = bs.map((b, i) => i % every === 0 && i ? `<text x="${X(i)}" y="${H - 6}" text-anchor="middle">${b.label}${b.label.length <= 2 ? ':00' : ''}</text>` : '').join('');
  const hits = bs.map((b, i) => `<rect class="hb" x="${(i / n * W).toFixed(1)}" y="0" width="${(W / n).toFixed(1)}" height="${G}" fill="transparent" ${tipA(`<span class="dim">${b.long}</span><br>${sw('#5B9BFF')}新增输入 ${fmt(g[i].in)}<br>${sw('#F2B35B')}输出 ${fmt(g[i].out)}${g[i].n ? `<br><span class="dim">缓存命中 ${Math.round(pct(g[i].cache, g[i].cache + g[i].in) * 100)}% · ${g[i].n} 次 · 约 ${fUSD(g[i].cost)} · 点击查看明细</span>` : ''}`)} ${g[i].n ? A('bucket', b.a + ',' + b.b) : ''}/>`).join('');
  return `<svg width="${W}" height="${H}" style="display:block;overflow:visible;font-size:11.5px;fill:var(--fg-4)" class="land"><defs>
    <linearGradient id="far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.f0}" stop-opacity="${C.f1}"/><stop offset="1" stop-color="${C.f0}" stop-opacity=".02"/></linearGradient>
    <linearGradient id="mid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5B9BFF" stop-opacity=".92"/><stop offset="1" stop-color="${C.m1}" stop-opacity="${C.m2}"/></linearGradient>
    <linearGradient id="fr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${L2 ? '#F7B267' : '#F2B35B'}" stop-opacity=".95"/><stop offset="1" stop-color="${C.o1}" stop-opacity="${C.o2}"/></linearGradient>
    <radialGradient id="sun" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFE6B0"/><stop offset=".35" stop-color="#F2B35B" stop-opacity=".9"/><stop offset="1" stop-color="#F2B35B" stop-opacity="0"/></radialGradient></defs>
    <path d="${ridge(inp, 1)}" fill="url(#mid)" opacity=".82"/><path d="${ridge(out.map(v => v * 2.2), 1)}" fill="url(#fr)"/>
    ${tot[pk] > 0 ? `<line x1="${px}" x2="${px}" y1="${l0}" y2="${py}" style="stroke:${ink(.35)}"/><text x="${px > W - 180 ? px - 8 : px + 8}" y="${ly}" text-anchor="${px > W - 180 ? 'end' : 'start'}" style="fill:var(--fg-2);font-size:12px">峰值 ${fmt(tot[pk])} · ${bs[pk].long.split(' ').pop().split('–')[0]}</text>` : `<text x="${W / 2}" y="${G / 2}" text-anchor="middle" style="fill:var(--fg-4);font-size:13px">这段时间没有调用</text>`}
    <line x1="0" x2="${W}" y1="${G}" y2="${G}" style="stroke:${ink(.16)}"/>
    <text x="0" y="${H - 6}">${bs[0].long.split('–')[0]}</text>${labels}
    ${hits}</svg>`;
}
// 会话光谱带：宽度 = 真实消耗占比
function spectrum(ss, total, W, H = 46) {
  const g = 3, big = ss.slice(0, 2), rest = ss.slice(2); let x = 0, s = '', lab = '';
  const avail = W - g * Math.max(0, ss.length - 1);
  ss.forEach((se, i) => {
    const v = se.in + se.out, w = Math.max(4, avail * v / total), id = 'sp' + i, c1 = PAL[i % PAL.length], c2 = PAL[(i + 1) % PAL.length], r = i === 0 || i === ss.length - 1 ? 12 : 4;
    s += `<defs><linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}" stop-opacity=".85"/></linearGradient></defs><g class="hit" ${A('insSess', se.key)} ${tipA(`<b>${SE[se.key].title}</b><br>${fmt(v)} · ${pctS(v / total)} · ${comma(se.n)} 次 · 约 ${fUSD(se.cost)}${SE[se.key].kids ? ` · ${SE[se.key].kids} 个子代理` : ''}<br><span class="dim">点击查看这个会话的用量</span>`)}><rect x="${x}" width="${w}" height="${H}" rx="${r}" fill="url(#${id})"/>${i === 0 && ss.length > 1 ? `<rect x="${x + 12}" width="${Math.max(0, w - 12)}" height="${H}" fill="url(#${id})"/>` : ''}${i === ss.length - 1 && i > 0 ? `<rect x="${x}" width="${Math.max(0, Math.min(w, 12) + 4)}" height="${H}" rx="4" fill="${c1}"/>` : ''}</g>`;
    if (i < 2 && w > 110) lab += `<div style="position:absolute;left:${x}px;top:${H + 12}px;width:${w - 8}px"><div class="el" style="font-size:13px">${SE[se.key].title}</div><div class="num" style="font-size:12px;color:var(--fg-4);margin-top:2px">${fmt(v)} · ${pctS(v / total)}</div></div>`;
    x += w + g;
  });
  if (rest.length) lab += `<div style="position:absolute;right:0;top:${H + 12}px;display:flex;flex-direction:column;gap:3px;align-items:flex-end">${rest.slice(0, 3).map((se, k) => `<div class="row num" style="gap:7px;font-size:12px;color:var(--fg-3)"><i style="width:7px;height:7px;border-radius:2px;background:${PAL[(k + 2) % PAL.length]}"></i><span class="el" style="max-width:150px">${SE[se.key].title}</span><span style="color:var(--fg-4)">${fmt(se.in + se.out)}</span></div>`).join('')}</div>`;
  return `<div style="position:relative;height:${H + 76}px"><svg width="${W}" height="${H}" style="display:block">${s}</svg>${lab}</div>`;
}
// 缓存命中曲线：虚线是区间平均，末端标最近 6 小时
function cacheLine(bs, rs, W, H = 104) {
  const at = bIdx(bs), B = bs.map(() => []); rs.forEach(r => B[at(r)].push(r));
  const v = B.map(x => { const g = agg(x); return g.n ? pct(g.cache, g.cache + g.in) : null; }), pts = [];
  const all = agg(rs), avg = pct(all.cache, all.cache + all.in), rec = agg(rs.filter(r => r.t >= NOW - 6 * 3600)), rh = rec.n ? pct(rec.cache, rec.cache + rec.in) : null;
  const lo = Math.max(0, Math.min(...v.filter(x => x != null), avg) - .08), X = i => (i + .5) / bs.length * W, Y = x => 6 + (1 - (x - lo) / (1 - lo || 1)) * (H - 12);
  v.forEach((x, i) => { if (x != null) pts.push([X(i), Y(x)]); });
  if (pts.length < 2) return `<div class="cap" style="height:${H}px;display:grid;place-items:center">数据不足</div>`;
  const d = curve(pts), e = pts[pts.length - 1];
  return `<svg width="${W - 64}" height="${H}" style="display:block;overflow:visible;font-size:11.5px"><defs><linearGradient id="cl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4FC3D9" stop-opacity=".28"/><stop offset="1" stop-color="#4FC3D9" stop-opacity="0"/></linearGradient></defs>
    <line x1="0" x2="${W - 56}" y1="${Y(avg)}" y2="${Y(avg)}" style="stroke:${ink(.22)}" stroke-dasharray="2 4"/>${Math.abs(Y(avg) - e[1]) > 18 ? `<text x="${W - 70}" y="${Y(avg) - 6}" text-anchor="end" style="fill:var(--fg-4)">平均 ${pctS(avg)}</text>` : `<text x="0" y="${Y(avg) - 6}" style="fill:var(--fg-4)">平均 ${pctS(avg)}</text>`}
    <path d="${d}L${e[0]},${H}L${pts[0][0]},${H}Z" fill="url(#cl)"/><path d="${d}" fill="none" stroke="#4FC3D9" stroke-width="2"/>
    <circle cx="${e[0]}" cy="${e[1]}" r="4.5" fill="#4FC3D9" style="stroke:var(--background)" stroke-width="2.5"/>
    ${rh != null ? `<text x="${e[0] + 12}" y="${e[1] + 5}" style="fill:var(--fg);font-size:15px;font-weight:450">${pctS(rh)}</text><text x="${e[0] + 12}" y="${e[1] + 22}" style="fill:var(--fg-4)">近 6h</text>` : ''}</svg>`;
}
function vOverview() {
  const rs = rowsIn(), t = agg(rs), bs = buckets(), hit = pct(t.cache, t.cache + t.in), W = CW();
  const ss = groupBy(rs, 'root').sort((x, y) => y.in + y.out - x.in - x.out), real = t.in + t.out;
  return shell(sub(filters()) + `<div class="body h2"><div class="pg">
    <section class="rw hero-sec" style="height:330px"><img class="hero-img" src="/illus/hero-${isLight() ? 'light' : 'dark'}.jpg" alt=""><div class="md" style="grid-column:1/-1">${landscape(bs, rs, W)}
      <div class="hero-t" ${A('metric', 'real')}><div class="lb">${rangeLabel()} · Tokens</div><div class="herov num">${unit(fmt(real))}</div><div class="sub2 num">约 ${fUSD(t.cost)} · 输入 ${fmt(t.in)} · 输出 ${fmt(t.out)} · ${comma(t.n)} 次调用</div></div></div></section>
    ${poolRow()}
    <section class="rw">
      <div class="md" style="grid-column:span 8"><div class="hd"><span class="lb">会话 · 按真实消耗</span><span class="lb" style="color:var(--fg-4)">${ss.length} 个会话${(k => k ? ` · 含 ${k} 个子代理` : '')(new Set(rs.filter(r => SE[r.s].child).map(r => r.s)).size)}</span></div>
        <div style="margin-top:16px">${ss.length ? spectrum(ss.slice(0, 8), real || 1, SPANW(8)) : '<div class="cap">这段时间没有调用</div>'}</div></div>
      <div class="md" style="grid-column:span 4" ${A('metric', 'cache')}><div class="hd"><span class="lb">缓存命中 · ${rangeLabel()}</span><span class="kn num" style="font-size:28px">${(hit * 100).toFixed(1)}<small>%</small></span></div>
        <div style="margin-top:16px">${cacheLine(bs, rs, SPANW(4))}</div></div>
    </section>
  </div></div>`);
}

// 第二轮探索稿共用的图形件：全出血面积图、堆叠柱、点阵、华夫格、树图、平滑曲线
const KIT = {};
KIT.path = (pts, smooth) => {
  if (!smooth) return pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('');
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], mx = (x0 + x1) / 2;
    d += `C${mx.toFixed(1)},${y0.toFixed(1)} ${mx.toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
  }
  return d;
};
let _gid = 0;
// 贴边面积图：W×H，vals 自动归一，lo/hi 可指定范围
KIT.area = (vals, W, H, color, o = {}) => {
  const lo = o.lo ?? 0, hi = o.hi ?? Math.max(...vals), pad = o.pad ?? 6, id = 'g' + (++_gid);
  const pts = vals.map((v, i) => [i / (vals.length - 1) * W, pad + (1 - (v - lo) / (hi - lo || 1)) * (H - pad * 2)]);
  const d = KIT.path(pts, o.smooth !== false);
  return `<svg width="${W}" height="${H}" style="display:block;overflow:visible"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity="${o.op ?? .28}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    ${o.fill === false ? '' : `<path d="${d}L${W},${H}L0,${H}Z" fill="url(#${id})"/>`}<path d="${d}" fill="none" stroke="${color}" stroke-width="${o.sw ?? 1.5}" ${o.dash ? 'stroke-dasharray="3 4"' : ''} stroke-linejoin="round"/>
    ${o.dot ? `<circle cx="${pts.at(-1)[0]}" cy="${pts.at(-1)[1]}" r="3" fill="${color}" stroke="var(--background)" stroke-width="2"/>` : ''}</svg>`;
};
// 堆叠柱：hours=[[in,out],...]
KIT.bars = (W, H, o = {}) => {
  const hs = o.hours || D.hours, mx = o.max || 1200, L = o.left ?? 0, R = o.right ?? 40, T = 8, B = 22, pw = W - L - R, bw = pw / hs.length, base = H - B;
  const y = v => base - v / mx * (base - T);
  let s = '';
  (o.ticks || [0, 300, 600, 900, 1200]).forEach(t => s += `<line x1="${L}" x2="${L + pw}" y1="${y(t)}" y2="${y(t)}" stroke="rgb(255 255 255/${t ? .05 : .14})"/><text x="${W}" y="${y(t) + 4}" text-anchor="end">${t ? (t >= 1000 ? t / 1000 + 'M' : t + 'K') : '0'}</text>`);
  hs.forEach(([a, b], i) => {
    const w = bw * (o.bw ?? .56), x = L + i * bw + (bw - w) / 2, hi = o.hl == null || o.hl === i;
    if (!a && !b) return;
    s += `<rect x="${x}" y="${y(a)}" width="${w}" height="${base - y(a)}" rx="2" fill="var(--s1)" opacity="${hi ? 1 : .45}"/><rect x="${x}" y="${y(a + b)}" width="${w}" height="${Math.max(0, y(a) - y(a + b) - 1.5)}" rx="2" fill="var(--s2)" opacity="${hi ? 1 : .45}"/>`;
  });
  (o.labels || [0, 3, 6, 9, 12, 15, 18, 21]).forEach(i => s += `<text x="${L + i * bw + bw / 2}" y="${H - 4}" text-anchor="middle">${D.hourLabel(i)}</text>`);
  return `<svg width="${W}" height="${H}" style="display:block;overflow:visible;font-size:11.5px;fill:var(--fg-4)">${s}${o.extra ? o.extra({ y, bw, L, base }) : ''}</svg>`;
};
// 点阵电池：cols×rows 个小格，按列从左到右填
KIT.dots = (f, cols, rows, size, gap, color) => {
  const n = cols * rows, on = Math.round(f * n);
  let s = '';
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) { const i = c * rows + r, lit = i < on; s += `<rect x="${c * (size + gap)}" y="${r * (size + gap)}" width="${size}" height="${size}" rx="${size / 4}" fill="${lit ? color : 'rgb(255 255 255/.07)'}" ${lit ? `opacity="${(.5 + .5 * c / cols).toFixed(2)}"` : ''}/>`; }
  return `<svg width="${cols * (size + gap) - gap}" height="${rows * (size + gap) - gap}" style="display:block">${s}</svg>`;
};
// 华夫格：100 格
KIT.waffle = (pct, cols, size, gap, color, mark) => {
  let s = '';
  for (let i = 0; i < 100; i++) { const c = i % cols, r = Math.floor(i / cols), on = i < Math.floor(pct * 100); s += `<rect x="${c * (size + gap)}" y="${r * (size + gap)}" width="${size}" height="${size}" rx="${size / 5}" fill="${on ? color : 'rgb(255 255 255/.07)'}" ${on && mark && i >= mark ? 'opacity=".55"' : ''}/>`; }
  const rows = Math.ceil(100 / cols);
  return `<svg width="${cols * (size + gap) - gap}" height="${rows * (size + gap) - gap}" style="display:block">${s}</svg>`;
};
// 树图：二分切（按比例交替横竖切），贴满 W×H
KIT.treemap = (items, W, H, g = 2) => {
  const out = [];
  const go = (its, x, y, w, h) => {
    if (its.length === 1) { out.push({ ...its[0], x, y, w, h }); return; }
    const tot = its.reduce((a, b) => a + b.v, 0); let acc = 0, k = 0;
    while (k < its.length - 1 && acc + its[k].v <= tot / 2) acc += its[k++].v;
    if (k === 0) acc = its[k++].v;
    const f = acc / tot;
    if (w >= h) { const w1 = w * f; go(its.slice(0, k), x, y, w1 - g / 2, h); go(its.slice(k), x + w1 + g / 2, y, w - w1 - g / 2, h); }
    else { const h1 = h * f; go(its.slice(0, k), x, y, w, h1 - g / 2); go(its.slice(k), x, y + h1 + g / 2, w, h - h1 - g / 2); }
  };
  go(items, 0, 0, W, H);
  return out;
};
const pctS = f => Math.round(f * 100) + '%';

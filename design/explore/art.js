// 第三轮：插画化的图形件。全部基于 shell.js 里的 D 数据
const ART = {};
ART.pal = ['#5B9BFF', '#9D8CFF', '#4FC3D9', '#F2B35B', '#F27A9B']; // 会话配色：蓝 紫 青 琥珀 玫瑰
let _aid = 0; const aid = p => p + (++_aid);

// 每小时 → 会话；生成 411 次调用（确定性随机）
(() => {
  let seed = 11; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const hourSess = { 7: [0], 8: [0], 9: [0], 10: [0, 4], 11: [0], 13: [2], 14: [2], 17: [1], 18: [1], 22: [3], 23: [3] };
  const quota = D.sessions.map(s => s.n), calls = [];
  const hoursOf = si => Object.keys(hourSess).filter(h => hourSess[h].includes(si)).map(Number);
  D.sessions.forEach((s, si) => {
    const hs = hoursOf(si), w = hs.map(h => D.hours[h][0] + D.hours[h][1] + 1), tw = w.reduce((a, b) => a + b, 0);
    let left = quota[si];
    hs.forEach((h, k) => {
      const n = k === hs.length - 1 ? left : Math.round(quota[si] * w[k] / tw); left -= n;
      for (let j = 0; j < n; j++) calls.push({ s: si, t: h + rnd(), tok: Math.pow(rnd(), 3) * (si === 1 ? 60 : 22) + 2 });
    });
  });
  D.calls = calls.sort((a, b) => a.t - b.t);
  D.rnd = rnd;
})();

ART.smooth = (vals, k = 1) => vals.map((_, i) => { let s = 0, w = 0; const n = Math.ceil(k * 2); for (let j = -n; j <= n; j++) { const v = vals[i + j]; if (v == null) continue; const g = Math.exp(-(j * j) / (2 * k * k)); s += v * g; w += g; } return s / w; });

// 液体球：f = 剩余比例
ART.orb = (f, size, c1, c2, o = {}) => {
  const r = size / 2 - 6, cx = size / 2, cy = size / 2, id = aid('orb'), lv = cy + r - 2 * r * f;
  const wave = (amp, len, ph, y) => { let d = `M${cx - r - 20},${y}`; for (let x = cx - r - 20; x <= cx + r + 20; x += 4) d += `L${x},${(y + Math.sin((x / len) * 2 * Math.PI + ph) * amp).toFixed(1)}`; return d + `L${cx + r + 20},${size}L${cx - r - 20},${size}Z`; };
  return `<svg width="${size}" height="${size}" style="display:block;overflow:visible"><defs>
    <clipPath id="${id}c"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>
    <linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
    <radialGradient id="${id}h" cx="50%" cy="50%" r="50%"><stop offset=".6" stop-color="${c1}" stop-opacity=".0"/><stop offset=".85" stop-color="${c1}" stop-opacity=".10"/><stop offset="1" stop-color="${c1}" stop-opacity="0"/></radialGradient></defs>
    <circle cx="${cx}" cy="${cy}" r="${r + 6}" fill="url(#${id}h)"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="rgb(255 255 255/.025)" stroke="rgb(255 255 255/.10)"/>
    <g clip-path="url(#${id}c)">
      <path d="${wave(4, size * .55, 1.2, lv + 3)}" fill="${c1}" opacity=".35"/>
      <path d="${wave(3.5, size * .7, 0, lv + 6)}" fill="url(#${id}g)" opacity=".92"/>
      ${f < .999 ? `<path d="${wave(3.5, size * .7, 0, lv + 6).split('L' + (cx + r + 20) + ',' + size)[0]}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.2"/>` : ''}
      <ellipse cx="${cx - r * .35}" cy="${cy - r * .45}" rx="${r * .22}" ry="${r * .12}" fill="#fff" opacity=".07" transform="rotate(-30 ${cx - r * .35} ${cy - r * .45})"/>
    </g>
    ${o.label ? `<text x="${cx}" y="${cy + 8}" text-anchor="middle" style="fill:#fff;font-size:${o.fs || 26}px;font-weight:450">${o.label}</text>` : ''}
  </svg>`;
};

// 月相：f = 被照亮比例（剩余额度）。从右侧开始变暗（亏月）
ART.moon = (f, size, color) => {
  const r = size / 2 - 4, cx = size / 2, cy = size / 2, id = aid('mn');
  const k = 1 - 2 * f; // 明暗交界椭圆的横向半径系数
  const lit = f >= .999 ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id}g)"/>`
    : `<path d="M${cx},${cy - r} A${r},${r} 0 0 0 ${cx},${cy + r} A${Math.abs(k) * r},${r} 0 0 ${k < 0 ? 0 : 1} ${cx},${cy - r}Z" fill="url(#${id}g)"/>`;
  let craters = '';
  [[.3, -.25, .13], [-.2, .3, .09], [-.35, -.3, .07], [.15, .45, .06], [.45, .2, .05]].forEach(([x, y, s]) => craters += `<circle cx="${cx + x * r}" cy="${cy + y * r}" r="${s * r}" fill="#000" opacity=".10"/>`);
  return `<svg width="${size}" height="${size}" style="display:block;overflow:visible"><defs>
    <radialGradient id="${id}g" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="#fff" stop-opacity=".98"/><stop offset=".55" stop-color="${color}" stop-opacity=".95"/><stop offset="1" stop-color="${color}" stop-opacity=".55"/></radialGradient>
    <radialGradient id="${id}h" cx="50%" cy="50%" r="50%"><stop offset=".55" stop-color="${color}" stop-opacity=".22"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>
    <clipPath id="${id}c"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath></defs>
    <circle cx="${cx}" cy="${cy}" r="${r * 1.45}" fill="url(#${id}h)" opacity="${.4 + .6 * f}"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="rgb(255 255 255/.05)"/>
    ${lit}<g clip-path="url(#${id}c)">${craters}</g>
  </svg>`;
};

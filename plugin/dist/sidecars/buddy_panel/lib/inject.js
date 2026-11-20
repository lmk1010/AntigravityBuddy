/* Buddy 输入框控件。由 Buddy 后台经调试接口注入 Antigravity 主界面；数据由后台推送（window.__buddy.update）。 */
(() => {
  const V = '__VERSION__';
  if (window.__buddy) { if (window.__buddy.v === V) return; try { window.__buddy.dispose(); } catch {} }
  const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e5 ? 0 : 1) + 'K' : String(Math.round(n));
  const comma = n => Math.round(n).toLocaleString('en-US');
  const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9.]/g, '');
  const convId = () => (location.pathname.match(/^\/c\/([0-9a-f-]{36})/) || [])[1];
  const modelLabel = () => (document.querySelector('[data-testid="model-selector-trigger"]')?.getAttribute('aria-label') || '').replace(/^.*current:\s*/, '');
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const C = { s1: '#3987e5', s2: '#d95926', s3: '#199e70', warn: '#fab219', crit: '#d03b3b', track: 'color-mix(in srgb, var(--foreground, #fff) 9%, transparent)', dim: 'var(--muted-foreground, #87888F)', fg2: 'var(--secondary-foreground, #BCBDC6)' };
  const tone = f => f <= .1 ? C.crit : f <= .25 ? C.warn : C.s1;
  const ring = (f, col) => { const r = 5.75, c = 2 * Math.PI * r; return `<svg width="14" height="14" viewBox="0 0 14 14" style="transform:rotate(-90deg);flex:none"><circle cx="7" cy="7" r="${r}" fill="none" stroke="${C.track}" stroke-width="2.5"/><circle cx="7" cy="7" r="${r}" fill="none" stroke="${col}" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="${c * Math.min(1, f)} ${c}"/></svg>`; };
  const bar = (f, col, w) => `<span style="display:block;width:${w};height:4px;border-radius:2px;background:${C.track};overflow:hidden;flex:none"><span style="display:block;width:${Math.max(2, Math.min(1, f) * 100)}%;height:100%;border-radius:2px;background:${col}"></span></span>`;
  const spark = (v, w, h) => { if (v.length < 2) return ''; const mx = Math.max(...v) || 1, st = w / (v.length - 1), p = v.map((x, i) => [i * st, h - 2 - (x / mx) * (h - 5)]), d = p.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ',' + q[1].toFixed(1)).join('');
    return `<svg width="${w}" height="${h}" style="display:block;overflow:visible"><path d="${d}L${w},${h}L0,${h}Z" fill="${C.s1}" opacity=".12"/><path d="${d}" fill="none" stroke="${C.s1}" stroke-width="1.5" stroke-linejoin="round"/></svg>`; };
  const gauge = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" style="flex:none;opacity:.75"><path d="M2.5 11.5a6 6 0 1 1 11 0"/><path d="M8 9.5l2.6-3.4"/></svg>`;
  const clock = t => { const d = new Date(t * 1000), now = new Date(), hm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); return d.toDateString() === now.toDateString() ? hm : ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()] + ' ' + hm; };
  const left = t => { const s = Math.max(0, t - Date.now() / 1000); return s >= 86400 ? `${Math.floor(s / 86400)}d ${Math.floor(s % 86400 / 3600)}h` : `${Math.floor(s / 3600)}h ${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}m`; };

  const B = window.__buddy = { v: V, d: null, open: null,
    update(d) { this.d = d; draw(); },
    dispose() { clearInterval(tm); removeEventListener('mousedown', away, true); removeEventListener('keydown', key, true); document.querySelectorAll('[data-buddy]').forEach(e => e.remove()); } };
  const cur = () => { const d = B.d; if (!d) return {}; return { cfg: d.cfg || {}, c: d.conv[convId()] || null, q: d.quota[norm(modelLabel())] || null }; };
  const CHIP = 'display:flex;align-items:center;gap:6px;height:28px;padding:0 8px;border-radius:999px;font-size:13px;cursor:pointer;color:' + C.fg2 + ';font-variant-numeric:tabular-nums;white-space:nowrap;transition:background-color .12s';
  function chips() {
    const { cfg, c, q } = cur(); let h = '';
    const chip = (id, inner, tip) => `<span data-chip="${id}" title="${tip}" style="${CHIP};${B.open === id ? 'background:var(--secondary, rgb(255 255 255 / .075))' : ''}">${inner}</span>`;
    if (cfg.ctx && c) h += chip('ctx', `${ring(c.ctx / c.max, c.ctx / c.max > .8 ? C.warn : 'currentColor')}<span>${fmt(c.ctx)}</span>`, '上下文');
    if (cfg.speed && c && c.dec) h += chip('speed', `${gauge}<span>${Math.round(c.dec)} <span style="color:${C.dim}">tok/s</span></span>`, '解码速度');
    if (cfg.quota && q) h += chip('quota', `${bar(q.f, tone(q.f), '20px')}<span>${q.left != null ? '$' + q.left.toFixed(q.left >= 10 ? 0 : 1) : Math.round(q.f * 100) + '%'}</span>`, '当前模型额度');
    return h;
  }
  const row = (k, v) => `<div style="display:flex;justify-content:space-between;gap:16px;height:26px;align-items:center"><span style="color:${C.dim}">${k}</span><span style="color:${C.fg2};font-variant-numeric:tabular-nums">${v}</span></div>`;
  const sw = c => `<i style="display:inline-block;width:7px;height:7px;border-radius:2px;background:${c};margin-right:7px"></i>`;
  const head = (l, r) => `<div style="display:flex;justify-content:space-between;color:${C.dim}"><span>${l}</span><span style="font-variant-numeric:tabular-nums">${r || ''}</span></div>`;
  const big = (v, u) => `<div style="font-size:22px;font-weight:500;letter-spacing:-.01em;margin-top:6px;font-variant-numeric:tabular-nums">${v}<span style="font-size:13px;font-weight:400;color:${C.dim}"> ${u}</span></div>`;
  const hr = `<div style="height:1px;background:var(--border, rgb(255 255 255 / .06));margin:10px 0 6px"></div>`;
  function pop() {
    const { c, q } = cur(), o = B.open;
    if (o === 'ctx' && c) { const G = { 'Chat Messages': ['对话消息', C.s1], 'Tools': ['工具定义', C.s2], 'System Prompt': ['系统提示', C.s3], 'Subagents': ['子代理', '#c98500'], 'Skills': ['Skills', '#d55181'], 'Plugins': ['插件', '#9085e9'] };
      const gs = c.bd ? c.bd.groups.map(g => ({ n: (G[g[0]] || [g[0]])[0], col: (G[g[0]] || [0, C.dim])[1], v: g[1], kids: g[2] || [] })).sort((a, b) => b.v - a.v) : [], used = c.bd ? Math.max(c.bd.est, c.ctx) : c.ctx, free = Math.max(0, c.max - used);
      return head('上下文', (used / c.max * 100).toFixed(1) + '%') + big(fmt(used), '/ ' + fmt(c.max))
        + (gs.length ? `<div style="display:flex;height:6px;gap:2px;margin:14px 0 10px">${gs.map(g => `<span style="flex:${g.v};min-width:2px;background:${g.col};border-radius:3px"></span>`).join('')}<span style="flex:${free};background:${C.track};border-radius:3px"></span></div>`
          + gs.map(g => `<div title="${esc(g.kids.map(k => k[0] + ' ' + fmt(k[1])).join(' · '))}" style="display:flex;justify-content:space-between;gap:16px;height:26px;align-items:center"><span style="color:${C.fg2}">${sw(g.col)}${g.n}</span><span style="font-variant-numeric:tabular-nums">${fmt(g.v)} <span style="color:${C.dim};display:inline-block;width:40px;text-align:right">${(g.v / used * 100).toFixed(0)}%</span></span></div>`).join('')
          + row(sw(C.track) + '可用', fmt(free))
          : `<div style="margin:14px 0 8px">${bar(c.ctx / c.max, C.s1, '100%')}</div><div style="color:${C.dim};font-size:12px;line-height:1.5">这次调用没有构成明细，下一次调用后出现。</div>`)
        + hr + row('上一步输入', `缓存 ${fmt(c.cache)} · 新增 ${fmt(c.newIn)}`) + row('本会话', `${comma(c.n)} 次调用${c.drops ? ` · 压缩过 ${c.drops} 次` : ''}`); }
    if (o === 'speed' && c) return head('解码速度', '上一次调用') + big(Math.round(c.dec), 'tok/s') + `<div style="height:8px"></div>`
      + row('本会话中位', c.med ? Math.round(c.med) + ' tok/s' : '—') + row('首字延迟', c.ttft ? c.ttft.toFixed(1) + ' s' : '—') + row('prefill', c.pre ? fmt(c.pre) + ' tok/s' : '—') + row('流式耗时', c.dur ? c.dur.toFixed(1) + ' s' : '—')
      + `<div style="color:${C.dim};font-size:12px;margin-top:6px;line-height:1.5">每次调用结束后更新。prefill 含网络与排队时间。</div>`;
    if (o === 'quota' && q) return head(esc(q.name), q.kind + '窗口') + big(Math.round(q.f * 100) + '%', '剩余') + `<div style="margin:12px 0 8px">${bar(q.f, tone(q.f), '100%')}</div>`
      + row('本窗口已用', q.idle ? '还没用过' : `$${q.used.toFixed(2)} · ${fmt(q.usedAll)}`) + row('估算还剩', q.left != null ? `约 $${q.left.toFixed(q.left >= 10 ? 1 : 2)}${q.leftAll ? ' · ' + fmt(q.leftAll) : ''}` : q.idle ? '—' : '用得太少，暂无法估算')
      + row('重置', q.idle ? '用了才开始计时' : `${clock(q.reset)} · ${left(q.reset)}`) + row('同一额度池', q.pool + ' 个模型')
      + `<div style="color:${C.dim};font-size:12px;margin-top:6px;line-height:1.5">余额按「已花美元 ÷ 已用比例」估算，token 含缓存。</div>`;
    return '';
  }
  let anchor = null;
  function draw() {
    const foots = [...document.querySelectorAll('.agy-composer-footer')].filter(f => f.offsetParent), foot = foots[foots.length - 1];
    document.querySelectorAll('[data-buddy="chips"]').forEach(e => { if (!foot || !foot.contains(e)) e.remove(); });
    if (!foot || !B.d) { hide(); return; }
    const right = foot.lastElementChild; let host = right.querySelector('[data-buddy="chips"]');
    if (!host) { host = document.createElement('div'); host.dataset.buddy = 'chips'; host.style.cssText = 'display:flex;align-items:center;gap:0;margin-right:2px'; right.prepend(host);
      host.addEventListener('mousedown', e => e.preventDefault());
      host.addEventListener('click', e => { const el = e.target.closest('[data-chip]'); if (!el) return; B.open = B.open === el.dataset.chip ? null : el.dataset.chip; draw(); });
      host.addEventListener('mouseover', e => { const el = e.target.closest('[data-chip]'); if (el && B.open !== el.dataset.chip) el.style.background = 'var(--secondary, rgb(255 255 255 / .075))'; });
      host.addEventListener('mouseout', e => { const el = e.target.closest('[data-chip]'); if (el && B.open !== el.dataset.chip) el.style.background = ''; }); }
    const h = chips(); if (host._h !== h) { host.innerHTML = h; host._h = h; }
    anchor = B.open && host.querySelector(`[data-chip="${B.open}"]`); const body = anchor ? pop() : '';
    if (!body) { if (B.open && !anchor) B.open = null; hide(); return; }
    let p = document.querySelector('[data-buddy="pop"]'); const fresh = !p;
    if (!p) { p = document.createElement('div'); p.dataset.buddy = 'pop'; document.body.appendChild(p); }
    const r = anchor.getBoundingClientRect(), w = 288, card = foot.closest('.surface-composer') || foot, top = card.getBoundingClientRect().top;
    p.style.cssText = `position:fixed;z-index:2147483000;width:${w}px;left:${Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2))}px;bottom:${innerHeight - top + 8}px;background:var(--glass, #131317);color:var(--foreground, #fff);border:1px solid var(--glass-border, rgb(255 255 255 / .085));border-radius:14px;box-shadow:0 16px 40px -12px rgb(0 0 0 / .6),0 2px 8px -2px rgb(0 0 0 / .4);padding:14px 16px 12px;font-size:13px;line-height:1.4;font-family:inherit` + (fresh ? ';animation:buddy-pop .14s ease-out' : '');
    if (p._h !== body) { p.innerHTML = body; p._h = body; }
  }
  const hide = () => document.querySelectorAll('[data-buddy="pop"]').forEach(e => e.remove());
  const away = e => { if (B.open && !e.target.closest('[data-buddy]')) { B.open = null; draw(); } };
  const key = e => { if (e.key === 'Escape' && B.open) { B.open = null; draw(); } };
  addEventListener('mousedown', away, true); addEventListener('keydown', key, true);
  if (!document.getElementById('buddy-kf')) { const s = document.createElement('style'); s.id = 'buddy-kf'; s.dataset.buddy = 'style'; s.textContent = '@keyframes buddy-pop{from{opacity:0;transform:translateY(4px) scale(.98)}to{opacity:1;transform:none}}'; document.head.appendChild(s); }
  const tm = setInterval(draw, 600);
})();

// 演示数据：截图 / 宣传用，不读本机任何数据。node dev.mjs 时设 DEMO=1 启用
const MODELS = ['gemini-4-neon-high', 'gemini-4-hydrogen-high', 'claude-opus-5-5-high', 'gemini-3-8-flash', 'gemini-4-argon-high'];
const SESS = [
  ['a1', 'Checkout Flow Refactor', 'Storefront'], ['a2', 'Realtime Sync Engine', 'Storefront'], ['a3', 'Onboarding Copy Review', 'Marketing'],
  ['a4', 'Flaky E2E Test Hunt', 'Storefront'], ['a5', 'Pricing Page Redesign', 'Marketing'], ['a6', 'Data Export Pipeline', 'Analytics'],
];
export function demoData() {
  let seed = 42; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const at = process.env.DEMO_AT, real = Math.floor(Date.now() / 1000); let shift = 0;
  if (at) { const [h, mi] = at.split(':').map(Number), d = new Date(), t = new Date(d); t.setHours(h, mi, 0, 0); shift = Math.round((t - d) / 1000); }
  const now = real + shift, rows = [];
  const sessions = SESS.map(([id, title, ws]) => ({ id, title, parent: '', agent: '', ws, known: 0 }));
  sessions.push({ id: 'a1k', title: '未命名会话', parent: 'a1', agent: 'code-reviewer', ws: 'Storefront', known: 0 }, { id: 'a6k', title: '未命名会话', parent: 'a6', agent: 'sql-explorer', ws: 'Analytics', known: 0 });
  // 近 8 天：工作日 9:30–12:30、14:00–18:30，偶尔晚上；今天到现在为止
  const tzOff = -new Date().getTimezoneOffset() * 60, day0 = Math.floor((now + tzOff) / 86400) * 86400 - tzOff;
  for (let d = 8; d >= 0; d--) {
    const base = day0 - d * 86400, wd = new Date((base + tzOff) * 1000).getUTCDay(), weekend = d > 0 && (wd === 0 || wd === 6);
    const blocks = weekend ? (rnd() < .4 ? [[14, 15.5]] : []) : [[9.5, 12.5], [14, 18.5], ...(rnd() < .35 ? [[20.5, 22.5]] : [])];
    blocks.forEach(([h0, h1]) => {
      for (let t = base + h0 * 3600; t < base + h1 * 3600 && t < now; t += 45 + rnd() * 110) {
        if (rnd() < .18) { t += 600 + rnd() * 900; continue; }
        const hr = (t - base) / 3600, si = hr < 12.5 ? (d % 2 ? 0 : 1) : hr < 16 ? (rnd() < .6 ? 3 : 2) : hr < 19 ? (d % 3 ? 4 : 5) : 5;
        const kid = rnd() < .08 ? (si === 0 ? 6 : si === 5 ? 7 : si) : si, m = rnd() < .14 ? 2 : rnd() < .08 ? 4 : rnd() < .2 ? 1 : rnd() < .06 ? 3 : 0;
        const miss = rnd() < .04, inp = miss ? 40000 + rnd() * 50000 : 3000 + rnd() * 9000, cache = miss ? 0 : 120000 + rnd() * 260000, out = 800 + rnd() * rnd() * 9000;
        const dur = out / (90 + rnd() * 60);
        rows.push([Math.floor(t), kid, m, Math.round(inp), Math.round(out), Math.round(cache), Math.floor(rnd() * 4), Math.floor(rnd() * 60), rnd() < .4 ? 1 : 0, +(2 + rnd() * 9).toFixed(3), +dur.toFixed(3), 0, m === 2 ? 160000 : 512000]);
      }
    });
  }
  rows.sort((a, b) => a[0] - b[0]);
  const iso = s => new Date((now + s) * 1000).toISOString(), m = (name, f, reset, prov = 'MODEL_PROVIDER_GOOGLE') => ({ displayName: name, quotaInfo: { remainingFraction: f, resetTime: iso(reset) }, disabled: false, provider: prov });
  const g5 = 1 * 3600 + 42 * 60, c5 = 3 * 3600 + 11 * 60, wk = 4 * 86400 + 6 * 3600;
  const models = {
    'gemini-4-neon-low': m('Gemini 4 Neon (Low)', .58, g5), 'gemini-4-neon-high': m('Gemini 4 Neon (High)', .58, g5), 'gemini-4-neon-xhigh': m('Gemini 4 Neon (XHigh)', .58, g5),
    'gemini-4-hydrogen-high': m('Gemini 4 Hydrogen (High)', .58, g5), 'gemini-3-8-flash': m('Gemini 3.8 Flash', .58, g5),
    'claude-opus-5-5-high': m('Claude Opus 5.5 (High)', .71, c5, 'MODEL_PROVIDER_ANTHROPIC'), 'claude-sonnet-5-5-high': m('Claude Sonnet 5.5 (High)', .71, c5, 'MODEL_PROVIDER_ANTHROPIC'),
    'gpt-oss-120b-medium': m('GPT-OSS 120B (Medium)', .71, c5, 'MODEL_PROVIDER_OPENAI'),
    'gemini-4-argon-high': m('Gemini 4 Argon (High)', .88, wk), 'gemini-2-5-pro': m('Gemini 2.5 Pro', .88, wk),
  };
  return { at: Date.now(), usage: { models: MODELS, sessions, rows }, status: { tier: { id: 'g1-pro-tier', name: 'Google AI Pro', teams: '' }, name: 'Alex Chen', email: 'alex.chen@example.com', plan: 'Pro' },
    models, ls: 'demo', error: null, paths: { brain: '~/.gemini/antigravity/brain', store: '~/.gemini/antigravity/plugin_data/buddy/usage.json' }, accounts: { active: 'alex.chen@example.com', list: [
      { email: 'alex.chen@example.com', name: 'Alex Chen', plan: 'Google AI Pro', active: true, saved: true, seen: Date.now(), pools: [{ t: now + g5, f: .58, provs: ['gemini'] }, { t: now + c5, f: .71, provs: ['claude', 'openai'] }, { t: now + wk, f: .88, provs: ['gemini'] }] },
      { email: 'alex.work@example.com', name: 'Alex · Work', plan: 'Google AI Pro', active: false, saved: true, seen: Date.now() - 5400e3, pools: [{ t: now + 2 * 3600, f: .93, provs: ['gemini'] }, { t: now - 600, f: .4, provs: ['claude', 'openai'] }, { t: now + 6 * 86400, f: .97, provs: ['gemini'] }] },
      { email: 'studio@example.com', name: 'Studio', plan: 'Google AI Ultra', active: false, saved: true, seen: Date.now() - 26 * 3600e3, pools: [{ t: now - 3600, f: .2, provs: ['gemini'] }, { t: now + 3 * 86400, f: .66, provs: ['gemini'] }] }] } };
}

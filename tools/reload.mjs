// 让 Antigravity 里已打开的 Buddy 面板重新加载界面代码。需要 Antigravity 以调试模式运行，否则静默跳过
import { readFileSync } from 'node:fs'; import { homedir } from 'node:os';
try {
  const port = readFileSync(homedir() + '/Library/Application Support/Antigravity/DevToolsActivePort', 'utf8').split('\n')[0];
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(2000) })).json();
  const ts = list.filter(x => x.url.startsWith('plugin://buddy--'));
  for (const t of ts) {
    const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: 'location.reload()' } }));
    await new Promise(r => setTimeout(r, 200)); ws.close();
  }
  console.log(ts.length ? `reloaded ${ts.length} Buddy panel(s)` : 'Buddy panel not open');
} catch { console.log('Antigravity 未以调试模式运行：请在 Antigravity 里关掉再打开 Buddy 标签'); }

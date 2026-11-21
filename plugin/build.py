#!/usr/bin/env python3
"""把 plugin/src 打包成插件的 index.html / app.js / styles.css。"""
import base64, os, urllib.parse
R = os.path.dirname(os.path.abspath(__file__)); A = os.path.join(R, '..', 'design', 'assets'); OUT = os.path.join(R, 'dist', 'sidecars', 'buddy_panel')
rd = lambda *p: open(os.path.join(*p), encoding='utf8').read()
src = lambda n: rd(R, 'src', n)
logos = '{' + ','.join(f"{n}:'data:image/svg+xml,{urllib.parse.quote(rd(A, n + '.svg'))}'" for n in ['gemini', 'claude', 'openai']) + '}'
ORDER = ['head.js', 'state.js', 'shell.js', 'h2.js', 'filters.js', 'overview.js', 'report.js', 'tokens.js', 'quota-head.js', 'quota.js', 'ledger.js', 'accounts.js', 'settings.js', 'main.js', 'boot.js']
js = "'use strict';\n" + '\n'.join(src(n) for n in ORDER).replace('__LOGOS__', logos)
open(os.path.join(OUT, 'app.js'), 'w', encoding='utf8').write(js)
sym = base64.b64encode(open(os.path.join(A, 'symbols.woff2'), 'rb').read()).decode()
open(os.path.join(OUT, 'styles.css'), 'w', encoding='utf8').write(src('styles.css').replace('__SYMBOLS__', 'data:font/woff2;base64,' + sym))
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf8').write(src('index.html'))
print('built', len(js), 'bytes js')

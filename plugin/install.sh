#!/bin/sh
# 重新打包并安装到 Antigravity：./install.sh   （界面文件即时生效；改了 main.mjs / lib 需在 Antigravity 里重启 Buddy）
cd "$(dirname "$0")" && python3 -I build.py && P=~/.gemini/config/plugins/buddy/sidecars/buddy_panel && mkdir -p "$P/lib" \
 && cp dist/sidecars/buddy_panel/app.js dist/sidecars/buddy_panel/index.html dist/sidecars/buddy_panel/styles.css dist/sidecars/buddy_panel/main.mjs dist/sidecars/buddy_panel/sidecar.json "$P/" \
 && cp dist/sidecars/buddy_panel/lib/*.mjs dist/sidecars/buddy_panel/lib/inject.js "$P/lib/" && echo "installed to $P"

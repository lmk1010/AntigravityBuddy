#!/bin/sh
# 渲染探索稿：./render.sh [a-hero b-timeline ...]，输出 png/<name>.png（2880×1800）
cd "$(dirname "$0")"
C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[ $# -eq 0 ] && set -- $(ls *.html | sed 's/\.html$//' | grep -v compare)
for s in "$@"; do "$C" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=2 --window-size=1440,900 --virtual-time-budget=3000 --screenshot="png/$s.png" "file://$PWD/$s.html" >/dev/null 2>&1; done
ls png

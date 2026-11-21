#!/bin/sh
# 第四轮：每页渲染深 / 浅两版到 png/r5/<页>-dark|light.png
cd "$(dirname "$0")"
C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[ $# -eq 0 ] && set -- h2-horizon p-report p-quota p-usage p-ledger p-accounts p-settings
for s in "$@"; do for t in dark light; do q=""; [ $t = light ] && q="?light"
  "$C" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=2 --window-size=1440,900 --virtual-time-budget=3000 --screenshot="png/r5/${s#p-}-$t.png" "file://$PWD/$s.html$q" >/dev/null 2>&1
done; done
ls png/r5

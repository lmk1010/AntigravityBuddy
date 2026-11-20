#!/bin/sh
# 把每一屏渲染成 2x PNG：./render.sh [screen ...]
cd "$(dirname "$0")"
C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[ $# -eq 0 ] && set -- overview quota quota-open quota-all tokens tokens-filtered ledger ledger-step accounts accounts-open accounts-switching tokens-month chat composer composer-quota settings settings-alerts settings-native settings-data settings-about
for s in "$@"; do "$C" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=2 --window-size=1440,900 --virtual-time-budget=3000 --screenshot="png/$s.png" "file://$PWD/buddy-design.html?s=$s" >/dev/null 2>&1; done
ls png

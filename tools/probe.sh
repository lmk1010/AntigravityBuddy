#!/usr/bin/env bash
# AntigravityBuddy · Language Server 探测脚本
#
# 自动发现 Antigravity 的 language_server（端口 + CSRF token），并调用其本地 RPC。
# 只读操作：GetUserStatus / GetAvailableModels。
#
# 用法:
#   ./probe.sh                 # 账号 + 额度 + 模型剩余
#   ./probe.sh status          # 只看账号与额度
#   ./probe.sh models          # 只看 39 个模型的配额
#   ./probe.sh raw <Method>    # 调任意 RPC，如: ./probe.sh raw GetAllPlugins
set -uo pipefail

LS_BIN_HINT="${ANTIGRAVITY_LS_BIN:-/Applications/Antigravity.app/Contents/Resources/bin/language_server}"

# ---------- 1. 找进程 ----------
find_ls() {
  ps aux | grep -F "$(basename "$LS_BIN_HINT")" | grep -v grep | grep -v "\-\-type=" | head -1
}

# ---------- 2. 从命令行取 CSRF / 端口 ----------
# 命令行里是 "空格分隔"：--csrf_token <value>（不是 --csrf_token=value）
csrf_of() {
  echo "$1" | tr ' ' '\n' | grep -A1 -x -- '--csrf_token' | tail -1
}
pid_of() {
  echo "$1" | awk '{print $2}'
}

# ---------- 3. 探活 + 找可用端口 ----------
# language_server 同时监听多个端口：一个 HTTPS API、一个 HTTP Connect API。
# 只对 HTTP 那个返回 /healthz 的可用。
discover_port() {
  local pid="$1" cands p
  cands=$(lsof -nP -iTCP -sTCP:LISTEN -a -p "$pid" 2>/dev/null | awk 'NR>1{print $9}' | sed 's/.*://' | sort -u)
  for p in $cands; do
    if curl -sS --max-time 2 "http://127.0.0.1:$p/healthz" 2>/dev/null | grep -q '"status":"ok"'; then
      echo "$p"; return 0
    fi
  done
  return 1
}

LS_LINE=$(find_ls)
if [ -z "$LS_LINE" ]; then
  echo "✗ 没找到正在运行的 language_server。请先启动 Antigravity。" >&2
  exit 1
fi

CSRF=$(csrf_of "$LS_LINE")
PID=$(pid_of "$LS_LINE")
if [ -z "$CSRF" ] || [ -z "$PID" ]; then
  echo "✗ 无法从命令行解析 csrf_token / pid" >&2
  exit 1
fi

PORT=$(discover_port "$PID")
if [ -z "$PORT" ]; then
  echo "✗ 没找到返回 healthz 的 HTTP 端口" >&2
  exit 1
fi

BASE="http://127.0.0.1:$PORT/exa.language_server_pb.LanguageServerService"

rpc() {
  local method="$1" body="${2:-}"
  [ -z "$body" ] && body='{}'
  # 先落盘再解析：避免调用方 `| head` 触发 SIGPIPE 导致解析失败
  local tmp
  tmp=$(mktemp "${TMPDIR:-/tmp}/agy-rpc.XXXXXX")
  curl -sS --max-time 10 -X POST "$BASE/$method" \
    -H "Content-Type: application/json" \
    -H "x-codeium-csrf-token: $CSRF" \
    -d "$body" -o "$tmp"
  cat "$tmp"
  rm -f "$tmp"
}

# ---------- 4. 输出 ----------
show_status() {
  local f
  f=$(mktemp "${TMPDIR:-/tmp}/agy-status.XXXXXX")
  rpc GetUserStatus > "$f"
  python3 - "$f" <<'PY'
import json,sys
try:
    d=json.load(open(sys.argv[1])).get('userStatus',{})
except Exception as e:
    print('解析失败:',e); sys.exit(0)
ps=d.get('planStatus',{}); pi=ps.get('planInfo',{})
print(f"账号     : {d.get('name','?')}  <{d.get('email','?')}>")
print(f"计划     : {pi.get('planName','?')}  ({pi.get('teamsTier','?')})")
avail=ps.get('availablePromptCredits'); total=pi.get('monthlyPromptCredits')
favail=ps.get('availableFlowCredits'); ftotal=pi.get('monthlyFlowCredits')
def bar(a,t):
    if not isinstance(a,(int,float)) or not t: return ''
    p=max(0.0,min(1.0,a/float(t)))
    n=int(round(p*20))
    return '█'*n+'░'*(20-n)+f'  {p*100:5.1f}%'
print(f"Prompt   : {avail} / {total}   {bar(avail,total)}")
print(f"Flow     : {favail} / {ftotal}  {bar(favail,ftotal)}")
print(f"可购买额度: {pi.get('canBuyMoreCredits')}   自定义图标: {pi.get('canCustomizeAppIcon')}")
PY
  rm -f "$f"
}

show_models() {
  local f
  f=$(mktemp "${TMPDIR:-/tmp}/agy-models.XXXXXX")
  rpc GetAvailableModels > "$f"
  python3 - "$f" <<'PY'
import json,sys
try:
    ms=json.load(open(sys.argv[1])).get('response',{}).get('models',{})
except Exception as e:
    print('解析失败:',e); sys.exit(0)
print(f"共 {len(ms)} 个模型\n")
print(f"{'模型':34} {'剩余':>7} {'重置时间':<22} {'最大输出':>9}")
print('-'*78)
for k,v in ms.items():
    q=v.get('quotaInfo') or {}
    rem=q.get('remainingFraction')
    rt=q.get('resetTime') or '-'
    out=v.get('maxOutputTokens','-')
    rs = f"{rem*100:6.1f}%" if isinstance(rem,(int,float)) else "    —"
    print(f"{k:34} {rs:>7} {rt:<22} {str(out):>9}")
PY
  rm -f "$f"
}

CMD="${1:-all}"
case "$CMD" in
  status) show_status ;;
  models) show_models ;;
  all)    show_status; echo; show_models ;;
  raw)    shift; rpc "${1:?用法: probe.sh raw <MethodName>}" "${2:-{\}}" ;;
  *)      echo "用法: $0 [status|models|all|raw <Method>]" >&2; exit 2 ;;
esac
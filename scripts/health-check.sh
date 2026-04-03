#!/usr/bin/env bash
#
# Bes3 健康检查脚本
#
# 用法:
#   bash scripts/health-check.sh
#   bash scripts/health-check.sh --url http://localhost:80
#   npm run ops:health-check
#
# 返回值:
#   0 = 健康
#   1 = 不健康
#   2 = 检查失败（无法连接）

set -euo pipefail

HEALTH_URL="${HEALTH_URL:-http://localhost/api/health}"
TIMEOUT="${TIMEOUT:-10}"
LOG_FILE="${LOG_FILE:-}"

log() {
  local ts
  ts=$(date '+%Y-%m-%dT%H:%M:%S')
  local msg="[${ts}] $1"
  echo "$msg"
  if [[ -n "${LOG_FILE}" ]]; then
    echo "$msg" >> "$LOG_FILE"
  fi
}

check_health() {
  local http_code
  local response

  http_code=$(curl -s -o /dev/null -w '%{http_code}' --max-time "$TIMEOUT" "$HEALTH_URL" 2>/dev/null || echo "000")
  if [[ "$http_code" == "000" ]]; then
    log "FAIL: 无法连接到 ${HEALTH_URL}"
    return 2
  fi

  if [[ "$http_code" != "200" ]]; then
    log "FAIL: HTTP ${http_code}"
    return 1
  fi

  response=$(curl -sf --max-time "$TIMEOUT" "$HEALTH_URL" 2>/dev/null)

  local status
  status=$(echo "$response" | node -pe 'JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")).status' 2>/dev/null || echo "unknown")
  if [[ "$status" != "ok" ]]; then
    log "FAIL: status=${status}"
    return 1
  fi

  local db_connected
  db_connected=$(echo "$response" | node -pe 'JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")).database?.connected' 2>/dev/null || echo "unknown")
  if [[ "$db_connected" != "true" ]]; then
    log "WARN: database.connected=${db_connected}"
  fi

  local worker_enabled
  worker_enabled=$(echo "$response" | node -pe 'JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")).worker?.enabled' 2>/dev/null || echo "unknown")
  local worker_poll_ms
  worker_poll_ms=$(echo "$response" | node -pe 'JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")).worker?.pollMs' 2>/dev/null || echo "unknown")
  local worker_concurrency
  worker_concurrency=$(echo "$response" | node -pe 'JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")).worker?.concurrency' 2>/dev/null || echo "unknown")

  log "OK: status=${status}, database.connected=${db_connected}, worker.enabled=${worker_enabled}, worker.pollMs=${worker_poll_ms}, worker.concurrency=${worker_concurrency}"
  return 0
}

main() {
  if [[ $# -gt 0 ]]; then
    case "$1" in
      -h|--help)
        echo "用法: $0 [--url URL] [--log FILE]"
        echo "  --url URL    健康检查端点 (默认: http://localhost/api/health)"
        echo "  --log FILE   日志文件 (默认: 输出到 stdout)"
        exit 0
        ;;
      --url)
        HEALTH_URL="$2"
        shift 2
        ;;
      --log)
        LOG_FILE="$2"
        shift 2
        ;;
    esac
  fi

  check_health
  local exit_code=$?
  if [[ $exit_code -eq 0 ]]; then
    log "Health check passed"
  elif [[ $exit_code -eq 1 ]]; then
    log "Health check failed"
  else
    log "Health check error: cannot reach service"
  fi
  exit $exit_code
}

main "$@"

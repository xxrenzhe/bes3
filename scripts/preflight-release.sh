#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$ROOT_DIR"

ENV_FILE="${1:-${BES3_PREFLIGHT_ENV_FILE:-.env.production}}"
SKIP_BUILD="${BES3_PREFLIGHT_SKIP_BUILD:-false}"
RUN_HEALTH="${BES3_PREFLIGHT_RUN_HEALTH:-false}"
HEALTH_URL="${BES3_PREFLIGHT_HEALTH_URL:-http://127.0.0.1/api/health}"
HEALTH_TOKEN="${BES3_PREFLIGHT_HEALTH_TOKEN:-}"

echo "[preflight] env file: ${ENV_FILE}"

run_step() {
  local label=$1
  shift
  echo "[preflight] >>> ${label}"
  "$@"
  echo "[preflight] <<< ${label}"
}

run_step "runtime env validation" node scripts/check-runtime-env.js "$ENV_FILE"
run_step "dependency audit governance" npm run ops:check-dependency-audit
run_step "planv2 security surface" npm run ops:check-planv2-security
run_step "database drift check" npm run db:check-drift
run_step "eslint" npm run lint
run_step "typescript" npm run type-check

if [[ "$SKIP_BUILD" != "true" ]]; then
  run_step "production build" npm run build
fi

if [[ "$RUN_HEALTH" == "true" ]]; then
  if [[ -n "$HEALTH_TOKEN" ]]; then
    run_step "runtime health" env HEALTH_URL="$HEALTH_URL" HEALTHCHECK_TOKEN="$HEALTH_TOKEN" bash scripts/health-check.sh
  else
    run_step "runtime health" env HEALTH_URL="$HEALTH_URL" bash scripts/health-check.sh
  fi
fi

echo "[preflight] release checks passed"

#!/bin/sh
# Docker container startup entrypoint.
# Runs one-time application initialization before handing control to supervisord.

set -e

CURRENT_CHILD_PID=""
TERMINATION_REQUESTED=0

handle_termination() {
    SIGNAL_NAME="$1"
    echo "[startup] received ${SIGNAL_NAME}, stopping initialization..."
    TERMINATION_REQUESTED=1
    if [ -n "${CURRENT_CHILD_PID:-}" ]; then
        kill -TERM "${CURRENT_CHILD_PID}" 2>/dev/null || true
        wait "${CURRENT_CHILD_PID}" 2>/dev/null || true
        CURRENT_CHILD_PID=""
    fi
    exit 143
}

run_with_signal_forward() {
    if [ "${TERMINATION_REQUESTED}" = "1" ]; then
        return 143
    fi

    "$@" &
    CURRENT_CHILD_PID=$!
    wait "${CURRENT_CHILD_PID}"
    EXIT_CODE=$?
    CURRENT_CHILD_PID=""
    return "${EXIT_CODE}"
}

now_ts() {
    date +%s
}

log_step_start() {
    STEP_NAME="$1"
    STEP_START_TS="$(now_ts)"
    echo "[startup] ${STEP_NAME} started..."
}

log_step_end() {
    STEP_NAME="$1"
    STEP_END_TS="$(now_ts)"
    STEP_COST_SEC=$((STEP_END_TS - STEP_START_TS))
    TOTAL_COST_SEC=$((STEP_END_TS - STARTUP_BEGIN_TS))
    echo "[startup] ${STEP_NAME} finished (step=${STEP_COST_SEC}s, total=${TOTAL_COST_SEC}s)"
}

trap 'handle_termination SIGTERM' TERM
trap 'handle_termination SIGINT' INT

STARTUP_BEGIN_TS="$(now_ts)"

echo "========================================"
echo "[startup] Bes3 service initialization"
echo "========================================"

cd /app

log_step_start "prepare runtime directories"
mkdir -p /app/data /app/storage/media /var/log/supervisor
log_step_end "prepare runtime directories"

log_step_start "database and application bootstrap"
run_with_signal_forward ./node_modules/.bin/tsx /app/scripts/db-init.ts
log_step_end "database and application bootstrap"

export SKIP_RUNTIME_DB_INIT=true

PRE_SUPERVISOR_COST_SEC=$(( $(now_ts) - STARTUP_BEGIN_TS ))

echo ""
echo "========================================"
echo "[startup] initialization complete, starting supervisord"
echo "[startup] pre-supervisor cost: ${PRE_SUPERVISOR_COST_SEC}s"
echo "========================================"
echo ""

exec /usr/bin/supervisord -c /app/supervisord.conf

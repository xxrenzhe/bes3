#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT_DIR=$(cd "${SCRIPT_DIR}/.." && pwd)
APP_DIR=${BES3_APP_DIR:-$ROOT_DIR}
IMAGE=${BES3_IMAGE:-ghcr.io/xxrenzhe/bes3:prod-latest}
HEALTHCHECK_URL=${BES3_HEALTHCHECK_URL:-http://127.0.0.1/api/health}
ENV_FILE="${APP_DIR}/.env.production"
COMPOSE_FILE="${APP_DIR}/docker-compose.yml"
SKIP_PULL=${BES3_SKIP_PULL:-false}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

http_check() {
  if command -v curl >/dev/null 2>&1; then
    curl --fail --silent --show-error "$1" >/dev/null
    return
  fi

  if command -v wget >/dev/null 2>&1; then
    wget -qO- "$1" >/dev/null
    return
  fi

  echo "Missing curl or wget for health check" >&2
  exit 1
}

require_command docker

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "docker-compose.yml not found at ${COMPOSE_FILE}" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo ".env.production not found at ${ENV_FILE}" >&2
  exit 1
fi

mkdir -p "${APP_DIR}/data" "${APP_DIR}/storage/media"

if [[ -n "${GHCR_USERNAME:-}" && -n "${GHCR_TOKEN:-}" ]]; then
  printf '%s' "${GHCR_TOKEN}" | docker login ghcr.io -u "${GHCR_USERNAME}" --password-stdin
fi

echo "Deploying image ${IMAGE}"
(
  cd "$APP_DIR"
  if [[ "$SKIP_PULL" != "true" ]]; then
    BES3_IMAGE="$IMAGE" docker compose pull
  fi
  docker run --rm --env-file "$ENV_FILE" "$IMAGE" node /app/scripts/check-runtime-env.js
  docker run --rm \
    --env-file "$ENV_FILE" \
    -v "${APP_DIR}/data:/app/data" \
    -v "${APP_DIR}/storage/media:/app/storage/media" \
    "$IMAGE" \
    ./node_modules/.bin/tsx /app/scripts/migrate.ts
  BES3_IMAGE="$IMAGE" docker compose up -d --no-build
)

for _ in 1 2 3 4 5 6 7 8 9 10; do
  if http_check "$HEALTHCHECK_URL"; then
    echo "Bes3 is healthy at ${HEALTHCHECK_URL}"
    exit 0
  fi
  sleep 3
done

echo "Health check failed: ${HEALTHCHECK_URL}" >&2
exit 1

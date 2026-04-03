#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT_DIR=$(cd "${SCRIPT_DIR}/.." && pwd)
APP_DIR=${BES3_APP_DIR:-$ROOT_DIR}
BACKUP_ROOT=${BES3_BACKUP_ROOT:-${APP_DIR}/backups}
INCLUDE_ENV=${BES3_INCLUDE_ENV:-false}
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
ARCHIVE_PATH="${BACKUP_ROOT}/bes3-runtime-${TIMESTAMP}.tar.gz"

mkdir -p "${APP_DIR}/data" "${APP_DIR}/storage/media" "$BACKUP_ROOT"

declare -a TAR_ITEMS=("data" "storage/media")
if [[ "$INCLUDE_ENV" == "true" && -f "${APP_DIR}/.env.production" ]]; then
  TAR_ITEMS+=(".env.production")
fi

(
  cd "$APP_DIR"
  tar -czf "$ARCHIVE_PATH" "${TAR_ITEMS[@]}"
)

echo "Backup created: ${ARCHIVE_PATH}"

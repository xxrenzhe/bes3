#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <backup-archive.tar.gz>" >&2
  exit 1
fi

ARCHIVE_PATH=$1
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT_DIR=$(cd "${SCRIPT_DIR}/.." && pwd)
APP_DIR=${BES3_APP_DIR:-$ROOT_DIR}
RESTORE_ENV=${BES3_RESTORE_ENV:-false}
CONFIRM_TOKEN=${BES3_RESTORE_CONFIRM:-}

if [[ ! -f "$ARCHIVE_PATH" ]]; then
  echo "Archive not found: ${ARCHIVE_PATH}" >&2
  exit 1
fi

if [[ "$CONFIRM_TOKEN" != "restore" ]]; then
  echo "Set BES3_RESTORE_CONFIRM=restore to allow runtime restore" >&2
  exit 1
fi

TMP_DIR=$(mktemp -d)
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

tar -xzf "$ARCHIVE_PATH" -C "$TMP_DIR"

rm -rf "${APP_DIR}/data" "${APP_DIR}/storage/media"
mkdir -p "${APP_DIR}/storage"
cp -a "${TMP_DIR}/data" "${APP_DIR}/data"
cp -a "${TMP_DIR}/storage/media" "${APP_DIR}/storage/media"

if [[ "$RESTORE_ENV" == "true" && -f "${TMP_DIR}/.env.production" ]]; then
  cp "${TMP_DIR}/.env.production" "${APP_DIR}/.env.production"
fi

echo "Runtime restore completed from ${ARCHIVE_PATH}"
echo "If the app is running, restart the container to pick up restored files."

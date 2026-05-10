#!/usr/bin/env bash
set -euo pipefail

required_env() {
  local missing=()
  for key in "$@"; do
    if [[ -z "${!key:-}" ]]; then
      missing+=("$key")
    fi
  done
  if (( ${#missing[@]} > 0 )); then
    printf 'Missing required environment variables: %s\n' "${missing[*]}" >&2
    exit 64
  fi
}

mask_secret() {
  local value="${1:-}"
  if [[ "${GITHUB_ACTIONS:-}" == "true" && -n "$value" ]]; then
    printf '::add-mask::%s\n' "$value"
  fi
}

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
LOCAL_DEPLOY_SCRIPT="${SCRIPT_DIR}/deploy-ghcr.sh"

if [[ ! -f "$LOCAL_DEPLOY_SCRIPT" ]]; then
  printf 'Local deploy script not found: %s\n' "$LOCAL_DEPLOY_SCRIPT" >&2
  exit 66
fi

required_env \
  CLAWCLOUD_SSH_HOST \
  CLAWCLOUD_SSH_USER \
  CLAWCLOUD_SSH_PRIVATE_KEY \
  GHCR_USERNAME \
  GHCR_TOKEN

for command_name in ssh ssh-keyscan curl node; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    printf 'Missing required command: %s\n' "$command_name" >&2
    exit 69
  fi
done

mask_secret "$CLAWCLOUD_SSH_PRIVATE_KEY"
mask_secret "$GHCR_TOKEN"
mask_secret "${BES3_INTERNAL_REVALIDATE_TOKEN:-}"

SSH_PORT="${CLAWCLOUD_SSH_PORT:-22}"
REMOTE_APP_DIR="${CLAWCLOUD_APP_DIR:-/srv/bes3}"
IMAGE="${BES3_IMAGE:-ghcr.io/xxrenzhe/bes3:prod-latest}"
REMOTE_HEALTHCHECK_URL="${BES3_REMOTE_HEALTHCHECK_URL:-http://127.0.0.1/api/health}"
PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL:-https://www.bes3.com}"
EXPECTED_SHA="${BES3_EXPECTED_BUILD_SHA:-}"

tmp_dir="$(mktemp -d)"
cleanup() {
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

key_file="${tmp_dir}/clawcloud_key"
known_hosts_file="${tmp_dir}/known_hosts"
printf '%s\n' "$CLAWCLOUD_SSH_PRIVATE_KEY" | tr -d '\r' > "$key_file"
chmod 600 "$key_file"

if [[ -n "${CLAWCLOUD_SSH_KNOWN_HOSTS:-}" ]]; then
  printf '%s\n' "$CLAWCLOUD_SSH_KNOWN_HOSTS" > "$known_hosts_file"
else
  ssh-keyscan -p "$SSH_PORT" "$CLAWCLOUD_SSH_HOST" > "$known_hosts_file" 2>/dev/null
fi

remote_script="$(
  cat <<'REMOTE'
set -euo pipefail

cd "$CLAWCLOUD_APP_DIR"

if [[ ! -f "$CLAWCLOUD_APP_DIR/docker-compose.yml" ]]; then
  echo "docker-compose.yml not found in $CLAWCLOUD_APP_DIR" >&2
  exit 1
fi

if [[ ! -f "$CLAWCLOUD_APP_DIR/.env.production" ]]; then
  echo ".env.production not found in $CLAWCLOUD_APP_DIR" >&2
  exit 1
fi

deploy_script="$(mktemp)"
cleanup() {
  rm -f "$deploy_script"
}
trap cleanup EXIT

cat > "$deploy_script" <<'BES3_DEPLOY_GHCR_SCRIPT'
REMOTE
)"

echo "Deploying $IMAGE on $CLAWCLOUD_SSH_USER@$CLAWCLOUD_SSH_HOST:$REMOTE_APP_DIR"
{
  printf 'export CLAWCLOUD_APP_DIR=%q\n' "$REMOTE_APP_DIR"
  printf 'export GHCR_USERNAME=%q\n' "$GHCR_USERNAME"
  printf 'export GHCR_TOKEN=%q\n' "$GHCR_TOKEN"
  printf 'export BES3_IMAGE=%q\n' "$IMAGE"
  printf 'export BES3_HEALTHCHECK_URL=%q\n' "$REMOTE_HEALTHCHECK_URL"
  printf '%s\n' "$remote_script"
  cat "$LOCAL_DEPLOY_SCRIPT"
  printf '\nBES3_DEPLOY_GHCR_SCRIPT\n'
  printf 'chmod +x "$deploy_script"\n'
  printf 'BES3_APP_DIR="$CLAWCLOUD_APP_DIR" "$deploy_script"\n'
} | ssh \
  -i "$key_file" \
  -p "$SSH_PORT" \
  -o BatchMode=yes \
  -o StrictHostKeyChecking=yes \
  -o UserKnownHostsFile="$known_hosts_file" \
  "$CLAWCLOUD_SSH_USER@$CLAWCLOUD_SSH_HOST" \
  'bash -s'

if [[ -n "$PUBLIC_APP_URL" ]]; then
  echo "Checking public health at $PUBLIC_APP_URL/api/health"
  health_json="$(curl --fail --silent --show-error "$PUBLIC_APP_URL/api/health")"
  printf '%s\n' "$health_json"

  if [[ -n "$EXPECTED_SHA" ]]; then
    HEALTH_JSON="$health_json" EXPECTED_SHA="$EXPECTED_SHA" node <<'NODE'
const health = JSON.parse(process.env.HEALTH_JSON || '{}')
const expected = process.env.EXPECTED_SHA
const deployed = health?.build?.sha
if (deployed !== expected) {
  console.error(`Expected deployed build ${expected}, got ${deployed || 'unknown'}`)
  process.exit(1)
}
NODE
  fi
fi

if [[ -n "${BES3_INTERNAL_REVALIDATE_TOKEN:-}" && -n "$PUBLIC_APP_URL" ]]; then
  echo "Requesting production revalidation"
  curl --fail --silent --show-error -X POST "$PUBLIC_APP_URL/api/internal/revalidate" \
    -H 'content-type: application/json' \
    -H "x-bes3-internal-token: $BES3_INTERNAL_REVALIDATE_TOKEN" \
    --data '{"paths":["/reviews/deervalley-dv-1s0029-v3-smart-bidet-toilet-purified-water-massage-review","/reviews","/api/open/coverage","/api/open/evidence","/editorial/sitemap.xml"],"category":"Bathroom Fixtures","brand":"DeerValley"}'
  echo
fi

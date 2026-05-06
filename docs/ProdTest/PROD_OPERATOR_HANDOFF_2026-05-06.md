# BES3 Production Operator Handoff - 2026-05-06

Target: `https://www.bes3.com`

Use this after getting access to the ClawCloud production host. The current local session cannot safely deploy because it has no production host, no production `.env.production`, no GHCR credentials, and no remote deployment workflow.

## Current Blocker

- `www.bes3.com` still serves stale/mixed page bundles.
- `https://www.bes3.com/products/lomon-womens-fuzzy-sherpa-fleece-jacket-lightweight-vest-cozy-sleeveless-cardigan-zipper-waistcoat-outerwear-with-pocket` still returns HTTP 404.
- `https://www.bes3.com/yard-pool-automation/best-yard-pool-automation-for-pool-wall-climbing` still serves old `Reddit Consensus` / `noindex` copy.
- Authenticated production audit still fails at `/api/auth/login returned 401`.

## Production Host Deploy

Run this on the ClawCloud production host from the app directory that contains `docker-compose.yml` and `.env.production`:

```bash
GHCR_USERNAME=<github-username> \
GHCR_TOKEN=<ghcr-token> \
BES3_IMAGE=ghcr.io/xxrenzhe/bes3:prod-latest \
./scripts/deploy-ghcr.sh
```

Expected deploy script behavior:

- Logs into GHCR if credentials are provided.
- Pulls `ghcr.io/xxrenzhe/bes3:prod-latest`.
- Runs runtime environment validation inside the image.
- Runs database migrations against the production env.
- Starts the container with `docker compose up -d --no-build`.
- Polls `http://127.0.0.1/api/health` until healthy.

Do not run this from a developer laptop unless that laptop is intentionally configured as the production host.

## Required Post-Deploy Checks

Run the executable verifier from this repository after the production host restart:

```bash
PRODUCTION_POST_DEPLOY_BASE_URL=https://www.bes3.com \
PRODUCTION_POST_DEPLOY_OUTPUT_DIR=docs/ProdTest \
npm run ops:production-post-deploy-verify
```

The verifier writes `docs/ProdTest/production-post-deploy-verify-<timestamp>.json`.

If the script is unavailable, run these equivalent manual checks from any machine:

```bash
curl -sS -H 'Cache-Control: no-cache' \
  'https://www.bes3.com/api/health?operator_recheck=20260506' | jq .

curl -sS -D /tmp/bes3-product54-after-deploy.headers \
  -o /tmp/bes3-product54-after-deploy.html \
  -H 'Cache-Control: no-cache' \
  'https://www.bes3.com/products/lomon-womens-fuzzy-sherpa-fleece-jacket-lightweight-vest-cozy-sleeveless-cardigan-zipper-waistcoat-outerwear-with-pocket?operator_recheck=20260506'

curl -sS -D /tmp/bes3-pseo-after-deploy.headers \
  -o /tmp/bes3-pseo-after-deploy.html \
  -H 'Cache-Control: no-cache' \
  'https://www.bes3.com/yard-pool-automation/best-yard-pool-automation-for-pool-wall-climbing?operator_recheck=20260506'

curl -sS 'https://www.bes3.com/products/sitemap.xml?operator_recheck=20260506' \
  | rg -c '<url>'

curl -sS 'https://www.bes3.com/editorial/sitemap.xml?operator_recheck=20260506' \
  | rg -c '<url>'
```

Pass criteria:

- `/api/health` returns HTTP 200 and includes a `build.sha` object from the latest image.
- Product 54 page returns HTTP 200, not `NEXT_HTTP_ERROR_FALLBACK;404`.
- Product 54 page renders the open-commerce fallback/product brief content and merchant CTA.
- pSEO page renders `Evidence Check`, `Research Snapshot`, `Source Score`, and `Source Proof`.
- pSEO page no longer renders the old `Reddit Consensus` title for this one-product research page.
- Product sitemap returns at least 215 URLs.
- Editorial sitemap returns at least 20 URLs.

## Required Authenticated Audit

After production admin login works, run:

```bash
PRODUCTION_BUSINESS_AUDIT_BASE_URL=https://www.bes3.com \
PRODUCTION_BUSINESS_AUDIT_OUTPUT_DIR=docs/ProdTest \
npm run ops:production-business-audit
```

Pass criteria:

- The audit does not stop at `Authentication`.
- Admin inventory truth, evidence quality, taxonomy intent sources, SEO backlog, and price-value summary checks run.
- Any generated JSON artifact is stored under `docs/ProdTest`.

## Manual Review URLs

- Working evidence page: `https://www.bes3.com/products/dolphin-nautilus-pool-wall-demo`
- Product 54 page to recheck after restart: `https://www.bes3.com/products/lomon-womens-fuzzy-sherpa-fleece-jacket-lightweight-vest-cozy-sleeveless-cardigan-zipper-waistcoat-outerwear-with-pocket`
- pSEO page to recheck after restart: `https://www.bes3.com/yard-pool-automation/best-yard-pool-automation-for-pool-wall-climbing`
- Product 54 machine API: `https://www.bes3.com/api/open/commerce/products/54`
- Product 54 offers API: `https://www.bes3.com/api/open/commerce/products/54/offers`
- Product 54 merchant handoff: `https://www.bes3.com/go/54?source=prodtest&visitor=prodtest-20260506`

## Completion Rule

Do not close bead `bes3-dg3t` and do not mark the thread goal complete until:

- Production host serves the latest image.
- Product 54 detail URL is externally HTTP 200.
- The sampled pSEO page serves corrected research-mode copy.
- Authenticated production business audit runs past login and records results under `docs/ProdTest`.

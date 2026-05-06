# BES3 Production Business Validation - 2026-05-06

Target: `https://www.bes3.com`

This report records the production validation steps, evidence, fixes made locally, and remaining blockers. The result is not a full pass yet because production admin authentication failed, one public product-detail URL is broken in the currently deployed build, and pSEO product/editorial sitemaps are empty in production.

## Executive Result

- Production public APIs are live and return real commerce/evidence payloads.
- Production has monetizable products and `/go/54` redirects to Amazon with affiliate attribution.
- Production has YouTube-backed evidence pages, including an externally accessible evidence URL.
- Production open-commerce product actions currently link to `/products/<slug>` URLs that 404 for open-commerce products.
- Local code was patched so `/products/[slug]` now falls back to open-commerce products and product/editorial sitemap routes are dynamic.
- Fix commit `5598466` was pushed to `main`; GitHub Actions release workflow `25428374415` completed successfully and published the release image, but `www.bes3.com` still serves the old runtime until the server pulls/restarts the new image.

## External URLs For Manual Review

- Evidence product page, currently working: `https://www.bes3.com/products/dolphin-nautilus-pool-wall-demo`
- pSEO scenario page, currently renders but is `noindex`: `https://www.bes3.com/yard-pool-automation/best-yard-pool-automation-for-pool-wall-climbing`
- Open commerce product API: `https://www.bes3.com/api/open/commerce/products/54`
- Open commerce offers API: `https://www.bes3.com/api/open/commerce/products/54/offers`
- Merchant handoff, currently redirects to Amazon: `https://www.bes3.com/go/54?source=prodtest&visitor=prodtest-20260506`
- Broken in current production after image build, fixed in commit `5598466`, pending server pull/restart: `https://www.bes3.com/products/lomon-womens-fuzzy-sherpa-fleece-jacket-lightweight-vest-cozy-sleeveless-cardigan-zipper-waistcoat-outerwear-with-pocket`

## Validation Evidence

| Requirement | Result | Evidence |
| --- | --- | --- |
| Business loop closed and data real | Partial | `/api/open/buying-feed` returned 24 products; product 54 has merchant handoff; `/go/54` returned 307 to `www.amazon.com`. Admin inventory audit is blocked by login 401. |
| Find products matching high-quality YouTube review video | Partial | `/api/open/evidence` returned 3 evidence products and 2 evidence reports. Product `dolphin-nautilus-pool-wall-demo` has 1 report and page includes YouTube timestamp links. Quantity/quality threshold is low. |
| Extract detailed information from YouTube products | Partial | Evidence page includes creator quote/context. Admin report-level validation is blocked by login 401. Product 54 machine payload has 32 attribute facts and 6 price-history points, but it is commerce data rather than YouTube-derived evidence. |
| Mine real long-tail keywords | Partial | Evidence API reports 60 tags and 6 pending tags; taxonomy sitemap has 750 URLs. Admin taxonomy intent-source validation is blocked by login 401. |
| Generate high-quality review/product pages | Partial | Evidence product page is 200, indexable, contains evidence and YouTube link. Open-commerce product page for product 54 is 404 in production; local code patch adds fallback page. |
| pSEO ranking automation | Weak | Main sitemap has 945 URLs and taxonomy sitemap has 750 URLs. Product and editorial sitemaps are empty in production; sampled pSEO page renders but contains `noindex`. |
| Improve affiliate-click conversion | Partial | `/go/54` redirects to Amazon with affiliate parameters; buying-feed actions include `merchant_handoff`, `start_alert`, and `browse_category`. Deployed product-detail page 404 weakens conversion. |
| Improve AI recommendation ability | Partial | `llms.txt`, `/api/open/coverage`, `/api/open/buying-feed`, and open commerce endpoints exist. `LOMON` search returns 10 results; `pool robot` search returns 0 despite evidence product existing. |
| Solve issues encountered | Partial | Fixed local root cause for broken open-commerce product URLs and stale product/editorial sitemap routes. Production deployment and credentials remain blockers. |
| Write every step under `docs/ProdTest` | Done | This report plus `production-business-loop-audit-2026-05-06T09-29-18-390Z.json` are stored in `docs/ProdTest`. |

## Commands Run

- `bd create --title="Validate production BES3 business flow" --type=task --priority=1`
- `bd update bes3-dg3t --claim`
- `PRODUCTION_BUSINESS_AUDIT_BASE_URL=https://www.bes3.com PRODUCTION_BUSINESS_AUDIT_OUTPUT_DIR=docs/ProdTest npm run ops:production-business-audit`
- `curl https://www.bes3.com/api/open/coverage`
- `curl https://www.bes3.com/api/open/evidence`
- `curl https://www.bes3.com/api/open/buying-feed`
- `curl 'https://www.bes3.com/api/open/commerce/search?q=pool%20robot&limit=10'`
- `curl 'https://www.bes3.com/api/open/commerce/search?q=LOMON&limit=10'`
- `curl https://www.bes3.com/api/open/commerce/products/54`
- `curl https://www.bes3.com/api/open/commerce/products/54/offers`
- `curl 'https://www.bes3.com/go/54?source=prodtest&visitor=prodtest-20260506'`
- `curl https://www.bes3.com/products/dolphin-nautilus-pool-wall-demo`
- `curl https://www.bes3.com/products/lomon-womens-fuzzy-sherpa-fleece-jacket-lightweight-vest-cozy-sleeveless-cardigan-zipper-waistcoat-outerwear-with-pocket`
- `curl https://www.bes3.com/products/sitemap.xml`
- `curl https://www.bes3.com/editorial/sitemap.xml`
- `curl https://www.bes3.com/taxonomy/sitemap.xml`
- `npx eslint 'src/app/products/[slug]/page.tsx' src/app/products/sitemap.ts src/app/editorial/sitemap.ts`
- `npx tsc --noEmit --pretty false`
- `npm run build`
- `git commit -m "Fix production product detail coverage"`
- `git push origin main`
- `gh api 'repos/xxrenzhe/bes3/actions/runs/25428374415'`
- Post-push production rechecks for product 54 detail URL and `/products/sitemap.xml`
- Final recheck after workflow `25428790831` success: product 54 detail URL, `/products/sitemap.xml`, and `npm run ops:production-business-audit`
- Deployment capability check: local `/srv/bes3`, `.env.production`, Docker daemon, SSH host config, and project ClawCloud deploy documentation

## Production Findings

### Passed

- `/api/open/coverage` returned `coverage-manifest-v1` with 42 products, 4 articles, 2 reviews, and 2 comparisons.
- `/api/open/evidence` returned `bes3-evidence-v2` with 15 categories, 60 tags, 3 products, 2 evidence reports, 6 pending tags, 11 queued rescans, and 12 price-value snapshots.
- `/api/open/buying-feed` returned 24 products. Product 54 includes AI-ready actions and 3 disclaimers.
- `/api/open/commerce/products/54` returned a detailed product payload with 32 attribute facts, 6 price-history points, and a large decision object.
- `/api/open/commerce/products/54/offers` returned 1 offer, 4 next actions, 3 disclaimers, and 6 price-history points.
- `/go/54?source=prodtest&visitor=prodtest-20260506` returned 307 to `https://www.amazon.com/...`.
- `https://www.bes3.com/products/dolphin-nautilus-pool-wall-demo` returned 200 and includes evidence report content, scenario evidence, YouTube link, check-price CTA, and no `noindex`.

### Failed Or Weak

- Built-in production business audit failed immediately because `/api/auth/login` returned 401. Admin-only checks for inventory truth, evidence report quality, taxonomy intent sources, SEO backlog, and price-value summaries could not run.
- `https://www.bes3.com/products/lomon-womens-fuzzy-sherpa-fleece-jacket-lightweight-vest-cozy-sleeveless-cardigan-zipper-waistcoat-outerwear-with-pocket` returned 404, even though public APIs advertise it as a product detail URL.
- `https://www.bes3.com/products/sitemap.xml` returned an empty `<urlset>`.
- `https://www.bes3.com/editorial/sitemap.xml` returned an empty `<urlset>`.
- `https://www.bes3.com/yard-pool-automation/best-yard-pool-automation-for-pool-wall-climbing` returned 200 with canonical and JSON-LD, but contains `noindex`.
- `pool robot` open-commerce search returned 0 results, even though an evidence product exists for the pool category.
- After commit `5598466` was pushed and release workflow `25428374415` completed successfully, production still returned 404 for the product 54 detail URL and 0 URLs for `/products/sitemap.xml`; this confirms the server has not yet pulled/restarted the new image.
- After report commit `a09c76b` and release workflow `25428790831` also completed successfully, production still returned 404 for the product 54 detail URL, 0 URLs for `/products/sitemap.xml`, and admin audit still failed with `/api/auth/login returned 401`.
- Workflow `25428991241` for final recheck commit `b0754e6` also completed successfully. Local deployment capability check found no `/srv/bes3`, no production `.env.production`, Docker daemon not running, and no SSH host entry for a Bes3/ClawCloud server. Project docs explicitly state ClawCloud deployment is manual from GHCR.

## Local Fixes Made

- `src/app/products/[slug]/page.tsx`: added an open-commerce fallback page so public buying-feed product URLs can render as product briefs with offer, price history, facts, brand context, machine payload link, structured data, and merchant CTA.
- `src/app/products/sitemap.ts`: made route dynamic and included both open-commerce products and hardcore evidence products, deduped by URL.
- `src/app/editorial/sitemap.ts`: made route dynamic so deployed runtime data can populate the editorial sitemap.

## Verification After Local Fix

- `npx eslint 'src/app/products/[slug]/page.tsx' src/app/products/sitemap.ts src/app/editorial/sitemap.ts`: passed.
- `npx tsc --noEmit --pretty false`: passed.
- `npm run build`: passed. Build output shows `/products/[slug]`, `/products/sitemap.xml`, and `/editorial/sitemap.xml` as dynamic server-rendered routes.
- Local production server could not prove the LOMON product-detail fix because local SQLite data does not contain the production LOMON product. This is expected data-environment mismatch, not a TypeScript/build failure.
- GitHub Actions release workflow `25428374415`: completed with `success` for commit `5598466`.
- GitHub Actions release workflow `25428790831`: completed with `success` for report commit `a09c76b`.
- GitHub Actions release workflow `25428991241`: completed with `success` for final recheck commit `b0754e6`.
- Final production business audit artifact: `docs/ProdTest/production-business-loop-audit-2026-05-06T10-05-26-097Z.json`.

## Required Next Steps

1. Pull/restart the production server on the new GHCR image from commit `5598466`.
2. Re-run `npm run ops:production-business-audit` with valid production admin credentials.
3. Re-check the pending external URL for product 54 and both sitemap URLs after deployment.
4. Remove pSEO `noindex` only after evidence thresholds are intentionally met, or adjust thresholds if one-product scenario pages should rank.
5. Improve open-commerce search so evidence products can be discovered by queries such as `pool robot`.

## Continuation Recheck - 2026-05-06T10:31:10Z

This recheck was run directly against `https://www.bes3.com` after the earlier release workflow successes.

### Commands Run

- `curl -sS -D /tmp/bes3-prod-product54.headers -o /tmp/bes3-prod-product54.body 'https://www.bes3.com/products/lomon-womens-fuzzy-sherpa-fleece-jacket-lightweight-vest-cozy-sleeveless-cardigan-zipper-waistcoat-outerwear-with-pocket'`
- `curl -sS 'https://www.bes3.com/products/sitemap.xml'`
- `curl -sS 'https://www.bes3.com/editorial/sitemap.xml'`
- `curl -sS -D /tmp/bes3-pseo.headers -o /tmp/bes3-pseo.body 'https://www.bes3.com/yard-pool-automation/best-yard-pool-automation-for-pool-wall-climbing'`
- `PRODUCTION_BUSINESS_AUDIT_BASE_URL=https://www.bes3.com PRODUCTION_BUSINESS_AUDIT_OUTPUT_DIR=docs/ProdTest npm run ops:production-business-audit`
- `curl -sS 'https://www.bes3.com/api/open/commerce/products/54'`
- `curl -sS 'https://www.bes3.com/api/open/commerce/search?q=LOMON&limit=1'`
- `npx eslint 'src/app/products/[slug]/page.tsx' src/lib/site-data.ts src/app/products/sitemap.ts`
- `npx tsc --noEmit --pretty false`

### New Evidence

- Product 54 advertised URL now returns HTTP 404 at the protocol layer, even though the body is a rendered Bes3 404 recovery page. Earlier shell output that printed `status=200` was from the proxy preamble line, not the final HTTP/2 status.
- Product 54 API still returns the advertised slug and product-detail action: `lomon-womens-fuzzy-sherpa-fleece-jacket-lightweight-vest-cozy-sleeveless-cardigan-zipper-waistcoat-outerwear-with-pocket`.
- `/api/open/commerce/search?q=LOMON&limit=1` returns product id 15 first, proving search works for some LOMON products but not the exact pending URL.
- `/products/sitemap.xml` still returns 0 `<url>` entries and `x-nextjs-cache: HIT`.
- `/editorial/sitemap.xml` still returns 0 `<url>` entries.
- The sampled pSEO page still returns 200 with crawler-visible evidence, JSON-LD, canonical, YouTube timestamp links, and `noindex, follow`.
- The built-in production business audit still stops at admin authentication: `/api/auth/login returned 401`. New artifact: `docs/ProdTest/production-business-loop-audit-2026-05-06T10-25-32-614Z.json`.

### Additional Local Fix

- `src/app/products/[slug]/page.tsx`: forced the product detail route to dynamic rendering with `revalidate = 0` so runtime DB changes are not hidden behind stale route output.
- `src/lib/site-data.ts`: made `getOpenCommerceProductBySlug` fall back to `listOpenCommerceProducts()` when the direct slug query misses, matching the API path that already exposes the product.

### Verification After Additional Local Fix

- `npx eslint 'src/app/products/[slug]/page.tsx' src/lib/site-data.ts src/app/products/sitemap.ts`: passed.
- `npx tsc --noEmit --pretty false`: passed.

### Current Blockers

1. Product 54 page is still externally broken in production until this additional fix is committed, pushed, built, and the production server pulls/restarts the new image.
2. Product and editorial sitemaps remain empty in production; product sitemap is explicitly cached as `x-nextjs-cache: HIT`.
3. Admin credentials are still invalid or unavailable, so authenticated audit gates for inventory truth, evidence quality, taxonomy sources, SEO backlog, and conversion telemetry remain unverified.
4. pSEO pages remain `noindex`, so search-ranking automation cannot be called a pass yet.

## Release Recheck - 2026-05-06T10:48:52Z

### Commands Run

- `gh run cancel 25430181094 --repo xxrenzhe/bes3`
- `env SMOKE_E2E_PORT=3210 SMOKE_E2E_STARTUP_TIMEOUT_MS=60000 SMOKE_E2E_REQUEST_TIMEOUT_MS=8000 JWT_SECRET=local-smoke-jwt-secret-with-enough-length ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef DEFAULT_ADMIN_PASSWORD=local-smoke-admin-password DATABASE_PATH=./data/local-smoke.db npm run ops:smoke-e2e`
- `npx tsc --noEmit --pretty false`
- `git commit -m "Harden runtime smoke diagnostics"`
- `git push origin main`
- `gh run watch 25430545440 --repo xxrenzhe/bes3 --exit-status`
- `gh run view 25430545440 --repo xxrenzhe/bes3 --json status,conclusion,headSha,url,jobs`
- `curl -sS -D /tmp/bes3-prod-product54-after280.headers -o /tmp/bes3-prod-product54-after280.body 'https://www.bes3.com/products/lomon-womens-fuzzy-sherpa-fleece-jacket-lightweight-vest-cozy-sleeveless-cardigan-zipper-waistcoat-outerwear-with-pocket'`
- `curl -sS -D /tmp/bes3-products-sitemap-after280.headers -o /tmp/bes3-products-sitemap-after280.xml 'https://www.bes3.com/products/sitemap.xml'`
- `curl -sS -D /tmp/bes3-editorial-sitemap-after280.headers -o /tmp/bes3-editorial-sitemap-after280.xml 'https://www.bes3.com/editorial/sitemap.xml'`

### New Fixes

- `scripts/smoke-planv2-e2e.ts`: uses `.next/standalone/server.js` when available, adds request-level timeout, and prints request timeout in diagnostics.
- `.github/workflows/deploy.yml`: caps the runtime smoke diagnostics step at 3 minutes and passes explicit startup/request timeout settings.

### Verification

- Local standalone runtime smoke passed with 10 checks.
- `npx tsc --noEmit --pretty false`: passed.
- GitHub release workflow `25430545440` for commit `280013f` completed successfully.
- CI `build-and-test` passed: type check, ESLint, schema drift, production build, and runtime smoke diagnostics.
- CI `build-and-push` passed and published:
  - `ghcr.io/xxrenzhe/bes3:prod-latest`
  - `ghcr.io/xxrenzhe/bes3:prod-280013f`

### Production Recheck After Image Publish

- Product 54 detail URL still returns HTTP 404 and renders the Bes3 404 recovery page.
- `/products/sitemap.xml` still returns 0 `<url>` entries with `x-nextjs-cache: HIT`.
- `/editorial/sitemap.xml` still returns 0 `<url>` entries with `x-nextjs-cache: HIT`.
- Project deployment docs and workflow comments still confirm ClawCloud deployment is manual: GitHub Actions only publishes GHCR images, then the server must pull/restart `ghcr.io/xxrenzhe/bes3:prod-latest`.

### Current Required Operator Action

Run the manual ClawCloud deployment from the production server with the current image:

```bash
GHCR_USERNAME=<github-username> \
GHCR_TOKEN=<ghcr-token> \
BES3_IMAGE=ghcr.io/xxrenzhe/bes3:prod-latest \
./scripts/deploy-ghcr.sh
```

Then re-run:

```bash
PRODUCTION_BUSINESS_AUDIT_BASE_URL=https://www.bes3.com \
PRODUCTION_BUSINESS_AUDIT_OUTPUT_DIR=docs/ProdTest \
npm run ops:production-business-audit
```

## Post-Deploy Recheck - 2026-05-06T11:06:28Z

The user confirmed production had pulled the latest code, so validation continued directly against `https://www.bes3.com`.

### Commands Run

- `curl -sS -D - -o /tmp/bes3-product-page.html 'https://www.bes3.com/products/lomon-womens-fuzzy-sherpa-fleece-jacket-lightweight-vest-cozy-sleeveless-cardigan-zipper-waistcoat-outerwear-with-pocket?codex_recheck=20260506b'`
- `curl -sS 'https://www.bes3.com/api/open/commerce/products/54'`
- `curl -sS 'https://www.bes3.com/api/open/commerce/search?q=LOMON%20Womens%20Fuzzy%20Sherpa%20Fleece%20Jacket&limit=1'`
- `curl -sS -D - -o /tmp/bes3-hardcore-product.html 'https://www.bes3.com/products/dolphin-nautilus-pool-wall-demo?codex_recheck=20260506b'`
- `npx eslint src/lib/site-data.ts 'src/app/products/[slug]/page.tsx'`
- `npx tsc --noEmit --pretty false`
- `npm run build`

### New Evidence

- Production now serves the updated product route bundle and fresh CSS, but the product 54 detail URL still returns HTTP 404 with the Bes3 404 recovery page.
- The same production service returns product 54 from `/api/open/commerce/products/54`; the payload includes the expected slug, 32 attribute facts, 6 price history points, 1 current offer, and fresh 2026-05-06 timestamps.
- Exact open-commerce search returns product 54 first and advertises the same product-detail action URL that currently returns 404.
- The existing hardcore evidence product URL `/products/dolphin-nautilus-pool-wall-demo` returns HTTP 200, so the product route itself is mounted and only the open-commerce slug path is failing.

### Root Cause Found

- Production Postgres returns some numeric identifiers as strings in JSON/query rows. Product 54 appears as `"id": "54"` in the public API payload.
- `mapProductRow` preserved that string id, so `getOpenCommerceProductBySlug` found the row by slug but then passed `"54"` into `getOpenCommerceProductById`.
- `getOpenCommerceProductById` intentionally rejects non-number ids with `Number.isInteger(productId)`, causing the page path to treat the product as missing and call `notFound()`.
- Sitemap/search/id API paths could still expose the same product because they do not all take the same slug-to-id round trip.

### Local Fix

- `src/lib/site-data.ts`: normalize product, offer, fact, article, and price-history ids to integers when mapping database rows.
- This keeps public data types consistent across SQLite and production Postgres and prevents slug lookups from failing after a valid slug row is found.

### Verification After Local Fix

- `npx eslint src/lib/site-data.ts 'src/app/products/[slug]/page.tsx'`: passed.
- `npx tsc --noEmit --pretty false`: passed.
- `npm run build`: passed. Build output confirms `/products/[slug]`, `/products/sitemap.xml`, and `/editorial/sitemap.xml` are dynamic server-rendered routes.

### Remaining Production Gate

- Product 54 detail page needs this numeric-id normalization commit built and deployed before the external URL can be marked pass.
- Authenticated production business audit remains blocked by `/api/auth/login returned 401` until valid production admin credentials are supplied.

## Release Recheck - 2026-05-06T11:14:23Z

### Commands Run

- `git commit -m "Normalize production site data ids"`
- `git push origin main`
- `gh run watch 25431652239 --repo xxrenzhe/bes3 --exit-status`
- `gh run view 25431652239 --repo xxrenzhe/bes3 --json status,conclusion,headSha,url,jobs`
- `curl -sS -D /tmp/bes3-prod-product54-after9fe8.headers -o /tmp/bes3-prod-product54-after9fe8.html 'https://www.bes3.com/products/lomon-womens-fuzzy-sherpa-fleece-jacket-lightweight-vest-cozy-sleeveless-cardigan-zipper-waistcoat-outerwear-with-pocket?codex_recheck=9fe8b87'`
- `curl -sS 'https://www.bes3.com/products/sitemap.xml?codex_recheck=9fe8b87'`
- `curl -sS 'https://www.bes3.com/editorial/sitemap.xml?codex_recheck=9fe8b87'`
- `PRODUCTION_BUSINESS_AUDIT_BASE_URL=https://www.bes3.com PRODUCTION_BUSINESS_AUDIT_OUTPUT_DIR=docs/ProdTest npm run ops:production-business-audit`

### Release Result

- Commit pushed: `9fe8b87` (`Normalize production site data ids`).
- GitHub Actions release workflow `25431652239`: completed with `success`.
- `build-and-test` passed type check, ESLint, schema drift check, production build, and runtime smoke diagnostics.
- `build-and-push` passed and published the GHCR image for `9fe8b87`.

### Production Recheck

- `/products/sitemap.xml?codex_recheck=9fe8b87`: returns 215 `<url>` entries.
- `/editorial/sitemap.xml?codex_recheck=9fe8b87`: returns 20 `<url>` entries.
- Product 54 detail URL still returns HTTP 404 and the Bes3 404 recovery page immediately after the image publish.
- The HTML still references product route chunk `page-11eb834d09265723.js`, so the live production instance does not yet appear to be serving the newly published `9fe8b87` image.
- Production business audit still stops at admin authentication: `/api/auth/login returned 401`.
- New audit artifact: `docs/ProdTest/production-business-loop-audit-2026-05-06T11-14-25-168Z.json`.

### Current Required Operator Action

Production needs to pull/restart the newly published image for `9fe8b87` before product 54 can be externally rechecked again:

```bash
GHCR_USERNAME=<github-username> \
GHCR_TOKEN=<ghcr-token> \
BES3_IMAGE=ghcr.io/xxrenzhe/bes3:prod-latest \
./scripts/deploy-ghcr.sh
```

After restart, recheck these external URLs:

- `https://www.bes3.com/products/lomon-womens-fuzzy-sherpa-fleece-jacket-lightweight-vest-cozy-sleeveless-cardigan-zipper-waistcoat-outerwear-with-pocket`
- `https://www.bes3.com/products/sitemap.xml`
- `https://www.bes3.com/editorial/sitemap.xml`
- `https://www.bes3.com/api/open/commerce/products/54`
- `https://www.bes3.com/go/54?source=prodtest&visitor=prodtest-20260506`

## Public Flow Recheck - 2026-05-06T11:21:27Z

### Commands Run

- `curl -sS 'https://www.bes3.com/api/open/commerce/products/54'`
- `curl -sS 'https://www.bes3.com/api/open/commerce/search?q=LOMON%20Womens%20Fuzzy%20Sherpa%20Fleece%20Jacket&limit=1'`
- `curl -sS -D /tmp/bes3-prod-product54-correct.headers -o /tmp/bes3-prod-product54-correct.html 'https://www.bes3.com/products/lomon-womens-fuzzy-sherpa-fleece-jacket-lightweight-vest-cozy-sleeveless-cardigan-zipper-waistcoat-outerwear-with-pocket?codex_recheck=193a73f-correct'`
- `curl -sS -D /tmp/bes3-prod-go54-current.headers -o /tmp/bes3-prod-go54-current.html 'https://www.bes3.com/go/54?source=prodtest&visitor=prodtest-20260506'`
- `curl -sS 'https://www.bes3.com/products/sitemap.xml?codex_recheck=193a73f'`
- `curl -sS 'https://www.bes3.com/editorial/sitemap.xml?codex_recheck=193a73f'`
- `curl -sS -D /tmp/bes3-prod-pseo-current.headers -o /tmp/bes3-prod-pseo-current.html 'https://www.bes3.com/yard-pool-automation/best-yard-pool-automation-for-pool-wall-climbing?codex_recheck=193a73f'`

### Evidence

- Product 54 API returns real production data with id `"54"`, the expected slug, 1 active offer, 32 evidence facts, 32 attribute facts, and 6 price-history entries.
- Exact open-commerce search returns product 54 as the first and only result for `LOMON Womens Fuzzy Sherpa Fleece Jacket`.
- The search result's `view_product` action points to the expected product-detail URL.
- Product 54 detail URL still returns HTTP 404 and the Bes3 404 recovery page. The page still references old route chunk `page-11eb834d09265723.js`, so the production server still has not picked up the id-normalization image.
- `/go/54?source=prodtest&visitor=prodtest-20260506` returns HTTP 307 to the Amazon product URL for ASIN `B0D7HLBT61`, so merchant handoff and affiliate conversion tracking route are reachable.
- `/products/sitemap.xml?codex_recheck=193a73f` returns 215 product URLs.
- `/editorial/sitemap.xml?codex_recheck=193a73f` returns 20 editorial URLs.
- pSEO page `/yard-pool-automation/best-yard-pool-automation-for-pool-wall-climbing` returns HTTP 200, has crawler-visible JSON-LD/canonical metadata, includes YouTube timestamp evidence, and still has `noindex, follow`.

### Note

- A mistyped manual probe to `/products/lomon-womens-fuzzy-sherpa-fleece-jacket-lightweight-vest-cozy-sleeveless-cardigan-zipper-waistcoat-193a73f` also returned 404; that path is not the advertised product URL and is not used as product-page evidence.

## Deployment State Recheck - 2026-05-06T11:29:34Z

### Commands Run

- `curl -sS -D /tmp/bes3-product54-latest.headers -o /tmp/bes3-product54-latest.html 'https://www.bes3.com/products/lomon-womens-fuzzy-sherpa-fleece-jacket-lightweight-vest-cozy-sleeveless-cardigan-zipper-waistcoat-outerwear-with-pocket?codex_recheck=bdc7b27-latest'`
- `curl -sS 'https://www.bes3.com/api/open/commerce/products/54'`
- `curl -sS 'https://www.bes3.com/api/open/commerce/search?q=LOMON&limit=5'`
- Sample product pages:
  - `/products/lomon-oversized-sweatshirt-for-women-crewneck-long-sleeve-casual-fleece-tops-graphic-hoodies-pullover-sweater`
  - `/products/lomon-3-4-length-sleeve-womens-tops-v-neck-blouses-dressy-casual-flowy-shirts-business-tunic-to-wear-with-leggings-s-3xl`
  - `/products/dolphin-nautilus-pool-wall-demo`
- `curl -sS 'https://www.bes3.com/api/health'`
- `gh run list --repo xxrenzhe/bes3 --branch main --limit 5`

### Evidence

- Product 54 detail page still returns HTTP 404 and the Bes3 404 recovery page.
- Other open-commerce product detail pages sampled from sitemap also return HTTP 404:
  - LOMON oversized sweatshirt: 404
  - LOMON 3/4 sleeve tops: 404
- The hardcore evidence product `/products/dolphin-nautilus-pool-wall-demo` returns HTTP 200, so the `/products/[slug]` route exists and only the open-commerce branch is failing.
- Production API `/api/open/commerce/products/54` still serializes `product.id` as a JSON string (`"54"`). Current committed code maps product ids through `toInteger` and `serializePublicProductSnapshot` does not stringify ids, so this is direct evidence that production is still serving code older than commit `9fe8b87`.
- `/api/health` returns `status=ok`, `database.connected=true`, and `database.type=postgres`; the database is reachable.
- Latest GitHub release workflows are all green:
  - `25432263973` for `bdc7b27`: success
  - `25431968121` for `193a73f`: success
  - `25431652239` for `9fe8b87`: success

### Conclusion

The remaining product-detail failure is not a CI/build failure and not a database outage. It is a deployment-state blocker: production must pull and restart the image that includes commit `9fe8b87` or later. Until then, all open-commerce product detail URLs exposed by sitemap/search may continue to return 404.

## Deployment Observability Fix - 2026-05-06T11:37:55Z

### Problem

Production could not prove which Git commit was actually running. `/api/health` only exposed package version `0.1.0`, so deployment-state checks had to infer old code from behavior such as string ids and open-commerce 404s.

### Local Fix

- `src/lib/health.ts`: added a public `build` object to health responses with `sha` and `ref`.
- `Dockerfile`: accepts `BES3_BUILD_SHA` and `BES3_BUILD_REF` build args and exposes them as runtime environment variables in builder and runner stages.
- `.github/workflows/deploy.yml`: passes `${{ github.sha }}` and `${{ github.ref_name }}` into Docker build args.

### Verification

- `npx eslint src/lib/health.ts`: passed.
- `npx tsc --noEmit --pretty false`: passed.
- `npm run build`: passed. Build output confirms `/api/health` remains dynamic server-rendered.

### Expected Manual Verification After Next Deploy

After the next GHCR image is pulled and restarted in production, `https://www.bes3.com/api/health` should include:

```json
{
  "build": {
    "sha": "<current git sha>",
    "ref": "main"
  }
}
```

This gives a direct external signal for whether production is running the image that contains the open-commerce product-detail fix.

## Production Latest-Code Recheck - 2026-05-06T11:51:12Z

### Context

The operator reported that production had been updated to the latest code. Current local `main` HEAD is `557b304` (`Expose production build metadata`), and GitHub Actions release workflow `25433025039` for that commit completed successfully at `2026-05-06T11:39:51Z`.

### Commands Run

- `curl -sS -H 'Cache-Control: no-cache' -H 'Pragma: no-cache' 'https://www.bes3.com/api/health?codex_recheck=latest-20260506T1152'`
- `curl -sS -D /tmp/bes3-prod-product54-latest.headers -o /tmp/bes3-prod-product54-latest.html -H 'Cache-Control: no-cache' -H 'Pragma: no-cache' 'https://www.bes3.com/products/lomon-womens-fuzzy-sherpa-fleece-jacket-lightweight-vest-cozy-sleeveless-cardigan-zipper-waistcoat-outerwear-with-pocket?codex_recheck=latest-20260506T1152'`
- `curl -sS -H 'Cache-Control: no-cache' 'https://www.bes3.com/api/open/commerce/products/54?codex_recheck=latest-20260506T1152'`
- `curl -sS -H 'Cache-Control: no-cache' 'https://www.bes3.com/api/open/commerce/search?q=LOMON%20Womens%20Fuzzy%20Sherpa%20Fleece%20Jacket&limit=1&codex_recheck=latest-20260506T1153'`
- `curl -sS -D /tmp/bes3-prod-go54-latest.headers -o /tmp/bes3-prod-go54-latest.html -H 'Cache-Control: no-cache' 'https://www.bes3.com/go/54?source=prodtest&visitor=prodtest-20260506-latest'`
- `curl -sS -H 'Cache-Control: no-cache' 'https://www.bes3.com/products/sitemap.xml?codex_recheck=latest-20260506T1153'`
- `curl -sS -H 'Cache-Control: no-cache' 'https://www.bes3.com/editorial/sitemap.xml?codex_recheck=latest-20260506T1153'`
- `curl -sS -D /tmp/bes3-prod-pseo-latest.headers -o /tmp/bes3-prod-pseo-latest.html -H 'Cache-Control: no-cache' 'https://www.bes3.com/yard-pool-automation/best-yard-pool-automation-for-pool-wall-climbing?codex_recheck=latest-20260506T1153'`
- `PRODUCTION_BUSINESS_AUDIT_BASE_URL=https://www.bes3.com PRODUCTION_BUSINESS_AUDIT_OUTPUT_DIR=docs/ProdTest npm run ops:production-business-audit`
- `curl -sS -D /tmp/bes3-apex-health.headers -o /tmp/bes3-apex-health.body -H 'Cache-Control: no-cache' 'https://bes3.com/api/health?codex_recheck=apex-20260506T1155'`

### Evidence

- `https://www.bes3.com/api/health` still returns `status=ok`, `version=0.1.0`, `database.connected=true`, and `database.type=postgres`, but still does not include the `build` object added in `557b304`.
- Product 54 detail page still returns HTTP 404 and `NEXT_HTTP_ERROR_FALLBACK;404`.
- Product 54 detail HTML still references old route chunk `static/chunks/app/products/%5Bslug%5D/page-11eb834d09265723.js`.
- Product 54 API still returns `product.id` as JSON string `"54"`, not a number. This is direct runtime evidence that the id-normalization code from `9fe8b87` is not active on the public `www` service.
- Product 54 API returns the expected slug and 6 price-history rows, but the latest probe returned 0 offers and 0 facts through the public product endpoint.
- Open-commerce search returns the expected LOMON product as the only result, with `view_product` pointing to the product URL that still returns 404 and `merchant_handoff` pointing to `/go/54?source=open-commerce-search`.
- `/go/54?source=prodtest&visitor=prodtest-20260506-latest` still returns HTTP 307 to the Amazon ASIN `B0D7HLBT61` affiliate URL.
- `/products/sitemap.xml` still returns 215 product URLs.
- `/editorial/sitemap.xml` still returns 20 editorial URLs.
- pSEO sample `/yard-pool-automation/best-yard-pool-automation-for-pool-wall-climbing` still returns HTTP 200, includes schema/canonical metadata and YouTube timestamp evidence, and still emits `noindex, follow`.
- Production business audit still fails at authentication: `/api/auth/login returned 401`.
- New audit artifact: `docs/ProdTest/production-business-loop-audit-2026-05-06T11-50-39-655Z.json`.
- Apex domain `https://bes3.com/api/health` returns Cloudflare HTTP 525 (`error code: 525`), while `https://www.bes3.com/api/health` is reachable. Manual verification should use `www.bes3.com` until apex TLS is corrected.

### Conclusion

Production is still not externally serving the latest `557b304` image on `www.bes3.com`. The public evidence remains consistent with an older runtime: no health build metadata, open-commerce product detail 404s, old product route chunk, and string product ids. The GitHub release image was built successfully, so the remaining blocker is the production pull/restart path rather than CI.

### Current Required Operator Action

Pull and restart the latest GHCR image on the production host, then recheck `https://www.bes3.com/api/health` for `build.sha`:

```bash
GHCR_USERNAME=<github-username> \
GHCR_TOKEN=<ghcr-token> \
BES3_IMAGE=ghcr.io/xxrenzhe/bes3:prod-latest \
./scripts/deploy-ghcr.sh
```

The production business audit also remains blocked until valid production admin credentials are available or the production auth configuration is corrected.

## pSEO Page Content Quality Fix - 2026-05-06T12:12:56Z

### Trigger

Manual review flagged `https://www.bes3.com/yard-pool-automation/best-yard-pool-automation-for-pool-wall-climbing` as unsuitable for real users or AI extraction. The prior production page returned HTTP 200 and had schema/canonical metadata, but the rendered content overclaimed the evidence state:

- Title used `Reddit Consensus: The 1 Best ...`, despite only one product and one evidence report.
- Eyebrow used `Programmatic Scenario Page`, which is implementation-facing, not user-facing.
- Body text and matrix language used `winner`, `ranking`, and `current winner` wording while the page was still `noindex, follow`.
- The page exposed useful YouTube proof, but did not clearly separate what was known from what was still unproven.

### Code Changes

- `src/app/[category]/[landing]/page.tsx`
  - Added explicit live/research status gating with `isLiveScenario`.
  - Researching pages now render as `Evidence Check` / `Research Snapshot` pages instead of `Best` pages.
  - Researching BLUF now states the exact evidence count, product count, best quote, and why the page is not a final ranking.
  - FAQ entries now switch between research-mode source-checking questions and live-mode ranking questions.
  - Metadata title, description, keywords, and structured-data `about` terms no longer use `Reddit Consensus` for research pages.
- `src/components/site/HardcoreEvidenceMatrix.tsx`
  - Added `isResearching` rendering mode.
  - Researching pages now label the table as `Evidence Matrix`, use `Source Score`, and use `Source Proof`.
  - Researching matrix copy now says the table is not a ranked recommendation and exists to expose proof, source depth, price context, and gaps.

### Local Validation

- `npx eslint 'src/app/[category]/[landing]/page.tsx' src/components/site/HardcoreEvidenceMatrix.tsx`: passed.
- `npx tsc --noEmit --pretty false`: passed.
- `npm run build`: passed; `/[category]/[landing]` remains dynamic server-rendered.
- Local production preview:
  - `npm run start -- --hostname 127.0.0.1 --port 3010`
  - `http://127.0.0.1:3010/yard-pool-automation/best-yard-pool-automation-for-pool-wall-climbing` returned HTTP 200.
  - Browser-rendered title: `Yard and Pool Automation for Pool Wall Climbing: Evidence Check | Bes3`.
  - Browser-rendered H1: `Yard and Pool Automation for Pool Wall Climbing: Evidence Check`.
  - Browser-rendered research summary now says there is 1 timestamped YouTube evidence report across 1 product and explicitly says it is not a final ranking.
  - Browser-rendered body includes `Research Snapshot`, `Research Status`, `Evidence Matrix`, `Source Score`, `Source Proof`, and `Timestamped YouTube proof and the gap it leaves`.
  - Browser snapshot confirmed the final visible page is the research evidence page, not the 404 recovery page.

### Remaining Production Gate

This fix is not externally visible on `https://www.bes3.com` until the new commit is built into the GHCR image and the production host pulls/restarts that image. After deployment, recheck:

- `https://www.bes3.com/api/health` should include `build.sha` for the deployed commit.
- `https://www.bes3.com/yard-pool-automation/best-yard-pool-automation-for-pool-wall-climbing` should show `Research Snapshot` and `Yard and Pool Automation for Pool Wall Climbing: Evidence Check`.
- The page should no longer show `Reddit Consensus: The 1 Best ...` or `Programmatic Scenario Page`.

## pSEO Fix Release and Production Recheck - 2026-05-06T12:21:09Z

### Release Evidence

- Commit `20fef2d` (`Improve research pSEO page quality`) was pushed to `main`.
- GitHub Actions release workflow `25434615490` completed successfully.
- `build-and-test` passed in 1m46s:
  - Type check passed.
  - ESLint passed.
  - Schema drift check passed.
  - Production build passed.
  - Runtime smoke diagnostics passed.
- `build-and-push` passed in 3m09s:
  - Docker Buildx setup passed.
  - GHCR login passed.
  - Docker image tags were generated.
  - Docker image was built and pushed.

### Production Recheck

- `curl -sS -H 'Cache-Control: no-cache' 'https://www.bes3.com/api/health?codex_recheck=20fef2d'`
  - Returned `status=ok`, `version=0.1.0`, `database.connected=true`, and `database.type=postgres`.
  - Still did not include `build.sha`, so the public runtime is not serving the build-metadata image.
- `curl -sS -D /tmp/bes3-prod-pseo-20fef2d.headers -o /tmp/bes3-prod-pseo-20fef2d.html -H 'Cache-Control: no-cache' 'https://www.bes3.com/yard-pool-automation/best-yard-pool-automation-for-pool-wall-climbing?codex_recheck=20fef2d'`
  - Returned HTTP 200.
  - Still referenced old chunk `static/chunks/app/%5Bcategory%5D/%5Blanding%5D/page-dbd05c86d7f423cc.js`.
  - Still rendered old metadata/title text: `Reddit Consensus: The 1 Best Yard and Pool Automation for Pool Wall Climbing (2026 Tested)`.
  - Still included old FAQ/ranking language in the streamed payload.

### Conclusion

The pSEO content-quality fix is built and pushed to GHCR, but it is not live on `https://www.bes3.com` yet. Production still needs to pull/restart an image that includes `20fef2d` or later. Until `/api/health` exposes `build.sha`, the public URL remains an old-runtime manual review target and should not be treated as fixed.

## Production Runtime Recheck - 2026-05-06T12:30:04Z

### Commands Run

- `curl -sS -H 'Cache-Control: no-cache' 'https://www.bes3.com/api/health?codex_recheck=19fc2a9-final'`
- `curl -sS -D /tmp/bes3-prod-pseo-19fc2a9.headers -o /tmp/bes3-prod-pseo-19fc2a9.html -H 'Cache-Control: no-cache' 'https://www.bes3.com/yard-pool-automation/best-yard-pool-automation-for-pool-wall-climbing?codex_recheck=19fc2a9-final'`
- `curl -sS -D /tmp/bes3-prod-product54-final.headers -o /tmp/bes3-prod-product54-final.html -H 'Cache-Control: no-cache' 'https://www.bes3.com/products/lomon-womens-fuzzy-sherpa-fleece-jacket-lightweight-vest-cozy-sleeveless-cardigan-zipper-waistcoat-outerwear-with-pocket?codex_recheck=19fc2a9-final'`

### Evidence

- `/api/health` still returns `status=ok`, `version=0.1.0`, `database.connected=true`, and `database.type=postgres`, but still does not include `build.sha`.
- The pSEO page returns HTTP 200 but still serves old route chunk `static/chunks/app/%5Bcategory%5D/%5Blanding%5D/page-dbd05c86d7f423cc.js`.
- The pSEO page still renders old metadata/title text: `Reddit Consensus: The 1 Best Yard and Pool Automation for Pool Wall Climbing (2026 Tested)`.
- The pSEO page still includes old `Scenario FAQ`, `winner`, `ranking`, and `Hardcore Proof` copy in the streamed payload.
- The pSEO page does not yet expose the fixed `Research Snapshot`, `Evidence Check`, `Source Score`, or `Source Proof` language on production.
- Product 54 detail URL still returns HTTP 404 and `NEXT_HTTP_ERROR_FALLBACK;404`, using old product route chunk `static/chunks/app/products/%5Bslug%5D/page-11eb834d09265723.js`.

### Conclusion

As of `2026-05-06T12:30:04Z`, production has still not pulled/restarted the image containing `20fef2d` / `19fc2a9`. The deployment blocker remains unchanged: CI and GHCR publish are green, but the public runtime on `www.bes3.com` is still old.

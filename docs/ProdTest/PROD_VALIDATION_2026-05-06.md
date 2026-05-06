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

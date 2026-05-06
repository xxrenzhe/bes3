# BES3 Production Business Validation - 2026-05-06

Target: `https://www.bes3.com`

This report records the production validation steps, evidence, fixes made locally, and remaining blockers. The result is not a full pass yet because production admin authentication failed, one public product-detail URL is broken in the currently deployed build, and pSEO product/editorial sitemaps are empty in production.

## Executive Result

- Production public APIs are live and return real commerce/evidence payloads.
- Production has monetizable products and `/go/54` redirects to Amazon with affiliate attribution.
- Production has YouTube-backed evidence pages, including an externally accessible evidence URL.
- Production open-commerce product actions currently link to `/products/<slug>` URLs that 404 for open-commerce products.
- Local code was patched so `/products/[slug]` now falls back to open-commerce products and product/editorial sitemap routes are dynamic.
- Production deployment is still required before the fixed open-commerce product page URL can be manually verified externally.

## External URLs For Manual Review

- Evidence product page, currently working: `https://www.bes3.com/products/dolphin-nautilus-pool-wall-demo`
- pSEO scenario page, currently renders but is `noindex`: `https://www.bes3.com/yard-pool-automation/best-yard-pool-automation-for-pool-wall-climbing`
- Open commerce product API: `https://www.bes3.com/api/open/commerce/products/54`
- Open commerce offers API: `https://www.bes3.com/api/open/commerce/products/54/offers`
- Merchant handoff, currently redirects to Amazon: `https://www.bes3.com/go/54?source=prodtest&visitor=prodtest-20260506`
- Broken in current production, fixed locally and pending deploy: `https://www.bes3.com/products/lomon-womens-fuzzy-sherpa-fleece-jacket-lightweight-vest-cozy-sleeveless-cardigan-zipper-waistcoat-outerwear-with-pocket`

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

## Local Fixes Made

- `src/app/products/[slug]/page.tsx`: added an open-commerce fallback page so public buying-feed product URLs can render as product briefs with offer, price history, facts, brand context, machine payload link, structured data, and merchant CTA.
- `src/app/products/sitemap.ts`: made route dynamic and included both open-commerce products and hardcore evidence products, deduped by URL.
- `src/app/editorial/sitemap.ts`: made route dynamic so deployed runtime data can populate the editorial sitemap.

## Verification After Local Fix

- `npx eslint 'src/app/products/[slug]/page.tsx' src/app/products/sitemap.ts src/app/editorial/sitemap.ts`: passed.
- `npx tsc --noEmit --pretty false`: passed.
- `npm run build`: passed. Build output shows `/products/[slug]`, `/products/sitemap.xml`, and `/editorial/sitemap.xml` as dynamic server-rendered routes.
- Local production server could not prove the LOMON product-detail fix because local SQLite data does not contain the production LOMON product. This is expected data-environment mismatch, not a TypeScript/build failure.

## Required Next Steps

1. Deploy the local code changes to production using the documented GHCR flow.
2. Re-run `npm run ops:production-business-audit` with valid production admin credentials.
3. Re-check the pending external URL for product 54 and both sitemap URLs after deployment.
4. Remove pSEO `noindex` only after evidence thresholds are intentionally met, or adjust thresholds if one-product scenario pages should rank.
5. Improve open-commerce search so evidence products can be discovered by queries such as `pool robot`.


# PlanV3 Production Completion Audit

## Objective Restatement

Complete the production commercial loop against real production systems:

1. Continuously sync affiliate products.
2. Select synced products that can be matched to high-quality YouTube reviews.
3. Capture full transcripts and extract multidimensional review evidence.
4. Use product data, YouTube evidence, and Reddit research to mine accurate long-tail buyer keywords.
5. Generate and publish automated pSEO review articles.
6. Improve the conversion path from long-tail search to article comprehension to merchant handoff.
7. Allow structural refactors when needed for UX and conversion.
8. Keep public pages, buttons, links, and content buyer-facing, complete, nonblank, and free of unqualified products.
9. Record all PlanV3 optimization work in `docs/planv3`.

Production secrets are intentionally not stored in this document.

## Prompt-To-Artifact Checklist

| Requirement | Concrete evidence inspected | Current status |
| --- | --- | --- |
| 1. Affiliate sync and continuous operation | `scripts/run-commercial-loop.ts`, `commercial-loop:continuous`, production audit `affiliate_products.total=1130`, `updated_7d=1130` | Passed in production DB. |
| 2. Product selection for YouTube reviews | `src/lib/commercial-loop.ts`, production audit `reviewVideos.total=2`, `with_entity_match=1` | Passed in production DB. |
| 3. Transcript and multidimensional evidence extraction | Production audit `with_full_transcript=2`, `analysisReports.usable_reports=3`, `advertorial_reports=0` | Passed in production DB. |
| 4. Long-tail keywords from product, YouTube, Reddit | Production audit `long_tail_intents + long_tail_tags = 37`; Reddit hard gate `reddit_long_tail_intents + reddit_pending_tags = 3` | Passed in production DB after Reddit collector hardening. |
| 5. pSEO article generation and publishing | Production audit `published_reviews=1`, `with_youtube_proof=1`, `seoPages.published_review_pages=1` | Passed in production DB. |
| 6. Conversion path and merchant handoff | Production audit `eligible_handoff_products=44`, `merchant_click_events=121`, `buyer_decision_events=58`; `/go/{productId}` integration gate | Passed in production DB and local integration. |
| 7. UX/conversion refactor allowance | Implemented production evidence gates, site-data cache invalidation, commercial run telemetry, Reddit collector fallback | Implemented and committed. |
| 8. No blank/dead/unqualified public pages | Production audit `thin_or_blank_reviews=0`, `reviews_without_public_evidence=0`, `incomplete_published_pages=0` | Passed in production DB; public HTTPS still blocked by old deployment. |
| 9. PlanV3 documentation | `docs/planv3/2026-05-10-commercial-loop-continuous-runner.md`, this audit document | Passed. |

## Verified Commands

Local and CI gates:

```bash
npm run type-check
npm run lint
npm run commercial-loop:check
gh run view 25625611274 --repo xxrenzhe/bes3 --json status,conclusion,headSha,jobs
```

Production audit command used with production Postgres credentials injected only through the process environment:

```bash
BES3_EXPECTED_BUILD_SHA=$(git rev-parse HEAD) \
DATABASE_URL='<production-postgres-url>' \
NEXT_PUBLIC_APP_URL='https://www.bes3.com' \
npm run commercial-loop:audit-production-db -- --fetch-public
```

Latest production audit report:

```text
qa-results/planv3-production-db-audit-2026-05-10T09-54-24-854Z.json
```

Result summary:

```text
Passed: 25
Failed: 2
Warnings: 0
```

The two failures are public deployment checks only:

```text
deployed=d90eb1afe5a49db82bb05af89b421296910cad55
expected=3d83e544e97be6749b4306f8798057ad81fd40e9
public review quickAnswer=false
public review youtubeProof=false
```

## Remaining Blocker

Update after manual image deployment: `https://www.bes3.com/api/health` now reports the expected build, but the public review page still renders old article content.

Root cause: the production container is still using the old ClawCloud Postgres database, not the supplied TencentCDB production database URL. Evidence:

```text
www.bes3.com /api/health build: 830bf05170ad3c678a038a14096c6f53989fa450
www.bes3.com /api/open/coverage: products=43, articles=3, latestRefresh=2026-05-08T13:26:35.925Z
old ClawCloud Postgres: products=44, articles=5, latest_article_update=2026-05-08, DeerValley article contains BLUF
supplied TencentCDB Postgres: products=44, articles=5, latest_article_update=2026-05-10, DeerValley article contains Quick answer and YouTube Review Proof
```

Required production env fix on the ClawCloud host:

```bash
# In the production Bes3 app directory, update .env.production to the supplied TencentCDB Postgres URL.
# Keep the value in the host secret file only; do not commit it to the repo.
DATABASE_URL='<supplied-tencentcdb-postgres-url-with-password-hash-encoded-as-%23>'

# Then restart the running app container.
BES3_IMAGE=ghcr.io/xxrenzhe/bes3:prod-latest ./scripts/deploy-ghcr.sh
```

The `#` in the database password must be URL-encoded as `%23`; otherwise the URL parser treats it as a fragment and the password is truncated.

Previous deployment blocker, now resolved: `https://www.bes3.com/api/health` used to report the old runtime build:

```text
d90eb1afe5a49db82bb05af89b421296910cad55
```

At that audit checkpoint, the latest business-code GHCR image had been built and pushed from:

```text
3d83e544e97be6749b4306f8798057ad81fd40e9
```

If additional documentation-only commits are added later, use the current `main` SHA for the final deployment audit.

Internal revalidate succeeds, but the old runtime does not clear the module-level site-data cache and the public review page still renders the old article module names (`BLUF`, `Evidence Verdict`) instead of the latest buyer-facing modules (`Quick answer:`, `YouTube Review Proof`).

The repository has no GitHub deployment records, no deployment webhook, and no local ClawCloud SSH/Docker context. Therefore final public acceptance requires a manual production deploy on the ClawCloud host.

## Required Production Deploy Action

Production audit secret status:

```text
DATABASE_URL: configured in GitHub Actions secrets
BES3_INTERNAL_REVALIDATE_TOKEN: configured in GitHub Actions secrets
CLAWCLOUD_SSH_HOST / CLAWCLOUD_SSH_USER / CLAWCLOUD_SSH_PRIVATE_KEY: still missing
```

The manual GitHub Actions workflow `Audit Bes3 Production` can now run the PlanV3 audit against production Postgres without relying on local shell state. Use `fetch_public=false` for a DB/business-only audit, or `fetch_public=true` for final public HTTPS acceptance.

Preferred path: run the manual GitHub Actions workflow `Deploy Bes3 Production` after configuring the required repository secrets:

```text
CLAWCLOUD_SSH_HOST
CLAWCLOUD_SSH_USER
CLAWCLOUD_SSH_PRIVATE_KEY
GHCR_USERNAME
GHCR_TOKEN
DATABASE_URL or PLANV3_DATABASE_URL
BES3_INTERNAL_REVALIDATE_TOKEN
```

The workflow deploys `ghcr.io/xxrenzhe/bes3:prod-latest`, verifies `/api/health` reports the expected SHA, requests production revalidation, and runs the PlanV3 production audit against Postgres only. If the production database secret is missing, the workflow fails instead of falling back to SQLite.

Fallback path: run on the ClawCloud production host in the Bes3 app directory:

```bash
GHCR_USERNAME=<github-user> \
GHCR_TOKEN=<ghcr-token> \
BES3_IMAGE=ghcr.io/xxrenzhe/bes3:prod-latest \
./scripts/deploy-ghcr.sh
```

Then clear public runtime caches on the deployed build:

```bash
curl -X POST 'https://www.bes3.com/api/internal/revalidate' \
  -H 'content-type: application/json' \
  -H 'x-bes3-internal-token: <internal-token>' \
  --data '{"paths":["/reviews/deervalley-dv-1s0029-v3-smart-bidet-toilet-purified-water-massage-review","/reviews","/api/open/coverage","/api/open/evidence","/editorial/sitemap.xml"],"category":"Bathroom Fixtures","brand":"DeerValley"}'
```

Final acceptance command:

```bash
BES3_EXPECTED_BUILD_SHA=$(git rev-parse HEAD) \
DATABASE_URL='<production-postgres-url>' \
NEXT_PUBLIC_APP_URL='https://www.bes3.com' \
npm run commercial-loop:audit-production-db -- --fetch-public
```

Do not close `bes3-yak4` until that final command has zero failures.

# PlanV3 Commercial Loop Continuous Runner

## Objective

PlanV3 must keep the whole business loop moving: PartnerBoost product sync -> qualified product selection -> YouTube review discovery -> transcript capture -> evidence extraction -> long-tail review page publishing -> buyer decision CTA -> merchant handoff.

This operation deliberately avoids storing production secrets in the repository. Production credentials must stay in environment variables or encrypted admin settings.

## Current-State Audit

| Requirement | Evidence in code | Gap found |
| --- | --- | --- |
| Affiliate product sync | `syncPartnerboostAmazonProducts`, `syncPartnerboostDtcProducts`, `commercial-loop:run -- --execute --sync=...` | One-shot runner existed, but no explicit continuous production runner. |
| High-quality YouTube matching | `discoverYoutubeVideos`, ASIN/search-term entity matching, `isPublicEvidenceUsable` | Covered by runtime and integration checks. |
| Transcript and multidimensional evidence | `fetchTranscriptWithYtDlp`, `buildVideoEvidencePrompt`, `parseVideoEvidenceWithRetry`, `analysis_reports` | Covered by runtime and integration checks. |
| Long-tail pSEO publishing | `upsertEvidenceArticle`, `seo_pages`, `/reviews/[slug]`, sitemap | Covered for review pages after validated evidence exists. |
| Conversion path | `PurchaseDecisionCard`, `/go/{productId}`, merchant click metadata | Covered by integration and browser gates. |
| No unqualified public pages | `isPublicArticle`, `isPublicProduct`, evidence and commissionable-link filtering | Covered by public data layer, but must remain gated. |
| Production database proof | `commercial-loop:audit-production-db`, read-only Postgres transaction | Added because SQLite regression tests are not production evidence. |
| PlanV3 documentation | `docs/planv3` | Missing before this operation. |

## Implemented Operation

- Added continuous mode to `scripts/run-commercial-loop.ts`.
- Added `commercial-loop:continuous` so production can run one durable command.
- Added `commercial-loop:audit-production-db` for read-only production Postgres verification.
- Live `--execute` runs now refuse to start without a Postgres `DATABASE_URL`; local SQLite rehearsals must opt in with `--allow-sqlite`.
- Continuous mode requires `--execute`, preventing a misleading no-op daemon.
- The loop emits structured JSON for every run with selected candidates, discovered videos, fetched transcripts, extracted evidence, published articles, indexing mode, and skipped reasons.
- Every live commercial loop execution now writes a `content_pipeline_runs` row with `run_type='commercialLoop'`, so production sync/selection/publish activity is auditable from the database instead of only from terminal logs.
- `--max-runs=N` allows bounded smoke runs; omitting it keeps the loop alive.
- `--interval-ms=N` controls cadence with a minimum of 60 seconds.
- `--continue-on-error` keeps the loop alive after transient PartnerBoost, YouTube, proxy, or AI failures.
- Reddit intent collection now has a `curl -4` fallback for production networks where Node fetch times out against Reddit, plus `--seed-limit` and `--query-limit` controls for bounded runs.

## Production Runbook

Preview candidates first:

```bash
npm run commercial-loop:run
```

One live pass:

```bash
npm run commercial-loop:run -- --execute --sync=all --discover-videos --fetch-transcripts --extract-evidence --publish --push-index
```

Continuous production loop:

```bash
npm run commercial-loop:continuous -- --interval-ms=1800000 --continue-on-error --push-index
```

Bounded production smoke loop:

```bash
npm run commercial-loop:continuous -- --max-runs=1 --interval-ms=60000
```

Production Postgres audit:

```bash
npm run commercial-loop:audit-production-db -- --fetch-public
```

This audit must run with a real production `DATABASE_URL` in the current process or an ignored env file such as `.env.local`. It only accepts `postgres://` or `postgresql://`, opens a read-only transaction, executes `SELECT` statements, writes a sanitized JSON report to `qa-results`, and refuses to fall back to SQLite.

Reddit intent collection smoke:

```bash
npm run hardcore:collect-intents -- --source=reddit --category=bathroom-fixtures --limit=5 --seed-limit=3 --query-limit=1 --promote-pending
```

Required runtime configuration:

- `DATABASE_URL` pointing at production Postgres for any `--execute` run
- `PARTNERBOOST_AMAZON_TOKEN` or encrypted `affiliate_sync.partnerboost_token`
- `PARTNERBOOST_DTC_TOKEN` or encrypted `affiliate_sync.partnerboost_token`
- `GEMINI_RELAY_API_KEY` or `GEMINI_API_KEY`
- `BROWSER_PROXY_URLS_JSON` for YouTube discovery and transcript collection
- `NEXT_PUBLIC_APP_URL=https://www.bes3.com`

## Guardrails

- Do not publish review pages without usable YouTube evidence.
- Do not expose merchant CTAs unless a commissionable merchant URL exists.
- Keep every review page buyer-facing: quick answer, YouTube proof, buy/skip guidance, affiliate disclosure, and a `/go` handoff only when eligible.
- Treat PartnerBoost payout data as prioritization input only; recommendation order must remain commission-blind.
- Keep secrets out of docs, code, commits, logs, and fixtures.

## Validation Commands

```bash
npm run type-check
npm run lint
npm run commercial-loop:check
npm run commercial-loop:check-live-readiness -- --dry-run --limit=10
npm run commercial-loop:audit-production-db -- --fetch-public
npm run planv2:check-business
```

`commercial-loop:check` remains a local fixture regression. It must not be used as proof that production has PartnerBoost inventory, YouTube transcripts, evidence, pSEO pages, or conversion telemetry.

## Production Hardening Update 2026-05-10

The completion audit found two weak proof points that were not acceptable as final evidence:

- `content_pipeline_runs` had pipeline history, but no explicit `commercialLoop` runs.
- Long-tail intent existed, but there was no hard production evidence that Reddit research contributed to those intents.

Hardening completed:

- `runCommercialLoop()` now creates and completes a `content_pipeline_runs` record for every live `--execute` run.
- `commercial-loop:audit-production-db` now fails if production has no `commercialLoop` history.
- `commercial-loop:audit-production-db` now fails if Reddit-sourced long-tail buyer intent is absent.
- `scripts/collect-hardcore-intents.ts` now falls back to `curl -4` for Reddit JSON collection and filters out unrelated relationship/news/SEO-listicle titles.

Production evidence after the hardening:

- Ran a bounded production commercial loop pass with `--execute --sync=none --limit=1 --min-score=100 --skip-discover-videos --skip-fetch-transcripts --skip-extract-evidence --skip-publish`.
- The bounded pass intentionally selected no publishable products, so it did not publish unqualified pages, but it did create auditable `commercialLoop` history.
- Ran Reddit intent collection against the production database for `bathroom-fixtures`; it created one Reddit source and promoted one pending long-tail intent: `Car wax to protect quartz bathroom vanity top?`.
- Re-ran the production Postgres audit. Production DB/business checks now pass 25 checks, including Reddit intent and commercial loop history.

Remaining production blocker after hardening:

- `https://www.bes3.com/api/health` still reports old build `d90eb1afe5a49db82bb05af89b421296910cad55`.
- Public review HTML still lacks the newly generated `Quick answer:` and `YouTube Review Proof` modules because ClawCloud has not restarted the latest GHCR image.
- Final acceptance still requires deploying the latest image and rerunning `commercial-loop:audit-production-db -- --fetch-public` until the public HTTPS checks pass.

## Production Audit Update 2026-05-10

Production Postgres audit was run against the supplied production database. Initial failures were real:

- `affiliate_products.youtube_match_terms_json` was empty for all synced products.
- Published review articles used an older template without `Quick answer:`, `Review Verdict`, or `YouTube Review Proof`.
- One published review had no usable YouTube evidence.
- One published DeerValley review was evidence-mismatched and returned 404 on the public surface.

Targeted production repair completed:

- Backfilled YouTube match terms for 1,130 affiliate products.
- Rebuilt the valid DeerValley DV-1S0029-V3 review with the current YouTube proof template.
- Moved the evidence-free LOMON review and mismatched DeerValley DV-1S0442-V3 review to draft.
- Re-ran the production DB audit: all database/content checks passed; only the public HTTPS surface remained stale.

Earlier production blocker from the first audit checkpoint:

- `https://www.bes3.com/api/health` reported build `d90eb1afe5a49db82bb05af89b421296910cad55`, while the then-current `main` build was newer. The GHCR workflow succeeded, but ClawCloud deployment is manual, so the public site still served the old image and old cached article HTML.
- Internal revalidate was called successfully, but old runtime content remained visible. The code now clears the module-level site-data cache inside `/api/internal/revalidate`; this requires deploying the latest image before the public HTTPS audit can pass.

Next production action:

```bash
GHCR_USERNAME=<github-user> GHCR_TOKEN=<ghcr-token> ./scripts/deploy-ghcr.sh
npm run commercial-loop:audit-production-db -- --fetch-public
```

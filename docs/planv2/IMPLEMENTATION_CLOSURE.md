# Planv2 Implementation Closure

Generated on 2026-04-27 for BD epic `bes3-yku1`.

## Coverage Assessment

| Plan document | Current status | Repo evidence |
| --- | --- | --- |
| `1.全局产品与商业需求文档 (Master PRD).md` | Implemented with closure checks | `src/lib/hardcore-catalog.ts`, `src/app/page.tsx`, `src/components/site/HardcoreEvidenceMatrix.tsx`, `src/components/site/CookieConsentBanner.tsx` |
| `2.自动化意图挖掘与标签引擎设计规范 (Taxonomy & Data Fusion Pipeline Spec).md` | Implemented, requires operational validation | `scripts/collect-hardcore-intents.ts`, `scripts/import-hardcore-intents.ts`, `scripts/import-keyword-planner-intents.ts`, `scripts/evolve-hardcore-taxonomy.ts`, `src/lib/hardcore-ops.ts` |
| `3.高度抽象化数据库实体关系设计 (Abstract Database ERD).md` | Implemented | `src/lib/db/schema.ts`, `src/lib/hardcore.ts`, `src/lib/entity-resolution.ts` |
| `4.平台级“元提示词”与 AI 工程手册 (Meta-Prompting & AI Engineering Guide).md` | Implemented | `src/lib/hardcore-prompts.ts`, `scripts/import-shorts-evidence.ts`, `src/lib/bootstrap.ts` |
| `5.自动化内容生成与 GEO&SEO 增长手册 (Programmatic SEO & GEO Playbook).md` | Implemented, requires machine-readable closure manifest | `src/app/robots.ts`, `src/app/llms.txt/route.ts`, `src/app/[category]/[landing]/page.tsx`, `src/lib/structured-data.ts` |
| `6.SKU 实体对齐与风控防御方案 (Entity Resolution & Risk Management Spec).md` | Implemented, requires stronger ops summary | `src/lib/entity-resolution.ts`, `scripts/resolve-video-entities.ts`, `scripts/export-entity-review-queue.ts`, `scripts/inspect-hardcore-affiliate-links.ts`, `scripts/youtube-transcript-command.ts` |
| `7.多维加权共识算法与评分逻辑规范 (Weighted Consensus & Scoring Logic Spec).md` | Implemented | `src/lib/hardcore.ts`, `src/app/api/open/evidence/feedback/route.ts`, `src/components/site/HardcoreEvidenceMatrix.tsx` |
| `8.多源价格监测与“最佳性价比”决策算法 (Price-Value Entry-Point Spec).md` | Implemented, requires end-to-end script validation | `src/lib/hardcore.ts`, `src/lib/hardcore-ops.ts`, `scripts/refresh-hardcore-price-value.ts`, `scripts/evaluate-price-alerts.ts`, `scripts/dispatch-price-alert-notifications.ts` |
| `9.自动化内容生成与 pSEO 联动执行手册 (Programmatic SEO Strategy).md` | Implemented, requires pSEO manifest and validation | `src/app/[category]/[landing]/page.tsx`, `src/app/deals/[slug]/page.tsx`, `scripts/push-hardcore-pseo.ts`, `scripts/export-reddit-reply-kit.ts`, `scripts/import-pseo-signals.ts` |

## Remaining Closure Work

The remaining work is not new product surface from scratch. It is the hardening needed to make the plan demonstrably landed:

| BD task | Closure target |
| --- | --- |
| `bes3-ib1n` | Remove runtime/type-check blockers in planv2 modules and scripts. |
| `bes3-mgh9` | Make pSEO, price-value, alert, GA4 signal, and Reddit distribution operations self-verifiable. |
| `bes3-5zo4` | Make entity resolution, affiliate health, transcript command generation, creator attribution, FTC disclosure, and cookie controls self-verifiable. |
| `bes3-imv8` | Run validation, close BD work, and commit final closure state without `git push`. |

## Acceptance Evidence

Planv2 is considered landed when these commands complete locally:

```bash
npm run type-check
npm run hardcore:export-planv2-ops -- --limit=25
npm run hardcore:resolve-video-entities -- --dry-run --limit=5
npm run hardcore:evolve-taxonomy -- --dry-run --limit=5
npm run hardcore:refresh-price-value -- --dry-run --limit=25
npm run hardcore:evaluate-price-alerts
```

Operational commands that require external credentials, network services, or a live deployment remain documented in `scripts/export-planv2-ops-manifest.ts` and should be run from the deployment environment:

```bash
npm run hardcore:collect-intents -- --source=all --promote-pending
npm run hardcore:import-keyword-planner -- --file=./keyword-planner.csv --category=yard-pool-automation --promote-pending
npm run hardcore:youtube-transcript-command -- --url=https://www.youtube.com/watch?v=...
npm run hardcore:inspect-affiliate-links
npm run hardcore:push-pseo
```

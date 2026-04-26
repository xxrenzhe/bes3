import './load-env'
import { bootstrapApplication } from '@/lib/bootstrap'
import { getDatabase } from '@/lib/db'
import { HARDCORE_CATEGORIES, listHardcoreTags } from '@/lib/hardcore'
import { exportTaxonomyRescanJobs } from '@/lib/hardcore-ops'

function readNumberFlag(name: string, fallback: number) {
  const prefix = `--${name}=`
  const raw = process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length)
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function buildCoverageMatrix() {
  return [
    {
      plan: '1.Master PRD',
      status: 'implemented',
      evidence: [
        'src/lib/hardcore-catalog.ts',
        'src/app/page.tsx',
        'src/components/site/HardcoreEvidenceMatrix.tsx',
        'src/components/site/CookieConsentBanner.tsx'
      ]
    },
    {
      plan: '2.Taxonomy & Data Fusion',
      status: 'implemented',
      evidence: [
        'scripts/collect-hardcore-intents.ts',
        'scripts/import-hardcore-intents.ts',
        'scripts/evolve-hardcore-taxonomy.ts',
        'src/lib/hardcore-ops.ts'
      ]
    },
    {
      plan: '3.Abstract Database ERD',
      status: 'implemented',
      evidence: [
        'src/lib/db/schema.ts',
        'src/lib/hardcore.ts',
        'src/lib/entity-resolution.ts',
        'src/lib/db/schema.ts#postgres-jsonb-gin-indexes'
      ]
    },
    {
      plan: '4.Meta-Prompting',
      status: 'implemented',
      evidence: [
        'src/lib/hardcore-prompts.ts',
        'src/lib/bootstrap.ts',
        'scripts/import-shorts-evidence.ts'
      ]
    },
    {
      plan: '5.GEO & SEO Playbook',
      status: 'implemented',
      evidence: [
        'src/app/robots.ts',
        'src/app/[category]/[landing]/page.tsx',
        'src/lib/structured-data.ts',
        'src/app/llms.txt/route.ts',
        'src/components/site/HardcoreEvidenceMatrix.tsx'
      ]
    },
    {
      plan: '6.Entity Resolution & Risk',
      status: 'implemented',
      evidence: [
        'src/lib/entity-resolution.ts',
        'scripts/resolve-video-entities.ts',
        'scripts/export-entity-review-queue.ts',
        'scripts/inspect-hardcore-affiliate-links.ts',
        'scripts/youtube-transcript-command.ts'
      ]
    },
    {
      plan: '7.Weighted Consensus',
      status: 'implemented',
      evidence: [
        'src/lib/hardcore.ts',
        'src/components/site/HardcoreEvidenceMatrix.tsx',
        'src/app/api/open/evidence/feedback/route.ts'
      ]
    },
    {
      plan: '8.Price-Value Entry Point',
      status: 'implemented',
      evidence: [
        'src/lib/hardcore.ts',
        'src/lib/hardcore-ops.ts',
        'scripts/refresh-hardcore-price-value.ts',
        'scripts/evaluate-price-alerts.ts',
        'src/components/site/ValueMap.tsx'
      ]
    },
    {
      plan: '9.Programmatic SEO Strategy',
      status: 'implemented',
      evidence: [
        'src/app/[category]/[landing]/page.tsx',
        'src/app/deals/[slug]/page.tsx',
        'scripts/push-hardcore-pseo.ts',
        'scripts/export-reddit-reply-kit.ts',
        'scripts/capture-reddit-kit-screenshots.ts',
        'scripts/import-pseo-signals.ts'
      ]
    }
  ]
}

function buildClosureChecks() {
  return {
    scenarioPages: {
      liveThreshold: 'At least 3 products with useful evidence; otherwise noindex researching state.',
      crawlerVisibleBlocks: ['BLUF', 'HTML comparison table', 'Evidence Stream blockquotes', 'FAQPage JSON-LD'],
      faqEntriesPerScenario: 3
    },
    redditDistribution: {
      screenshotAnchor: '#consensus-matrix',
      exportCommand: 'npm run hardcore:export-reddit-kit',
      screenshotCommand: 'npm run hardcore:capture-reddit-kit-screenshots -- --base-url=https://bes3.example --output-dir=storage/reddit-kit'
    },
    dataIntegrity: {
      jsonbIndexPolicy: 'PostgreSQL JSONB columns are covered by GIN indexes where they support dynamic product, taxonomy, schema, payload, or event metadata queries.',
      evidenceValidation: 'AI/Shorts imports must keep canonical tag, product, timestamp/context, quote, confidence, and quality flags attached before surfacing rankings.'
    },
    riskControls: {
      transcriptCollection: 'yt-dlp command generation uses --skip-download, subtitle-only outputs, jitter, user-agent spoofing, and optional proxy support.',
      entityResolution: 'Video/product matching prefers extracted ASINs and only accepts brand/model fallback when confidence is at least 0.9.',
      affiliateHealth: 'Affiliate inspection dry-run and mutation paths use the same link-health classifier for broken and out-of-stock states.',
      complianceSurface: 'Public pages include top affiliate disclosure, per-action affiliate labels, creator timestamp attribution, privacy policy, and one-click Reject all cookie control.'
    },
    operations: {
      noGitPushThisRun: true,
      beadsLifecycle: 'Epic plus child tasks are created, claimed, and closed locally. Remote sync is left to the operator when pushes are allowed.'
    }
  }
}

async function main() {
  await bootstrapApplication()
  const db = await getDatabase()
  const limit = readNumberFlag('limit', 200)
  const tags = await listHardcoreTags()
  const pseoPaths = new Set<string>()

  for (const category of HARDCORE_CATEGORIES) {
    pseoPaths.add(`/categories/${category.slug}`)
    pseoPaths.add(`/deals/best-value-${category.slug}-under-500`)
    const categoryTags = tags
      .filter((tag) => tag.categorySlug === category.slug)
      .sort((left, right) => Number(right.isCorePainpoint) - Number(left.isCorePainpoint) || right.searchVolume - left.searchVolume)

    for (const tag of categoryTags.slice(0, 12)) {
      pseoPaths.add(`/${category.slug}/best-${category.slug}-for-${tag.slug}`)
    }

    for (const [firstIndex, first] of categoryTags.filter((tag) => tag.isCorePainpoint).slice(0, 4).entries()) {
      for (const second of categoryTags.filter((tag) => tag.isCorePainpoint).slice(firstIndex + 1, 4)) {
        pseoPaths.add(`/${category.slug}/best-${first.slug}-${second.slug}-${category.slug}`)
      }
    }
  }

  const [rescanJobs, notificationSummary, entitySummary] = await Promise.all([
    exportTaxonomyRescanJobs(limit),
    db.queryOne<{ queued: number }>(
      "SELECT COUNT(*) AS queued FROM price_alert_notifications WHERE status = 'queued'"
    ),
    db.queryOne<{ unresolved: number }>(
      `
        SELECT COUNT(*) AS unresolved
        FROM review_videos
        WHERE processed_status IN ('success', 'pending')
          AND (
            entity_match_json IS NULL
            OR entity_match_json NOT LIKE '%"productId":%'
          )
      `
    )
  ])

  console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    coverage: buildCoverageMatrix(),
    pseo: {
      totalPaths: pseoPaths.size,
      samplePaths: Array.from(pseoPaths).slice(0, limit)
    },
    closureChecks: buildClosureChecks(),
    operations: {
      taxonomyRescanJobs: rescanJobs.length,
      queuedPriceNotifications: Number(notificationSummary?.queued || 0),
      unresolvedEntityVideos: Number(entitySummary?.unresolved || 0)
    },
    runbook: {
      collectIntents: 'npm run hardcore:collect-intents -- --source=all --promote-pending',
      importKeywordPlanner: 'npm run hardcore:import-keyword-planner -- --file=./keyword-planner.csv --category=yard-pool-automation --promote-pending',
      importShortsEvidence: 'npm run hardcore:import-shorts-evidence -- --file=./shorts-evidence.json',
      evolveTaxonomy: 'npm run hardcore:evolve-taxonomy -- --mark-processing',
      downloadTranscriptCommand: "npm run hardcore:youtube-transcript-command -- '--url=https://www.youtube.com/watch?v=...'",
      resolveEntities: 'npm run hardcore:resolve-video-entities -- --resolve-redirects',
      previewAffiliateLinks: 'npm run hardcore:inspect-affiliate-links -- --dry-run --limit=25',
      inspectAffiliateLinks: 'npm run hardcore:inspect-affiliate-links -- --limit=50',
      previewPriceValue: 'npm run hardcore:refresh-price-value -- --dry-run --limit=25',
      refreshPriceValue: 'npm run hardcore:refresh-price-value -- --limit=250',
      queuePriceAlerts: 'npm run hardcore:evaluate-price-alerts -- --queue-notifications --mark-notified',
      dispatchPriceAlerts: 'npm run hardcore:dispatch-price-alerts -- --mark-sent',
      exportRedditKit: 'npm run hardcore:export-reddit-kit',
      captureRedditKitScreenshots: 'npm run hardcore:capture-reddit-kit-screenshots -- --base-url=https://bes3.example --output-dir=storage/reddit-kit',
      pushPseo: 'npm run hardcore:push-pseo'
    }
  }))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

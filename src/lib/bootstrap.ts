import { DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_USERNAME } from '@/lib/constants'
import { ADMIN_ROLE_PERMISSIONS } from '@/lib/admin-permissions'
import { hashPassword } from '@/lib/crypto'
import { getDatabase } from '@/lib/db'
import { GEMINI_ACTIVE_MODEL } from '@/lib/gemini-models'
import { HARDCORE_CATEGORIES } from '@/lib/hardcore-catalog'
import { getRuntimeAdminPasswordState } from '@/lib/runtime-secrets'
import { buildSeoPagePersistencePayload } from '@/lib/seo-page-payload'
import { slugify } from '@/lib/slug'

let bootstrapPromise: Promise<void> | null = null

const DEFAULT_SETTINGS = [
  ['ai', 'provider', 'gemini', 'string', 0, 'AI provider'],
  ['ai', 'geminiModel', GEMINI_ACTIVE_MODEL, 'string', 0, 'Gemini model'],
  ['ai', 'geminiApiKey', '', 'secret', 1, 'Gemini API key used for keyword and article generation'],
  ['ai', 'geminiTimeoutMs', '30000', 'string', 0, 'Gemini request timeout in milliseconds'],
  ['proxy', 'browserProxyUrlsJson', '[]', 'json', 0, 'Proxy pool list'],
  ['affiliateSync', 'partnerboostAmazonBaseUrl', 'https://app.partnerboost.com', 'string', 0, 'PartnerBoost Amazon API base URL'],
  ['affiliateSync', 'partnerboostAmazonToken', '', 'secret', 1, 'PartnerBoost Amazon token'],
  ['affiliateSync', 'partnerboostDtcBaseUrl', 'https://app.partnerboost.com', 'string', 0, 'PartnerBoost DTC API base URL'],
  ['affiliateSync', 'partnerboostDtcToken', '', 'secret', 1, 'PartnerBoost DTC token'],
  ['media', 'driver', process.env.MEDIA_DRIVER || 'local', 'string', 0, 'Media storage driver'],
  ['media', 'localRoot', process.env.MEDIA_LOCAL_ROOT || 'storage/media', 'string', 0, 'Local media root relative to app root'],
  ['media', 'publicBaseUrl', process.env.MEDIA_PUBLIC_BASE_URL || '', 'string', 0, 'Public base URL for media'],
  ['media', 's3Endpoint', process.env.S3_ENDPOINT || '', 'string', 0, 'S3-compatible endpoint'],
  ['media', 's3Region', process.env.S3_REGION || 'auto', 'string', 0, 'S3 region'],
  ['media', 's3Bucket', process.env.S3_BUCKET || '', 'string', 0, 'S3 bucket name'],
  ['media', 's3AccessKeyId', process.env.S3_ACCESS_KEY_ID || '', 'secret', 1, 'S3 access key id'],
  ['media', 's3SecretAccessKey', process.env.S3_SECRET_ACCESS_KEY || '', 'secret', 1, 'S3 secret access key'],
  ['media', 's3ForcePathStyle', process.env.S3_FORCE_PATH_STYLE || 'false', 'boolean', 0, 'Force path-style access for MinIO and compatible storage'],
  ['seo', 'siteName', 'Bes3', 'string', 0, 'Public site name'],
  ['seo', 'siteTagline', 'The Best 3 Tech Picks, Decoded.', 'string', 0, 'Public site tagline'],
  ['seo', 'appUrl', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', 'string', 0, 'Primary public site URL'],
  ['seo', 'renderAuditBaseUrl', process.env.SEO_RENDER_AUDIT_BASE_URL || '', 'string', 0, 'Optional internal base URL used by rendered SEO audits when the public app URL is not directly reachable from the server runtime'],
  ['seo', 'pingomaticEnabled', process.env.PINGOMATIC_ENABLED || 'false', 'boolean', 0, 'Enable Ping-O-Matic notifications'],
  ['seo', 'googleIndexingEnabled', process.env.GOOGLE_INDEXING_ENABLED || 'false', 'boolean', 0, 'Enable Google Indexing API dispatch'],
  ['seo', 'googleServiceAccountJson', process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '', 'secret', 1, 'Google service account JSON used for Indexing API dispatch'],
  ['seo', 'syndicationEnabled', process.env.SEO_SYNDICATION_ENABLED || 'false', 'boolean', 0, 'Enable external syndication handoff after publish'],
  ['seo', 'syndicationTargetsJson', process.env.SEO_SYNDICATION_TARGETS_JSON || '[]', 'json', 0, 'Configured syndication targets such as Medium, Substack, or LinkedIn webhooks'],
  ['seo', 'linkInspectorEnabled', process.env.LINK_INSPECTOR_ENABLED || 'true', 'boolean', 0, 'Enable link inspector checks'],
  ['seo', 'linkInspectorMaxUrls', process.env.LINK_INSPECTOR_MAX_URLS || '60', 'string', 0, 'Maximum URLs checked per manual inspection run'],
  ['pipeline', 'workerEnabled', process.env.PIPELINE_WORKER_ENABLED || 'true', 'boolean', 0, 'Enable pipeline background worker'],
  ['pipeline', 'workerPollMs', process.env.PIPELINE_WORKER_POLL_MS || '2500', 'string', 0, 'Worker poll interval in milliseconds'],
  ['pipeline', 'workerConcurrency', process.env.PIPELINE_WORKER_CONCURRENCY || '1', 'string', 0, 'Max concurrent pipeline runs per container']
] as const

const DEFAULT_PROMPTS = [
  {
    promptId: 'keyword_mining',
    category: 'keywordMining',
    name: 'Keyword Mining',
    version: 'v1',
    promptContent:
      'Generate 12 buyer-intent long-tail keywords for {{product.productName}}. Return JSON array with keyword, buyerIntent, serpWeakness, commissionPotential, contentFit, freshness.'
  },
  {
    promptId: 'review_generation',
    category: 'reviewGeneration',
    name: 'Review Article',
    version: 'v1',
    promptContent:
      'Write a concise independent review for {{product.productName}} with pros, cons, ideal buyer, and CTA-safe language. Return markdown.'
  },
  {
    promptId: 'comparison_generation',
    category: 'comparisonGeneration',
    name: 'Comparison Article',
    version: 'v1',
    promptContent:
      'Compare {{product.productName}} against two alternatives. Return markdown with verdict, comparison table, and FAQ.'
  },
  {
    promptId: 'seo_enrichment',
    category: 'seoEnrichment',
    name: 'SEO Enrichment',
    version: 'v1',
    promptContent:
      'Generate SEO title, meta description, FAQPage schema, Review schema, and open graph summary for {{article.title}}. Return JSON.'
  },
  {
    promptId: 'fact_extraction',
    category: 'factExtraction',
    name: 'Fact Extraction',
    version: 'v1',
    promptContent:
      'Extract only verifiable commerce facts for {{product.productName}}. Return JSON with productFacts, topAttributes, offerSummary, and evidenceGaps. Do not add opinions.'
  },
  {
    promptId: 'buyer_fit_reasoning',
    category: 'buyerFitReasoning',
    name: 'Buyer Fit Reasoning',
    version: 'v1',
    promptContent:
      'Using the verified facts for {{product.productName}}, explain who it is best for, who should skip it, and what proof is still missing. Return JSON.'
  },
  {
    promptId: 'assistant_answering',
    category: 'assistantAnswering',
    name: 'Assistant Answering',
    version: 'v1',
    promptContent:
      'Answer the shopping question using only the supplied Bes3 product facts, offers, and evidence. Recommend the clearest next action and keep the tone concise.'
  },
  {
    promptId: 'taxonomy_refinement',
    category: 'factExtraction',
    name: 'Taxonomy Refinement',
    version: 'v2',
    promptContent:
      'You are an expert E-commerce Taxonomist and SEO Specialist. Group raw queries for {{category.name}} into Canonical Tags. Each tag must represent a user pain point, usage scenario, or physical test. Return strict JSON array with canonical_tag, synonyms, and is_core_painpoint.'
  },
  {
    promptId: 'video_evidence_extraction',
    category: 'factExtraction',
    name: 'Hardcore Video Evidence Extraction',
    version: 'v2',
    promptContent:
      'You are a hardcore hardware engineer and ruthless product reviewer. Analyze {{category.name}} transcript against {{canonicalTags}}. Return strict JSON with is_advertorial, overall_sentiment, scenario_performance[{canonical_tag,rating,evidence_quote,timestamp_seconds,context_snippet}], and unexpected_brilliant_usecases. Do not include untested tags.'
  },
  {
    promptId: 'shorts_evidence_extraction',
    category: 'factExtraction',
    name: 'Shorts Evidence Extraction',
    version: 'v2',
    promptContent:
      'Analyze a short product video for {{category.name}}. Return strict JSON with verdict_type, killer_feature, fatal_flaw, and vibe_quote. Do not infer comprehensive physical performance from a short clip.'
  }
] as const

function isUniqueConstraintError(error: unknown): boolean {
  const code =
    typeof error === 'object' && error && 'code' in error
      ? String((error as { code?: unknown }).code || '')
      : ''
  const message = error instanceof Error ? error.message : String(error)

  return (
    code === '23505' ||
    code === 'SQLITE_CONSTRAINT_UNIQUE' ||
    message.includes('UNIQUE constraint failed') ||
    message.includes('duplicate key value violates unique constraint')
  )
}

async function ignoreUniqueViolation(operation: () => Promise<unknown>): Promise<void> {
  try {
    await operation()
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error
  }
}

async function ensureDefaultAdmin(): Promise<void> {
  const db = await getDatabase()
  const adminPasswordState = getRuntimeAdminPasswordState()
  if (!adminPasswordState.value) {
    throw new Error(
      'DEFAULT_ADMIN_PASSWORD is required. Use a local .env file in development and injected environment variables in production.'
    )
  }
  const passwordHash = await hashPassword(adminPasswordState.value)
  const existing = await db.queryOne<{ id: number }>(
    'SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1',
    [DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_EMAIL]
  )

  const syncAdmin = async (userId: number) =>
    db.exec(
      `
        UPDATE users
        SET username = ?, email = ?, password_hash = ?, role = 'admin', display_name = ?, is_active = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        DEFAULT_ADMIN_USERNAME,
        DEFAULT_ADMIN_EMAIL,
        passwordHash,
        'Bes3 Administrator',
        1,
        userId
      ]
    )

  if (existing?.id) {
    await syncAdmin(existing.id)
    return
  }

  try {
    await db.exec(
      `
        INSERT INTO users (username, email, password_hash, role, display_name, is_active, must_change_password)
        VALUES (?, ?, ?, 'admin', 'Bes3 Administrator', 1, 1)
      `,
      [
        DEFAULT_ADMIN_USERNAME,
        DEFAULT_ADMIN_EMAIL,
        passwordHash
      ]
    )
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error
    const concurrentUser = await db.queryOne<{ id: number }>(
      'SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1',
      [DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_EMAIL]
    )
    if (!concurrentUser?.id) throw error
    await syncAdmin(concurrentUser.id)
  }
}

async function ensureDefaultSettings(): Promise<void> {
  const db = await getDatabase()
  for (const [category, key, value, dataType, isSensitive, description] of DEFAULT_SETTINGS) {
    const existing = await db.queryOne<{ id: number }>(
      'SELECT id FROM system_settings WHERE category = ? AND key = ? LIMIT 1',
      [category, key]
    )
    if (existing?.id) continue
    await ignoreUniqueViolation(() =>
      db.exec(
        `
          INSERT INTO system_settings (category, key, value, data_type, is_sensitive, description)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [category, key, value, dataType, isSensitive, description]
      )
    )
  }
}

async function ensureAdminRolePermissions(): Promise<void> {
  const db = await getDatabase()
  for (const [role, permissions] of Object.entries(ADMIN_ROLE_PERMISSIONS)) {
    for (const permission of permissions) {
      await ignoreUniqueViolation(() =>
        db.exec(
          `
            INSERT INTO admin_role_permissions (role, permission, allowed, created_at, updated_at)
            VALUES (?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `,
          [role, permission]
        )
      )
    }
  }
}

async function ensureDefaultPrompts(): Promise<void> {
  const db = await getDatabase()
  for (const prompt of DEFAULT_PROMPTS) {
    const existing = await db.queryOne<{ id: number }>(
      'SELECT id FROM prompt_versions WHERE prompt_id = ? AND version = ? LIMIT 1',
      [prompt.promptId, prompt.version]
    )
    if (existing?.id) continue
    await ignoreUniqueViolation(() =>
      db.exec(
        `
          INSERT INTO prompt_versions (prompt_id, category, name, version, prompt_content, is_active, change_notes)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [prompt.promptId, prompt.category, prompt.name, prompt.version, prompt.promptContent, 1, 'Initial Bes3 seed prompt']
      )
    )
  }
}

async function ensureSeedContent(): Promise<void> {
  const db = await getDatabase()
  const existing = await db.queryOne<{ id: number }>('SELECT id FROM products LIMIT 1')
  if (existing?.id) return

  const seedProductSlug = slugify('Midea MERC07C4BAWW Chest Freezer')

  await ignoreUniqueViolation(() =>
    db.exec(
      `
        INSERT INTO products (
          source_platform,
          source_affiliate_link,
          resolved_url,
          canonical_url,
          slug,
          brand,
          product_name,
          category,
          description,
          price_amount,
          price_currency,
          rating,
          review_count,
          specs_json,
          review_highlights_json,
          published_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
      [
        'manual',
        'https://www.amazon.com/dp/B0CQT26VCW',
        'https://www.amazon.com/dp/B0CQT26VCW',
        'https://www.amazon.com/dp/B0CQT26VCW',
        seedProductSlug,
        'Midea',
        'Midea MERC07C4BAWW Chest Freezer',
        'home-office',
        'A seeded demo product so the public site has initial content on first boot.',
        269.99,
        'USD',
        4.4,
        10196,
        JSON.stringify({ Capacity: '7 Cu.ft', Mode: 'Convertible', Finish: 'White' }),
        JSON.stringify(['Strong value for the size', 'Reliable temperature stability', 'Large review base'])
      ]
    )
  )

  const product = await db.queryOne<{ id: number; slug: string; product_name: string }>(
    'SELECT id, slug, product_name FROM products WHERE slug = ? LIMIT 1',
    [seedProductSlug]
  )
  if (!product) return

  const articleSlug = `best-${product.slug}`
  await ignoreUniqueViolation(() =>
    db.exec(
      `
        INSERT INTO articles (
          product_id,
          article_type,
          title,
          slug,
          summary,
          keyword,
          hero_image_url,
          content_md,
          content_html,
          seo_title,
          seo_description,
          schema_json,
          status,
          published_at
        ) VALUES (?, 'review', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', CURRENT_TIMESTAMP)
      `,
      [
        product.id,
        `${product.product_name} Review`,
        articleSlug,
        'Seeded article for the homepage and public routes.',
        'midea chest freezer review',
        'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?auto=format&fit=crop&w=1200&q=80',
        `# ${product.product_name}\n\nThis seeded review exists so Bes3 boots with a working public experience.`,
        `<h1>${product.product_name}</h1><p>This seeded review exists so Bes3 boots with a working public experience.</p>`,
        `${product.product_name} Review | Bes3`,
        'Seeded review page for Bes3.',
        JSON.stringify({
          '@type': 'Review',
          reviewRating: { '@type': 'Rating', ratingValue: '4.4' }
        })
      ]
    )
  )

  const article = await db.queryOne<{ id: number; title: string; slug: string }>(
    'SELECT id, title, slug FROM articles WHERE slug = ? LIMIT 1',
    [articleSlug]
  )
  if (!article) return

  const seededSeoPage = buildSeoPagePersistencePayload({
    pageType: 'review',
    pathname: `/reviews/${article.slug}`,
    title: article.title,
    description: 'Seeded SEO record for the first Bes3 article.',
    schemaJson: JSON.stringify({ '@type': 'FAQPage', mainEntity: [] })
  })

  await ignoreUniqueViolation(() =>
    db.exec(
      `
        INSERT INTO seo_pages (
          article_id,
          page_type,
          pathname,
          title,
          meta_description,
          canonical_url,
          open_graph_json,
          schema_json,
          status,
          published_at
        ) VALUES (?, 'review', ?, ?, ?, ?, ?, ?, 'published', CURRENT_TIMESTAMP)
      `,
      [
        article.id,
        seededSeoPage.pathname,
        seededSeoPage.title,
        seededSeoPage.metaDescription,
        seededSeoPage.canonicalUrl,
        seededSeoPage.openGraphJson,
        seededSeoPage.schemaJson
      ]
    )
  )

}

async function ensureSeedBrandKnowledge(): Promise<void> {
  const db = await getDatabase()
  const brandSlug = slugify('Midea')

  await ignoreUniqueViolation(() =>
    db.exec(
      `
        INSERT INTO brand_policies (
          brand_name,
          brand_slug,
          shipping_policy,
          return_policy,
          warranty_policy,
          discount_window,
          support_policy,
          source_type,
          confidence_score,
          last_verified_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'editorial', ?, CURRENT_TIMESTAMP)
      `,
      [
        'Midea',
        brandSlug,
        'Most large-appliance orders should be treated as scheduled delivery items, so buyers should confirm shipping timing before checkout.',
        'Return eligibility can vary by merchant on major appliances and freezer products, so buyers should verify pickup and restocking rules before ordering.',
        'Expect standard limited-appliance warranty coverage and confirm the exact term on the merchant or manufacturer support page before purchase.',
        'The best discount windows usually cluster around major seasonal sale events and merchant promotion pushes rather than constant everyday pricing.',
        'Use merchant delivery details plus the official brand support flow as the final source of truth for installation, warranty, and post-purchase service.',
        0.82
      ]
    )
  )

  const compatibilityFacts = [
    {
      factType: 'placement',
      factLabel: 'Placement planning',
      factValue: 'Chest freezers usually need ventilation clearance and enough lid-opening room, so small-room placement should be checked before purchase.'
    },
    {
      factType: 'power',
      factLabel: 'Power expectations',
      factValue: 'Garage or utility-room appliance buyers should verify outlet availability and operating-environment guidance before relying on year-round placement.'
    },
    {
      factType: 'delivery',
      factLabel: 'Delivery fit',
      factValue: 'Measure doorways, stairs, and final placement space before ordering because delivery constraints matter as much as freezer capacity.'
    }
  ]

  for (const fact of compatibilityFacts) {
    await ignoreUniqueViolation(() =>
      db.exec(
        `
          INSERT INTO compatibility_facts (
            brand_name,
            brand_slug,
            category,
            fact_type,
            fact_label,
            fact_value,
            source_type,
            confidence_score,
            is_verified,
            last_checked_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'editorial', ?, ?, CURRENT_TIMESTAMP)
        `,
        ['Midea', brandSlug, 'home-office', fact.factType, fact.factLabel, fact.factValue, 0.78, 1]
      )
    )
  }
}

async function ensureHardcoreTaxonomySeed(): Promise<void> {
  const db = await getDatabase()

  for (const category of HARDCORE_CATEGORIES) {
    await ignoreUniqueViolation(() =>
      db.exec(
        `
          INSERT INTO hardcore_categories (name, slug, status, meta_config_json)
          VALUES (?, ?, 'active', ?)
        `,
        [
          category.name,
          category.slug,
          JSON.stringify({
            coreProducts: category.coreProducts,
            metrics: category.metrics,
            redditSeeds: category.redditSeeds
          })
        ]
      )
    )

    const categoryRow = await db.queryOne<{ id: number }>(
      'SELECT id FROM hardcore_categories WHERE slug = ? LIMIT 1',
      [category.slug]
    )

    for (const [index, painpoint] of category.painpoints.entries()) {
      const slug = slugify(painpoint)
      const seedKeywords = Array.from(
        new Set([
          painpoint,
          ...category.redditSeeds.filter((seed) =>
            seed.toLowerCase().includes(painpoint.split(' ')[0].toLowerCase())
          )
        ])
      )

      await ignoreUniqueViolation(() =>
        db.exec(
          `
            INSERT INTO taxonomy_tags (
              category_id,
              category_slug,
              canonical_name,
              slug,
              keywords_json,
              search_volume,
              is_core_painpoint,
              status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
          `,
          [
            categoryRow?.id || null,
            category.slug,
            painpoint,
            slug,
            JSON.stringify({ synonyms: seedKeywords, reddit_mentions: category.redditSeeds }),
            Math.max(1000 - index * 120, 100),
            index < 4 ? 1 : 0
          ]
        )
      )
    }
  }
}

async function ensureHardcoreDemoEvidenceSeed(): Promise<void> {
  const db = await getDatabase()
  const productSlug = slugify('Dolphin Nautilus Pool Wall Demo')

  await ignoreUniqueViolation(() =>
    db.exec(
      `
        INSERT INTO products (
          source_platform,
          source_affiliate_link,
          resolved_url,
          canonical_url,
          slug,
          brand,
          product_name,
          category,
          description,
          price_amount,
          price_currency,
          current_price,
          hist_low_price,
          avg_90d_price,
          price_status,
          rating,
          review_count,
          specs_json,
          review_highlights_json,
          published_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
      [
        'manual',
        'https://example.com/affiliate/dolphin-nautilus-demo',
        'https://example.com/affiliate/dolphin-nautilus-demo',
        'https://example.com/products/dolphin-nautilus-demo',
        productSlug,
        'Dolphin',
        'Nautilus Pool Wall Demo',
        'yard-pool-automation',
        'Seeded v2 evidence product used to keep the yard and pool automation matrix, scenario pages, and value map visible before live ingestion runs.',
        499,
        'USD',
        499,
        449,
        629,
        'great-value',
        4.4,
        8,
        JSON.stringify({ cable: 'tangle-resistant swivel', poolType: 'in-ground', filter: 'top-load basket' }),
        JSON.stringify(['Seeded teardown-style evidence for Pool Wall Climbing', 'Below 90-day average price window'])
      ]
    )
  )

  const product = await db.queryOne<{ id: number }>('SELECT id FROM products WHERE slug = ? LIMIT 1', [productSlug])
  if (!product?.id) return

  await ignoreUniqueViolation(() =>
    db.exec(
      `
        INSERT INTO affiliate_links (
          product_id,
          platform,
          affiliate_url,
          original_url,
          country_code,
          commission_rate,
          status,
          last_verified
        ) VALUES (?, 'PartnerBoost', ?, ?, 'US', ?, 'active', CURRENT_TIMESTAMP)
      `,
      [
        product.id,
        'https://example.com/affiliate/dolphin-nautilus-demo',
        'https://example.com/products/dolphin-nautilus-demo',
        0.08
      ]
    )
  )

  const existingPriceSnapshot = await db.queryOne<{ id: number }>(
    'SELECT id FROM price_value_snapshots WHERE product_id = ? AND source = ? LIMIT 1',
    [product.id, 'seed']
  )
  if (!existingPriceSnapshot?.id) {
    await db.exec(
      `
        INSERT INTO price_value_snapshots (
          product_id,
          current_price,
          hist_low_price,
          avg_90d_price,
          consensus_score,
          value_score,
          entry_status,
          source
        ) VALUES (?, ?, ?, ?, ?, ?, 'great-value', 'seed')
      `,
      [product.id, 499, 449, 629, 4, (4 * 100) / 499]
    )
  }

  await ignoreUniqueViolation(() =>
    db.exec(
      `
        INSERT INTO review_videos (
          youtube_id,
          channel_name,
          channel_url,
          blogger_rank,
          authority_tier,
          title,
          video_type,
          transcript,
          description,
          processed_status,
          published_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'long-form', ?, ?, 'success', CURRENT_TIMESTAMP)
      `,
      [
        'demoPoolWall001',
        'Pool Robot Demo Lab',
        'https://www.youtube.com/@PoolRobotLab',
        2,
        'specialist',
        'Dolphin Nautilus pool wall climb demo',
        'In the wall climbing test, the robot reached the tile line repeatedly and scrubbed the waterline instead of sliding back down.',
        'Demo video description with product identity controlled by Bes3 seed data.'
      ]
    )
  )

  const video = await db.queryOne<{ id: number }>('SELECT id FROM review_videos WHERE youtube_id = ? LIMIT 1', ['demoPoolWall001'])
  const poolWallTag = await db.queryOne<{ id: number }>(
    'SELECT id FROM taxonomy_tags WHERE category_slug = ? AND slug = ? LIMIT 1',
    ['yard-pool-automation', 'pool-wall-climbing']
  )
  if (!video?.id || !poolWallTag?.id) return

  const existingReport = await db.queryOne<{ id: number }>(
    'SELECT id FROM analysis_reports WHERE product_id = ? AND video_id = ? AND tag_id = ? LIMIT 1',
    [product.id, video.id, poolWallTag.id]
  )
  if (existingReport?.id) {
    await db.exec(
      `
        UPDATE analysis_reports
        SET context_snippet = COALESCE(context_snippet, ?), quality_flags_json = COALESCE(quality_flags_json, ?)
        WHERE id = ?
      `,
      [
        'In the wall climbing test, the robot reached the tile line repeatedly and scrubbed the waterline instead of sliding back down.',
        JSON.stringify({ validation: 'seeded_quote_with_context' }),
        existingReport.id
      ]
    )
    return
  }

  await db.exec(
    `
      INSERT INTO analysis_reports (
        product_id,
        video_id,
        tag_id,
        rating,
        evidence_quote,
        timestamp_seconds,
        context_snippet,
        evidence_confidence,
        evidence_type,
        is_advertorial,
        quality_flags_json
      ) VALUES (?, ?, ?, 'Good', ?, ?, ?, ?, 'side-by-side', 0, ?)
    `,
    [
      product.id,
      video.id,
      poolWallTag.id,
      'Reached the tile line repeatedly and scrubbed the waterline instead of sliding back down.',
      428,
      'In the wall climbing test, the robot reached the tile line repeatedly and scrubbed the waterline instead of sliding back down.',
      0.86,
      JSON.stringify({ validation: 'seeded_quote_with_context' })
    ]
  )
}

export async function bootstrapApplication(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      await getDatabase()
      await ensureDefaultAdmin()
      await ensureDefaultSettings()
      await ensureAdminRolePermissions()
      await ensureDefaultPrompts()
      await ensureHardcoreTaxonomySeed()
      await ensureHardcoreDemoEvidenceSeed()
      await ensureSeedContent()
      await ensureSeedBrandKnowledge()
    })().catch((error) => {
      bootstrapPromise = null
      throw error
    })
  }

  await bootstrapPromise
}

import { DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD, DEFAULT_ADMIN_USERNAME } from '@/lib/constants'
import { hashPassword } from '@/lib/crypto'
import { getDatabase } from '@/lib/db'
import { slugify } from '@/lib/slug'

let bootstrapPromise: Promise<void> | null = null

const DEFAULT_SETTINGS = [
  ['ai', 'provider', 'gemini', 'string', 0, 'AI provider'],
  ['ai', 'geminiModel', 'gemini-2.5-flash', 'string', 0, 'Gemini model'],
  ['ai', 'geminiApiKey', '', 'secret', 1, 'Gemini API key used for keyword and article generation'],
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
  const passwordHash = await hashPassword(DEFAULT_ADMIN_PASSWORD)
  const existing = await db.queryOne<{ id: number }>(
    'SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1',
    [DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_EMAIL]
  )

  const syncAdmin = async (userId: number) =>
    db.exec(
      `
        UPDATE users
        SET username = ?, email = ?, password_hash = ?, role = 'admin', display_name = ?, is_active = ?,
            must_change_password = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_EMAIL, passwordHash, 'Bes3 Administrator', 1, 0, userId]
    )

  if (existing?.id) {
    await syncAdmin(existing.id)
    return
  }

  try {
    await db.exec(
      `
        INSERT INTO users (username, email, password_hash, role, display_name, is_active, must_change_password)
        VALUES (?, ?, ?, 'admin', 'Bes3 Administrator', 1, 0)
      `,
      [DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_EMAIL, passwordHash]
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
        `/reviews/${article.slug}`,
        article.title,
        'Seeded SEO record for the first Bes3 article.',
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reviews/${article.slug}`,
        JSON.stringify({ title: article.title }),
        JSON.stringify({ '@type': 'FAQPage', mainEntity: [] })
      ]
    )
  )
}

export async function bootstrapApplication(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      await getDatabase()
      await ensureDefaultAdmin()
      await ensureDefaultSettings()
      await ensureDefaultPrompts()
      await ensureSeedContent()
    })().catch((error) => {
      bootstrapPromise = null
      throw error
    })
  }

  await bootstrapPromise
}

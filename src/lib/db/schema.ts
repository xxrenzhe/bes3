import type { DatabaseAdapter } from '@/lib/types'

type DatabaseError = Error & {
  code?: string
}

const SQLITE_SCHEMA = [
  `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      display_name TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      must_change_password INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT,
      data_type TEXT NOT NULL DEFAULT 'string',
      is_sensitive INTEGER NOT NULL DEFAULT 0,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(category, key)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS prompt_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prompt_id TEXT NOT NULL,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      version TEXT NOT NULL,
      prompt_content TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 0,
      change_notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(prompt_id, version)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS affiliate_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      external_id TEXT NOT NULL,
      merchant_id TEXT,
      asin TEXT,
      brand TEXT,
      product_name TEXT,
      product_url TEXT,
      promo_link TEXT,
      short_promo_link TEXT,
      image_url TEXT,
      price_amount REAL,
      price_currency TEXT,
      commission_rate REAL,
      review_count INTEGER,
      rating REAL,
      country_code TEXT,
      raw_payload TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(platform, external_id)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      affiliate_product_id INTEGER,
      source_platform TEXT NOT NULL,
      source_affiliate_link TEXT NOT NULL,
      resolved_url TEXT,
      canonical_url TEXT,
      slug TEXT UNIQUE,
      brand TEXT,
      product_name TEXT NOT NULL,
      category TEXT,
      description TEXT,
      price_amount REAL,
      price_currency TEXT,
      current_price REAL,
      hist_low_price REAL,
      avg_90d_price REAL,
      price_status TEXT,
      rating REAL,
      review_count INTEGER,
      specs_json TEXT,
      review_highlights_json TEXT,
      source_payload_json TEXT,
      published_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (affiliate_product_id) REFERENCES affiliate_products(id) ON DELETE SET NULL
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS hardcore_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      icon_url TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      meta_config_json TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS affiliate_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      platform TEXT NOT NULL,
      affiliate_url TEXT NOT NULL,
      original_url TEXT,
      country_code TEXT,
      commission_rate REAL,
      status TEXT NOT NULL DEFAULT 'active',
      last_verified TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE(product_id, platform, country_code)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS taxonomy_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
      category_slug TEXT NOT NULL,
      canonical_name TEXT NOT NULL,
      slug TEXT NOT NULL,
      keywords_json TEXT,
      search_volume INTEGER NOT NULL DEFAULT 0,
      is_core_painpoint INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES hardcore_categories(id) ON DELETE SET NULL,
      UNIQUE(category_slug, slug)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS review_videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      youtube_id TEXT NOT NULL UNIQUE,
      channel_name TEXT NOT NULL,
      channel_url TEXT,
      blogger_rank REAL NOT NULL DEFAULT 1,
      authority_tier TEXT NOT NULL DEFAULT 'general',
      title TEXT NOT NULL,
      video_type TEXT NOT NULL DEFAULT 'long-form',
      transcript TEXT,
      description TEXT,
      processed_status TEXT NOT NULL DEFAULT 'pending',
      published_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS analysis_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      video_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      rating TEXT NOT NULL,
      evidence_quote TEXT NOT NULL,
      timestamp_seconds INTEGER,
      context_snippet TEXT,
      evidence_confidence REAL NOT NULL DEFAULT 1,
      evidence_type TEXT NOT NULL DEFAULT 'standard-review',
      is_advertorial INTEGER NOT NULL DEFAULT 0,
      quality_flags_json TEXT,
      unexpected_usecase TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (video_id) REFERENCES review_videos(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES taxonomy_tags(id) ON DELETE CASCADE
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS site_search_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query_text TEXT NOT NULL UNIQUE,
      hit_count INTEGER NOT NULL DEFAULT 1,
      matched_tag_id INTEGER,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (matched_tag_id) REFERENCES taxonomy_tags(id) ON DELETE SET NULL
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS taxonomy_intent_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_slug TEXT NOT NULL,
      source_type TEXT NOT NULL,
      raw_query TEXT NOT NULL,
      normalized_query TEXT NOT NULL,
      search_volume INTEGER NOT NULL DEFAULT 0,
      competition TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(category_slug, source_type, normalized_query)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS pending_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_slug TEXT NOT NULL,
      canonical_name TEXT NOT NULL,
      slug TEXT NOT NULL,
      trigger_query TEXT NOT NULL,
      hit_count INTEGER NOT NULL DEFAULT 1,
      source TEXT NOT NULL DEFAULT 'site_search',
      status TEXT NOT NULL DEFAULT 'pending',
      priority_score REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(category_slug, slug)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS taxonomy_rescan_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_slug TEXT NOT NULL,
      tag_slug TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS pseo_page_signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pathname TEXT NOT NULL,
      category_slug TEXT,
      tag_slug TEXT,
      impressions INTEGER NOT NULL DEFAULT 0,
      clicks INTEGER NOT NULL DEFAULT 0,
      ctr REAL NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT 'ga4',
      captured_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS creator_feedback_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      analysis_report_id INTEGER,
      video_id INTEGER,
      feedback_type TEXT NOT NULL,
      weight_delta REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (analysis_report_id) REFERENCES analysis_reports(id) ON DELETE SET NULL,
      FOREIGN KEY (video_id) REFERENCES review_videos(id) ON DELETE SET NULL
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS price_value_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      current_price REAL,
      hist_low_price REAL,
      avg_90d_price REAL,
      consensus_score REAL,
      value_score REAL,
      entry_status TEXT NOT NULL DEFAULT 'unknown',
      source TEXT NOT NULL DEFAULT 'affiliate',
      captured_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS price_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      email TEXT NOT NULL,
      target_price REAL,
      target_value_score REAL,
      status TEXT NOT NULL DEFAULT 'active',
      last_notified_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE(product_id, email)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS product_media_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      storage_provider TEXT NOT NULL,
      storage_key TEXT NOT NULL,
      public_url TEXT NOT NULL,
      source_url TEXT,
      mime_type TEXT,
      checksum TEXT,
      width INTEGER,
      height INTEGER,
      asset_role TEXT NOT NULL,
      is_public INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS merchants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      website_url TEXT,
      country_code TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS product_offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      merchant_id INTEGER,
      offer_url TEXT NOT NULL,
      merchant_sku TEXT,
      availability_status TEXT,
      price_amount REAL,
      price_currency TEXT,
      shipping_cost REAL,
      coupon_text TEXT,
      coupon_type TEXT,
      reference_price_amount REAL,
      reference_price_currency TEXT,
      reference_price_type TEXT,
      reference_price_source TEXT,
      reference_price_last_checked_at TEXT,
      condition_label TEXT,
      source_type TEXT NOT NULL DEFAULT 'scrape',
      source_url TEXT,
      confidence_score REAL NOT NULL DEFAULT 0.7,
      raw_payload_json TEXT,
      last_checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE SET NULL,
      UNIQUE(product_id, offer_url)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS product_price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      product_offer_id INTEGER,
      price_amount REAL,
      price_currency TEXT,
      availability_status TEXT,
      captured_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (product_offer_id) REFERENCES product_offers(id) ON DELETE SET NULL
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS product_attribute_facts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      attribute_key TEXT NOT NULL,
      attribute_label TEXT NOT NULL,
      attribute_value TEXT NOT NULL,
      source_url TEXT,
      source_type TEXT NOT NULL DEFAULT 'scrape',
      confidence_score REAL NOT NULL DEFAULT 0.7,
      is_verified INTEGER NOT NULL DEFAULT 0,
      last_checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS brand_policies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      brand_name TEXT NOT NULL,
      brand_slug TEXT NOT NULL UNIQUE,
      shipping_policy TEXT,
      return_policy TEXT,
      warranty_policy TEXT,
      discount_window TEXT,
      support_policy TEXT,
      source_url TEXT,
      source_type TEXT NOT NULL DEFAULT 'editorial',
      confidence_score REAL NOT NULL DEFAULT 0.8,
      last_verified_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS compatibility_facts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      brand_name TEXT NOT NULL,
      brand_slug TEXT NOT NULL,
      category TEXT,
      fact_type TEXT NOT NULL,
      fact_label TEXT NOT NULL,
      fact_value TEXT NOT NULL,
      source_url TEXT,
      source_type TEXT NOT NULL DEFAULT 'editorial',
      confidence_score REAL NOT NULL DEFAULT 0.8,
      is_verified INTEGER NOT NULL DEFAULT 0,
      last_checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(brand_slug, category, fact_label, fact_value)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS keyword_opportunities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      keyword TEXT NOT NULL,
      buyer_intent REAL NOT NULL,
      serp_weakness REAL NOT NULL,
      commission_potential REAL NOT NULL,
      content_fit REAL NOT NULL,
      freshness REAL NOT NULL,
      total_score REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS content_pipeline_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      affiliate_product_id INTEGER,
      source_link TEXT NOT NULL,
      run_type TEXT NOT NULL DEFAULT 'fullPipeline',
      requested_action TEXT,
      worker_id TEXT,
      locked_at TEXT,
      started_at TEXT,
      finished_at TEXT,
      attempt_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'queued',
      current_stage TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS content_pipeline_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER NOT NULL,
      stage TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      message TEXT,
      payload_json TEXT,
      started_at TEXT,
      finished_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (run_id) REFERENCES content_pipeline_runs(id) ON DELETE CASCADE
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      article_type TEXT NOT NULL,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      summary TEXT,
      keyword TEXT,
      hero_image_url TEXT,
      content_md TEXT NOT NULL,
      content_html TEXT NOT NULL,
      seo_title TEXT,
      seo_description TEXT,
      schema_json TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      published_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS seo_pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER,
      page_type TEXT NOT NULL,
      pathname TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      meta_description TEXT NOT NULL,
      canonical_url TEXT,
      open_graph_json TEXT,
      schema_json TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      published_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS publish_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seo_page_id INTEGER,
      event_type TEXT NOT NULL,
      status TEXT NOT NULL,
      payload_json TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS link_inspector_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      status TEXT NOT NULL DEFAULT 'queued',
      total_checked INTEGER NOT NULL DEFAULT 0,
      issues_found INTEGER NOT NULL DEFAULT 0,
      broken_count INTEGER NOT NULL DEFAULT 0,
      out_of_stock_count INTEGER NOT NULL DEFAULT 0,
      payload_json TEXT,
      started_at TEXT,
      finished_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS link_inspector_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER NOT NULL,
      product_id INTEGER,
      product_name TEXT,
      source_url TEXT NOT NULL,
      final_url TEXT,
      http_status INTEGER,
      status TEXT NOT NULL DEFAULT 'ok',
      issue_type TEXT,
      issue_detail TEXT,
      response_snippet TEXT,
      checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (run_id) REFERENCES link_inspector_runs(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS merchant_click_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      visitor_id TEXT,
      source TEXT NOT NULL DEFAULT 'site',
      target_url TEXT NOT NULL,
      referer TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS buyer_decision_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      visitor_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      product_id INTEGER,
      source TEXT NOT NULL DEFAULT 'site',
      metadata_json TEXT,
      referer TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      source TEXT NOT NULL DEFAULT 'site',
      intent TEXT NOT NULL DEFAULT 'offers',
      category_slug TEXT,
      cadence TEXT NOT NULL DEFAULT 'weekly',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `
]

const POSTGRES_SCHEMA = SQLITE_SCHEMA.map((statement) =>
  statement
    .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'BIGSERIAL PRIMARY KEY')
    .replace(/TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP/g, 'TIMESTAMPTZ NOT NULL DEFAULT NOW()')
    .replace(/TEXT NOT NULL DEFAULT 'queued'/g, "TEXT NOT NULL DEFAULT 'queued'")
    .replace(/TEXT NOT NULL DEFAULT 'draft'/g, "TEXT NOT NULL DEFAULT 'draft'")
    .replace(/TEXT NOT NULL DEFAULT 'site'/g, "TEXT NOT NULL DEFAULT 'site'")
)

async function listColumns(db: DatabaseAdapter, tableName: string): Promise<Set<string>> {
  if (db.type === 'sqlite') {
    const rows = await db.query<{ name: string }>(`PRAGMA table_info(${tableName})`)
    return new Set(rows.map((row) => row.name))
  }

  const rows = await db.query<{ column_name: string }>(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = ? AND table_schema = ANY (current_schemas(false))
    `,
    [tableName]
  )
  return new Set(rows.map((row) => row.column_name))
}

function isAlreadyExistsError(db: DatabaseAdapter, error: unknown, kind: 'column' | 'index'): boolean {
  const databaseError = error as DatabaseError
  const message = databaseError.message?.toLowerCase() || ''

  if (db.type === 'sqlite') {
    return kind === 'column' ? message.includes('duplicate column name') : message.includes('already exists')
  }

  if (kind === 'column') {
    return databaseError.code === '42701' || message.includes('already exists')
  }

  return databaseError.code === '42P07' || message.includes('already exists')
}

async function ensureColumn(db: DatabaseAdapter, tableName: string, columnName: string, definition: string): Promise<void> {
  const columns = await listColumns(db, tableName)
  if (columns.has(columnName)) return
  try {
    await db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`)
  } catch (error) {
    if (isAlreadyExistsError(db, error, 'column')) return
    throw error
  }
}

async function ensureIndex(db: DatabaseAdapter, indexName: string, statement: string): Promise<void> {
  // Use IF NOT EXISTS to avoid race conditions between concurrent workers/processes
  const createSql = statement.replace(/^CREATE INDEX\s+/i, 'CREATE INDEX IF NOT EXISTS ')
  try {
    await db.exec(createSql)
  } catch (error) {
    if (isAlreadyExistsError(db, error, 'index')) return
    throw error
  }
}

async function ensurePipelineRunSchema(db: DatabaseAdapter): Promise<void> {
  await ensureColumn(db, 'content_pipeline_runs', 'run_type', "TEXT NOT NULL DEFAULT 'fullPipeline'")
  await ensureColumn(db, 'content_pipeline_runs', 'requested_action', 'TEXT')
  await ensureColumn(db, 'content_pipeline_runs', 'worker_id', 'TEXT')
  await ensureColumn(db, 'content_pipeline_runs', 'locked_at', 'TEXT')
  await ensureColumn(db, 'content_pipeline_runs', 'started_at', 'TEXT')
  await ensureColumn(db, 'content_pipeline_runs', 'finished_at', 'TEXT')
  await ensureColumn(db, 'content_pipeline_runs', 'attempt_count', 'INTEGER NOT NULL DEFAULT 0')
  await ensureIndex(
    db,
    'idx_content_pipeline_runs_status_created_at',
    'CREATE INDEX idx_content_pipeline_runs_status_created_at ON content_pipeline_runs (status, created_at, id)'
  )
  await ensureIndex(
    db,
    'idx_content_pipeline_runs_product_status',
    'CREATE INDEX idx_content_pipeline_runs_product_status ON content_pipeline_runs (product_id, status, updated_at)'
  )
}

async function ensureProductGraphSchema(db: DatabaseAdapter): Promise<void> {
  await ensureColumn(db, 'products', 'price_last_checked_at', 'TEXT')
  await ensureColumn(db, 'products', 'offer_last_checked_at', 'TEXT')
  await ensureColumn(db, 'products', 'attribute_completeness_score', 'REAL NOT NULL DEFAULT 0')
  await ensureColumn(db, 'products', 'data_confidence_score', 'REAL NOT NULL DEFAULT 0')
  await ensureColumn(db, 'products', 'source_count', 'INTEGER NOT NULL DEFAULT 0')
  await ensureColumn(db, 'products', 'current_price', 'REAL')
  await ensureColumn(db, 'products', 'hist_low_price', 'REAL')
  await ensureColumn(db, 'products', 'avg_90d_price', 'REAL')
  await ensureColumn(db, 'products', 'price_status', 'TEXT')
  await ensureColumn(db, 'products', 'asin', 'TEXT')
  await ensureColumn(db, 'review_videos', 'entity_match_json', 'TEXT')
  await ensureColumn(db, 'analysis_reports', 'context_snippet', 'TEXT')
  await ensureColumn(db, 'analysis_reports', 'quality_flags_json', 'TEXT')

  await ensureColumn(db, 'merchants', 'website_url', 'TEXT')
  await ensureColumn(db, 'merchants', 'country_code', 'TEXT')
  await ensureColumn(db, 'merchants', 'updated_at', 'TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP')

  await ensureColumn(db, 'product_offers', 'merchant_sku', 'TEXT')
  await ensureColumn(db, 'product_offers', 'availability_status', 'TEXT')
  await ensureColumn(db, 'product_offers', 'shipping_cost', 'REAL')
  await ensureColumn(db, 'product_offers', 'coupon_text', 'TEXT')
  await ensureColumn(db, 'product_offers', 'coupon_type', 'TEXT')
  await ensureColumn(db, 'product_offers', 'reference_price_amount', 'REAL')
  await ensureColumn(db, 'product_offers', 'reference_price_currency', 'TEXT')
  await ensureColumn(db, 'product_offers', 'reference_price_type', 'TEXT')
  await ensureColumn(db, 'product_offers', 'reference_price_source', 'TEXT')
  await ensureColumn(db, 'product_offers', 'reference_price_last_checked_at', 'TEXT')
  await ensureColumn(db, 'product_offers', 'condition_label', 'TEXT')
  await ensureColumn(db, 'product_offers', 'source_type', "TEXT NOT NULL DEFAULT 'scrape'")
  await ensureColumn(db, 'product_offers', 'source_url', 'TEXT')
  await ensureColumn(db, 'product_offers', 'confidence_score', 'REAL NOT NULL DEFAULT 0.7')
  await ensureColumn(db, 'product_offers', 'raw_payload_json', 'TEXT')
  await ensureColumn(db, 'product_offers', 'last_checked_at', 'TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP')
  await ensureColumn(db, 'product_offers', 'updated_at', 'TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP')

  await ensureColumn(db, 'product_price_history', 'product_offer_id', 'INTEGER')
  await ensureColumn(db, 'product_price_history', 'availability_status', 'TEXT')
  await ensureColumn(db, 'product_price_history', 'captured_at', 'TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP')

  await ensureColumn(db, 'product_attribute_facts', 'source_url', 'TEXT')
  await ensureColumn(db, 'product_attribute_facts', 'source_type', "TEXT NOT NULL DEFAULT 'scrape'")
  await ensureColumn(db, 'product_attribute_facts', 'confidence_score', 'REAL NOT NULL DEFAULT 0.7')
  await ensureColumn(db, 'product_attribute_facts', 'is_verified', 'INTEGER NOT NULL DEFAULT 0')
  await ensureColumn(db, 'product_attribute_facts', 'last_checked_at', 'TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP')
  await ensureColumn(db, 'product_attribute_facts', 'updated_at', 'TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP')

  await ensureColumn(db, 'brand_policies', 'brand_name', 'TEXT')
  await ensureColumn(db, 'brand_policies', 'brand_slug', 'TEXT')
  await ensureColumn(db, 'brand_policies', 'shipping_policy', 'TEXT')
  await ensureColumn(db, 'brand_policies', 'return_policy', 'TEXT')
  await ensureColumn(db, 'brand_policies', 'warranty_policy', 'TEXT')
  await ensureColumn(db, 'brand_policies', 'discount_window', 'TEXT')
  await ensureColumn(db, 'brand_policies', 'support_policy', 'TEXT')
  await ensureColumn(db, 'brand_policies', 'source_url', 'TEXT')
  await ensureColumn(db, 'brand_policies', 'source_type', "TEXT NOT NULL DEFAULT 'editorial'")
  await ensureColumn(db, 'brand_policies', 'confidence_score', 'REAL NOT NULL DEFAULT 0.8')
  await ensureColumn(db, 'brand_policies', 'last_verified_at', 'TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP')
  await ensureColumn(db, 'brand_policies', 'updated_at', 'TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP')

  await ensureColumn(db, 'compatibility_facts', 'brand_name', 'TEXT')
  await ensureColumn(db, 'compatibility_facts', 'brand_slug', 'TEXT')
  await ensureColumn(db, 'compatibility_facts', 'category', 'TEXT')
  await ensureColumn(db, 'compatibility_facts', 'fact_type', 'TEXT')
  await ensureColumn(db, 'compatibility_facts', 'fact_label', 'TEXT')
  await ensureColumn(db, 'compatibility_facts', 'fact_value', 'TEXT')
  await ensureColumn(db, 'compatibility_facts', 'source_url', 'TEXT')
  await ensureColumn(db, 'compatibility_facts', 'source_type', "TEXT NOT NULL DEFAULT 'editorial'")
  await ensureColumn(db, 'compatibility_facts', 'confidence_score', 'REAL NOT NULL DEFAULT 0.8')
  await ensureColumn(db, 'compatibility_facts', 'is_verified', 'INTEGER NOT NULL DEFAULT 0')
  await ensureColumn(db, 'compatibility_facts', 'last_checked_at', 'TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP')
  await ensureColumn(db, 'compatibility_facts', 'updated_at', 'TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP')

  await ensureIndex(
    db,
    'idx_products_offer_last_checked_at',
    'CREATE INDEX idx_products_offer_last_checked_at ON products (offer_last_checked_at, updated_at)'
  )
  await ensureIndex(
    db,
    'idx_product_offers_product_checked_price',
    'CREATE INDEX idx_product_offers_product_checked_price ON product_offers (product_id, last_checked_at, price_amount)'
  )
  await ensureIndex(
    db,
    'idx_product_offers_merchant_product',
    'CREATE INDEX idx_product_offers_merchant_product ON product_offers (merchant_id, product_id)'
  )
  await ensureIndex(
    db,
    'idx_product_price_history_product_captured_at',
    'CREATE INDEX idx_product_price_history_product_captured_at ON product_price_history (product_id, captured_at)'
  )
  await ensureIndex(
    db,
    'idx_product_attribute_facts_product_key',
    'CREATE INDEX idx_product_attribute_facts_product_key ON product_attribute_facts (product_id, attribute_key, last_checked_at)'
  )
  await ensureIndex(
    db,
    'idx_products_hardcore_category_price',
    'CREATE INDEX idx_products_hardcore_category_price ON products (category, current_price, avg_90d_price)'
  )
  await ensureIndex(
    db,
    'idx_affiliate_links_product_status',
    'CREATE INDEX idx_affiliate_links_product_status ON affiliate_links (product_id, status, last_verified)'
  )
  await ensureIndex(
    db,
    'idx_taxonomy_tags_category_core',
    'CREATE INDEX idx_taxonomy_tags_category_core ON taxonomy_tags (category_slug, is_core_painpoint, search_volume)'
  )
  await ensureIndex(
    db,
    'idx_analysis_reports_product_tag',
    'CREATE INDEX idx_analysis_reports_product_tag ON analysis_reports (product_id, tag_id, created_at)'
  )
  await ensureIndex(
    db,
    'idx_analysis_reports_tag_rating',
    'CREATE INDEX idx_analysis_reports_tag_rating ON analysis_reports (tag_id, rating, is_advertorial)'
  )
  await ensureIndex(
    db,
    'idx_pending_tags_status_priority',
    'CREATE INDEX idx_pending_tags_status_priority ON pending_tags (status, priority_score, updated_at)'
  )
  await ensureIndex(
    db,
    'idx_taxonomy_intent_sources_category_status',
    'CREATE INDEX idx_taxonomy_intent_sources_category_status ON taxonomy_intent_sources (category_slug, status, search_volume)'
  )
  await ensureIndex(
    db,
    'idx_taxonomy_rescan_queue_status',
    'CREATE INDEX idx_taxonomy_rescan_queue_status ON taxonomy_rescan_queue (status, category_slug, created_at)'
  )
  await ensureIndex(
    db,
    'idx_pseo_page_signals_path_captured',
    'CREATE INDEX idx_pseo_page_signals_path_captured ON pseo_page_signals (pathname, captured_at)'
  )
  await ensureIndex(
    db,
    'idx_pseo_page_signals_tag',
    'CREATE INDEX idx_pseo_page_signals_tag ON pseo_page_signals (category_slug, tag_slug, captured_at)'
  )
  await ensureIndex(
    db,
    'idx_creator_feedback_events_video',
    'CREATE INDEX idx_creator_feedback_events_video ON creator_feedback_events (video_id, created_at)'
  )
  await ensureIndex(
    db,
    'idx_price_value_snapshots_product_captured',
    'CREATE INDEX idx_price_value_snapshots_product_captured ON price_value_snapshots (product_id, captured_at)'
  )
  await ensureIndex(
    db,
    'idx_price_alerts_product_status',
    'CREATE INDEX idx_price_alerts_product_status ON price_alerts (product_id, status, updated_at)'
  )
  await ensureIndex(
    db,
    'idx_brand_policies_brand_slug',
    'CREATE INDEX idx_brand_policies_brand_slug ON brand_policies (brand_slug)'
  )
  await ensureIndex(
    db,
    'idx_compatibility_facts_brand_category',
    'CREATE INDEX idx_compatibility_facts_brand_category ON compatibility_facts (brand_slug, category, last_checked_at)'
  )
}

async function ensureNewsletterSubscriberSchema(db: DatabaseAdapter): Promise<void> {
  await ensureColumn(db, 'newsletter_subscribers', 'intent', "TEXT NOT NULL DEFAULT 'offers'")
  await ensureColumn(db, 'newsletter_subscribers', 'category_slug', 'TEXT')
  await ensureColumn(db, 'newsletter_subscribers', 'cadence', "TEXT NOT NULL DEFAULT 'weekly'")
  await ensureColumn(db, 'newsletter_subscribers', 'notes', 'TEXT')
  await ensureColumn(db, 'newsletter_subscribers', 'updated_at', 'TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP')

  if (db.type === 'postgres') {
    await db.exec("ALTER TABLE newsletter_subscribers ALTER COLUMN intent SET DEFAULT 'offers'")
  }

  await db.exec(
    `
      UPDATE newsletter_subscribers
      SET intent = 'offers'
      WHERE LOWER(TRIM(intent)) = 'deals'
    `
  )
}

async function ensureMerchantClickSchema(db: DatabaseAdapter): Promise<void> {
  await ensureColumn(db, 'merchant_click_events', 'visitor_id', 'TEXT')
  await ensureColumn(db, 'merchant_click_events', 'source', "TEXT NOT NULL DEFAULT 'site'")
  await ensureColumn(db, 'merchant_click_events', 'target_url', 'TEXT')
  await ensureColumn(db, 'merchant_click_events', 'referer', 'TEXT')
  await ensureColumn(db, 'merchant_click_events', 'user_agent', 'TEXT')
  await ensureColumn(db, 'merchant_click_events', 'created_at', 'TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP')
  await ensureIndex(
    db,
    'idx_merchant_click_events_product_created_at',
    'CREATE INDEX idx_merchant_click_events_product_created_at ON merchant_click_events (product_id, created_at)'
  )
  await ensureIndex(
    db,
    'idx_merchant_click_events_source_created_at',
    'CREATE INDEX idx_merchant_click_events_source_created_at ON merchant_click_events (source, created_at)'
  )
  await ensureIndex(
    db,
    'idx_merchant_click_events_visitor_created_at',
    'CREATE INDEX idx_merchant_click_events_visitor_created_at ON merchant_click_events (visitor_id, created_at)'
  )
}

async function ensureLinkInspectorSchema(db: DatabaseAdapter): Promise<void> {
  await ensureColumn(db, 'link_inspector_runs', 'status', "TEXT NOT NULL DEFAULT 'queued'")
  await ensureColumn(db, 'link_inspector_runs', 'total_checked', 'INTEGER NOT NULL DEFAULT 0')
  await ensureColumn(db, 'link_inspector_runs', 'issues_found', 'INTEGER NOT NULL DEFAULT 0')
  await ensureColumn(db, 'link_inspector_runs', 'broken_count', 'INTEGER NOT NULL DEFAULT 0')
  await ensureColumn(db, 'link_inspector_runs', 'out_of_stock_count', 'INTEGER NOT NULL DEFAULT 0')
  await ensureColumn(db, 'link_inspector_runs', 'payload_json', 'TEXT')
  await ensureColumn(db, 'link_inspector_runs', 'started_at', 'TEXT')
  await ensureColumn(db, 'link_inspector_runs', 'finished_at', 'TEXT')
  await ensureColumn(db, 'link_inspector_runs', 'created_at', 'TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP')
  await ensureColumn(db, 'link_inspector_results', 'product_id', 'INTEGER')
  await ensureColumn(db, 'link_inspector_results', 'product_name', 'TEXT')
  await ensureColumn(db, 'link_inspector_results', 'source_url', 'TEXT')
  await ensureColumn(db, 'link_inspector_results', 'final_url', 'TEXT')
  await ensureColumn(db, 'link_inspector_results', 'http_status', 'INTEGER')
  await ensureColumn(db, 'link_inspector_results', 'status', "TEXT NOT NULL DEFAULT 'ok'")
  await ensureColumn(db, 'link_inspector_results', 'issue_type', 'TEXT')
  await ensureColumn(db, 'link_inspector_results', 'issue_detail', 'TEXT')
  await ensureColumn(db, 'link_inspector_results', 'response_snippet', 'TEXT')
  await ensureColumn(db, 'link_inspector_results', 'checked_at', 'TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP')
  await ensureIndex(
    db,
    'idx_link_inspector_runs_created_at',
    'CREATE INDEX idx_link_inspector_runs_created_at ON link_inspector_runs (created_at, id)'
  )
  await ensureIndex(
    db,
    'idx_link_inspector_results_run_id',
    'CREATE INDEX idx_link_inspector_results_run_id ON link_inspector_results (run_id, status, issue_type)'
  )
  await ensureIndex(
    db,
    'idx_publish_events_event_type_created_at',
    'CREATE INDEX idx_publish_events_event_type_created_at ON publish_events (event_type, created_at)'
  )
}

async function ensureDecisionEventSchema(db: DatabaseAdapter): Promise<void> {
  await ensureColumn(db, 'buyer_decision_events', 'visitor_id', 'TEXT')
  await ensureColumn(db, 'buyer_decision_events', 'event_type', 'TEXT')
  await ensureColumn(db, 'buyer_decision_events', 'product_id', 'INTEGER')
  await ensureColumn(db, 'buyer_decision_events', 'source', "TEXT NOT NULL DEFAULT 'site'")
  await ensureColumn(db, 'buyer_decision_events', 'metadata_json', 'TEXT')
  await ensureColumn(db, 'buyer_decision_events', 'referer', 'TEXT')
  await ensureColumn(db, 'buyer_decision_events', 'user_agent', 'TEXT')
  await ensureColumn(db, 'buyer_decision_events', 'created_at', 'TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP')
  await ensureIndex(
    db,
    'idx_buyer_decision_events_event_created_at',
    'CREATE INDEX idx_buyer_decision_events_event_created_at ON buyer_decision_events (event_type, created_at)'
  )
  await ensureIndex(
    db,
    'idx_buyer_decision_events_visitor_event_created_at',
    'CREATE INDEX idx_buyer_decision_events_visitor_event_created_at ON buyer_decision_events (visitor_id, event_type, created_at)'
  )
  await ensureIndex(
    db,
    'idx_buyer_decision_events_source_created_at',
    'CREATE INDEX idx_buyer_decision_events_source_created_at ON buyer_decision_events (source, created_at)'
  )
}

export async function ensureSchema(db: DatabaseAdapter): Promise<void> {
  const statements = db.type === 'postgres' ? POSTGRES_SCHEMA : SQLITE_SCHEMA
  for (const statement of statements) {
    await db.exec(statement)
  }
  await ensureProductGraphSchema(db)
  await ensurePipelineRunSchema(db)
  await ensureLinkInspectorSchema(db)
  await ensureMerchantClickSchema(db)
  await ensureDecisionEventSchema(db)
  await ensureNewsletterSubscriberSchema(db)
}

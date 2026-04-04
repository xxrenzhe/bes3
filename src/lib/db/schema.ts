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
      intent TEXT NOT NULL DEFAULT 'deals',
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

async function ensureNewsletterSubscriberSchema(db: DatabaseAdapter): Promise<void> {
  await ensureColumn(db, 'newsletter_subscribers', 'intent', "TEXT NOT NULL DEFAULT 'deals'")
  await ensureColumn(db, 'newsletter_subscribers', 'category_slug', 'TEXT')
  await ensureColumn(db, 'newsletter_subscribers', 'cadence', "TEXT NOT NULL DEFAULT 'weekly'")
  await ensureColumn(db, 'newsletter_subscribers', 'notes', 'TEXT')
  await ensureColumn(db, 'newsletter_subscribers', 'updated_at', 'TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP')
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
  await ensurePipelineRunSchema(db)
  await ensureMerchantClickSchema(db)
  await ensureDecisionEventSchema(db)
  await ensureNewsletterSubscriberSchema(db)
}

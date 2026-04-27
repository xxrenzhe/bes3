CREATE TABLE IF NOT EXISTS product_scrape_tasks (
  id TEXT PRIMARY KEY,
  run_id INTEGER NOT NULL UNIQUE,
  affiliate_product_id INTEGER,
  product_id INTEGER,
  source_link TEXT NOT NULL,
  final_url TEXT,
  country_code TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  stage TEXT,
  progress INTEGER NOT NULL DEFAULT 0,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 2,
  proxy_country TEXT,
  proxy_used TEXT,
  browser_engine TEXT,
  http_status INTEGER,
  request_headers_json TEXT,
  redirect_chain_json TEXT,
  browser_signals_json TEXT,
  result_json TEXT,
  error_message TEXT,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (run_id) REFERENCES content_pipeline_runs(id) ON DELETE CASCADE,
  FOREIGN KEY (affiliate_product_id) REFERENCES affiliate_products(id) ON DELETE SET NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_product_scrape_tasks_status_updated
  ON product_scrape_tasks (status, updated_at);

CREATE INDEX IF NOT EXISTS idx_product_scrape_tasks_affiliate
  ON product_scrape_tasks (affiliate_product_id, status, updated_at);

CREATE INDEX IF NOT EXISTS idx_product_scrape_tasks_product
  ON product_scrape_tasks (product_id, status, updated_at);

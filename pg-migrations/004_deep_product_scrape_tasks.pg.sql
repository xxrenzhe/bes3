CREATE TABLE IF NOT EXISTS product_scrape_tasks (
  id TEXT PRIMARY KEY,
  run_id BIGINT NOT NULL UNIQUE,
  affiliate_product_id BIGINT,
  product_id BIGINT,
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
  request_headers_json JSONB,
  redirect_chain_json JSONB,
  browser_signals_json JSONB,
  result_json JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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

CREATE INDEX IF NOT EXISTS idx_product_scrape_tasks_browser_signals_json_gin
  ON product_scrape_tasks USING GIN (browser_signals_json);

CREATE INDEX IF NOT EXISTS idx_product_scrape_tasks_result_json_gin
  ON product_scrape_tasks USING GIN (result_json);

CREATE TABLE IF NOT EXISTS admin_login_attempts (
  id BIGSERIAL PRIMARY KEY,
  username_or_email TEXT NOT NULL,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  device_type TEXT,
  os TEXT,
  browser TEXT,
  success INTEGER NOT NULL DEFAULT 0,
  failure_reason TEXT,
  request_id TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_user_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token_hash TEXT NOT NULL UNIQUE,
  jwt_id TEXT,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  device_fingerprint TEXT,
  is_suspicious INTEGER NOT NULL DEFAULT 0,
  suspicious_reason TEXT,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_security_events (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  ip_address TEXT,
  user_agent TEXT,
  metadata_json JSONB,
  request_id TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_role_permissions (
  id BIGSERIAL PRIMARY KEY,
  role TEXT NOT NULL,
  permission TEXT NOT NULL,
  allowed INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(role, permission)
);

CREATE TABLE IF NOT EXISTS admin_password_history (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  actor_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  before_json JSONB,
  after_json JSONB,
  reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  request_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_import_runs (
  id BIGSERIAL PRIMARY KEY,
  actor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  import_type TEXT NOT NULL,
  source_filename TEXT,
  dry_run INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'queued',
  total_rows INTEGER NOT NULL DEFAULT 0,
  created_rows INTEGER NOT NULL DEFAULT 0,
  updated_rows INTEGER NOT NULL DEFAULT 0,
  skipped_rows INTEGER NOT NULL DEFAULT 0,
  conflict_rows INTEGER NOT NULL DEFAULT 0,
  error_json JSONB,
  result_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS admin_risk_alerts (
  id BIGSERIAL PRIMARY KEY,
  risk_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  entity_type TEXT,
  entity_id TEXT,
  title TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  details_json JSONB,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_saved_views (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  view_key TEXT NOT NULL,
  name TEXT NOT NULL,
  filters_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, view_key, name)
);

CREATE TABLE IF NOT EXISTS prompt_regression_cases (
  id BIGSERIAL PRIMARY KEY,
  prompt_id TEXT NOT NULL,
  name TEXT NOT NULL,
  input_json JSONB NOT NULL,
  expected_output_json JSONB,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evidence_review_decisions (
  id BIGSERIAL PRIMARY KEY,
  analysis_report_id BIGINT REFERENCES analysis_reports(id) ON DELETE SET NULL,
  video_id BIGINT REFERENCES review_videos(id) ON DELETE SET NULL,
  product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
  reviewer_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  decision TEXT NOT NULL,
  before_json JSONB,
  after_json JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS worker_heartbeats (
  id BIGSERIAL PRIMARY KEY,
  worker_id TEXT NOT NULL UNIQUE,
  worker_type TEXT NOT NULL DEFAULT 'pipeline',
  hostname TEXT,
  pid INTEGER,
  status TEXT NOT NULL DEFAULT 'starting',
  current_run_id BIGINT REFERENCES content_pipeline_runs(id) ON DELETE SET NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata_json JSONB
);

CREATE TABLE IF NOT EXISTS pipeline_queue_config (
  id BIGSERIAL PRIMARY KEY,
  task_type TEXT NOT NULL UNIQUE,
  enabled INTEGER NOT NULL DEFAULT 1,
  priority INTEGER NOT NULL DEFAULT 100,
  max_concurrency INTEGER NOT NULL DEFAULT 1,
  timeout_seconds INTEGER NOT NULL DEFAULT 1800,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  backoff_policy_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_username_attempted ON admin_login_attempts (username_or_email, attempted_at);
CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_ip_attempted ON admin_login_attempts (ip_address, attempted_at);
CREATE INDEX IF NOT EXISTS idx_admin_user_sessions_user_active ON admin_user_sessions (user_id, revoked_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_user_sessions_token_hash ON admin_user_sessions (session_token_hash);
CREATE INDEX IF NOT EXISTS idx_admin_security_events_user_created ON admin_security_events (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_admin_security_events_metadata_json_gin ON admin_security_events USING GIN (metadata_json);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_entity_created ON admin_audit_logs (entity_type, entity_id, created_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_after_json_gin ON admin_audit_logs USING GIN (after_json);
CREATE INDEX IF NOT EXISTS idx_admin_risk_alerts_status_severity ON admin_risk_alerts (status, severity, detected_at);
CREATE INDEX IF NOT EXISTS idx_admin_risk_alerts_details_json_gin ON admin_risk_alerts USING GIN (details_json);
CREATE INDEX IF NOT EXISTS idx_worker_heartbeats_seen ON worker_heartbeats (worker_type, status, last_seen_at);
CREATE INDEX IF NOT EXISTS idx_worker_heartbeats_metadata_json_gin ON worker_heartbeats USING GIN (metadata_json);
CREATE INDEX IF NOT EXISTS idx_pipeline_queue_config_enabled ON pipeline_queue_config (enabled, priority, task_type);

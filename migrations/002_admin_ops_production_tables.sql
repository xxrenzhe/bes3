CREATE TABLE IF NOT EXISTS admin_login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username_or_email TEXT NOT NULL,
  user_id INTEGER,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  device_type TEXT,
  os TEXT,
  browser TEXT,
  success INTEGER NOT NULL DEFAULT 0,
  failure_reason TEXT,
  request_id TEXT,
  attempted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS admin_user_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  session_token_hash TEXT NOT NULL UNIQUE,
  jwt_id TEXT,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  device_fingerprint TEXT,
  is_suspicious INTEGER NOT NULL DEFAULT 0,
  suspicious_reason TEXT,
  last_activity_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS admin_security_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  ip_address TEXT,
  user_agent TEXT,
  metadata_json TEXT,
  request_id TEXT,
  resolved_at TEXT,
  resolved_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS admin_role_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL,
  permission TEXT NOT NULL,
  allowed INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role, permission)
);

CREATE TABLE IF NOT EXISTS admin_password_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id INTEGER,
  actor_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  before_json TEXT,
  after_json TEXT,
  reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  request_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS admin_import_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id INTEGER,
  import_type TEXT NOT NULL,
  source_filename TEXT,
  dry_run INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'queued',
  total_rows INTEGER NOT NULL DEFAULT 0,
  created_rows INTEGER NOT NULL DEFAULT 0,
  updated_rows INTEGER NOT NULL DEFAULT 0,
  skipped_rows INTEGER NOT NULL DEFAULT 0,
  conflict_rows INTEGER NOT NULL DEFAULT 0,
  error_json TEXT,
  result_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS admin_risk_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  risk_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  entity_type TEXT,
  entity_id TEXT,
  title TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  details_json TEXT,
  detected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT,
  resolved_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS admin_saved_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  view_key TEXT NOT NULL,
  name TEXT NOT NULL,
  filters_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, view_key, name)
);

CREATE TABLE IF NOT EXISTS prompt_regression_cases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prompt_id TEXT NOT NULL,
  name TEXT NOT NULL,
  input_json TEXT NOT NULL,
  expected_output_json TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS evidence_review_decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  analysis_report_id INTEGER,
  video_id INTEGER,
  product_id INTEGER,
  reviewer_id INTEGER,
  decision TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (analysis_report_id) REFERENCES analysis_reports(id) ON DELETE SET NULL,
  FOREIGN KEY (video_id) REFERENCES review_videos(id) ON DELETE SET NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS worker_heartbeats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  worker_id TEXT NOT NULL UNIQUE,
  worker_type TEXT NOT NULL DEFAULT 'pipeline',
  hostname TEXT,
  pid INTEGER,
  status TEXT NOT NULL DEFAULT 'starting',
  current_run_id INTEGER,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata_json TEXT,
  FOREIGN KEY (current_run_id) REFERENCES content_pipeline_runs(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS pipeline_queue_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_type TEXT NOT NULL UNIQUE,
  enabled INTEGER NOT NULL DEFAULT 1,
  priority INTEGER NOT NULL DEFAULT 100,
  max_concurrency INTEGER NOT NULL DEFAULT 1,
  timeout_seconds INTEGER NOT NULL DEFAULT 1800,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  backoff_policy_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_username_attempted ON admin_login_attempts (username_or_email, attempted_at);
CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_ip_attempted ON admin_login_attempts (ip_address, attempted_at);
CREATE INDEX IF NOT EXISTS idx_admin_user_sessions_user_active ON admin_user_sessions (user_id, revoked_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_user_sessions_token_hash ON admin_user_sessions (session_token_hash);
CREATE INDEX IF NOT EXISTS idx_admin_security_events_user_created ON admin_security_events (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_entity_created ON admin_audit_logs (entity_type, entity_id, created_at);
CREATE INDEX IF NOT EXISTS idx_admin_risk_alerts_status_severity ON admin_risk_alerts (status, severity, detected_at);
CREATE INDEX IF NOT EXISTS idx_worker_heartbeats_seen ON worker_heartbeats (worker_type, status, last_seen_at);
CREATE INDEX IF NOT EXISTS idx_pipeline_queue_config_enabled ON pipeline_queue_config (enabled, priority, task_type);

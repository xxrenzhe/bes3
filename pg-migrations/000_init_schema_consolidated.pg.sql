CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      display_name TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      must_change_password INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    , failed_login_count INTEGER NOT NULL DEFAULT 0, locked_until TIMESTAMPTZ, last_failed_login TIMESTAMPTZ, last_login_at TIMESTAMPTZ);

CREATE TABLE IF NOT EXISTS sessions (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS admin_login_attempts (
      id BIGSERIAL PRIMARY KEY,
      username_or_email TEXT NOT NULL,
      user_id BIGINT,
      ip_address TEXT NOT NULL,
      user_agent TEXT,
      device_type TEXT,
      os TEXT,
      browser TEXT,
      success INTEGER NOT NULL DEFAULT 0,
      failure_reason TEXT,
      request_id TEXT,
      attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

CREATE TABLE IF NOT EXISTS admin_user_sessions (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL,
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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS admin_security_events (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT,
      event_type TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'info',
      ip_address TEXT,
      user_agent TEXT,
      metadata_json JSONB,
      request_id TEXT,
      resolved_at TIMESTAMPTZ,
      resolved_by INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
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
      user_id BIGINT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id BIGSERIAL PRIMARY KEY,
      actor_id BIGINT,
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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
    );

CREATE TABLE IF NOT EXISTS admin_import_runs (
      id BIGSERIAL PRIMARY KEY,
      actor_id BIGINT,
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
      finished_at TIMESTAMPTZ,
      FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
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
      resolved_by INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
    );

CREATE TABLE IF NOT EXISTS admin_saved_views (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT,
      view_key TEXT NOT NULL,
      name TEXT NOT NULL,
      filters_json JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, view_key, name)
    );

CREATE TABLE IF NOT EXISTS system_settings (
      id BIGSERIAL PRIMARY KEY,
      category TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT,
      data_type TEXT NOT NULL DEFAULT 'string',
      is_sensitive INTEGER NOT NULL DEFAULT 0,
      description TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(category, key)
    );

CREATE TABLE IF NOT EXISTS prompt_versions (
      id BIGSERIAL PRIMARY KEY,
      prompt_id TEXT NOT NULL,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      version TEXT NOT NULL,
      prompt_content TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 0,
      change_notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(prompt_id, version)
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

CREATE TABLE IF NOT EXISTS affiliate_products (
      id BIGSERIAL PRIMARY KEY,
      platform TEXT NOT NULL,
      external_id TEXT NOT NULL,
      merchant_id TEXT,
      asin TEXT,
      brand TEXT,
      product_model TEXT,
      model_number TEXT,
      product_type TEXT,
      category TEXT,
      category_slug TEXT,
      product_name TEXT,
      product_url TEXT,
      promo_link TEXT,
      short_promo_link TEXT,
      image_url TEXT,
      price_amount DOUBLE PRECISION,
      price_currency TEXT,
      commission_rate DOUBLE PRECISION,
      review_count INTEGER,
      rating DOUBLE PRECISION,
      country_code TEXT,
      youtube_match_terms_json JSONB,
      raw_payload JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(platform, external_id)
    );

CREATE TABLE IF NOT EXISTS products (
      id BIGSERIAL PRIMARY KEY,
      affiliate_product_id BIGINT,
      source_platform TEXT NOT NULL,
      source_affiliate_link TEXT NOT NULL,
      resolved_url TEXT,
      canonical_url TEXT,
      slug TEXT UNIQUE,
      brand TEXT,
      product_model TEXT,
      model_number TEXT,
      product_type TEXT,
      category_slug TEXT,
      product_name TEXT NOT NULL,
      category TEXT,
      description TEXT,
      price_amount DOUBLE PRECISION,
      price_currency TEXT,
      current_price DOUBLE PRECISION,
      hist_low_price DOUBLE PRECISION,
      avg_90d_price DOUBLE PRECISION,
      price_status TEXT,
      rating DOUBLE PRECISION,
      review_count INTEGER,
      youtube_match_terms_json JSONB,
      specs_json JSONB,
      review_highlights_json JSONB,
      source_payload_json JSONB,
      published_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), price_last_checked_at TIMESTAMPTZ, offer_last_checked_at TIMESTAMPTZ, attribute_completeness_score DOUBLE PRECISION NOT NULL DEFAULT 0, data_confidence_score DOUBLE PRECISION NOT NULL DEFAULT 0, source_count INTEGER NOT NULL DEFAULT 0, asin TEXT,
      FOREIGN KEY (affiliate_product_id) REFERENCES affiliate_products(id) ON DELETE SET NULL
    );

CREATE TABLE IF NOT EXISTS hardcore_categories (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      icon_url TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      meta_config_json JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS affiliate_links (
      id BIGSERIAL PRIMARY KEY,
      product_id BIGINT NOT NULL,
      platform TEXT NOT NULL,
      affiliate_url TEXT NOT NULL,
      original_url TEXT,
      country_code TEXT,
      commission_rate DOUBLE PRECISION,
      status TEXT NOT NULL DEFAULT 'active',
      last_verified TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE(product_id, platform, country_code)
    );

CREATE TABLE IF NOT EXISTS taxonomy_tags (
      id BIGSERIAL PRIMARY KEY,
      category_id BIGINT,
      category_slug TEXT NOT NULL,
      canonical_name TEXT NOT NULL,
      slug TEXT NOT NULL,
      keywords_json JSONB,
      search_volume INTEGER NOT NULL DEFAULT 0,
      is_core_painpoint INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (category_id) REFERENCES hardcore_categories(id) ON DELETE SET NULL,
      UNIQUE(category_slug, slug)
    );

CREATE TABLE IF NOT EXISTS review_videos (
      id BIGSERIAL PRIMARY KEY,
      youtube_id TEXT NOT NULL UNIQUE,
      channel_name TEXT NOT NULL,
      channel_url TEXT,
      blogger_rank DOUBLE PRECISION NOT NULL DEFAULT 1,
      authority_tier TEXT NOT NULL DEFAULT 'general',
      title TEXT NOT NULL,
      video_type TEXT NOT NULL DEFAULT 'long-form',
      transcript TEXT,
      description TEXT,
      processed_status TEXT NOT NULL DEFAULT 'pending',
      published_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    , entity_match_json JSONB);

CREATE TABLE IF NOT EXISTS analysis_reports (
      id BIGSERIAL PRIMARY KEY,
      product_id BIGINT NOT NULL,
      video_id BIGINT NOT NULL,
      tag_id BIGINT NOT NULL,
      rating TEXT NOT NULL,
      evidence_quote TEXT NOT NULL,
      timestamp_seconds INTEGER,
      context_snippet TEXT,
      evidence_confidence DOUBLE PRECISION NOT NULL DEFAULT 1,
      evidence_type TEXT NOT NULL DEFAULT 'standard-review',
      is_advertorial INTEGER NOT NULL DEFAULT 0,
      quality_flags_json JSONB,
      unexpected_usecase TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (video_id) REFERENCES review_videos(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES taxonomy_tags(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS site_search_logs (
      id BIGSERIAL PRIMARY KEY,
      query_text TEXT NOT NULL UNIQUE,
      hit_count INTEGER NOT NULL DEFAULT 1,
      matched_tag_id BIGINT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (matched_tag_id) REFERENCES taxonomy_tags(id) ON DELETE SET NULL
    );

CREATE TABLE IF NOT EXISTS taxonomy_intent_sources (
      id BIGSERIAL PRIMARY KEY,
      category_slug TEXT NOT NULL,
      source_type TEXT NOT NULL,
      raw_query TEXT NOT NULL,
      normalized_query TEXT NOT NULL,
      search_volume INTEGER NOT NULL DEFAULT 0,
      competition TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(category_slug, source_type, normalized_query)
    );

CREATE TABLE IF NOT EXISTS pending_tags (
      id BIGSERIAL PRIMARY KEY,
      category_slug TEXT NOT NULL,
      canonical_name TEXT NOT NULL,
      slug TEXT NOT NULL,
      trigger_query TEXT NOT NULL,
      hit_count INTEGER NOT NULL DEFAULT 1,
      source TEXT NOT NULL DEFAULT 'site_search',
      status TEXT NOT NULL DEFAULT 'pending',
      priority_score DOUBLE PRECISION NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(category_slug, slug)
    );

CREATE TABLE IF NOT EXISTS taxonomy_rescan_queue (
      id BIGSERIAL PRIMARY KEY,
      category_slug TEXT NOT NULL,
      tag_slug TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS pseo_page_signals (
      id BIGSERIAL PRIMARY KEY,
      pathname TEXT NOT NULL,
      category_slug TEXT,
      tag_slug TEXT,
      impressions INTEGER NOT NULL DEFAULT 0,
      clicks INTEGER NOT NULL DEFAULT 0,
      ctr DOUBLE PRECISION NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT 'ga4',
      captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS creator_feedback_events (
      id BIGSERIAL PRIMARY KEY,
      analysis_report_id BIGINT,
      video_id BIGINT,
      feedback_type TEXT NOT NULL,
      weight_delta DOUBLE PRECISION NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (analysis_report_id) REFERENCES analysis_reports(id) ON DELETE SET NULL,
      FOREIGN KEY (video_id) REFERENCES review_videos(id) ON DELETE SET NULL
    );

CREATE TABLE IF NOT EXISTS evidence_review_decisions (
      id BIGSERIAL PRIMARY KEY,
      analysis_report_id BIGINT,
      video_id BIGINT,
      product_id BIGINT,
      reviewer_id BIGINT,
      decision TEXT NOT NULL,
      before_json JSONB,
      after_json JSONB,
      reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (analysis_report_id) REFERENCES analysis_reports(id) ON DELETE SET NULL,
      FOREIGN KEY (video_id) REFERENCES review_videos(id) ON DELETE SET NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
      FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL
    );

CREATE TABLE IF NOT EXISTS price_value_snapshots (
      id BIGSERIAL PRIMARY KEY,
      product_id BIGINT NOT NULL,
      current_price DOUBLE PRECISION,
      hist_low_price DOUBLE PRECISION,
      avg_90d_price DOUBLE PRECISION,
      consensus_score DOUBLE PRECISION,
      value_score DOUBLE PRECISION,
      entry_status TEXT NOT NULL DEFAULT 'unknown',
      source TEXT NOT NULL DEFAULT 'affiliate',
      captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS price_alerts (
      id BIGSERIAL PRIMARY KEY,
      product_id BIGINT NOT NULL,
      email TEXT NOT NULL,
      target_price DOUBLE PRECISION,
      target_value_score DOUBLE PRECISION,
      status TEXT NOT NULL DEFAULT 'active',
      last_notified_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE(product_id, email)
    );

CREATE TABLE IF NOT EXISTS price_alert_notifications (
      id BIGSERIAL PRIMARY KEY,
      price_alert_id BIGINT NOT NULL,
      product_id BIGINT NOT NULL,
      email TEXT NOT NULL,
      channel TEXT NOT NULL DEFAULT 'email',
      status TEXT NOT NULL DEFAULT 'queued',
      dedupe_key TEXT NOT NULL UNIQUE,
      payload_json JSONB,
      error_message TEXT,
      queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (price_alert_id) REFERENCES price_alerts(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS product_media_assets (
      id BIGSERIAL PRIMARY KEY,
      product_id BIGINT NOT NULL,
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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS merchants (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      website_url TEXT,
      country_code TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS product_offers (
      id BIGSERIAL PRIMARY KEY,
      product_id BIGINT NOT NULL,
      merchant_id BIGINT,
      offer_url TEXT NOT NULL,
      merchant_sku TEXT,
      availability_status TEXT,
      price_amount DOUBLE PRECISION,
      price_currency TEXT,
      shipping_cost DOUBLE PRECISION,
      coupon_text TEXT,
      coupon_type TEXT,
      reference_price_amount DOUBLE PRECISION,
      reference_price_currency TEXT,
      reference_price_type TEXT,
      reference_price_source TEXT,
      reference_price_last_checked_at TIMESTAMPTZ,
      condition_label TEXT,
      source_type TEXT NOT NULL DEFAULT 'scrape',
      source_url TEXT,
      confidence_score DOUBLE PRECISION NOT NULL DEFAULT 0.7,
      raw_payload_json TEXT,
      last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE SET NULL,
      UNIQUE(product_id, offer_url)
    );

CREATE TABLE IF NOT EXISTS product_price_history (
      id BIGSERIAL PRIMARY KEY,
      product_id BIGINT NOT NULL,
      product_offer_id BIGINT,
      price_amount DOUBLE PRECISION,
      price_currency TEXT,
      availability_status TEXT,
      captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (product_offer_id) REFERENCES product_offers(id) ON DELETE SET NULL
    );

CREATE TABLE IF NOT EXISTS product_attribute_facts (
      id BIGSERIAL PRIMARY KEY,
      product_id BIGINT NOT NULL,
      attribute_key TEXT NOT NULL,
      attribute_label TEXT NOT NULL,
      attribute_value TEXT NOT NULL,
      source_url TEXT,
      source_type TEXT NOT NULL DEFAULT 'scrape',
      confidence_score DOUBLE PRECISION NOT NULL DEFAULT 0.7,
      is_verified INTEGER NOT NULL DEFAULT 0,
      last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS brand_policies (
      id BIGSERIAL PRIMARY KEY,
      brand_name TEXT NOT NULL,
      brand_slug TEXT NOT NULL UNIQUE,
      shipping_policy TEXT,
      return_policy TEXT,
      warranty_policy TEXT,
      discount_window TEXT,
      support_policy TEXT,
      source_url TEXT,
      source_type TEXT NOT NULL DEFAULT 'editorial',
      confidence_score DOUBLE PRECISION NOT NULL DEFAULT 0.8,
      last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS compatibility_facts (
      id BIGSERIAL PRIMARY KEY,
      brand_name TEXT NOT NULL,
      brand_slug TEXT NOT NULL,
      category TEXT,
      fact_type TEXT NOT NULL,
      fact_label TEXT NOT NULL,
      fact_value TEXT NOT NULL,
      source_url TEXT,
      source_type TEXT NOT NULL DEFAULT 'editorial',
      confidence_score DOUBLE PRECISION NOT NULL DEFAULT 0.8,
      is_verified INTEGER NOT NULL DEFAULT 0,
      last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(brand_slug, category, fact_label, fact_value)
    );

CREATE TABLE IF NOT EXISTS keyword_opportunities (
      id BIGSERIAL PRIMARY KEY,
      product_id BIGINT NOT NULL,
      keyword TEXT NOT NULL,
      buyer_intent DOUBLE PRECISION NOT NULL,
      serp_weakness DOUBLE PRECISION NOT NULL,
      commission_potential DOUBLE PRECISION NOT NULL,
      content_fit DOUBLE PRECISION NOT NULL,
      freshness DOUBLE PRECISION NOT NULL,
      total_score DOUBLE PRECISION NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS content_pipeline_runs (
      id BIGSERIAL PRIMARY KEY,
      product_id BIGINT,
      affiliate_product_id BIGINT,
      source_link TEXT NOT NULL,
      run_type TEXT NOT NULL DEFAULT 'fullPipeline',
      requested_action TEXT,
      worker_id TEXT,
      locked_at TIMESTAMPTZ,
      started_at TIMESTAMPTZ,
      finished_at TIMESTAMPTZ,
      attempt_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'queued',
      current_stage TEXT,
      error_message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    , priority INTEGER NOT NULL DEFAULT 100, scheduled_at TIMESTAMPTZ, locked_by TEXT, lock_expires_at TIMESTAMPTZ, last_heartbeat_at TIMESTAMPTZ, cancel_requested_at TIMESTAMPTZ, payload_json JSONB);

CREATE TABLE IF NOT EXISTS content_pipeline_jobs (
      id BIGSERIAL PRIMARY KEY,
      run_id BIGINT NOT NULL,
      stage TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      message TEXT,
      payload_json JSONB,
      started_at TIMESTAMPTZ,
      finished_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (run_id) REFERENCES content_pipeline_runs(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS worker_heartbeats (
      id BIGSERIAL PRIMARY KEY,
      worker_id TEXT NOT NULL UNIQUE,
      worker_type TEXT NOT NULL DEFAULT 'pipeline',
      hostname TEXT,
      pid INTEGER,
      status TEXT NOT NULL DEFAULT 'starting',
      current_run_id BIGINT,
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      metadata_json JSONB,
      FOREIGN KEY (current_run_id) REFERENCES content_pipeline_runs(id) ON DELETE SET NULL
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

CREATE TABLE IF NOT EXISTS articles (
      id BIGSERIAL PRIMARY KEY,
      product_id BIGINT,
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
      schema_json JSONB,
      status TEXT NOT NULL DEFAULT 'draft',
      published_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    );

CREATE TABLE IF NOT EXISTS seo_pages (
      id BIGSERIAL PRIMARY KEY,
      article_id BIGINT,
      page_type TEXT NOT NULL,
      pathname TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      meta_description TEXT NOT NULL,
      canonical_url TEXT,
      open_graph_json JSONB,
      schema_json JSONB,
      status TEXT NOT NULL DEFAULT 'draft',
      published_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS publish_events (
      id BIGSERIAL PRIMARY KEY,
      seo_page_id BIGINT,
      event_type TEXT NOT NULL,
      status TEXT NOT NULL,
      payload_json JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS link_inspector_runs (
      id BIGSERIAL PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'queued',
      total_checked INTEGER NOT NULL DEFAULT 0,
      issues_found INTEGER NOT NULL DEFAULT 0,
      broken_count INTEGER NOT NULL DEFAULT 0,
      out_of_stock_count INTEGER NOT NULL DEFAULT 0,
      payload_json JSONB,
      started_at TIMESTAMPTZ,
      finished_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS link_inspector_results (
      id BIGSERIAL PRIMARY KEY,
      run_id BIGINT NOT NULL,
      product_id BIGINT,
      product_name TEXT,
      source_url TEXT NOT NULL,
      final_url TEXT,
      http_status INTEGER,
      status TEXT NOT NULL DEFAULT 'ok',
      issue_type TEXT,
      issue_detail TEXT,
      response_snippet TEXT,
      checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (run_id) REFERENCES link_inspector_runs(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    );

CREATE TABLE IF NOT EXISTS merchant_click_events (
      id BIGSERIAL PRIMARY KEY,
      product_id BIGINT NOT NULL,
      visitor_id TEXT,
      source TEXT NOT NULL DEFAULT 'site',
      target_url TEXT NOT NULL,
      referer TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS buyer_decision_events (
      id BIGSERIAL PRIMARY KEY,
      visitor_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      product_id BIGINT,
      source TEXT NOT NULL DEFAULT 'site',
      metadata_json JSONB,
      referer TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    );

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id BIGSERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      source TEXT NOT NULL DEFAULT 'site',
      intent TEXT NOT NULL DEFAULT 'offers',
      category_slug TEXT,
      cadence TEXT NOT NULL DEFAULT 'weekly',
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_ip_attempted ON admin_login_attempts (ip_address, attempted_at);

CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_success_attempted ON admin_login_attempts (success, attempted_at);

CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_username_attempted ON admin_login_attempts (username_or_email, attempted_at);

CREATE INDEX IF NOT EXISTS idx_admin_user_sessions_device ON admin_user_sessions (device_fingerprint, last_activity_at);

CREATE INDEX IF NOT EXISTS idx_admin_user_sessions_token_hash ON admin_user_sessions (session_token_hash);

CREATE INDEX IF NOT EXISTS idx_admin_user_sessions_user_active ON admin_user_sessions (user_id, revoked_at, expires_at);

CREATE INDEX IF NOT EXISTS idx_admin_security_events_type_created ON admin_security_events (event_type, created_at);

CREATE INDEX IF NOT EXISTS idx_admin_security_events_user_created ON admin_security_events (user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor_created ON admin_audit_logs (actor_id, created_at);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_entity_created ON admin_audit_logs (entity_type, entity_id, created_at);

CREATE INDEX IF NOT EXISTS idx_admin_import_runs_type_status ON admin_import_runs (import_type, status, created_at);

CREATE INDEX IF NOT EXISTS idx_admin_risk_alerts_status_severity ON admin_risk_alerts (status, severity, detected_at);

CREATE INDEX IF NOT EXISTS idx_prompt_regression_cases_prompt ON prompt_regression_cases (prompt_id, status);

CREATE INDEX IF NOT EXISTS idx_affiliate_products_identity ON affiliate_products (platform, brand, product_model, model_number, category_slug);

CREATE INDEX IF NOT EXISTS idx_products_hardcore_category_price ON products (category, current_price, avg_90d_price);

CREATE INDEX IF NOT EXISTS idx_products_identity_video_match ON products (brand, product_model, model_number, category_slug);

CREATE INDEX IF NOT EXISTS idx_products_offer_last_checked_at ON products (offer_last_checked_at, updated_at);

CREATE INDEX IF NOT EXISTS idx_affiliate_links_product_status ON affiliate_links (product_id, status, last_verified);

CREATE INDEX IF NOT EXISTS idx_taxonomy_tags_category_core ON taxonomy_tags (category_slug, is_core_painpoint, search_volume);

CREATE INDEX IF NOT EXISTS idx_analysis_reports_product_tag ON analysis_reports (product_id, tag_id, created_at);

CREATE INDEX IF NOT EXISTS idx_analysis_reports_tag_rating ON analysis_reports (tag_id, rating, is_advertorial);

CREATE INDEX IF NOT EXISTS idx_taxonomy_intent_sources_category_status ON taxonomy_intent_sources (category_slug, status, search_volume);

CREATE INDEX IF NOT EXISTS idx_pending_tags_status_priority ON pending_tags (status, priority_score, updated_at);

CREATE INDEX IF NOT EXISTS idx_taxonomy_rescan_queue_status ON taxonomy_rescan_queue (status, category_slug, created_at);

CREATE INDEX IF NOT EXISTS idx_pseo_page_signals_path_captured ON pseo_page_signals (pathname, captured_at);

CREATE INDEX IF NOT EXISTS idx_pseo_page_signals_tag ON pseo_page_signals (category_slug, tag_slug, captured_at);

CREATE INDEX IF NOT EXISTS idx_creator_feedback_events_video ON creator_feedback_events (video_id, created_at);

CREATE INDEX IF NOT EXISTS idx_evidence_review_decisions_report ON evidence_review_decisions (analysis_report_id, created_at);

CREATE INDEX IF NOT EXISTS idx_price_value_snapshots_product_captured ON price_value_snapshots (product_id, captured_at);

CREATE INDEX IF NOT EXISTS idx_price_alerts_product_status ON price_alerts (product_id, status, updated_at);

CREATE INDEX IF NOT EXISTS idx_price_alert_notifications_alert ON price_alert_notifications (price_alert_id, status, queued_at);

CREATE INDEX IF NOT EXISTS idx_price_alert_notifications_status ON price_alert_notifications (status, queued_at, id);

CREATE INDEX IF NOT EXISTS idx_product_offers_merchant_product ON product_offers (merchant_id, product_id);

CREATE INDEX IF NOT EXISTS idx_product_offers_product_checked_price ON product_offers (product_id, last_checked_at, price_amount);

CREATE INDEX IF NOT EXISTS idx_product_price_history_product_captured_at ON product_price_history (product_id, captured_at);

CREATE INDEX IF NOT EXISTS idx_product_attribute_facts_product_key ON product_attribute_facts (product_id, attribute_key, last_checked_at);

CREATE INDEX IF NOT EXISTS idx_brand_policies_brand_slug ON brand_policies (brand_slug);

CREATE INDEX IF NOT EXISTS idx_compatibility_facts_brand_category ON compatibility_facts (brand_slug, category, last_checked_at);

CREATE INDEX IF NOT EXISTS idx_content_pipeline_runs_claimable ON content_pipeline_runs (status, priority, scheduled_at, created_at);

CREATE INDEX IF NOT EXISTS idx_content_pipeline_runs_product_status ON content_pipeline_runs (product_id, status, updated_at);

CREATE INDEX IF NOT EXISTS idx_content_pipeline_runs_status_created_at ON content_pipeline_runs (status, created_at, id);

CREATE INDEX IF NOT EXISTS idx_content_pipeline_runs_worker_lock ON content_pipeline_runs (worker_id, locked_at, lock_expires_at);

CREATE INDEX IF NOT EXISTS idx_worker_heartbeats_seen ON worker_heartbeats (worker_type, status, last_seen_at);

CREATE INDEX IF NOT EXISTS idx_pipeline_queue_config_enabled ON pipeline_queue_config (enabled, priority, task_type);

CREATE INDEX IF NOT EXISTS idx_publish_events_event_type_created_at ON publish_events (event_type, created_at);

CREATE INDEX IF NOT EXISTS idx_link_inspector_runs_created_at ON link_inspector_runs (created_at, id);

CREATE INDEX IF NOT EXISTS idx_link_inspector_results_run_id ON link_inspector_results (run_id, status, issue_type);

CREATE INDEX IF NOT EXISTS idx_merchant_click_events_product_created_at ON merchant_click_events (product_id, created_at);

CREATE INDEX IF NOT EXISTS idx_merchant_click_events_source_created_at ON merchant_click_events (source, created_at);

CREATE INDEX IF NOT EXISTS idx_merchant_click_events_visitor_created_at ON merchant_click_events (visitor_id, created_at);

CREATE INDEX IF NOT EXISTS idx_buyer_decision_events_event_created_at ON buyer_decision_events (event_type, created_at);

CREATE INDEX IF NOT EXISTS idx_buyer_decision_events_source_created_at ON buyer_decision_events (source, created_at);

CREATE INDEX IF NOT EXISTS idx_buyer_decision_events_visitor_event_created_at ON buyer_decision_events (visitor_id, event_type, created_at);

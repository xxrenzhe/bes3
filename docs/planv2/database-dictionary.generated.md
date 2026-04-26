# Bes3 Database Dictionary

Generated at: 2026-04-26T17:32:03.463Z

| Table | Columns | Indexes |
| --- | ---: | ---: |
| `users` | 14 | 0 |
| `sessions` | 5 | 0 |
| `admin_login_attempts` | 12 | 3 |
| `admin_user_sessions` | 13 | 3 |
| `admin_security_events` | 11 | 2 |
| `admin_role_permissions` | 6 | 0 |
| `admin_password_history` | 4 | 0 |
| `admin_audit_logs` | 13 | 2 |
| `admin_import_runs` | 15 | 1 |
| `admin_risk_alerts` | 14 | 1 |
| `admin_saved_views` | 7 | 0 |
| `system_settings` | 9 | 0 |
| `prompt_versions` | 9 | 0 |
| `prompt_regression_cases` | 8 | 1 |
| `affiliate_products` | 20 | 0 |
| `products` | 31 | 2 |
| `hardcore_categories` | 8 | 0 |
| `affiliate_links` | 11 | 1 |
| `taxonomy_tags` | 11 | 1 |
| `review_videos` | 15 | 0 |
| `analysis_reports` | 14 | 2 |
| `site_search_logs` | 7 | 0 |
| `taxonomy_intent_sources` | 10 | 1 |
| `pending_tags` | 11 | 1 |
| `taxonomy_rescan_queue` | 7 | 1 |
| `pseo_page_signals` | 10 | 2 |
| `creator_feedback_events` | 6 | 1 |
| `evidence_review_decisions` | 10 | 1 |
| `price_value_snapshots` | 10 | 1 |
| `price_alerts` | 9 | 1 |
| `price_alert_notifications` | 13 | 2 |
| `product_media_assets` | 13 | 0 |
| `merchants` | 7 | 0 |
| `product_offers` | 24 | 2 |
| `product_price_history` | 7 | 1 |
| `product_attribute_facts` | 12 | 1 |
| `brand_policies` | 14 | 1 |
| `compatibility_facts` | 14 | 1 |
| `keyword_opportunities` | 10 | 0 |
| `content_pipeline_runs` | 23 | 4 |
| `content_pipeline_jobs` | 9 | 0 |
| `worker_heartbeats` | 10 | 1 |
| `pipeline_queue_config` | 10 | 1 |
| `articles` | 17 | 0 |
| `seo_pages` | 13 | 0 |
| `publish_events` | 6 | 1 |
| `link_inspector_runs` | 10 | 1 |
| `link_inspector_results` | 12 | 1 |
| `merchant_click_events` | 8 | 3 |
| `buyer_decision_events` | 9 | 3 |
| `newsletter_subscribers` | 9 | 0 |

## users

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `username` | `TEXT` | yes | `` | no |
| `email` | `TEXT` | yes | `` | no |
| `password_hash` | `TEXT` | yes | `` | no |
| `role` | `TEXT` | yes | `'admin'` | no |
| `display_name` | `TEXT` | yes | `` | no |
| `is_active` | `INTEGER` | yes | `1` | no |
| `must_change_password` | `INTEGER` | yes | `0` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |
| `updated_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |
| `failed_login_count` | `INTEGER` | yes | `0` | no |
| `locked_until` | `TEXT` | no | `` | no |
| `last_failed_login` | `TEXT` | no | `` | no |
| `last_login_at` | `TEXT` | no | `` | no |

## sessions

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `user_id` | `INTEGER` | yes | `` | no |
| `token` | `TEXT` | yes | `` | no |
| `expires_at` | `TEXT` | yes | `` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

## admin_login_attempts

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `username_or_email` | `TEXT` | yes | `` | no |
| `user_id` | `INTEGER` | no | `` | no |
| `ip_address` | `TEXT` | yes | `` | no |
| `user_agent` | `TEXT` | no | `` | no |
| `device_type` | `TEXT` | no | `` | no |
| `os` | `TEXT` | no | `` | no |
| `browser` | `TEXT` | no | `` | no |
| `success` | `INTEGER` | yes | `0` | no |
| `failure_reason` | `TEXT` | no | `` | no |
| `request_id` | `TEXT` | no | `` | no |
| `attempted_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

Indexes:

- `idx_admin_login_attempts_ip_attempted`
- `idx_admin_login_attempts_success_attempted`
- `idx_admin_login_attempts_username_attempted`

## admin_user_sessions

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `user_id` | `INTEGER` | yes | `` | no |
| `session_token_hash` | `TEXT` | yes | `` | no |
| `jwt_id` | `TEXT` | no | `` | no |
| `ip_address` | `TEXT` | yes | `` | no |
| `user_agent` | `TEXT` | no | `` | no |
| `device_fingerprint` | `TEXT` | no | `` | no |
| `is_suspicious` | `INTEGER` | yes | `0` | no |
| `suspicious_reason` | `TEXT` | no | `` | no |
| `last_activity_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |
| `expires_at` | `TEXT` | yes | `` | no |
| `revoked_at` | `TEXT` | no | `` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

Indexes:

- `idx_admin_user_sessions_device`
- `idx_admin_user_sessions_token_hash`
- `idx_admin_user_sessions_user_active`

## admin_security_events

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `user_id` | `INTEGER` | no | `` | no |
| `event_type` | `TEXT` | yes | `` | no |
| `severity` | `TEXT` | yes | `'info'` | no |
| `ip_address` | `TEXT` | no | `` | no |
| `user_agent` | `TEXT` | no | `` | no |
| `metadata_json` | `TEXT` | no | `` | no |
| `request_id` | `TEXT` | no | `` | no |
| `resolved_at` | `TEXT` | no | `` | no |
| `resolved_by` | `INTEGER` | no | `` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

Indexes:

- `idx_admin_security_events_type_created`
- `idx_admin_security_events_user_created`

## admin_role_permissions

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `role` | `TEXT` | yes | `` | no |
| `permission` | `TEXT` | yes | `` | no |
| `allowed` | `INTEGER` | yes | `1` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |
| `updated_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

## admin_password_history

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `user_id` | `INTEGER` | yes | `` | no |
| `password_hash` | `TEXT` | yes | `` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

## admin_audit_logs

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `actor_id` | `INTEGER` | no | `` | no |
| `actor_role` | `TEXT` | no | `` | no |
| `action` | `TEXT` | yes | `` | no |
| `entity_type` | `TEXT` | yes | `` | no |
| `entity_id` | `TEXT` | no | `` | no |
| `before_json` | `TEXT` | no | `` | no |
| `after_json` | `TEXT` | no | `` | no |
| `reason` | `TEXT` | no | `` | no |
| `ip_address` | `TEXT` | no | `` | no |
| `user_agent` | `TEXT` | no | `` | no |
| `request_id` | `TEXT` | no | `` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

Indexes:

- `idx_admin_audit_logs_actor_created`
- `idx_admin_audit_logs_entity_created`

## admin_import_runs

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `actor_id` | `INTEGER` | no | `` | no |
| `import_type` | `TEXT` | yes | `` | no |
| `source_filename` | `TEXT` | no | `` | no |
| `dry_run` | `INTEGER` | yes | `1` | no |
| `status` | `TEXT` | yes | `'queued'` | no |
| `total_rows` | `INTEGER` | yes | `0` | no |
| `created_rows` | `INTEGER` | yes | `0` | no |
| `updated_rows` | `INTEGER` | yes | `0` | no |
| `skipped_rows` | `INTEGER` | yes | `0` | no |
| `conflict_rows` | `INTEGER` | yes | `0` | no |
| `error_json` | `TEXT` | no | `` | no |
| `result_json` | `TEXT` | no | `` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |
| `finished_at` | `TEXT` | no | `` | no |

Indexes:

- `idx_admin_import_runs_type_status`

## admin_risk_alerts

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `risk_type` | `TEXT` | yes | `` | no |
| `severity` | `TEXT` | yes | `'warning'` | no |
| `entity_type` | `TEXT` | no | `` | no |
| `entity_id` | `TEXT` | no | `` | no |
| `title` | `TEXT` | yes | `` | no |
| `message` | `TEXT` | no | `` | no |
| `status` | `TEXT` | yes | `'open'` | no |
| `details_json` | `TEXT` | no | `` | no |
| `detected_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |
| `resolved_at` | `TEXT` | no | `` | no |
| `resolved_by` | `INTEGER` | no | `` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |
| `updated_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

Indexes:

- `idx_admin_risk_alerts_status_severity`

## admin_saved_views

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `user_id` | `INTEGER` | no | `` | no |
| `view_key` | `TEXT` | yes | `` | no |
| `name` | `TEXT` | yes | `` | no |
| `filters_json` | `TEXT` | no | `` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |
| `updated_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

## system_settings

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `category` | `TEXT` | yes | `` | no |
| `key` | `TEXT` | yes | `` | no |
| `value` | `TEXT` | no | `` | no |
| `data_type` | `TEXT` | yes | `'string'` | no |
| `is_sensitive` | `INTEGER` | yes | `0` | no |
| `description` | `TEXT` | no | `` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |
| `updated_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

## prompt_versions

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `prompt_id` | `TEXT` | yes | `` | no |
| `category` | `TEXT` | yes | `` | no |
| `name` | `TEXT` | yes | `` | no |
| `version` | `TEXT` | yes | `` | no |
| `prompt_content` | `TEXT` | yes | `` | no |
| `is_active` | `INTEGER` | yes | `0` | no |
| `change_notes` | `TEXT` | no | `` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

## prompt_regression_cases

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `prompt_id` | `TEXT` | yes | `` | no |
| `name` | `TEXT` | yes | `` | no |
| `input_json` | `TEXT` | yes | `` | no |
| `expected_output_json` | `TEXT` | no | `` | no |
| `status` | `TEXT` | yes | `'active'` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |
| `updated_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

Indexes:

- `idx_prompt_regression_cases_prompt`

## affiliate_products

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `platform` | `TEXT` | yes | `` | no |
| `external_id` | `TEXT` | yes | `` | no |
| `merchant_id` | `TEXT` | no | `` | no |
| `asin` | `TEXT` | no | `` | no |
| `brand` | `TEXT` | no | `` | no |
| `product_name` | `TEXT` | no | `` | no |
| `product_url` | `TEXT` | no | `` | no |
| `promo_link` | `TEXT` | no | `` | no |
| `short_promo_link` | `TEXT` | no | `` | no |
| `image_url` | `TEXT` | no | `` | no |
| `price_amount` | `REAL` | no | `` | no |
| `price_currency` | `TEXT` | no | `` | no |
| `commission_rate` | `REAL` | no | `` | no |
| `review_count` | `INTEGER` | no | `` | no |
| `rating` | `REAL` | no | `` | no |
| `country_code` | `TEXT` | no | `` | no |
| `raw_payload` | `TEXT` | no | `` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |
| `updated_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

## products

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `affiliate_product_id` | `INTEGER` | no | `` | no |
| `source_platform` | `TEXT` | yes | `` | no |
| `source_affiliate_link` | `TEXT` | yes | `` | no |
| `resolved_url` | `TEXT` | no | `` | no |
| `canonical_url` | `TEXT` | no | `` | no |
| `slug` | `TEXT` | no | `` | no |
| `brand` | `TEXT` | no | `` | no |
| `product_name` | `TEXT` | yes | `` | no |
| `category` | `TEXT` | no | `` | no |
| `description` | `TEXT` | no | `` | no |
| `price_amount` | `REAL` | no | `` | no |
| `price_currency` | `TEXT` | no | `` | no |
| `current_price` | `REAL` | no | `` | no |
| `hist_low_price` | `REAL` | no | `` | no |
| `avg_90d_price` | `REAL` | no | `` | no |
| `price_status` | `TEXT` | no | `` | no |
| `rating` | `REAL` | no | `` | no |
| `review_count` | `INTEGER` | no | `` | no |
| `specs_json` | `TEXT` | no | `` | no |
| `review_highlights_json` | `TEXT` | no | `` | no |
| `source_payload_json` | `TEXT` | no | `` | no |
| `published_at` | `TEXT` | no | `` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |
| `updated_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |
| `price_last_checked_at` | `TEXT` | no | `` | no |
| `offer_last_checked_at` | `TEXT` | no | `` | no |
| `attribute_completeness_score` | `REAL` | yes | `0` | no |
| `data_confidence_score` | `REAL` | yes | `0` | no |
| `source_count` | `INTEGER` | yes | `0` | no |
| `asin` | `TEXT` | no | `` | no |

Indexes:

- `idx_products_hardcore_category_price`
- `idx_products_offer_last_checked_at`

## hardcore_categories

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `name` | `TEXT` | yes | `` | no |
| `slug` | `TEXT` | yes | `` | no |
| `icon_url` | `TEXT` | no | `` | no |
| `status` | `TEXT` | yes | `'active'` | no |
| `meta_config_json` | `TEXT` | no | `` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |
| `updated_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

## affiliate_links

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `product_id` | `INTEGER` | yes | `` | no |
| `platform` | `TEXT` | yes | `` | no |
| `affiliate_url` | `TEXT` | yes | `` | no |
| `original_url` | `TEXT` | no | `` | no |
| `country_code` | `TEXT` | no | `` | no |
| `commission_rate` | `REAL` | no | `` | no |
| `status` | `TEXT` | yes | `'active'` | no |
| `last_verified` | `TEXT` | no | `` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |
| `updated_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

Indexes:

- `idx_affiliate_links_product_status`

## taxonomy_tags

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `category_id` | `INTEGER` | no | `` | no |
| `category_slug` | `TEXT` | yes | `` | no |
| `canonical_name` | `TEXT` | yes | `` | no |
| `slug` | `TEXT` | yes | `` | no |
| `keywords_json` | `TEXT` | no | `` | no |
| `search_volume` | `INTEGER` | yes | `0` | no |
| `is_core_painpoint` | `INTEGER` | yes | `0` | no |
| `status` | `TEXT` | yes | `'active'` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |
| `updated_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

Indexes:

- `idx_taxonomy_tags_category_core`

## review_videos

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `youtube_id` | `TEXT` | yes | `` | no |
| `channel_name` | `TEXT` | yes | `` | no |
| `channel_url` | `TEXT` | no | `` | no |
| `blogger_rank` | `REAL` | yes | `1` | no |
| `authority_tier` | `TEXT` | yes | `'general'` | no |
| `title` | `TEXT` | yes | `` | no |
| `video_type` | `TEXT` | yes | `'long-form'` | no |
| `transcript` | `TEXT` | no | `` | no |
| `description` | `TEXT` | no | `` | no |
| `processed_status` | `TEXT` | yes | `'pending'` | no |
| `published_at` | `TEXT` | no | `` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |
| `updated_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |
| `entity_match_json` | `TEXT` | no | `` | no |

## analysis_reports

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `product_id` | `INTEGER` | yes | `` | no |
| `video_id` | `INTEGER` | yes | `` | no |
| `tag_id` | `INTEGER` | yes | `` | no |
| `rating` | `TEXT` | yes | `` | no |
| `evidence_quote` | `TEXT` | yes | `` | no |
| `timestamp_seconds` | `INTEGER` | no | `` | no |
| `context_snippet` | `TEXT` | no | `` | no |
| `evidence_confidence` | `REAL` | yes | `1` | no |
| `evidence_type` | `TEXT` | yes | `'standard-review'` | no |
| `is_advertorial` | `INTEGER` | yes | `0` | no |
| `quality_flags_json` | `TEXT` | no | `` | no |
| `unexpected_usecase` | `TEXT` | no | `` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

Indexes:

- `idx_analysis_reports_product_tag`
- `idx_analysis_reports_tag_rating`

## site_search_logs

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `query_text` | `TEXT` | yes | `` | no |
| `hit_count` | `INTEGER` | yes | `1` | no |
| `matched_tag_id` | `INTEGER` | no | `` | no |
| `status` | `TEXT` | yes | `'pending'` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |
| `updated_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

## taxonomy_intent_sources

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `category_slug` | `TEXT` | yes | `` | no |
| `source_type` | `TEXT` | yes | `` | no |
| `raw_query` | `TEXT` | yes | `` | no |
| `normalized_query` | `TEXT` | yes | `` | no |
| `search_volume` | `INTEGER` | yes | `0` | no |
| `competition` | `TEXT` | no | `` | no |
| `status` | `TEXT` | yes | `'new'` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |
| `updated_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

Indexes:

- `idx_taxonomy_intent_sources_category_status`

## pending_tags

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `category_slug` | `TEXT` | yes | `` | no |
| `canonical_name` | `TEXT` | yes | `` | no |
| `slug` | `TEXT` | yes | `` | no |
| `trigger_query` | `TEXT` | yes | `` | no |
| `hit_count` | `INTEGER` | yes | `1` | no |
| `source` | `TEXT` | yes | `'site_search'` | no |
| `status` | `TEXT` | yes | `'pending'` | no |
| `priority_score` | `REAL` | yes | `0` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |
| `updated_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

Indexes:

- `idx_pending_tags_status_priority`

## taxonomy_rescan_queue

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `category_slug` | `TEXT` | yes | `` | no |
| `tag_slug` | `TEXT` | yes | `` | no |
| `reason` | `TEXT` | yes | `` | no |
| `status` | `TEXT` | yes | `'queued'` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |
| `updated_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

Indexes:

- `idx_taxonomy_rescan_queue_status`

## pseo_page_signals

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `pathname` | `TEXT` | yes | `` | no |
| `category_slug` | `TEXT` | no | `` | no |
| `tag_slug` | `TEXT` | no | `` | no |
| `impressions` | `INTEGER` | yes | `0` | no |
| `clicks` | `INTEGER` | yes | `0` | no |
| `ctr` | `REAL` | yes | `0` | no |
| `source` | `TEXT` | yes | `'ga4'` | no |
| `captured_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

Indexes:

- `idx_pseo_page_signals_path_captured`
- `idx_pseo_page_signals_tag`

## creator_feedback_events

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `analysis_report_id` | `INTEGER` | no | `` | no |
| `video_id` | `INTEGER` | no | `` | no |
| `feedback_type` | `TEXT` | yes | `` | no |
| `weight_delta` | `REAL` | yes | `0` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

Indexes:

- `idx_creator_feedback_events_video`

## evidence_review_decisions

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `analysis_report_id` | `INTEGER` | no | `` | no |
| `video_id` | `INTEGER` | no | `` | no |
| `product_id` | `INTEGER` | no | `` | no |
| `reviewer_id` | `INTEGER` | no | `` | no |
| `decision` | `TEXT` | yes | `` | no |
| `before_json` | `TEXT` | no | `` | no |
| `after_json` | `TEXT` | no | `` | no |
| `reason` | `TEXT` | no | `` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

Indexes:

- `idx_evidence_review_decisions_report`

## price_value_snapshots

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `product_id` | `INTEGER` | yes | `` | no |
| `current_price` | `REAL` | no | `` | no |
| `hist_low_price` | `REAL` | no | `` | no |
| `avg_90d_price` | `REAL` | no | `` | no |
| `consensus_score` | `REAL` | no | `` | no |
| `value_score` | `REAL` | no | `` | no |
| `entry_status` | `TEXT` | yes | `'unknown'` | no |
| `source` | `TEXT` | yes | `'affiliate'` | no |
| `captured_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

Indexes:

- `idx_price_value_snapshots_product_captured`

## price_alerts

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `product_id` | `INTEGER` | yes | `` | no |
| `email` | `TEXT` | yes | `` | no |
| `target_price` | `REAL` | no | `` | no |
| `target_value_score` | `REAL` | no | `` | no |
| `status` | `TEXT` | yes | `'active'` | no |
| `last_notified_at` | `TEXT` | no | `` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |
| `updated_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

Indexes:

- `idx_price_alerts_product_status`

## price_alert_notifications

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `price_alert_id` | `INTEGER` | yes | `` | no |
| `product_id` | `INTEGER` | yes | `` | no |
| `email` | `TEXT` | yes | `` | no |
| `channel` | `TEXT` | yes | `'email'` | no |
| `status` | `TEXT` | yes | `'queued'` | no |
| `dedupe_key` | `TEXT` | yes | `` | no |
| `payload_json` | `TEXT` | no | `` | no |
| `error_message` | `TEXT` | no | `` | no |
| `queued_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |
| `sent_at` | `TEXT` | no | `` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |
| `updated_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

Indexes:

- `idx_price_alert_notifications_alert`
- `idx_price_alert_notifications_status`

## product_media_assets

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `product_id` | `INTEGER` | yes | `` | no |
| `storage_provider` | `TEXT` | yes | `` | no |
| `storage_key` | `TEXT` | yes | `` | no |
| `public_url` | `TEXT` | yes | `` | no |
| `source_url` | `TEXT` | no | `` | no |
| `mime_type` | `TEXT` | no | `` | no |
| `checksum` | `TEXT` | no | `` | no |
| `width` | `INTEGER` | no | `` | no |
| `height` | `INTEGER` | no | `` | no |
| `asset_role` | `TEXT` | yes | `` | no |
| `is_public` | `INTEGER` | yes | `1` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

## merchants

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `name` | `TEXT` | yes | `` | no |
| `slug` | `TEXT` | yes | `` | no |
| `website_url` | `TEXT` | no | `` | no |
| `country_code` | `TEXT` | no | `` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |
| `updated_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

## product_offers

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `product_id` | `INTEGER` | yes | `` | no |
| `merchant_id` | `INTEGER` | no | `` | no |
| `offer_url` | `TEXT` | yes | `` | no |
| `merchant_sku` | `TEXT` | no | `` | no |
| `availability_status` | `TEXT` | no | `` | no |
| `price_amount` | `REAL` | no | `` | no |
| `price_currency` | `TEXT` | no | `` | no |
| `shipping_cost` | `REAL` | no | `` | no |
| `coupon_text` | `TEXT` | no | `` | no |
| `coupon_type` | `TEXT` | no | `` | no |
| `reference_price_amount` | `REAL` | no | `` | no |
| `reference_price_currency` | `TEXT` | no | `` | no |
| `reference_price_type` | `TEXT` | no | `` | no |
| `reference_price_source` | `TEXT` | no | `` | no |
| `reference_price_last_checked_at` | `TEXT` | no | `` | no |
| `condition_label` | `TEXT` | no | `` | no |
| `source_type` | `TEXT` | yes | `'scrape'` | no |
| `source_url` | `TEXT` | no | `` | no |
| `confidence_score` | `REAL` | yes | `0.7` | no |
| `raw_payload_json` | `TEXT` | no | `` | no |
| `last_checked_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |
| `updated_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

Indexes:

- `idx_product_offers_merchant_product`
- `idx_product_offers_product_checked_price`

## product_price_history

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `product_id` | `INTEGER` | yes | `` | no |
| `product_offer_id` | `INTEGER` | no | `` | no |
| `price_amount` | `REAL` | no | `` | no |
| `price_currency` | `TEXT` | no | `` | no |
| `availability_status` | `TEXT` | no | `` | no |
| `captured_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

Indexes:

- `idx_product_price_history_product_captured_at`

## product_attribute_facts

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `product_id` | `INTEGER` | yes | `` | no |
| `attribute_key` | `TEXT` | yes | `` | no |
| `attribute_label` | `TEXT` | yes | `` | no |
| `attribute_value` | `TEXT` | yes | `` | no |
| `source_url` | `TEXT` | no | `` | no |
| `source_type` | `TEXT` | yes | `'scrape'` | no |
| `confidence_score` | `REAL` | yes | `0.7` | no |
| `is_verified` | `INTEGER` | yes | `0` | no |
| `last_checked_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |
| `updated_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

Indexes:

- `idx_product_attribute_facts_product_key`

## brand_policies

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `brand_name` | `TEXT` | yes | `` | no |
| `brand_slug` | `TEXT` | yes | `` | no |
| `shipping_policy` | `TEXT` | no | `` | no |
| `return_policy` | `TEXT` | no | `` | no |
| `warranty_policy` | `TEXT` | no | `` | no |
| `discount_window` | `TEXT` | no | `` | no |
| `support_policy` | `TEXT` | no | `` | no |
| `source_url` | `TEXT` | no | `` | no |
| `source_type` | `TEXT` | yes | `'editorial'` | no |
| `confidence_score` | `REAL` | yes | `0.8` | no |
| `last_verified_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |
| `updated_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

Indexes:

- `idx_brand_policies_brand_slug`

## compatibility_facts

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `brand_name` | `TEXT` | yes | `` | no |
| `brand_slug` | `TEXT` | yes | `` | no |
| `category` | `TEXT` | no | `` | no |
| `fact_type` | `TEXT` | yes | `` | no |
| `fact_label` | `TEXT` | yes | `` | no |
| `fact_value` | `TEXT` | yes | `` | no |
| `source_url` | `TEXT` | no | `` | no |
| `source_type` | `TEXT` | yes | `'editorial'` | no |
| `confidence_score` | `REAL` | yes | `0.8` | no |
| `is_verified` | `INTEGER` | yes | `0` | no |
| `last_checked_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |
| `updated_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

Indexes:

- `idx_compatibility_facts_brand_category`

## keyword_opportunities

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `product_id` | `INTEGER` | yes | `` | no |
| `keyword` | `TEXT` | yes | `` | no |
| `buyer_intent` | `REAL` | yes | `` | no |
| `serp_weakness` | `REAL` | yes | `` | no |
| `commission_potential` | `REAL` | yes | `` | no |
| `content_fit` | `REAL` | yes | `` | no |
| `freshness` | `REAL` | yes | `` | no |
| `total_score` | `REAL` | yes | `` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

## content_pipeline_runs

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `product_id` | `INTEGER` | no | `` | no |
| `affiliate_product_id` | `INTEGER` | no | `` | no |
| `source_link` | `TEXT` | yes | `` | no |
| `run_type` | `TEXT` | yes | `'fullPipeline'` | no |
| `requested_action` | `TEXT` | no | `` | no |
| `worker_id` | `TEXT` | no | `` | no |
| `locked_at` | `TEXT` | no | `` | no |
| `started_at` | `TEXT` | no | `` | no |
| `finished_at` | `TEXT` | no | `` | no |
| `attempt_count` | `INTEGER` | yes | `0` | no |
| `status` | `TEXT` | yes | `'queued'` | no |
| `current_stage` | `TEXT` | no | `` | no |
| `error_message` | `TEXT` | no | `` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |
| `updated_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |
| `priority` | `INTEGER` | yes | `100` | no |
| `scheduled_at` | `TEXT` | no | `` | no |
| `locked_by` | `TEXT` | no | `` | no |
| `lock_expires_at` | `TEXT` | no | `` | no |
| `last_heartbeat_at` | `TEXT` | no | `` | no |
| `cancel_requested_at` | `TEXT` | no | `` | no |
| `payload_json` | `TEXT` | no | `` | no |

Indexes:

- `idx_content_pipeline_runs_claimable`
- `idx_content_pipeline_runs_product_status`
- `idx_content_pipeline_runs_status_created_at`
- `idx_content_pipeline_runs_worker_lock`

## content_pipeline_jobs

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `run_id` | `INTEGER` | yes | `` | no |
| `stage` | `TEXT` | yes | `` | no |
| `status` | `TEXT` | yes | `'queued'` | no |
| `message` | `TEXT` | no | `` | no |
| `payload_json` | `TEXT` | no | `` | no |
| `started_at` | `TEXT` | no | `` | no |
| `finished_at` | `TEXT` | no | `` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

## worker_heartbeats

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `worker_id` | `TEXT` | yes | `` | no |
| `worker_type` | `TEXT` | yes | `'pipeline'` | no |
| `hostname` | `TEXT` | no | `` | no |
| `pid` | `INTEGER` | no | `` | no |
| `status` | `TEXT` | yes | `'starting'` | no |
| `current_run_id` | `INTEGER` | no | `` | no |
| `last_seen_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |
| `started_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |
| `metadata_json` | `TEXT` | no | `` | no |

Indexes:

- `idx_worker_heartbeats_seen`

## pipeline_queue_config

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `task_type` | `TEXT` | yes | `` | no |
| `enabled` | `INTEGER` | yes | `1` | no |
| `priority` | `INTEGER` | yes | `100` | no |
| `max_concurrency` | `INTEGER` | yes | `1` | no |
| `timeout_seconds` | `INTEGER` | yes | `1800` | no |
| `max_attempts` | `INTEGER` | yes | `3` | no |
| `backoff_policy_json` | `TEXT` | no | `` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |
| `updated_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

Indexes:

- `idx_pipeline_queue_config_enabled`

## articles

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `product_id` | `INTEGER` | no | `` | no |
| `article_type` | `TEXT` | yes | `` | no |
| `title` | `TEXT` | yes | `` | no |
| `slug` | `TEXT` | yes | `` | no |
| `summary` | `TEXT` | no | `` | no |
| `keyword` | `TEXT` | no | `` | no |
| `hero_image_url` | `TEXT` | no | `` | no |
| `content_md` | `TEXT` | yes | `` | no |
| `content_html` | `TEXT` | yes | `` | no |
| `seo_title` | `TEXT` | no | `` | no |
| `seo_description` | `TEXT` | no | `` | no |
| `schema_json` | `TEXT` | no | `` | no |
| `status` | `TEXT` | yes | `'draft'` | no |
| `published_at` | `TEXT` | no | `` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |
| `updated_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

## seo_pages

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `article_id` | `INTEGER` | no | `` | no |
| `page_type` | `TEXT` | yes | `` | no |
| `pathname` | `TEXT` | yes | `` | no |
| `title` | `TEXT` | yes | `` | no |
| `meta_description` | `TEXT` | yes | `` | no |
| `canonical_url` | `TEXT` | no | `` | no |
| `open_graph_json` | `TEXT` | no | `` | no |
| `schema_json` | `TEXT` | no | `` | no |
| `status` | `TEXT` | yes | `'draft'` | no |
| `published_at` | `TEXT` | no | `` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |
| `updated_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

## publish_events

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `seo_page_id` | `INTEGER` | no | `` | no |
| `event_type` | `TEXT` | yes | `` | no |
| `status` | `TEXT` | yes | `` | no |
| `payload_json` | `TEXT` | no | `` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

Indexes:

- `idx_publish_events_event_type_created_at`

## link_inspector_runs

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `status` | `TEXT` | yes | `'queued'` | no |
| `total_checked` | `INTEGER` | yes | `0` | no |
| `issues_found` | `INTEGER` | yes | `0` | no |
| `broken_count` | `INTEGER` | yes | `0` | no |
| `out_of_stock_count` | `INTEGER` | yes | `0` | no |
| `payload_json` | `TEXT` | no | `` | no |
| `started_at` | `TEXT` | no | `` | no |
| `finished_at` | `TEXT` | no | `` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

Indexes:

- `idx_link_inspector_runs_created_at`

## link_inspector_results

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `run_id` | `INTEGER` | yes | `` | no |
| `product_id` | `INTEGER` | no | `` | no |
| `product_name` | `TEXT` | no | `` | no |
| `source_url` | `TEXT` | yes | `` | no |
| `final_url` | `TEXT` | no | `` | no |
| `http_status` | `INTEGER` | no | `` | no |
| `status` | `TEXT` | yes | `'ok'` | no |
| `issue_type` | `TEXT` | no | `` | no |
| `issue_detail` | `TEXT` | no | `` | no |
| `response_snippet` | `TEXT` | no | `` | no |
| `checked_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

Indexes:

- `idx_link_inspector_results_run_id`

## merchant_click_events

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `product_id` | `INTEGER` | yes | `` | no |
| `visitor_id` | `TEXT` | no | `` | no |
| `source` | `TEXT` | yes | `'site'` | no |
| `target_url` | `TEXT` | yes | `` | no |
| `referer` | `TEXT` | no | `` | no |
| `user_agent` | `TEXT` | no | `` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

Indexes:

- `idx_merchant_click_events_product_created_at`
- `idx_merchant_click_events_source_created_at`
- `idx_merchant_click_events_visitor_created_at`

## buyer_decision_events

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `visitor_id` | `TEXT` | yes | `` | no |
| `event_type` | `TEXT` | yes | `` | no |
| `product_id` | `INTEGER` | no | `` | no |
| `source` | `TEXT` | yes | `'site'` | no |
| `metadata_json` | `TEXT` | no | `` | no |
| `referer` | `TEXT` | no | `` | no |
| `user_agent` | `TEXT` | no | `` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

Indexes:

- `idx_buyer_decision_events_event_created_at`
- `idx_buyer_decision_events_source_created_at`
- `idx_buyer_decision_events_visitor_event_created_at`

## newsletter_subscribers

| Column | Type | Required | Default | PK |
| --- | --- | --- | --- | --- |
| `id` | `INTEGER` | no | `` | yes |
| `email` | `TEXT` | yes | `` | no |
| `source` | `TEXT` | yes | `'site'` | no |
| `intent` | `TEXT` | yes | `'offers'` | no |
| `category_slug` | `TEXT` | no | `` | no |
| `cadence` | `TEXT` | yes | `'weekly'` | no |
| `notes` | `TEXT` | no | `` | no |
| `created_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |
| `updated_at` | `TEXT` | yes | `CURRENT_TIMESTAMP` | no |

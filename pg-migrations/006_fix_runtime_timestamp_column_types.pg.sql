DO $$
DECLARE
  column_spec RECORD;
BEGIN
  FOR column_spec IN
    SELECT *
    FROM (VALUES
      ('users', 'locked_until', false),
      ('users', 'last_failed_login', false),
      ('users', 'last_login_at', false),
      ('admin_login_attempts', 'attempted_at', true),
      ('admin_user_sessions', 'last_activity_at', true),
      ('admin_user_sessions', 'expires_at', true),
      ('admin_user_sessions', 'revoked_at', false),
      ('admin_user_sessions', 'created_at', true),
      ('content_pipeline_runs', 'scheduled_at', false),
      ('content_pipeline_runs', 'lock_expires_at', false),
      ('content_pipeline_runs', 'last_heartbeat_at', false),
      ('content_pipeline_runs', 'cancel_requested_at', false),
      ('content_pipeline_runs', 'locked_at', false),
      ('content_pipeline_runs', 'started_at', false),
      ('content_pipeline_runs', 'finished_at', false),
      ('product_scrape_tasks', 'started_at', false),
      ('product_scrape_tasks', 'completed_at', false),
      ('product_scrape_tasks', 'updated_at', true),
      ('products', 'price_last_checked_at', false),
      ('products', 'offer_last_checked_at', false),
      ('merchants', 'updated_at', true),
      ('product_offers', 'reference_price_last_checked_at', false),
      ('product_offers', 'last_checked_at', true),
      ('product_offers', 'updated_at', true),
      ('product_price_history', 'captured_at', true),
      ('product_attribute_facts', 'last_checked_at', true),
      ('product_attribute_facts', 'updated_at', true),
      ('brand_policies', 'last_verified_at', true),
      ('brand_policies', 'updated_at', true),
      ('compatibility_facts', 'last_checked_at', true),
      ('compatibility_facts', 'updated_at', true),
      ('newsletter_subscribers', 'updated_at', true),
      ('merchant_click_events', 'created_at', true),
      ('link_inspector_runs', 'started_at', false),
      ('link_inspector_runs', 'finished_at', false),
      ('link_inspector_runs', 'created_at', true),
      ('link_inspector_results', 'checked_at', true),
      ('buyer_decision_events', 'created_at', true),
      ('price_alert_notifications', 'queued_at', true),
      ('price_alert_notifications', 'sent_at', false),
      ('price_alert_notifications', 'created_at', true),
      ('price_alert_notifications', 'updated_at', true)
    ) AS specs(table_name, column_name, required)
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = column_spec.table_name
        AND column_name = column_spec.column_name
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ALTER COLUMN %I DROP DEFAULT',
        column_spec.table_name,
        column_spec.column_name
      );
      EXECUTE format(
        'ALTER TABLE %I ALTER COLUMN %I DROP NOT NULL',
        column_spec.table_name,
        column_spec.column_name
      );

      EXECUTE format(
        'ALTER TABLE %I ALTER COLUMN %I TYPE TIMESTAMPTZ USING NULLIF(%I::text, '''')::timestamptz',
        column_spec.table_name,
        column_spec.column_name,
        column_spec.column_name
      );

      IF column_spec.required THEN
        EXECUTE format(
          'UPDATE %I SET %I = CURRENT_TIMESTAMP WHERE %I IS NULL',
          column_spec.table_name,
          column_spec.column_name,
          column_spec.column_name
        );
        EXECUTE format(
          'ALTER TABLE %I ALTER COLUMN %I SET DEFAULT CURRENT_TIMESTAMP',
          column_spec.table_name,
          column_spec.column_name
        );
        EXECUTE format(
          'ALTER TABLE %I ALTER COLUMN %I SET NOT NULL',
          column_spec.table_name,
          column_spec.column_name
        );
      END IF;
    END IF;
  END LOOP;
END $$;

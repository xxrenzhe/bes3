import type { AuthPayload } from '@/lib/auth'
import { getDatabase } from '@/lib/db'
import {
  evaluatePriceAlerts,
  previewPriceValueSnapshotsForProducts,
  promotePendingTags,
  queueTaxonomyRescan,
  refreshPriceValueSnapshotsForProducts
} from '@/lib/hardcore-ops'

export async function getEvidenceOperationsSnapshot() {
  const db = await getDatabase()
  const [summary, videos, reports, feedback, decisions] = await Promise.all([
    db.queryOne<{
      videos: number
      pending_videos: number
      reports: number
      low_confidence_reports: number
      advertorial_reports: number
      feedback_events: number
    }>(
      `
        SELECT
          (SELECT COUNT(*) FROM review_videos) AS videos,
          (SELECT COUNT(*) FROM review_videos WHERE processed_status <> 'success') AS pending_videos,
          (SELECT COUNT(*) FROM analysis_reports) AS reports,
          (SELECT COUNT(*) FROM analysis_reports WHERE evidence_confidence < 0.65) AS low_confidence_reports,
          (SELECT COUNT(*) FROM analysis_reports WHERE is_advertorial = 1) AS advertorial_reports,
          (SELECT COUNT(*) FROM creator_feedback_events) AS feedback_events
      `
    ),
    db.query(
      `
        SELECT id, youtube_id, channel_name, authority_tier, title, video_type, processed_status, published_at, updated_at
        FROM review_videos
        ORDER BY updated_at DESC, id DESC
        LIMIT 50
      `
    ),
    db.query(
      `
        SELECT ar.id, ar.product_id, p.product_name, p.slug AS product_slug, ar.video_id, rv.youtube_id,
               rv.channel_name, tt.canonical_name AS tag_name, tt.category_slug, ar.rating,
               ar.evidence_quote, ar.timestamp_seconds, ar.context_snippet, ar.evidence_confidence,
               ar.evidence_type, ar.is_advertorial, ar.quality_flags_json, ar.created_at
        FROM analysis_reports ar
        LEFT JOIN products p ON p.id = ar.product_id
        LEFT JOIN review_videos rv ON rv.id = ar.video_id
        LEFT JOIN taxonomy_tags tt ON tt.id = ar.tag_id
        ORDER BY ar.created_at DESC, ar.id DESC
        LIMIT 80
      `
    ),
    db.query(
      `
        SELECT cfe.id, cfe.analysis_report_id, cfe.video_id, rv.youtube_id, cfe.feedback_type, cfe.weight_delta, cfe.created_at
        FROM creator_feedback_events cfe
        LEFT JOIN review_videos rv ON rv.id = cfe.video_id
        ORDER BY cfe.created_at DESC, cfe.id DESC
        LIMIT 50
      `
    ),
    db.query(
      `
        SELECT erd.id, erd.analysis_report_id, erd.video_id, erd.product_id, p.product_name,
               erd.reviewer_id, u.username AS reviewer_name, erd.decision, erd.reason, erd.created_at
        FROM evidence_review_decisions erd
        LEFT JOIN products p ON p.id = erd.product_id
        LEFT JOIN users u ON u.id = erd.reviewer_id
        ORDER BY erd.created_at DESC, erd.id DESC
        LIMIT 50
      `
    )
  ])

  return { summary, videos, reports, feedback, decisions }
}

export async function reviewEvidenceReport(input: {
  reportId: number
  actor: AuthPayload
  decision: 'approve' | 'downgrade' | 'mark_advertorial' | 'detach_product'
  reason?: string | null
}) {
  const db = await getDatabase()
  const report = await db.queryOne<{
    id: number
    product_id: number
    video_id: number
    evidence_confidence: number
    is_advertorial: number
  }>('SELECT id, product_id, video_id, evidence_confidence, is_advertorial FROM analysis_reports WHERE id = ? LIMIT 1', [input.reportId])
  if (!report) throw new Error('evidence_report_not_found')

  const before = { ...report }
  if (input.decision === 'approve') {
    await db.exec('UPDATE analysis_reports SET evidence_confidence = CASE WHEN evidence_confidence < 0.85 THEN 0.85 ELSE evidence_confidence END WHERE id = ?', [input.reportId])
  } else if (input.decision === 'downgrade') {
    await db.exec('UPDATE analysis_reports SET evidence_confidence = CASE WHEN evidence_confidence - 0.2 < 0.1 THEN 0.1 ELSE evidence_confidence - 0.2 END, quality_flags_json = ? WHERE id = ?', [
      JSON.stringify({ manual_review: 'downgraded' }),
      input.reportId
    ])
  } else if (input.decision === 'mark_advertorial') {
    await db.exec('UPDATE analysis_reports SET is_advertorial = 1, quality_flags_json = ? WHERE id = ?', [
      JSON.stringify({ manual_review: 'advertorial' }),
      input.reportId
    ])
  } else if (input.decision === 'detach_product') {
    await db.exec('DELETE FROM analysis_reports WHERE id = ?', [input.reportId])
  }

  await db.exec(
    `
      INSERT INTO evidence_review_decisions (
        analysis_report_id, video_id, product_id, reviewer_id, decision, before_json, after_json, reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.reportId,
      report.video_id,
      report.product_id,
      input.actor.userId,
      input.decision,
      JSON.stringify(before),
      JSON.stringify({ decision: input.decision }),
      input.reason || null
    ]
  )

  return { success: true }
}

export async function getTaxonomyOperationsSnapshot() {
  const db = await getDatabase()
  const [summary, categories, tags, pendingTags, intentSources, rescanQueue, pseoSignals] = await Promise.all([
    db.queryOne(
      `
        SELECT
          (SELECT COUNT(*) FROM taxonomy_tags WHERE status = 'active') AS active_tags,
          (SELECT COUNT(*) FROM pending_tags WHERE status = 'pending') AS pending_tags,
          (SELECT COUNT(*) FROM taxonomy_rescan_queue WHERE status IN ('queued', 'processing')) AS active_rescans,
          (SELECT COUNT(*) FROM taxonomy_intent_sources WHERE status = 'new') AS new_intents
      `
    ),
    db.query('SELECT id, name, slug, status, updated_at FROM hardcore_categories ORDER BY name ASC LIMIT 100'),
    db.query(
      `
        SELECT tt.id, tt.category_slug, tt.canonical_name, tt.slug, tt.search_volume, tt.is_core_painpoint,
               tt.status, tt.updated_at,
               (SELECT COUNT(*) FROM analysis_reports ar WHERE ar.tag_id = tt.id) AS evidence_count
        FROM taxonomy_tags tt
        ORDER BY tt.updated_at DESC, tt.id DESC
        LIMIT 80
      `
    ),
    db.query(
      `
        SELECT id, category_slug, canonical_name, slug, trigger_query, hit_count, source, status, priority_score, updated_at
        FROM pending_tags
        ORDER BY priority_score DESC, hit_count DESC, updated_at DESC
        LIMIT 80
      `
    ),
    db.query(
      `
        SELECT id, category_slug, source_type, raw_query, normalized_query, search_volume, competition, status, updated_at
        FROM taxonomy_intent_sources
        ORDER BY updated_at DESC, id DESC
        LIMIT 80
      `
    ),
    db.query(
      `
        SELECT id, category_slug, tag_slug, reason, status, created_at, updated_at
        FROM taxonomy_rescan_queue
        ORDER BY updated_at DESC, id DESC
        LIMIT 80
      `
    ),
    db.query(
      `
        SELECT pathname, category_slug, tag_slug, SUM(impressions) AS impressions, SUM(clicks) AS clicks,
               CASE WHEN SUM(impressions) > 0 THEN SUM(clicks) * 1.0 / SUM(impressions) ELSE 0 END AS ctr
        FROM pseo_page_signals
        GROUP BY pathname, category_slug, tag_slug
        ORDER BY impressions DESC, clicks DESC
        LIMIT 50
      `
    )
  ])
  return { summary, categories, tags, pendingTags, intentSources, rescanQueue, pseoSignals }
}

export async function runTaxonomyAction(input: {
  action: string
  categorySlug?: string
  tagSlug?: string
  limit?: number
  minPriorityScore?: number
}) {
  if (input.action === 'promotePending') {
    return { promoted: await promotePendingTags({ limit: input.limit || 50, minPriorityScore: input.minPriorityScore ?? 0.5 }) }
  }
  if (input.action === 'queueRescan') {
    if (!input.categorySlug || !input.tagSlug) throw new Error('category_and_tag_required')
    const id = await queueTaxonomyRescan(input.categorySlug, input.tagSlug, 'Queued from Taxonomy Lab')
    return { queued: id }
  }
  throw new Error('unknown_taxonomy_action')
}

export async function getPriceValueOperationsSnapshot() {
  const db = await getDatabase()
  const [summary, latestSnapshots, alerts, notifications, products] = await Promise.all([
    db.queryOne(
      `
        SELECT
          (SELECT COUNT(*) FROM price_value_snapshots) AS snapshots,
          (SELECT COUNT(*) FROM price_alerts WHERE status = 'active') AS active_alerts,
          (SELECT COUNT(*) FROM price_alert_notifications WHERE status = 'queued') AS queued_notifications,
          (SELECT COUNT(*) FROM products WHERE current_price IS NOT NULL) AS priced_products
      `
    ),
    db.query(
      `
        SELECT pvs.id, pvs.product_id, p.product_name, p.slug, pvs.current_price, pvs.hist_low_price,
               pvs.avg_90d_price, pvs.consensus_score, pvs.value_score, pvs.entry_status, pvs.source, pvs.captured_at
        FROM price_value_snapshots pvs
        LEFT JOIN products p ON p.id = pvs.product_id
        ORDER BY pvs.captured_at DESC, pvs.id DESC
        LIMIT 80
      `
    ),
    db.query(
      `
        SELECT pa.id, pa.product_id, p.product_name, p.slug, pa.email, pa.target_price,
               pa.target_value_score, pa.status, pa.last_notified_at, pa.updated_at
        FROM price_alerts pa
        LEFT JOIN products p ON p.id = pa.product_id
        ORDER BY pa.updated_at DESC, pa.id DESC
        LIMIT 80
      `
    ),
    db.query(
      `
        SELECT pan.id, pan.product_id, p.product_name, pan.email, pan.channel, pan.status,
               pan.error_message, pan.queued_at, pan.sent_at
        FROM price_alert_notifications pan
        LEFT JOIN products p ON p.id = pan.product_id
        ORDER BY pan.queued_at DESC, pan.id DESC
        LIMIT 80
      `
    ),
    db.query(
      `
        SELECT id, product_name, slug, current_price, hist_low_price, avg_90d_price, price_status, price_last_checked_at
        FROM products
        ORDER BY COALESCE(price_last_checked_at, updated_at, created_at) DESC
        LIMIT 80
      `
    )
  ])
  return { summary, latestSnapshots, alerts, notifications, products }
}

export async function runPriceValueAction(input: {
  action: string
  limit?: number
  markNotified?: boolean
  queueNotifications?: boolean
}) {
  const limit = Math.max(1, Math.min(Number(input.limit || 100), 500))
  if (input.action === 'previewRefresh') {
    return { preview: await previewPriceValueSnapshotsForProducts(limit) }
  }
  if (input.action === 'refreshSnapshots') {
    return { refreshed: await refreshPriceValueSnapshotsForProducts(limit) }
  }
  if (input.action === 'evaluateAlerts') {
    return {
      triggered: await evaluatePriceAlerts(limit, Boolean(input.markNotified), Boolean(input.queueNotifications))
    }
  }
  throw new Error('unknown_price_value_action')
}

export async function getRiskOperationsSnapshot() {
  const db = await getDatabase()
  const [summary, riskAlerts, linkIssues, evidenceRisks, seoRisks, priceRisks] = await Promise.all([
    db.queryOne(
      `
        SELECT
          (SELECT COUNT(*) FROM admin_risk_alerts WHERE status = 'open') AS open_risks,
          (SELECT COUNT(*) FROM link_inspector_results WHERE issue_type IS NOT NULL) AS link_issues,
          (SELECT COUNT(*) FROM analysis_reports WHERE evidence_confidence < 0.65 OR is_advertorial = 1) AS evidence_risks,
          (SELECT COUNT(*) FROM products WHERE price_status IS NULL OR price_status = 'unknown') AS price_risks
      `
    ),
    db.query(
      `
        SELECT id, risk_type, severity, entity_type, entity_id, title, message, status, details_json, detected_at, resolved_at, updated_at
        FROM admin_risk_alerts
        ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END, detected_at DESC
        LIMIT 100
      `
    ),
    db.query(
      `
        SELECT lir.id, lir.product_id, p.product_name, lir.source_url, lir.final_url, lir.http_status,
               lir.issue_type, lir.issue_detail, lir.checked_at
        FROM link_inspector_results lir
        LEFT JOIN products p ON p.id = lir.product_id
        WHERE lir.issue_type IS NOT NULL
        ORDER BY lir.checked_at DESC, lir.id DESC
        LIMIT 80
      `
    ),
    db.query(
      `
        SELECT ar.id, ar.product_id, p.product_name, rv.youtube_id, rv.channel_name,
               ar.rating, ar.evidence_confidence, ar.is_advertorial, ar.evidence_quote, ar.created_at
        FROM analysis_reports ar
        LEFT JOIN products p ON p.id = ar.product_id
        LEFT JOIN review_videos rv ON rv.id = ar.video_id
        WHERE ar.evidence_confidence < 0.65 OR ar.is_advertorial = 1
        ORDER BY ar.evidence_confidence ASC, ar.created_at DESC
        LIMIT 80
      `
    ),
    db.query(
      `
        SELECT sp.pathname, sp.status, sp.indexing_status, sp.last_indexed_at, sp.updated_at
        FROM seo_pages sp
        WHERE sp.status <> 'published' OR sp.indexing_status IN ('blocked', 'failed', 'noindex')
        ORDER BY sp.updated_at DESC, sp.id DESC
        LIMIT 80
      `
    ),
    db.query(
      `
        SELECT id, product_name, slug, current_price, price_status, price_last_checked_at
        FROM products
        WHERE price_status IS NULL OR price_status = 'unknown'
        ORDER BY updated_at DESC
        LIMIT 80
      `
    )
  ])
  return { summary, riskAlerts, linkIssues, evidenceRisks, seoRisks, priceRisks }
}

export async function updateRiskAlertStatus(input: {
  alertId: number
  status: 'open' | 'resolved'
  actor: AuthPayload
}) {
  const db = await getDatabase()
  await db.exec(
    `
      UPDATE admin_risk_alerts
      SET status = ?,
          resolved_at = CASE WHEN ? = 'resolved' THEN CURRENT_TIMESTAMP ELSE NULL END,
          resolved_by = CASE WHEN ? = 'resolved' THEN ? ELSE NULL END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [input.status, input.status, input.status, input.actor.userId, input.alertId]
  )
  return { success: true }
}

export async function getUsersAccessSnapshot() {
  const db = await getDatabase()
  const [summary, users, sessions, loginAttempts, securityEvents] = await Promise.all([
    db.queryOne(
      `
        SELECT
          (SELECT COUNT(*) FROM users) AS users,
          (SELECT COUNT(*) FROM users WHERE is_active = 1) AS active_users,
          (SELECT COUNT(*) FROM users WHERE locked_until IS NOT NULL AND locked_until > CURRENT_TIMESTAMP) AS locked_users,
          (SELECT COUNT(*) FROM admin_user_sessions WHERE revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP) AS active_sessions
      `
    ),
    db.query(
      `
        SELECT id, username, email, role, display_name, is_active, must_change_password,
               failed_login_count, locked_until, last_failed_login, last_login_at, created_at, updated_at
        FROM users
        ORDER BY updated_at DESC, id DESC
        LIMIT 100
      `
    ),
    db.query(
      `
        SELECT s.id, s.user_id, u.username, s.ip_address, s.user_agent, s.device_fingerprint,
               s.is_suspicious, s.suspicious_reason, s.last_activity_at, s.expires_at, s.revoked_at, s.created_at
        FROM admin_user_sessions s
        LEFT JOIN users u ON u.id = s.user_id
        ORDER BY s.last_activity_at DESC, s.id DESC
        LIMIT 100
      `
    ),
    db.query(
      `
        SELECT id, username_or_email, user_id, ip_address, success, failure_reason, request_id, attempted_at
        FROM admin_login_attempts
        ORDER BY attempted_at DESC, id DESC
        LIMIT 100
      `
    ),
    db.query(
      `
        SELECT id, user_id, event_type, severity, ip_address, metadata_json, request_id, resolved_at, created_at
        FROM admin_security_events
        ORDER BY created_at DESC, id DESC
        LIMIT 100
      `
    )
  ])
  return { summary, users, sessions, loginAttempts, securityEvents }
}

export async function runUsersAccessAction(input: {
  actor: AuthPayload
  action: string
  userId?: number
  sessionId?: number
  active?: boolean
}) {
  const db = await getDatabase()
  if (input.action === 'revokeSession') {
    if (!input.sessionId) throw new Error('session_id_required')
    await db.exec('UPDATE admin_user_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE id = ?', [input.sessionId])
    return { revokedSessionId: input.sessionId }
  }
  if (input.action === 'unlockUser') {
    if (!input.userId) throw new Error('user_id_required')
    await db.exec(
      `
        UPDATE users
        SET failed_login_count = 0, locked_until = NULL, last_failed_login = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [input.userId]
    )
    await db.exec(
      `
        INSERT INTO admin_security_events (user_id, event_type, severity, metadata_json, created_at)
        VALUES (?, 'admin_user_unlocked', 'info', ?, CURRENT_TIMESTAMP)
      `,
      [input.userId, JSON.stringify({ actorId: input.actor.userId })]
    )
    return { unlockedUserId: input.userId }
  }
  if (input.action === 'setUserActive') {
    if (!input.userId) throw new Error('user_id_required')
    await db.exec('UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [input.active ? 1 : 0, input.userId])
    if (!input.active) {
      await db.exec('UPDATE admin_user_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = ? AND revoked_at IS NULL', [input.userId])
    }
    return { userId: input.userId, active: Boolean(input.active) }
  }
  throw new Error('unknown_users_access_action')
}

export async function getDataManagementSnapshot() {
  const db = await getDatabase()
  const [summary, imports, audits, migrations, settings, media, backups] = await Promise.all([
    db.queryOne(
      `
        SELECT
          (SELECT COUNT(*) FROM admin_import_runs) AS import_runs,
          (SELECT COUNT(*) FROM admin_audit_logs) AS audit_logs,
          (SELECT COUNT(*) FROM migration_history) AS migrations,
          (SELECT COUNT(*) FROM product_media_assets) AS media_assets
      `
    ),
    db.query(
      `
        SELECT id, actor_id, import_type, source_filename, dry_run, status, total_rows,
               created_rows, updated_rows, skipped_rows, conflict_rows, error_json, result_json, created_at, finished_at
        FROM admin_import_runs
        ORDER BY created_at DESC, id DESC
        LIMIT 100
      `
    ),
    db.query(
      `
        SELECT id, actor_id, actor_role, action, entity_type, entity_id, reason, request_id, created_at
        FROM admin_audit_logs
        ORDER BY created_at DESC, id DESC
        LIMIT 120
      `
    ),
    db.query('SELECT id, migration_name, applied_at FROM migration_history ORDER BY applied_at DESC, id DESC LIMIT 100'),
    db.query(
      `
        SELECT category, key, data_type, is_sensitive, updated_at
        FROM system_settings
        ORDER BY category ASC, key ASC
        LIMIT 100
      `
    ),
    db.query(
      `
        SELECT pma.id, pma.product_id, p.product_name, pma.storage_provider, pma.asset_role,
               pma.mime_type, pma.created_at
        FROM product_media_assets pma
        LEFT JOIN products p ON p.id = pma.product_id
        ORDER BY pma.created_at DESC, pma.id DESC
        LIMIT 80
      `
    ),
    Promise.resolve([
      { name: 'Runtime backup', command: 'npm run ops:backup-runtime', scope: 'data + storage/media' },
      { name: 'Runtime restore', command: 'BES3_RESTORE_CONFIRM=restore npm run ops:restore-runtime -- <archive>', scope: 'guarded restore' },
      { name: 'Planv2 manifest', command: 'npm run hardcore:export-planv2-ops', scope: 'operational manifest export' }
    ])
  ])
  return { summary, imports, audits, migrations, settings, media, backups }
}

export async function recordAdminImportRun(input: {
  actor: AuthPayload
  importType: string
  sourceFilename?: string | null
  dryRun?: boolean
}) {
  const db = await getDatabase()
  const result = await db.exec(
    `
      INSERT INTO admin_import_runs (
        actor_id, import_type, source_filename, dry_run, status, total_rows, result_json, finished_at
      ) VALUES (?, ?, ?, ?, 'completed', 0, ?, CURRENT_TIMESTAMP)
    `,
    [
      input.actor.userId,
      input.importType || 'manual',
      input.sourceFilename || null,
      input.dryRun === false ? 0 : 1,
      JSON.stringify({ mode: input.dryRun === false ? 'real-run-placeholder' : 'dry-run-placeholder' })
    ]
  )
  return { importRunId: Number(result.lastInsertRowid || 0) }
}

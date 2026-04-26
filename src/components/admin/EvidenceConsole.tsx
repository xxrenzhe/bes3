'use client'

import { OperationsConsole } from '@/components/admin/OperationsConsole'

export function EvidenceConsole() {
  return (
    <OperationsConsole
      title="Evidence Graph"
      eyebrow="Evidence Ops"
      description="Review videos, extracted evidence, confidence risks, creator feedback, and manual evidence decisions."
      endpoint="/api/admin/evidence"
      metricKeys={[
        { label: 'Videos', key: 'videos' },
        { label: 'Pending Videos', key: 'pending_videos' },
        { label: 'Reports', key: 'reports' },
        { label: 'Low Confidence', key: 'low_confidence_reports' }
      ]}
      sections={[
        {
          title: 'Review Videos',
          key: 'videos',
          columns: [
            { label: 'Title', key: 'title' },
            { label: 'Channel', key: 'channel_name' },
            { label: 'Tier', key: 'authority_tier', badge: true },
            { label: 'Status', key: 'processed_status', badge: true },
            { label: 'Updated', key: 'updated_at', date: true }
          ]
        },
        {
          title: 'Evidence Reports',
          key: 'reports',
          columns: [
            { label: 'Product', key: 'product_name' },
            { label: 'Tag', key: 'tag_name' },
            { label: 'Rating', key: 'rating', badge: true },
            { label: 'Confidence', key: 'evidence_confidence' },
            { label: 'Quote', key: 'evidence_quote' }
          ]
        },
        {
          title: 'Feedback Queue',
          key: 'feedback',
          columns: [
            { label: 'Type', key: 'feedback_type', badge: true },
            { label: 'YouTube', key: 'youtube_id' },
            { label: 'Weight', key: 'weight_delta' },
            { label: 'Created', key: 'created_at', date: true }
          ]
        },
        {
          title: 'Review Decisions',
          key: 'decisions',
          columns: [
            { label: 'Decision', key: 'decision', badge: true },
            { label: 'Product', key: 'product_name' },
            { label: 'Reviewer', key: 'reviewer_name' },
            { label: 'Reason', key: 'reason' },
            { label: 'Created', key: 'created_at', date: true }
          ]
        }
      ]}
    />
  )
}

'use client'

import { OperationsConsole } from '@/components/admin/OperationsConsole'

export function RiskConsole() {
  return (
    <OperationsConsole
      title="Risk Center"
      eyebrow="Risk Ops"
      description="Aggregate evidence, link, SEO, price, and governance risks that can block public recommendations."
      endpoint="/api/admin/risk"
      metricKeys={[
        { label: 'Open Risks', key: 'open_risks' },
        { label: 'Link Issues', key: 'link_issues' },
        { label: 'Evidence Risks', key: 'evidence_risks' },
        { label: 'Price Risks', key: 'price_risks' }
      ]}
      sections={[
        {
          title: 'Risk Alerts',
          key: 'riskAlerts',
          columns: [
            { label: 'Title', key: 'title' },
            { label: 'Type', key: 'risk_type', badge: true },
            { label: 'Severity', key: 'severity', badge: true },
            { label: 'Status', key: 'status', badge: true },
            { label: 'Detected', key: 'detected_at', date: true }
          ]
        },
        {
          title: 'Link Issues',
          key: 'linkIssues',
          columns: [
            { label: 'Product', key: 'product_name' },
            { label: 'Issue', key: 'issue_type', badge: true },
            { label: 'HTTP', key: 'http_status' },
            { label: 'Detail', key: 'issue_detail' },
            { label: 'Checked', key: 'checked_at', date: true }
          ]
        },
        {
          title: 'Evidence Risks',
          key: 'evidenceRisks',
          columns: [
            { label: 'Product', key: 'product_name' },
            { label: 'Channel', key: 'channel_name' },
            { label: 'Rating', key: 'rating', badge: true },
            { label: 'Confidence', key: 'evidence_confidence' },
            { label: 'Quote', key: 'evidence_quote' }
          ]
        },
        {
          title: 'SEO Risks',
          key: 'seoRisks',
          columns: [
            { label: 'Path', key: 'pathname' },
            { label: 'Status', key: 'status', badge: true },
            { label: 'Indexing', key: 'indexing_status', badge: true },
            { label: 'Updated', key: 'updated_at', date: true }
          ]
        }
      ]}
    />
  )
}

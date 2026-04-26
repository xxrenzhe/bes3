'use client'

import { OperationsConsole } from '@/components/admin/OperationsConsole'

export function PriceValueConsole() {
  return (
    <OperationsConsole
      title="Price & Value"
      eyebrow="Commerce Ops"
      description="Operate price snapshots, value-score refreshes, buy-window status, alerts, and queued customer notifications."
      endpoint="/api/admin/price-value"
      metricKeys={[
        { label: 'Snapshots', key: 'snapshots' },
        { label: 'Active Alerts', key: 'active_alerts' },
        { label: 'Queued Notifications', key: 'queued_notifications' },
        { label: 'Priced Products', key: 'priced_products' }
      ]}
      actions={[
        { label: 'Dry-run Refresh', body: { action: 'previewRefresh', limit: 100 }, success: 'Price refresh preview ready', variant: 'outline' },
        { label: 'Refresh Snapshots', body: { action: 'refreshSnapshots', limit: 100 }, success: 'Price snapshots refreshed' },
        { label: 'Evaluate Alerts', body: { action: 'evaluateAlerts', limit: 100, queueNotifications: true }, success: 'Price alerts evaluated', variant: 'secondary' }
      ]}
      sections={[
        {
          title: 'Latest Snapshots',
          key: 'latestSnapshots',
          columns: [
            { label: 'Product', key: 'product_name' },
            { label: 'Current', key: 'current_price' },
            { label: 'Value', key: 'value_score' },
            { label: 'Entry', key: 'entry_status', badge: true },
            { label: 'Captured', key: 'captured_at', date: true }
          ]
        },
        {
          title: 'Price Alerts',
          key: 'alerts',
          columns: [
            { label: 'Product', key: 'product_name' },
            { label: 'Email', key: 'email' },
            { label: 'Target Price', key: 'target_price' },
            { label: 'Status', key: 'status', badge: true },
            { label: 'Updated', key: 'updated_at', date: true }
          ]
        },
        {
          title: 'Notifications',
          key: 'notifications',
          columns: [
            { label: 'Product', key: 'product_name' },
            { label: 'Email', key: 'email' },
            { label: 'Channel', key: 'channel', badge: true },
            { label: 'Status', key: 'status', badge: true },
            { label: 'Queued', key: 'queued_at', date: true }
          ]
        }
      ]}
    />
  )
}

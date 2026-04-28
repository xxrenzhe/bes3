'use client'

import { OperationsConsole } from '@/components/admin/OperationsConsole'

export function PriceValueConsole() {
  return (
    <OperationsConsole
      title="价格价值"
      eyebrow="商业运维"
      description="管理价格快照、价值评分、购买窗口、价格提醒和待发送通知。"
      endpoint="/api/admin/price-value"
      metricKeys={[
        { label: '价格快照', key: 'snapshots' },
        { label: '活跃提醒', key: 'active_alerts' },
        { label: '待发通知', key: 'queued_notifications' },
        { label: '已定价商品', key: 'priced_products' }
      ]}
      actions={[
        { label: '预览刷新', body: { action: 'previewRefresh', limit: 100 }, success: '价格刷新预览已生成', variant: 'outline' },
        { label: '刷新快照', body: { action: 'refreshSnapshots', limit: 100 }, success: '价格快照已刷新' },
        { label: '评估提醒', body: { action: 'evaluateAlerts', limit: 100, queueNotifications: true }, success: '价格提醒已评估', variant: 'secondary' }
      ]}
      sections={[
        {
          title: '最新快照',
          key: 'latestSnapshots',
          columns: [
            { label: '商品', key: 'product_name' },
            { label: '当前价格', key: 'current_price' },
            { label: '价值分', key: 'value_score' },
            { label: '入手机会', key: 'entry_status', badge: true },
            { label: '采集时间', key: 'captured_at', date: true }
          ]
        },
        {
          title: '价格提醒',
          key: 'alerts',
          columns: [
            { label: '商品', key: 'product_name' },
            { label: '邮箱', key: 'email' },
            { label: '目标价', key: 'target_price' },
            { label: '状态', key: 'status', badge: true },
            { label: '更新时间', key: 'updated_at', date: true }
          ]
        },
        {
          title: '通知队列',
          key: 'notifications',
          columns: [
            { label: '商品', key: 'product_name' },
            { label: '邮箱', key: 'email' },
            { label: '渠道', key: 'channel', badge: true },
            { label: '状态', key: 'status', badge: true },
            { label: '入队时间', key: 'queued_at', date: true }
          ]
        }
      ]}
    />
  )
}

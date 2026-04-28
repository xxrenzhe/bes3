'use client'

import { OperationsConsole } from '@/components/admin/OperationsConsole'

export function EvidenceConsole() {
  return (
    <OperationsConsole
      title="证据库"
      eyebrow="证据运维"
      description="查看评测视频、结构化证据、置信度风险、创作者反馈和人工判断记录。"
      endpoint="/api/admin/evidence"
      metricKeys={[
        { label: '视频数', key: 'videos' },
        { label: '待处理视频', key: 'pending_videos' },
        { label: '证据报告', key: 'reports' },
        { label: '低置信报告', key: 'low_confidence_reports' }
      ]}
      sections={[
        {
          title: '评测视频',
          key: 'videos',
          columns: [
            { label: '标题', key: 'title' },
            { label: '频道', key: 'channel_name' },
            { label: '等级', key: 'authority_tier', badge: true },
            { label: '状态', key: 'processed_status', badge: true },
            { label: '更新时间', key: 'updated_at', date: true }
          ]
        },
        {
          title: '证据报告',
          key: 'reports',
          columns: [
            { label: '商品', key: 'product_name' },
            { label: '标签', key: 'tag_name' },
            { label: '评级', key: 'rating', badge: true },
            { label: '置信度', key: 'evidence_confidence' },
            { label: '摘录', key: 'evidence_quote' }
          ]
        },
        {
          title: '反馈队列',
          key: 'feedback',
          columns: [
            { label: '类型', key: 'feedback_type', badge: true },
            { label: 'YouTube', key: 'youtube_id' },
            { label: '权重', key: 'weight_delta' },
            { label: '创建时间', key: 'created_at', date: true }
          ]
        },
        {
          title: '评审决策',
          key: 'decisions',
          columns: [
            { label: '决策', key: 'decision', badge: true },
            { label: '商品', key: 'product_name' },
            { label: '评审人', key: 'reviewer_name' },
            { label: '原因', key: 'reason' },
            { label: '创建时间', key: 'created_at', date: true }
          ]
        }
      ]}
    />
  )
}

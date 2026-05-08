'use client'

import { OperationsConsole } from '@/components/admin/OperationsConsole'

export function RiskConsole() {
  return (
    <OperationsConsole
      title="风险中心"
      eyebrow="风险运维"
      description="聚合证据、链接、SEO、价格和治理风险，优先处理会阻碍公开推荐的问题。"
      endpoint="/api/admin/risk"
      metricKeys={[
        { label: '未处理风险', key: 'open_risks' },
        { label: '链接问题', key: 'link_issues' },
        { label: '证据风险', key: 'evidence_risks' },
        { label: '价格风险', key: 'price_risks' },
        { label: '商业风险', key: 'commercial_risks' }
      ]}
      sections={[
        {
          title: '风险提醒',
          key: 'riskAlerts',
          columns: [
            { label: '标题', key: 'title' },
            { label: '类型', key: 'risk_type', badge: true },
            { label: '严重度', key: 'severity', badge: true },
            { label: '状态', key: 'status', badge: true },
            { label: '发现时间', key: 'detected_at', date: true }
          ]
        },
        {
          title: '链接问题',
          key: 'linkIssues',
          columns: [
            { label: '商品', key: 'product_name' },
            { label: '问题', key: 'issue_type', badge: true },
            { label: 'HTTP', key: 'http_status' },
            { label: '详情', key: 'issue_detail' },
            { label: '检查时间', key: 'checked_at', date: true }
          ]
        },
        {
          title: '商业风险',
          key: 'commercialRisks',
          columns: [
            { label: '商品', key: 'product_name' },
            { label: '风险类型', key: 'risk_type', badge: true },
            { label: '严重度', key: 'severity', badge: true },
            { label: '说明', key: 'message' },
            { label: '证据数', key: 'evidence_count' },
            { label: '价格状态', key: 'price_status', badge: true },
            { label: '更新时间', key: 'updated_at', date: true }
          ]
        },
        {
          title: '证据风险',
          key: 'evidenceRisks',
          columns: [
            { label: '商品', key: 'product_name' },
            { label: '频道', key: 'channel_name' },
            { label: '评级', key: 'rating', badge: true },
            { label: '置信度', key: 'evidence_confidence' },
            { label: '摘录', key: 'evidence_quote' }
          ]
        },
        {
          title: 'SEO 风险',
          key: 'seoRisks',
          columns: [
            { label: '路径', key: 'pathname' },
            { label: '状态', key: 'status', badge: true },
            { label: '索引', key: 'indexing_status', badge: true },
            { label: '更新时间', key: 'updated_at', date: true }
          ]
        }
      ]}
    />
  )
}

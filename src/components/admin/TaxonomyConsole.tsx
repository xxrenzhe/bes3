'use client'

import { OperationsConsole } from '@/components/admin/OperationsConsole'

export function TaxonomyConsole() {
  return (
    <OperationsConsole
      title="分类实验室"
      eyebrow="分类运维"
      description="管理意图来源、待审核标签、活跃分类、pSEO 信号，以及分类演进触发的重扫任务。"
      endpoint="/api/admin/taxonomy"
      metricKeys={[
        { label: '活跃标签', key: 'active_tags' },
        { label: '待审核标签', key: 'pending_tags' },
        { label: '重扫任务', key: 'active_rescans' },
        { label: '新增意图', key: 'new_intents' }
      ]}
      actions={[
        { label: '提升待审核标签', body: { action: 'promotePending', limit: 50, minPriorityScore: 0.5 }, success: '待审核标签已提升' }
      ]}
      sections={[
        {
          title: '分类标签',
          key: 'tags',
          columns: [
            { label: '名称', key: 'canonical_name' },
            { label: '分类', key: 'category_slug' },
            { label: '状态', key: 'status', badge: true },
            { label: '搜索量', key: 'search_volume' },
            { label: '证据', key: 'evidence_count' }
          ]
        },
        {
          title: '待审核标签',
          key: 'pendingTags',
          columns: [
            { label: '名称', key: 'canonical_name' },
            { label: '触发词', key: 'trigger_query' },
            { label: '来源', key: 'source', badge: true },
            { label: '优先级', key: 'priority_score' },
            { label: '状态', key: 'status', badge: true }
          ]
        },
        {
          title: '意图来源',
          key: 'intentSources',
          columns: [
            { label: '查询词', key: 'raw_query' },
            { label: '分类', key: 'category_slug' },
            { label: '来源', key: 'source_type', badge: true },
            { label: '搜索量', key: 'search_volume' },
            { label: '状态', key: 'status', badge: true }
          ]
        },
        {
          title: '重扫队列',
          key: 'rescanQueue',
          columns: [
            { label: '分类', key: 'category_slug' },
            { label: '标签', key: 'tag_slug' },
            { label: '原因', key: 'reason' },
            { label: '状态', key: 'status', badge: true },
            { label: '更新时间', key: 'updated_at', date: true }
          ]
        }
      ]}
    />
  )
}

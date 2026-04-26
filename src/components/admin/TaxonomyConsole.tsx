'use client'

import { OperationsConsole } from '@/components/admin/OperationsConsole'

export function TaxonomyConsole() {
  return (
    <OperationsConsole
      title="Taxonomy Lab"
      eyebrow="Taxonomy Ops"
      description="Manage intent sources, pending tags, active taxonomy, pSEO signals, and rescan work triggered by tag evolution."
      endpoint="/api/admin/taxonomy"
      metricKeys={[
        { label: 'Active Tags', key: 'active_tags' },
        { label: 'Pending Tags', key: 'pending_tags' },
        { label: 'Active Rescans', key: 'active_rescans' },
        { label: 'New Intents', key: 'new_intents' }
      ]}
      actions={[
        { label: 'Promote Pending Tags', body: { action: 'promotePending', limit: 50, minPriorityScore: 0.5 }, success: 'Pending tags promoted' }
      ]}
      sections={[
        {
          title: 'Taxonomy Tags',
          key: 'tags',
          columns: [
            { label: 'Name', key: 'canonical_name' },
            { label: 'Category', key: 'category_slug' },
            { label: 'Status', key: 'status', badge: true },
            { label: 'Volume', key: 'search_volume' },
            { label: 'Evidence', key: 'evidence_count' }
          ]
        },
        {
          title: 'Pending Tags',
          key: 'pendingTags',
          columns: [
            { label: 'Name', key: 'canonical_name' },
            { label: 'Trigger', key: 'trigger_query' },
            { label: 'Source', key: 'source', badge: true },
            { label: 'Priority', key: 'priority_score' },
            { label: 'Status', key: 'status', badge: true }
          ]
        },
        {
          title: 'Intent Sources',
          key: 'intentSources',
          columns: [
            { label: 'Query', key: 'raw_query' },
            { label: 'Category', key: 'category_slug' },
            { label: 'Source', key: 'source_type', badge: true },
            { label: 'Volume', key: 'search_volume' },
            { label: 'Status', key: 'status', badge: true }
          ]
        },
        {
          title: 'Rescan Queue',
          key: 'rescanQueue',
          columns: [
            { label: 'Category', key: 'category_slug' },
            { label: 'Tag', key: 'tag_slug' },
            { label: 'Reason', key: 'reason' },
            { label: 'Status', key: 'status', badge: true },
            { label: 'Updated', key: 'updated_at', date: true }
          ]
        }
      ]}
    />
  )
}

'use client'

import { OperationsConsole } from '@/components/admin/OperationsConsole'

export function DataManagementConsole() {
  return (
    <OperationsConsole
      title="Data Management"
      eyebrow="Data Ops"
      description="Inspect import runs, audit trails, migrations, settings inventory, media assets, and runtime backup commands."
      endpoint="/api/admin/data"
      metricKeys={[
        { label: 'Import Runs', key: 'import_runs' },
        { label: 'Audit Logs', key: 'audit_logs' },
        { label: 'Migrations', key: 'migrations' },
        { label: 'Media Assets', key: 'media_assets' }
      ]}
      actions={[
        {
          label: 'Validate Sample Import',
          body: {
            importType: 'manual',
            sourceFilename: 'admin-dry-run.json',
            dryRun: true,
            keyField: 'externalId',
            rows: [
              { externalId: 'sample-product-1', name: 'Sample product' },
              { externalId: 'sample-product-1', name: 'Duplicate sample product' },
              { name: 'Missing key sample product' }
            ]
          },
          success: 'Import dry-run validated',
          variant: 'outline'
        }
      ]}
      sections={[
        {
          title: 'Import Runs',
          key: 'imports',
          columns: [
            { label: 'Type', key: 'import_type', badge: true },
            { label: 'File', key: 'source_filename' },
            { label: 'Status', key: 'status', badge: true },
            { label: 'Rows', key: 'total_rows' },
            { label: 'Conflicts', key: 'conflict_rows' },
            { label: 'Created', key: 'created_at', date: true }
          ]
        },
        {
          title: 'Audit Logs',
          key: 'audits',
          columns: [
            { label: 'Action', key: 'action' },
            { label: 'Entity', key: 'entity_type', badge: true },
            { label: 'ID', key: 'entity_id' },
            { label: 'Actor', key: 'actor_role', badge: true },
            { label: 'Created', key: 'created_at', date: true }
          ]
        },
        {
          title: 'Migrations',
          key: 'migrations',
          columns: [
            { label: 'Migration', key: 'migration_name' },
            { label: 'Applied', key: 'applied_at', date: true }
          ]
        },
        {
          title: 'Backup & Restore Commands',
          key: 'backups',
          columns: [
            { label: 'Name', key: 'name' },
            { label: 'Command', key: 'command' },
            { label: 'Scope', key: 'scope' }
          ]
        }
      ]}
    />
  )
}

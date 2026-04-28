'use client'

import { OperationsConsole } from '@/components/admin/OperationsConsole'

export function DataManagementConsole() {
  return (
    <OperationsConsole
      title="数据管理"
      eyebrow="数据运维"
      description="查看导入记录、审计日志、数据库迁移、媒体资产和运行时备份命令。"
      endpoint="/api/admin/data"
      metricKeys={[
        { label: '导入记录', key: 'import_runs' },
        { label: '审计日志', key: 'audit_logs' },
        { label: '迁移记录', key: 'migrations' },
        { label: '媒体资产', key: 'media_assets' }
      ]}
      actions={[
        {
          label: '验证样例导入',
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
          success: '导入预检已完成',
          variant: 'outline',
          confirmMessage: '是否运行 3 条样例数据的导入预检？系统会记录一次包含预期冲突的后台导入记录。'
        }
      ]}
      sections={[
        {
          title: '导入记录',
          key: 'imports',
          columns: [
            { label: '类型', key: 'import_type', badge: true },
            { label: '文件', key: 'source_filename' },
            { label: '状态', key: 'status', badge: true },
            { label: '行数', key: 'total_rows' },
            { label: '冲突', key: 'conflict_rows' },
            { label: '创建时间', key: 'created_at', date: true }
          ]
        },
        {
          title: '审计日志',
          key: 'audits',
          columns: [
            { label: '动作', key: 'action' },
            { label: '实体', key: 'entity_type', badge: true },
            { label: 'ID', key: 'entity_id' },
            { label: '操作者', key: 'actor_role', badge: true },
            { label: '创建时间', key: 'created_at', date: true }
          ]
        },
        {
          title: '迁移记录',
          key: 'migrations',
          columns: [
            { label: '迁移名称', key: 'migration_name' },
            { label: '应用时间', key: 'applied_at', date: true }
          ]
        },
        {
          title: '备份与恢复命令',
          key: 'backups',
          columns: [
            { label: '名称', key: 'name' },
            { label: '命令', key: 'command' },
            { label: '范围', key: 'scope' }
          ]
        }
      ]}
    />
  )
}

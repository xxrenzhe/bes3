import { getDatabase } from '@/lib/db'
import type { SettingDataType } from '@/lib/types'

export interface SettingRecord {
  category: string
  key: string
  value: string | null
  dataType: SettingDataType
  isSensitive: boolean
  description: string | null
}

function mapSetting(row: {
  category: string
  key: string
  value: string | null
  data_type: SettingDataType
  is_sensitive: number | boolean
  description: string | null
}): SettingRecord {
  return {
    category: row.category,
    key: row.key,
    value: row.value,
    dataType: row.data_type,
    isSensitive: row.is_sensitive === true || row.is_sensitive === 1,
    description: row.description
  }
}

export async function listSettings(): Promise<SettingRecord[]> {
  const db = await getDatabase()
  const rows = await db.query<{
    category: string
    key: string
    value: string | null
    data_type: SettingDataType
    is_sensitive: number | boolean
    description: string | null
  }>('SELECT category, key, value, data_type, is_sensitive, description FROM system_settings ORDER BY category, key')
  return rows.map(mapSetting)
}

export async function getSettingValue(category: string, key: string): Promise<string | null> {
  const db = await getDatabase()
  const row = await db.queryOne<{ value: string | null }>(
    'SELECT value FROM system_settings WHERE category = ? AND key = ? LIMIT 1',
    [category, key]
  )
  return row?.value ?? null
}

export async function saveSetting(input: {
  category: string
  key: string
  value: string | null
  dataType?: SettingDataType
  isSensitive?: boolean
  description?: string | null
}): Promise<void> {
  const db = await getDatabase()
  const existing = await db.queryOne<{ id: number }>(
    'SELECT id FROM system_settings WHERE category = ? AND key = ? LIMIT 1',
    [input.category, input.key]
  )

  if (existing?.id) {
    await db.exec(
      `
        UPDATE system_settings
        SET value = ?, data_type = ?, is_sensitive = ?, description = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [input.value, input.dataType || 'string', input.isSensitive ? 1 : 0, input.description || null, existing.id]
    )
    return
  }

  await db.exec(
    `
      INSERT INTO system_settings (category, key, value, data_type, is_sensitive, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [input.category, input.key, input.value, input.dataType || 'string', input.isSensitive ? 1 : 0, input.description || null]
  )
}

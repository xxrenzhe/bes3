import { isEncryptedWithCurrentKey, reencryptToCurrentKey } from '@/lib/crypto'
import { getDatabase } from '@/lib/db'
import type { DatabaseAdapter } from '@/lib/types'

export interface EncryptionRotationFailure {
  table: string
  id: number
  label: string
  error: string
}

export interface EncryptionRotationResult {
  dryRun: boolean
  scanned: number
  alreadyCurrent: number
  reencrypted: number
  failed: number
  failures: EncryptionRotationFailure[]
}

type SystemSettingEncryptedRow = {
  id: number
  category: string
  key: string
  encrypted_value: string | null
}

function createEmptyResult(dryRun: boolean): EncryptionRotationResult {
  return {
    dryRun,
    scanned: 0,
    alreadyCurrent: 0,
    reencrypted: 0,
    failed: 0,
    failures: []
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function rotateSystemSettingsEncryptedValues(
  db: DatabaseAdapter,
  result: EncryptionRotationResult
): Promise<void> {
  const rows = await db.query<SystemSettingEncryptedRow>(
    `
      SELECT id, category, key, encrypted_value
      FROM system_settings
      WHERE encrypted_value IS NOT NULL
        AND TRIM(encrypted_value) <> ''
      ORDER BY id
    `
  )

  for (const row of rows) {
    result.scanned += 1
    const label = `${row.category}.${row.key}`
    const encryptedValue = row.encrypted_value || ''

    try {
      if (isEncryptedWithCurrentKey(encryptedValue)) {
        result.alreadyCurrent += 1
        continue
      }

      const rotatedValue = reencryptToCurrentKey(encryptedValue)
      if (!result.dryRun) {
        await db.exec(
          'UPDATE system_settings SET encrypted_value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [rotatedValue, row.id]
        )
      }
      result.reencrypted += 1
    } catch (error) {
      result.failed += 1
      result.failures.push({
        table: 'system_settings',
        id: row.id,
        label,
        error: getErrorMessage(error)
      })
    }
  }
}

export async function rotateEncryptedDatabaseValues(options: {
  apply?: boolean
  db?: DatabaseAdapter
} = {}): Promise<EncryptionRotationResult> {
  const db = options.db || await getDatabase()
  const result = createEmptyResult(!options.apply)

  const run = async () => {
    await rotateSystemSettingsEncryptedValues(db, result)
    return result
  }

  return options.apply ? db.transaction(run) : run()
}

#!/usr/bin/env tsx

import assert from 'node:assert/strict'
import { encryptSecret } from '../src/lib/crypto'
import { rotateEncryptedDatabaseValues } from '../src/lib/encryption-rotation'
import type { DatabaseAdapter } from '../src/lib/types'

class MemoryDatabaseAdapter implements DatabaseAdapter {
  type = 'sqlite' as const
  rows: Array<{
    id: number
    category: string
    key: string
    encrypted_value: string | null
  }> = []

  async query<T = Record<string, unknown>>(): Promise<T[]> {
    return this.rows
      .filter((row) => row.encrypted_value && row.encrypted_value.trim())
      .sort((left, right) => left.id - right.id) as T[]
  }

  async queryOne<T = Record<string, unknown>>(): Promise<T | undefined> {
    return undefined
  }

  async exec(sql: string, params: unknown[] = []): Promise<{ changes: number; lastInsertRowid?: number }> {
    assert.match(sql, /UPDATE system_settings SET encrypted_value = \?, updated_at = CURRENT_TIMESTAMP WHERE id = \?/)
    const [encryptedValue, id] = params
    const row = this.rows.find((item) => item.id === id)
    if (!row) return { changes: 0 }
    row.encrypted_value = String(encryptedValue)
    return { changes: 1 }
  }

  async transaction<T>(fn: () => T | Promise<T>): Promise<T> {
    return fn()
  }
}

function setEncryptionEnv(current: string, previous?: string) {
  process.env.ENCRYPTION_KEY = current
  if (previous === undefined) {
    delete process.env.ENCRYPTION_PREVIOUS_KEYS
  } else {
    process.env.ENCRYPTION_PREVIOUS_KEYS = previous
  }
}

const previousEnv = {
  current: process.env.ENCRYPTION_KEY,
  previous: process.env.ENCRYPTION_PREVIOUS_KEYS
}

async function main() {
  const oldKey = 'old-rotation-passphrase'
  const newKey = 'new-rotation-passphrase'
  const db = new MemoryDatabaseAdapter()

  setEncryptionEnv(oldKey)
  const oldEncrypted = encryptSecret('stored-secret')

  setEncryptionEnv(newKey)
  const currentEncrypted = encryptSecret('current-secret')
  db.rows = [
    { id: 1, category: 'ai', key: 'gemini_api_key', encrypted_value: oldEncrypted },
    { id: 2, category: 'media', key: 's3SecretAccessKey', encrypted_value: currentEncrypted },
    { id: 3, category: 'empty', key: 'ignored', encrypted_value: '' }
  ]

  setEncryptionEnv(newKey, oldKey)
  const dryRun = await rotateEncryptedDatabaseValues({ db })
  assert.equal(dryRun.dryRun, true)
  assert.equal(dryRun.scanned, 2)
  assert.equal(dryRun.alreadyCurrent, 1)
  assert.equal(dryRun.reencrypted, 1)
  assert.equal(dryRun.failed, 0)
  assert.equal(db.rows[0].encrypted_value, oldEncrypted)

  const applied = await rotateEncryptedDatabaseValues({ db, apply: true })
  assert.equal(applied.dryRun, false)
  assert.equal(applied.scanned, 2)
  assert.equal(applied.alreadyCurrent, 1)
  assert.equal(applied.reencrypted, 1)
  assert.equal(applied.failed, 0)
  assert.notEqual(db.rows[0].encrypted_value, oldEncrypted)

  const afterApply = await rotateEncryptedDatabaseValues({ db })
  assert.equal(afterApply.scanned, 2)
  assert.equal(afterApply.alreadyCurrent, 2)
  assert.equal(afterApply.reencrypted, 0)

  console.log('Encryption rotation check passed')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => {
    if (previousEnv.current === undefined) {
      delete process.env.ENCRYPTION_KEY
    } else {
      process.env.ENCRYPTION_KEY = previousEnv.current
    }
    if (previousEnv.previous === undefined) {
      delete process.env.ENCRYPTION_PREVIOUS_KEYS
    } else {
      process.env.ENCRYPTION_PREVIOUS_KEYS = previousEnv.previous
    }
  })

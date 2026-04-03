import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import type { DatabaseAdapter } from '@/lib/types'

export class SQLiteAdapter implements DatabaseAdapter {
  type = 'sqlite' as const
  private db: Database.Database

  constructor(dbPath: string) {
    const directory = path.dirname(dbPath)
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true })
    }

    this.db = new Database(dbPath)
    this.db.pragma('foreign_keys = ON')
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('synchronous = NORMAL')
  }

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    return this.db.prepare(sql).all(...params) as T[]
  }

  async queryOne<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    return this.db.prepare(sql).get(...params) as T | undefined
  }

  async exec(sql: string, params: unknown[] = []): Promise<{ changes: number; lastInsertRowid?: number }> {
    const result = this.db.prepare(sql).run(...params)
    return {
      changes: result.changes,
      lastInsertRowid: Number(result.lastInsertRowid)
    }
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    const runner = this.db.transaction(() => fn())
    return runner() as Promise<T>
  }
}

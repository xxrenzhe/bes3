import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import type { DatabaseAdapter } from '@/lib/types'

export class SQLiteAdapter implements DatabaseAdapter {
  type = 'sqlite' as const
  private db: Database.Database
  private readonly transactionStatements: {
    begin: Database.Statement
    commit: Database.Statement
    rollback: Database.Statement
    savepoint: Database.Statement
    release: Database.Statement
    rollbackTo: Database.Statement
  }

  constructor(dbPath: string) {
    const directory = path.dirname(dbPath)
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true })
    }

    this.db = new Database(dbPath)
    this.db.pragma('busy_timeout = 5000')
    this.db.pragma('foreign_keys = ON')
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('synchronous = NORMAL')
    this.transactionStatements = {
      begin: this.db.prepare('BEGIN'),
      commit: this.db.prepare('COMMIT'),
      rollback: this.db.prepare('ROLLBACK'),
      savepoint: this.db.prepare('SAVEPOINT `\t_bs3.\t`'),
      release: this.db.prepare('RELEASE `\t_bs3.\t`'),
      rollbackTo: this.db.prepare('ROLLBACK TO `\t_bs3.\t`')
    }
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

  async transaction<T>(fn: () => T | Promise<T>): Promise<T> {
    const statements = this.db.inTransaction
      ? {
          before: this.transactionStatements.savepoint,
          after: this.transactionStatements.release,
          undo: this.transactionStatements.rollbackTo
        }
      : {
          before: this.transactionStatements.begin,
          after: this.transactionStatements.commit,
          undo: this.transactionStatements.rollback
        }

    statements.before.run()
    try {
      const result = await fn()
      statements.after.run()
      return result
    } catch (error) {
      if (this.db.inTransaction) {
        statements.undo.run()
        if (statements.undo !== this.transactionStatements.rollback) {
          statements.after.run()
        }
      }
      throw error
    }
  }
}

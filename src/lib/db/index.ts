import path from 'node:path'
import type { DatabaseAdapter } from '@/lib/types'
import { PostgresAdapter } from '@/lib/db/postgres'
import { ensureSchema } from '@/lib/db/schema'
import { SQLiteAdapter } from '@/lib/db/sqlite'

let dbPromise: Promise<DatabaseAdapter> | null = null
let schemaReady = false

function createDatabase(): DatabaseAdapter {
  const databaseUrl = process.env.DATABASE_URL
  if (databaseUrl) {
    return new PostgresAdapter(databaseUrl)
  }

  const databasePath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'bes3.db')
  return new SQLiteAdapter(databasePath)
}

export async function getDatabase(): Promise<DatabaseAdapter> {
  if (!dbPromise) {
    dbPromise = Promise.resolve(createDatabase())
  }

  const db = await dbPromise
  if (!schemaReady) {
    await ensureSchema(db)
    schemaReady = true
  }
  return db
}

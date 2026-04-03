import postgres from 'postgres'
import type { DatabaseAdapter } from '@/lib/types'

function convertPlaceholders(sql: string): string {
  let index = 1
  return sql.replace(/\?/g, () => `$${index++}`)
}

export class PostgresAdapter implements DatabaseAdapter {
  type = 'postgres' as const
  private client: postgres.Sql<Record<string, unknown>>

  constructor(connectionString: string) {
    this.client = postgres(connectionString, {
      max: 10,
      idle_timeout: 30,
      connect_timeout: 10
    })
  }

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const result = await this.client.unsafe(convertPlaceholders(sql), params as any[])
    return result as unknown as T[]
  }

  async queryOne<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    const rows = await this.query<T>(sql, params)
    return rows[0]
  }

  async exec(sql: string, params: unknown[] = []): Promise<{ changes: number; lastInsertRowid?: number }> {
    const isInsert = /^\s*INSERT\b/i.test(sql) && !/\bRETURNING\b/i.test(sql)
    const statement = isInsert ? `${convertPlaceholders(sql)} RETURNING id` : convertPlaceholders(sql)
    const result = (await this.client.unsafe(statement, params as any[])) as unknown as Array<{ id?: number | string }>
    return {
      changes: Array.isArray(result) ? result.length : 0,
      lastInsertRowid: isInsert && Array.isArray(result) && result[0]?.id != null ? Number(result[0].id) : undefined
    }
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    return this.client.begin(async () => fn()) as unknown as Promise<T>
  }
}

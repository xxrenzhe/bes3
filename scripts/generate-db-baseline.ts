#!/usr/bin/env tsx

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { ensureSchema } from '../src/lib/db/schema'
import { SQLiteAdapter } from '../src/lib/db/sqlite'
import {
  introspectSchemaDefinition,
  renderMarkdownDictionary,
  renderPostgresBaseline,
  renderSqliteBaseline
} from '../src/lib/db/schema-definition'

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bes3-schema-'))
  const dbPath = path.join(tempDir, 'baseline.db')
  const db = new SQLiteAdapter(dbPath)
  await ensureSchema(db)

  const definition = await introspectSchemaDefinition(db)
  const root = process.cwd()
  const sqlitePath = path.join(root, 'migrations', '000_init_schema_consolidated.sqlite.sql')
  const postgresPath = path.join(root, 'pg-migrations', '000_init_schema_consolidated.pg.sql')
  const dictionaryPath = path.join(root, 'docs', 'planv2', 'database-dictionary.generated.md')

  fs.mkdirSync(path.dirname(sqlitePath), { recursive: true })
  fs.mkdirSync(path.dirname(postgresPath), { recursive: true })
  fs.mkdirSync(path.dirname(dictionaryPath), { recursive: true })

  fs.writeFileSync(sqlitePath, renderSqliteBaseline(definition))
  fs.writeFileSync(postgresPath, renderPostgresBaseline(definition))
  fs.writeFileSync(dictionaryPath, renderMarkdownDictionary(definition))

  console.log(`Generated ${definition.tables.length} table definitions`)
  console.log(`SQLite baseline: ${sqlitePath}`)
  console.log(`PostgreSQL baseline: ${postgresPath}`)
  console.log(`Dictionary: ${dictionaryPath}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

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

type DriftCheck = {
  label: string
  filePath: string
  expected: string
}

function normalize(value: string): string {
  return value.replace(/\r\n/g, '\n').trim()
}

async function buildChecks(): Promise<DriftCheck[]> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bes3-schema-drift-'))
  const dbPath = path.join(tempDir, 'baseline.db')
  const db = new SQLiteAdapter(dbPath)
  await ensureSchema(db)

  const definition = await introspectSchemaDefinition(db)
  const root = process.cwd()
  return [
    {
      label: 'SQLite baseline',
      filePath: path.join(root, 'migrations', '000_init_schema_consolidated.sqlite.sql'),
      expected: renderSqliteBaseline(definition)
    },
    {
      label: 'PostgreSQL baseline',
      filePath: path.join(root, 'pg-migrations', '000_init_schema_consolidated.pg.sql'),
      expected: renderPostgresBaseline(definition)
    },
    {
      label: 'Database dictionary',
      filePath: path.join(root, 'docs', 'planv2', 'database-dictionary.generated.md'),
      expected: renderMarkdownDictionary(definition)
    }
  ]
}

async function main() {
  const checks = await buildChecks()
  const drifted = checks.filter((check) => {
    if (!fs.existsSync(check.filePath)) return true
    return normalize(fs.readFileSync(check.filePath, 'utf8')) !== normalize(check.expected)
  })

  if (drifted.length > 0) {
    console.error('Database schema baseline drift detected:')
    for (const check of drifted) {
      console.error(`- ${check.label}: ${path.relative(process.cwd(), check.filePath)}`)
    }
    console.error('Run `npm run db:generate-baseline` and commit the regenerated artifacts.')
    process.exit(1)
  }

  console.log('Database schema baseline drift check passed')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

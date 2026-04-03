#!/usr/bin/env tsx
/**
 * 数据库迁移 CLI 入口
 * 调用 scripts/migrate.ts 执行迁移
 */
import { spawn } from 'node:child_process'
import path from 'node:path'

const script = path.join(process.cwd(), 'scripts', 'migrate.ts')

const child = spawn('tsx', [script], {
  stdio: 'inherit',
  env: { ...process.env }
})

child.on('exit', (code) => {
  process.exit(code ?? 0)
})

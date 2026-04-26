#!/usr/bin/env tsx
/**
 * Bes3 Pipeline Worker 独立进程入口
 *
 * 由 supervisord 管理，独立于 Next.js 进程运行。
 * 启动后持续从数据库队列拉取并执行 pipeline 任务。
 *
 * 日志输出到 stdout，由 supervisord 捕获到独立日志文件。
 */

import './load-env'
import { getDatabase } from '../src/lib/db'
import { markPipelineWorkerStopped, startPipelineWorker } from '../src/lib/pipeline'

let shuttingDown = false

async function shutdown(signal: string) {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`[bes3-worker] Received ${signal}, marking worker stopped...`)
  try {
    await markPipelineWorkerStopped()
  } catch (error) {
    console.error('[bes3-worker] Failed to mark worker stopped:', error)
  } finally {
    process.exit(0)
  }
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))

async function main() {
  console.log('[bes3-worker] Starting pipeline worker...')

  // 初始化数据库（触发 ensureSchema + runMigrations）
  await getDatabase()
  console.log('[bes3-worker] Database initialized')

  // 启动 worker（加载配置 + 恢复中断任务 + 启动 tick 循环）
  await startPipelineWorker()

  console.log('[bes3-worker] Pipeline worker started')
}

main().catch((err) => {
  console.error('[bes3-worker] Fatal error:', err)
  process.exit(1)
})

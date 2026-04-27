import './load-env'
import { spawn } from 'node:child_process'
import { bootstrapApplication } from '@/lib/bootstrap'

let child: ReturnType<typeof spawn> | null = null
let shuttingDown = false

function forwardSignal(signal: NodeJS.Signals) {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`[bes3-web] Received ${signal}, stopping web process...`)
  if (child && !child.killed) {
    child.kill(signal)
    return
  }
  process.exit(0)
}

process.on('SIGTERM', () => forwardSignal('SIGTERM'))
process.on('SIGINT', () => forwardSignal('SIGINT'))

async function main() {
  if (process.env.SKIP_RUNTIME_DB_INIT === 'true') {
    console.log('[bes3-web] SKIP_RUNTIME_DB_INIT=true, using entrypoint bootstrap result')
  } else {
    console.log('[bes3-web] Running database and application bootstrap before server start...')
    await bootstrapApplication()
    console.log('[bes3-web] Bootstrap completed, starting Next standalone server...')
  }

  child = spawn(process.execPath, ['server.js'], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: process.env
  })

  child.on('exit', (code, signal) => {
    child = null
    if (signal) {
      process.kill(process.pid, signal)
      return
    }
    process.exit(code ?? 1)
  })
}

main().catch((error) => {
  console.error('[bes3-web] Failed to initialize before server start:', error)
  process.exit(1)
})

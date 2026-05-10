#!/usr/bin/env tsx

import './load-env'
import { rotateEncryptedDatabaseValues } from '../src/lib/encryption-rotation'

function hasFlag(flag: string): boolean {
  return process.argv.slice(2).includes(flag)
}

async function main() {
  const apply = hasFlag('--apply')
  const result = await rotateEncryptedDatabaseValues({ apply })

  console.log(`Encryption key rotation ${result.dryRun ? 'dry-run' : 'apply'} complete`)
  console.log(`- scanned: ${result.scanned}`)
  console.log(`- already current: ${result.alreadyCurrent}`)
  console.log(`- ${result.dryRun ? 'would re-encrypt' : 're-encrypted'}: ${result.reencrypted}`)
  console.log(`- failed: ${result.failed}`)

  for (const failure of result.failures) {
    console.error(`- ${failure.table}#${failure.id} ${failure.label}: ${failure.error}`)
  }

  if (result.failed > 0) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Encryption key rotation failed:', error)
  process.exit(1)
})

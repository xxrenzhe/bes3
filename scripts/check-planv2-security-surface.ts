#!/usr/bin/env tsx

import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const proxyPath = path.join(root, 'src', 'proxy.ts')
const robotsPath = path.join(root, 'src', 'app', 'robots.ts')

const checks = [
  {
    label: 'proxy request id propagation',
    filePath: proxyPath,
    required: ['crypto.randomUUID()', "requestHeaders.set('x-request-id'", "return NextResponse.json({ error: 'Unauthorized', requestId }"]
  },
  {
    label: 'proxy scan blocking',
    filePath: proxyPath,
    required: ['MALICIOUS_SCAN_PATTERNS', 'isMaliciousScanPath', 'x-bes3-blocked-reason', 'wp-admin', '\\.env']
  },
  {
    label: 'public/admin route separation',
    filePath: proxyPath,
    required: ["pathname.startsWith('/api/admin')", "return NextResponse.redirect(new URL('/login'", "pathname.startsWith('/api/open/')"]
  },
  {
    label: 'robots admin exclusion',
    filePath: robotsPath,
    required: ["'/admin'", "'/api/admin'", "'/api/auth'", "'/api/open/'"]
  }
]

const failures = checks.flatMap((check) => {
  if (!fs.existsSync(check.filePath)) return [`${check.label}: missing ${path.relative(root, check.filePath)}`]
  const content = fs.readFileSync(check.filePath, 'utf8')
  return check.required
    .filter((required) => !content.includes(required))
    .map((required) => `${check.label}: missing "${required}"`)
})

if (failures.length > 0) {
  console.error('Planv2 security surface check failed:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('Planv2 security surface check passed')

#!/usr/bin/env tsx

import { execFileSync } from 'node:child_process'
import { getDatabase } from '@/lib/db'

type AuditReport = {
  vulnerabilities?: Record<
    string,
    {
      name?: string
      severity?: string
      via?: Array<string | { source?: number; name?: string; title?: string; url?: string; severity?: string; range?: string }>
      nodes?: string[]
      effects?: string[]
      range?: string
    }
  >
  metadata?: {
    vulnerabilities?: Record<string, number>
  }
}

type AllowedVulnerabilityRule = {
  severity: string
  nodes: string[]
  effects?: string[]
  viaDependency?: string
  advisoryTitle?: string
}

const ALLOWED_VULNERABILITIES: Record<string, AllowedVulnerabilityRule> = {
  next: {
    severity: 'moderate',
    nodes: ['node_modules/next'],
    effects: [],
    viaDependency: 'postcss'
  },
  postcss: {
    severity: 'moderate',
    nodes: ['node_modules/next/node_modules/postcss'],
    effects: ['next'],
    advisoryTitle: 'PostCSS has XSS via Unescaped </style> in its CSS Stringify Output'
  }
}

const MONITORED_ALERT_ID = 'next-bundled-postcss'
const UNEXPECTED_ALERT_ID = 'unexpected-findings'

function readAuditReport(): AuditReport {
  try {
    const output = execFileSync('npm', ['audit', '--json'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    })
    return JSON.parse(output) as AuditReport
  } catch (error: any) {
    const stdout = typeof error?.stdout === 'string' && error.stdout.trim() ? error.stdout : ''
    if (!stdout) {
      throw error
    }
    return JSON.parse(stdout) as AuditReport
  }
}

function arraysEqual(left: string[] = [], right: string[] = []) {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function matchesAllowedRule(name: string, vulnerability: NonNullable<AuditReport['vulnerabilities']>[string]) {
  const rule = ALLOWED_VULNERABILITIES[name]
  if (!rule) return false
  if (String(vulnerability.severity || '') !== rule.severity) return false
  if (!arraysEqual(vulnerability.nodes || [], rule.nodes)) return false
  if (rule.effects && !arraysEqual(vulnerability.effects || [], rule.effects)) return false

  const via = Array.isArray(vulnerability.via) ? vulnerability.via : []
  if (rule.viaDependency) {
    return via.some((entry) => typeof entry === 'string' && entry === rule.viaDependency)
  }
  if (rule.advisoryTitle) {
    return via.some((entry) => typeof entry === 'object' && String(entry?.title || '') === rule.advisoryTitle)
  }
  return true
}

async function upsertRiskAlert(input: {
  entityId: string
  severity: 'warning' | 'high'
  title: string
  message: string
  details: Record<string, unknown>
  status: 'open' | 'resolved'
  createIfMissing?: boolean
}) {
  const db = await getDatabase()
  const existing = await db.queryOne<{ id: number }>(
    `
      SELECT id
      FROM admin_risk_alerts
      WHERE risk_type = 'dependency_audit'
        AND entity_type = 'npm_audit'
        AND entity_id = ?
      ORDER BY id DESC
      LIMIT 1
    `,
    [input.entityId]
  )

  if (existing) {
    await db.exec(
      `
        UPDATE admin_risk_alerts
        SET severity = ?,
            title = ?,
            message = ?,
            status = ?,
            details_json = ?,
            resolved_at = CASE WHEN ? = 'resolved' THEN CURRENT_TIMESTAMP ELSE NULL END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [input.severity, input.title, input.message, input.status, JSON.stringify(input.details), input.status, existing.id]
    )
    return existing.id
  }

  if (input.createIfMissing === false) {
    return 0
  }

  const result = await db.exec(
    `
      INSERT INTO admin_risk_alerts (
        risk_type, severity, entity_type, entity_id, title, message, status, details_json, detected_at, resolved_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CASE WHEN ? = 'resolved' THEN CURRENT_TIMESTAMP ELSE NULL END, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    ['dependency_audit', input.severity, 'npm_audit', input.entityId, input.title, input.message, input.status, JSON.stringify(input.details), input.status]
  )
  return Number(result.lastInsertRowid || 0)
}

async function main() {
  const report = readAuditReport()
  const vulnerabilities = report.vulnerabilities || {}
  const entries = Object.entries(vulnerabilities)
  const unexpected = entries.filter(([name, vulnerability]) => !matchesAllowedRule(name, vulnerability))
  const monitoredResidual = entries.filter(([name, vulnerability]) => matchesAllowedRule(name, vulnerability))

  const summary = {
    checkedAt: new Date().toISOString(),
    counts: report.metadata?.vulnerabilities || {},
    monitoredResidual: monitoredResidual.map(([name, vulnerability]) => ({
      name,
      severity: vulnerability.severity,
      nodes: vulnerability.nodes || [],
      effects: vulnerability.effects || []
    })),
    unexpected: unexpected.map(([name, vulnerability]) => ({
      name,
      severity: vulnerability.severity,
      nodes: vulnerability.nodes || [],
      effects: vulnerability.effects || [],
      via: vulnerability.via || []
    }))
  }

  if (monitoredResidual.length > 0) {
    await upsertRiskAlert({
      entityId: MONITORED_ALERT_ID,
      severity: 'warning',
      status: 'open',
      title: 'Monitored npm audit residual from bundled Next.js PostCSS',
      message:
        'npm audit still reports the upstream Next.js bundled PostCSS advisory. This is tracked as a monitored residual until Next.js ships a fixed bundled version.',
      details: summary
    })
  } else {
    await upsertRiskAlert({
      entityId: MONITORED_ALERT_ID,
      severity: 'warning',
      status: 'resolved',
      title: 'Monitored npm audit residual from bundled Next.js PostCSS',
      message: 'Previously monitored bundled PostCSS audit residual is no longer present.',
      details: summary
    })
  }

  if (unexpected.length > 0) {
    await upsertRiskAlert({
      entityId: UNEXPECTED_ALERT_ID,
      severity: 'high',
      status: 'open',
      title: 'Unexpected npm audit findings require remediation',
      message: `Detected ${unexpected.length} unexpected npm audit finding(s) outside the monitored Next.js bundled PostCSS residual.`,
      details: summary
    })
    console.error('Dependency audit failed with unexpected findings:')
    console.error(JSON.stringify(summary, null, 2))
    process.exit(1)
  }

  await upsertRiskAlert({
    entityId: UNEXPECTED_ALERT_ID,
    severity: 'high',
    status: 'resolved',
    title: 'Unexpected npm audit findings require remediation',
    message: 'No unexpected npm audit findings are currently present.',
    details: summary,
    createIfMissing: false
  })

  if (monitoredResidual.length > 0) {
    console.log('Dependency audit passed with monitored residual only.')
    console.log(JSON.stringify(summary, null, 2))
    return
  }

  console.log('Dependency audit passed with no residual findings.')
  console.log(JSON.stringify(summary, null, 2))
}

void main()

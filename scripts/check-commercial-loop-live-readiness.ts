#!/usr/bin/env tsx

import './load-env'
import { bootstrapApplication } from '@/lib/bootstrap'
import { buildCommercialLoopRuntimeGuide, runCommercialLoop, type CommercialLoopOptions } from '@/lib/commercial-loop'

type ReadinessCheck = {
  label: string
  ok: boolean
  detail: string
}

function hasFlag(name: string) {
  return process.argv.includes(`--${name}`)
}

function readFlag(name: string) {
  const prefix = `--${name}=`
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length) || ''
}

function readNumberFlag(name: string, fallback: number) {
  const raw = readFlag(name)
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function readSyncPlatform(): CommercialLoopOptions['syncPlatform'] {
  const raw = String(readFlag('sync') || 'amazon').trim().toLowerCase()
  if (raw === 'amazon' || raw === 'dtc' || raw === 'all' || raw === 'none') return raw
  return 'amazon'
}

function envValue(name: string) {
  return String(process.env[name] || '').trim()
}

function isValidJsonArray(value: string) {
  if (!value) return false
  try {
    return Array.isArray(JSON.parse(value))
  } catch {
    return false
  }
}

function buildReadinessChecks(): ReadinessCheck[] {
  const hasPartnerBoost = Boolean(envValue('PARTNERBOOST_AMAZON_TOKEN') || envValue('PARTNERBOOST_DTC_TOKEN') || envValue('PARTNERBOOST_TOKEN'))
  const hasAi = Boolean(envValue('GEMINI_RELAY_API_KEY') || envValue('GEMINI_API_KEY'))
  const proxyJson = envValue('BROWSER_PROXY_URLS_JSON')

  return [
    {
      label: 'Affiliate sync credential',
      ok: hasPartnerBoost,
      detail: hasPartnerBoost ? 'PartnerBoost token is available from env.' : 'Set PARTNERBOOST_AMAZON_TOKEN, PARTNERBOOST_DTC_TOKEN, or PARTNERBOOST_TOKEN.'
    },
    {
      label: 'AI evidence provider',
      ok: hasAi,
      detail: hasAi ? 'Gemini relay or official Gemini key is available from env.' : 'Set GEMINI_RELAY_API_KEY or GEMINI_API_KEY before live extraction.'
    },
    {
      label: 'Proxy pool JSON',
      ok: isValidJsonArray(proxyJson),
      detail: isValidJsonArray(proxyJson) ? 'BROWSER_PROXY_URLS_JSON parses as an array.' : 'Set BROWSER_PROXY_URLS_JSON to a JSON array before live discovery/transcript collection.'
    },
    {
      label: 'Execution mode acknowledged',
      ok: hasFlag('execute') || hasFlag('dry-run'),
      detail: hasFlag('execute') ? 'Will run live probes.' : 'Default is readiness-only. Pass --dry-run to acknowledge no external calls or --execute for live probes.'
    }
  ]
}

async function main() {
  const checks = buildReadinessChecks()
  const guide = buildCommercialLoopRuntimeGuide()
  const ready = checks.every((check) => check.ok)
  const execute = hasFlag('execute')
  const dryRun = hasFlag('dry-run') || !execute
  const limit = readNumberFlag('limit', 50)

  const payload: Record<string, unknown> = {
    ready,
    mode: execute ? 'execute-live-commercial-loop-probe' : 'readiness-only',
    checks,
    recommendedSampleSize: limit,
    commercialLoopGuide: guide.commands,
    nextCommand: `npm run commercial-loop:run -- --execute --sync=${readSyncPlatform()} --limit=${limit} --discover-videos --fetch-transcripts --extract-evidence --publish --push-index`
  }

  if (execute) {
    if (!ready) {
      console.log(JSON.stringify(payload, null, 2))
      process.exit(1)
    }
    await bootstrapApplication()
    payload.liveProbe = await runCommercialLoop({
      execute: true,
      limit,
      minScore: readNumberFlag('min-score', 65),
      syncPlatform: readSyncPlatform(),
      discoverVideos: !hasFlag('skip-discover-videos'),
      enrichProducts: hasFlag('enrich-products'),
      fetchTranscripts: !hasFlag('skip-fetch-transcripts'),
      extractEvidence: !hasFlag('skip-extract-evidence'),
      publishArticles: !hasFlag('skip-publish'),
      pushIndex: hasFlag('push-index'),
      maxVideosPerProduct: readNumberFlag('max-videos-per-product', 3)
    })
  }

  console.log(JSON.stringify(payload, null, 2))
  if (!ready && !dryRun) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

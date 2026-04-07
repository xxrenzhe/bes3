#!/usr/bin/env node

'use strict'

const fs = require('node:fs')
const path = require('node:path')

const DEFAULT_ADMIN_PASSWORD = 'replace-with-a-random-admin-password-before-first-run'
const GEMINI_ACTIVE_MODEL = 'gemini-3-flash-preview'
const GEMINI_SUPPORTED_MODELS = new Set([GEMINI_ACTIVE_MODEL])
const GEMINI_DEPRECATED_MODELS = new Set(['gemini-2.5-flash', 'gemini-2.5-pro'])
const DEFAULT_JWT_SECRETS = new Set([
  'change-me-to-a-long-random-secret',
  'dev-only-jwt-secret-change-me',
  'dev-only-jwt-secret-change-me-before-production'
])

function parseEnvFile(filePath) {
  const values = {}
  const content = fs.readFileSync(filePath, 'utf8')
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue

    let [, key, value] = match
    value = value.trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    values[key] = value
  }
  return values
}

function buildConfig() {
  const explicitEnvFile = process.argv[2] || process.env.BES3_ENV_FILE || ''
  const defaultEnvFile = path.join(process.cwd(), '.env.production')
  const envFilePath = explicitEnvFile || defaultEnvFile
  const fileValues = fs.existsSync(envFilePath) ? parseEnvFile(envFilePath) : {}
  const read = (key, fallback = '') => process.env[key] ?? fileValues[key] ?? fallback

  return {
    envFilePath: fs.existsSync(envFilePath) ? envFilePath : '',
    nodeEnv: read('NODE_ENV', 'production'),
    port: read('PORT', '80'),
    appUrl: read('NEXT_PUBLIC_APP_URL'),
    jwtSecret: read('JWT_SECRET'),
    adminPassword: read('DEFAULT_ADMIN_PASSWORD', DEFAULT_ADMIN_PASSWORD),
    databaseUrl: read('DATABASE_URL'),
    databasePath: read('DATABASE_PATH', './data/bes3.db'),
    mediaDriver: read('MEDIA_DRIVER', 'local'),
    mediaLocalRoot: read('MEDIA_LOCAL_ROOT', 'storage/media'),
    mediaPublicBaseUrl: read('MEDIA_PUBLIC_BASE_URL'),
    s3Endpoint: read('S3_ENDPOINT'),
    s3Region: read('S3_REGION', 'auto'),
    s3Bucket: read('S3_BUCKET'),
    s3AccessKeyId: read('S3_ACCESS_KEY_ID'),
    s3SecretAccessKey: read('S3_SECRET_ACCESS_KEY'),
    s3ForcePathStyle: read('S3_FORCE_PATH_STYLE', 'false'),
    amazonToken: read('PARTNERBOOST_AMAZON_TOKEN'),
    dtcToken: read('PARTNERBOOST_DTC_TOKEN'),
    geminiApiKey: read('GEMINI_API_KEY'),
    geminiModel: read('GEMINI_MODEL', GEMINI_ACTIVE_MODEL),
    pipelineWorkerEnabled: read('PIPELINE_WORKER_ENABLED', 'true'),
    pipelineWorkerPollMs: read('PIPELINE_WORKER_POLL_MS', '2500'),
    pipelineWorkerConcurrency: read('PIPELINE_WORKER_CONCURRENCY', '1'),
    allowInsecureDefaults: read('BES3_ALLOW_INSECURE_DEFAULTS', 'false') === 'true'
  }
}

function isLocalUrl(value) {
  return /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(value)
}

function addResult(collection, level, message) {
  collection.push({ level, message })
}

function isPositiveInteger(value) {
  return /^\d+$/.test(String(value)) && Number.parseInt(String(value), 10) > 0
}

function validate() {
  const config = buildConfig()
  const results = []
  const errors = []
  const warnings = []

  if (config.envFilePath) {
    addResult(results, 'info', `Loaded file defaults from ${config.envFilePath}`)
  } else {
    addResult(results, 'info', 'No .env.production file loaded, validating current process environment only')
  }

  if (!config.appUrl) {
    errors.push('NEXT_PUBLIC_APP_URL is required')
  } else {
    addResult(results, 'info', `Public app URL: ${config.appUrl}`)
    if (config.nodeEnv === 'production' && isLocalUrl(config.appUrl)) {
      warnings.push('NEXT_PUBLIC_APP_URL still points to a local address')
    }
  }

  if (!config.jwtSecret) {
    errors.push('JWT_SECRET is required')
  } else if (DEFAULT_JWT_SECRETS.has(config.jwtSecret) || config.jwtSecret.length < 32) {
    const message = 'JWT_SECRET must be replaced with a strong random secret of at least 32 characters'
    if (config.nodeEnv === 'production' && !config.allowInsecureDefaults) {
      errors.push(message)
    } else {
      warnings.push(message)
    }
  }

  if (!config.adminPassword) {
    errors.push('DEFAULT_ADMIN_PASSWORD is required')
  } else if (config.adminPassword === DEFAULT_ADMIN_PASSWORD) {
    const message = 'DEFAULT_ADMIN_PASSWORD is still using the seeded default value'
    if (config.nodeEnv === 'production' && !config.allowInsecureDefaults) {
      errors.push(message)
    } else {
      warnings.push(message)
    }
  }

  if (config.nodeEnv === 'production' && config.port !== '80') {
    warnings.push(`PORT is ${config.port}; the current deployment baseline expects port 80`)
  }

  if (!config.databaseUrl && !config.databasePath) {
    errors.push('Set either DATABASE_URL or DATABASE_PATH')
  } else if (config.databaseUrl) {
    addResult(results, 'info', 'Database mode: PostgreSQL')
  } else {
    addResult(results, 'info', `Database mode: SQLite (${config.databasePath})`)
  }

  if (!['local', 's3'].includes(config.mediaDriver)) {
    errors.push(`MEDIA_DRIVER must be "local" or "s3", received "${config.mediaDriver}"`)
  } else if (config.mediaDriver === 'local') {
    if (!config.mediaLocalRoot) {
      errors.push('MEDIA_LOCAL_ROOT is required when MEDIA_DRIVER=local')
    } else {
      addResult(results, 'info', `Media mode: local (${config.mediaLocalRoot})`)
    }
  } else {
    addResult(results, 'info', `Media mode: s3 (${config.s3Bucket || 'missing bucket'})`)
    const missingS3 = [
      ['MEDIA_PUBLIC_BASE_URL', config.mediaPublicBaseUrl],
      ['S3_ENDPOINT', config.s3Endpoint],
      ['S3_BUCKET', config.s3Bucket],
      ['S3_ACCESS_KEY_ID', config.s3AccessKeyId],
      ['S3_SECRET_ACCESS_KEY', config.s3SecretAccessKey]
    ]
      .filter(([, value]) => !value)
      .map(([key]) => key)

    if (missingS3.length > 0) {
      errors.push(`Missing required S3 configuration: ${missingS3.join(', ')}`)
    }
  }

  if (!['true', 'false'].includes(String(config.s3ForcePathStyle))) {
    warnings.push('S3_FORCE_PATH_STYLE should be "true" or "false"')
  }

  if (!['true', 'false'].includes(String(config.pipelineWorkerEnabled))) {
    errors.push('PIPELINE_WORKER_ENABLED should be "true" or "false"')
  } else {
    addResult(
      results,
      'info',
      `Pipeline worker: ${config.pipelineWorkerEnabled === 'true' ? 'enabled' : 'disabled'} · poll ${config.pipelineWorkerPollMs}ms · concurrency ${config.pipelineWorkerConcurrency}`
    )
  }

  if (!isPositiveInteger(config.pipelineWorkerPollMs)) {
    errors.push('PIPELINE_WORKER_POLL_MS must be a positive integer')
  }

  if (!isPositiveInteger(config.pipelineWorkerConcurrency)) {
    errors.push('PIPELINE_WORKER_CONCURRENCY must be a positive integer')
  } else if (Number.parseInt(String(config.pipelineWorkerConcurrency), 10) > 4) {
    warnings.push('PIPELINE_WORKER_CONCURRENCY above 4 is discouraged in the current single-container baseline')
  }

  if (!config.amazonToken) {
    warnings.push('PARTNERBOOST_AMAZON_TOKEN is not set, Amazon affiliate sync will be unavailable')
  }

  if (!config.dtcToken) {
    warnings.push('PARTNERBOOST_DTC_TOKEN is not set, DTC affiliate sync will be unavailable')
  }

  if (!config.geminiApiKey) {
    warnings.push('GEMINI_API_KEY is not set, content generation will fall back to the built-in copy generator')
  } else {
    addResult(results, 'info', `Gemini model: ${config.geminiModel}`)
  }

  if (GEMINI_DEPRECATED_MODELS.has(config.geminiModel)) {
    warnings.push(`GEMINI_MODEL ${config.geminiModel} is deprecated; switch to ${GEMINI_ACTIVE_MODEL}`)
  } else if (!GEMINI_SUPPORTED_MODELS.has(config.geminiModel)) {
    warnings.push(`GEMINI_MODEL ${config.geminiModel} is unsupported in Bes3; using ${GEMINI_ACTIVE_MODEL} is recommended`)
  }

  for (const message of errors) {
    addResult(results, 'error', message)
  }
  for (const message of warnings) {
    addResult(results, 'warn', message)
  }

  return {
    results,
    hasErrors: errors.length > 0
  }
}

const { results, hasErrors } = validate()
console.log('Bes3 runtime configuration check')
for (const item of results) {
  const prefix = item.level === 'error' ? '[error]' : item.level === 'warn' ? '[warn]' : '[info]'
  console.log(`${prefix} ${item.message}`)
}

if (hasErrors) {
  process.exit(1)
}

console.log('[ok] Runtime configuration looks consistent')

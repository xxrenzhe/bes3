import { getDatabase } from '@/lib/db'
import { decryptSecret, encryptSecret } from '@/lib/crypto'
import { GEMINI_ACTIVE_MODEL } from '@/lib/gemini-models'
import {
  getRuntimeAdminPasswordState,
  getRuntimeEncryptionKeyState,
  getRuntimeJwtSecretState,
  type RuntimeSecretState
} from '@/lib/runtime-secrets'
import type { SettingDataType } from '@/lib/types'

type SettingIdentity = {
  category: string
  key: string
}

const CATEGORY_ALIASES: Readonly<Record<string, string>> = {
  affiliateSync: 'affiliate_sync'
}

const CANONICAL_SETTING_ALIASES: Readonly<Record<string, SettingIdentity[]>> = {
  'ai.gemini_provider': [{ category: 'ai', key: 'provider' }],
  'ai.gemini_model': [{ category: 'ai', key: 'geminiModel' }],
  'ai.gemini_endpoint': [{ category: 'ai', key: 'geminiBaseUrl' }],
  'ai.gemini_api_key': [{ category: 'ai', key: 'geminiApiKey' }],
  'ai.gemini_relay_api_key': [{ category: 'ai', key: 'geminiRelayApiKey' }],
  'proxy.urls': [{ category: 'proxy', key: 'browserProxyUrlsJson' }],
  'affiliate_sync.partnerboost_token': [
    { category: 'affiliateSync', key: 'partnerboostAmazonToken' },
    { category: 'affiliateSync', key: 'partnerboostDtcToken' }
  ],
  'affiliate_sync.partnerboost_base_url': [
    { category: 'affiliateSync', key: 'partnerboostAmazonBaseUrl' },
    { category: 'affiliateSync', key: 'partnerboostDtcBaseUrl' }
  ]
}

function normalizeSettingCategory(category: string): string {
  return CATEGORY_ALIASES[category] || category
}

function normalizeProviderValue(value: string | null): string | null {
  if (value == null) return value
  const normalized = String(value).trim()
  if (!normalized) return normalized
  return normalized === 'gemini' ? 'official' : normalized
}

function canonicalizeSettingIdentity(input: SettingIdentity): SettingIdentity {
  const normalizedCategory = normalizeSettingCategory(input.category)
  const normalizedKey = `${normalizedCategory}.${input.key}`

  switch (normalizedKey) {
    case 'ai.provider':
      return { category: 'ai', key: 'gemini_provider' }
    case 'ai.geminiModel':
      return { category: 'ai', key: 'gemini_model' }
    case 'ai.geminiBaseUrl':
      return { category: 'ai', key: 'gemini_endpoint' }
    case 'ai.geminiApiKey':
      return { category: 'ai', key: 'gemini_api_key' }
    case 'ai.geminiRelayApiKey':
      return { category: 'ai', key: 'gemini_relay_api_key' }
    case 'proxy.browserProxyUrlsJson':
      return { category: 'proxy', key: 'urls' }
    case 'affiliate_sync.partnerboostAmazonToken':
    case 'affiliate_sync.partnerboostDtcToken':
      return { category: 'affiliate_sync', key: 'partnerboost_token' }
    case 'affiliate_sync.partnerboostAmazonBaseUrl':
    case 'affiliate_sync.partnerboostDtcBaseUrl':
      return { category: 'affiliate_sync', key: 'partnerboost_base_url' }
    default:
      return { category: normalizedCategory, key: input.key }
  }
}

function normalizeSettingValue(identity: SettingIdentity, value: string | null): string | null {
  if (identity.category === 'ai' && identity.key === 'gemini_provider') {
    return normalizeProviderValue(value)
  }
  return value
}

function buildSettingLookupCandidates(category: string, key: string): SettingIdentity[] {
  const canonical = canonicalizeSettingIdentity({ category, key })
  const aliasKey = `${canonical.category}.${canonical.key}`
  const aliases = CANONICAL_SETTING_ALIASES[aliasKey] || []
  return [canonical, ...aliases]
}

export interface SettingRecord {
  category: string
  key: string
  value: string | null
  dataType: SettingDataType
  isSensitive: boolean
  description: string | null
}

export interface SettingDiagnostic {
  id: string
  title: string
  status: 'configured' | 'partial' | 'missing'
  detail: string
}

function mapSetting(row: {
  category: string
  key: string
  value: string | null
  encrypted_value: string | null
  data_type: SettingDataType
  is_sensitive: number | boolean
  description: string | null
}): SettingRecord {
  const isSensitive = row.is_sensitive === true || row.is_sensitive === 1
  const canonical = canonicalizeSettingIdentity({ category: row.category, key: row.key })
  return {
    category: canonical.category,
    key: canonical.key,
    value: normalizeSettingValue(
      canonical,
      resolveStoredSettingValue({
      value: row.value,
      encryptedValue: row.encrypted_value,
      isSensitive
      })
    ),
    dataType: row.data_type,
    isSensitive,
    description: row.description
  }
}

function resolveStoredSettingValue(input: {
  value: string | null
  encryptedValue: string | null
  isSensitive: boolean
}): string | null {
  if (input.isSensitive && input.encryptedValue) {
    return decryptSecret(input.encryptedValue)
  }
  return input.value
}

function prepareStoredSettingValue(value: string | null, isSensitive: boolean) {
  if (!isSensitive) return { value, encryptedValue: null }
  if (!value || !value.trim()) return { value: null, encryptedValue: null }
  return { value: null, encryptedValue: encryptSecret(value) }
}

export function redactSensitiveSettings(settings: SettingRecord[]): SettingRecord[] {
  return settings.map((item) => ({
    ...item,
    value: item.isSensitive && item.value ? '[redacted]' : item.value
  }))
}

export async function listSettings(): Promise<SettingRecord[]> {
  const db = await getDatabase()
  const rows = await db.query<{
    category: string
    key: string
    value: string | null
    encrypted_value: string | null
    data_type: SettingDataType
    is_sensitive: number | boolean
    description: string | null
  }>('SELECT category, key, value, encrypted_value, data_type, is_sensitive, description FROM system_settings ORDER BY category, key')
  const records = rows.map((row) => ({
    rawCategory: row.category,
    rawKey: row.key,
    canonical: canonicalizeSettingIdentity({ category: row.category, key: row.key }),
    record: mapSetting(row)
  }))
  const deduped = new Map<string, { rawCategory: string; rawKey: string; record: SettingRecord }>()

  for (const entry of records) {
    const lookupKey = `${entry.canonical.category}.${entry.canonical.key}`
    const current = deduped.get(lookupKey)
    const isCanonicalRow = entry.rawCategory === entry.canonical.category && entry.rawKey === entry.canonical.key
    const currentIsCanonical =
      current?.rawCategory === entry.canonical.category && current?.rawKey === entry.canonical.key

    if (!current || (isCanonicalRow && !currentIsCanonical)) {
      deduped.set(lookupKey, {
        rawCategory: entry.rawCategory,
        rawKey: entry.rawKey,
        record: entry.record
      })
    }
  }

  return Array.from(deduped.values()).map((entry) => entry.record)
}

export async function getSettingValue(category: string, key: string): Promise<string | null> {
  const db = await getDatabase()
  const candidates = buildSettingLookupCandidates(category, key)

  for (const candidate of candidates) {
    const row = await db.queryOne<{
      value: string | null
      encrypted_value: string | null
      is_sensitive: number | boolean
    }>(
      'SELECT value, encrypted_value, is_sensitive FROM system_settings WHERE category = ? AND key = ? LIMIT 1',
      [candidate.category, candidate.key]
    )
    if (!row) continue

    return normalizeSettingValue(
      canonicalizeSettingIdentity({ category, key }),
      resolveStoredSettingValue({
        value: row.value,
        encryptedValue: row.encrypted_value,
        isSensitive: row.is_sensitive === true || row.is_sensitive === 1
      })
    )
  }

  return null
}

export async function getSettingValueOrEnv(
  category: string,
  key: string,
  envKey?: string,
  fallback: string = ''
): Promise<string> {
  const value = await getSettingValue(category, key)
  if (value && value.trim()) return value
  if (envKey) {
    const envValue = process.env[envKey]
    if (envValue && envValue.trim()) return envValue
  }
  return fallback
}

function getDiagnosticStatus(flags: boolean[]): SettingDiagnostic['status'] {
  const enabled = flags.filter(Boolean).length
  if (enabled === 0) return 'missing'
  if (enabled === flags.length) return 'configured'
  return 'partial'
}

function describeSecretState(label: string, state: RuntimeSecretState): string {
  if (state.source === 'env') return `${label} via environment`

  switch (state.issue) {
    case 'placeholder':
      return `${label} placeholder`
    case 'too_short':
      return `${label} too short`
    case 'invalid_format':
      return `${label} invalid`
    default:
      return `${label} missing`
  }
}

function normalizeHttpUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function inferS3PublicBaseUrl(endpoint: string, bucket: string): string {
  const normalizedEndpoint = normalizeHttpUrl(endpoint)
  const normalizedBucket = bucket.trim()
  if (!normalizedEndpoint || !normalizedBucket) return ''
  return `${normalizedEndpoint}/${normalizedBucket}`
}

export async function listSettingDiagnostics(): Promise<SettingDiagnostic[]> {
  const settings = await listSettings()
  const map = new Map(settings.map((item) => [`${item.category}.${item.key}`, item.value]))
  const read = (category: string, key: string, envKey?: string, fallback: string = '') => {
    const value = map.get(`${category}.${key}`)
    if (value && value.trim()) return value
    if (envKey) {
      const envValue = process.env[envKey]
      if (envValue && envValue.trim()) return envValue
    }
    return fallback
  }

  const aiProvider = read('ai', 'gemini_provider', undefined, 'official')
  const aiModel = read('ai', 'gemini_model', 'GEMINI_MODEL', GEMINI_ACTIVE_MODEL)
  const aiKey = aiProvider === 'relay'
    ? read('ai', 'gemini_relay_api_key', 'GEMINI_RELAY_API_KEY')
    : read('ai', 'gemini_api_key', 'GEMINI_API_KEY')
  const aiTimeoutMs = read('ai', 'geminiTimeoutMs', 'GEMINI_TIMEOUT_MS', '30000')
  const proxyPool = read('proxy', 'urls', undefined, '[]')
  const deepScrapeEnabled = read('deepScrape', 'enabled', 'DEEP_PRODUCT_SCRAPE_ENABLED', 'true') !== 'false'
  const deepScrapeTimeoutMs = read('deepScrape', 'timeoutMs', 'DEEP_PRODUCT_SCRAPE_TIMEOUT_MS', '60000')
  const deepScrapeRequireProxy = read('deepScrape', 'requireProxy', 'DEEP_PRODUCT_SCRAPE_REQUIRE_PROXY', 'false') === 'true'
  const partnerboostToken = read('affiliate_sync', 'partnerboost_token', 'PARTNERBOOST_AMAZON_TOKEN') || process.env.PARTNERBOOST_DTC_TOKEN || ''
  const mediaDriver = read('media', 'driver', 'MEDIA_DRIVER', 'local')
  const mediaLocalRoot = read('media', 'localRoot', 'MEDIA_LOCAL_ROOT', 'storage/media')
  const mediaS3Endpoint = read('media', 's3Endpoint', 'S3_ENDPOINT')
  const mediaS3AccessKeyId = read('media', 's3AccessKeyId', 'S3_ACCESS_KEY_ID')
  const mediaS3SecretAccessKey = read('media', 's3SecretAccessKey', 'S3_SECRET_ACCESS_KEY')
  const mediaBucket = read('media', 's3Bucket', 'S3_BUCKET')
  const mediaPublicBaseUrl = read('media', 'publicBaseUrl', 'MEDIA_PUBLIC_BASE_URL')
  const effectiveMediaPublicBaseUrl = normalizeHttpUrl(mediaPublicBaseUrl) || inferS3PublicBaseUrl(mediaS3Endpoint, mediaBucket)
  const siteName = read('seo', 'siteName', undefined, 'Bes3')
  const siteTagline = read('seo', 'siteTagline', undefined, 'The Best 3 Tech Picks, Decoded.')
  const siteUrl = read('seo', 'appUrl', 'NEXT_PUBLIC_APP_URL')
  const pingomaticEnabled = read('seo', 'pingomaticEnabled', 'PINGOMATIC_ENABLED', 'false') === 'true'
  const googleIndexingEnabled = read('seo', 'googleIndexingEnabled', 'GOOGLE_INDEXING_ENABLED', 'false') === 'true'
  const googleServiceAccountJson = read('seo', 'googleServiceAccountJson', 'GOOGLE_SERVICE_ACCOUNT_JSON')
  const syndicationEnabled = read('seo', 'syndicationEnabled', 'SEO_SYNDICATION_ENABLED', 'false') === 'true'
  const syndicationTargetsJson = read('seo', 'syndicationTargetsJson', 'SEO_SYNDICATION_TARGETS_JSON', '[]')
  const linkInspectorEnabled = read('seo', 'linkInspectorEnabled', 'LINK_INSPECTOR_ENABLED', 'true') === 'true'
  const linkInspectorMaxUrls = read('seo', 'linkInspectorMaxUrls', 'LINK_INSPECTOR_MAX_URLS', '60')
  const jwtSecretState = getRuntimeJwtSecretState()
  const adminPasswordState = getRuntimeAdminPasswordState()
  const encryptionKeyState = getRuntimeEncryptionKeyState()
  const runtimePort = process.env.PORT || '80'
  const isJwtStrong = Boolean(jwtSecretState.value) && jwtSecretState.value.length >= 32
  const isAdminPasswordRotated = Boolean(adminPasswordState.value) && adminPasswordState.value.length >= 16
  const isEncryptionKeyReady = Boolean(encryptionKeyState.value)
  let parsedSyndicationTargets: unknown[] = []
  try {
    const parsed = JSON.parse(syndicationTargetsJson)
    parsedSyndicationTargets = Array.isArray(parsed) ? parsed : []
  } catch {
    parsedSyndicationTargets = []
  }
  const enabledSyndicationTargets = parsedSyndicationTargets.filter((item) => {
    return Boolean(
      item &&
        typeof item === 'object' &&
        !Array.isArray(item) &&
        String((item as { enabled?: unknown }).enabled ?? 'true') !== 'false' &&
        String((item as { endpoint?: unknown }).endpoint || '').trim()
    )
  }).length

  return [
    {
      id: 'runtime-security',
      title: 'Runtime Security',
      status: getDiagnosticStatus([isJwtStrong, isAdminPasswordRotated, isEncryptionKeyReady]),
      detail: `${describeSecretState('JWT secret', jwtSecretState)} · ${describeSecretState('Admin password', adminPasswordState)} · ${describeSecretState('Encryption key', encryptionKeyState)} · port ${runtimePort}`
    },
    {
      id: 'ai',
      title: 'AI Engine',
      status: getDiagnosticStatus([Boolean(aiProvider), Boolean(aiModel), Boolean(aiKey)]),
      detail: aiKey
        ? `${aiProvider} · ${aiModel} · timeout ${aiTimeoutMs}ms · key ready`
        : `${aiProvider} · ${aiModel} · timeout ${aiTimeoutMs}ms · missing API key`
    },
    {
      id: 'proxy',
      title: 'Proxy Pool',
      status: proxyPool !== '[]' && proxyPool !== '' ? 'configured' : 'missing',
      detail: proxyPool !== '[]' && proxyPool !== '' ? 'Browser proxy pool configured' : 'No proxy endpoints configured'
    },
    {
      id: 'deep-scrape',
      title: 'Deep Product Scrape',
      status: deepScrapeEnabled ? (deepScrapeRequireProxy && (proxyPool === '[]' || proxyPool === '') ? 'partial' : 'configured') : 'missing',
      detail: deepScrapeEnabled
        ? `Playwright enabled · timeout ${deepScrapeTimeoutMs}ms · proxy ${deepScrapeRequireProxy ? 'required' : 'optional'}`
        : 'Deep browser scraping disabled'
    },
    {
      id: 'affiliate-amazon',
      title: 'PartnerBoost Amazon',
      status: getDiagnosticStatus([Boolean(partnerboostToken)]),
      detail: partnerboostToken ? 'PartnerBoost sync token configured' : 'Missing PartnerBoost sync token'
    },
    {
      id: 'media',
      title: 'Media Storage',
      status:
        mediaDriver === 's3'
          ? getDiagnosticStatus([
              Boolean(mediaBucket),
              Boolean(effectiveMediaPublicBaseUrl),
              Boolean(mediaS3Endpoint),
              Boolean(mediaS3AccessKeyId),
              Boolean(mediaS3SecretAccessKey)
            ])
          : getDiagnosticStatus([Boolean(mediaLocalRoot)]),
      detail:
        mediaDriver === 's3'
          ? `S3 mode · bucket ${mediaBucket || 'missing'} · endpoint ${mediaS3Endpoint || 'missing'} · public URL ${effectiveMediaPublicBaseUrl || 'missing'}`
          : `Local mode · root ${mediaLocalRoot}`
    },
    {
      id: 'seo',
      title: 'SEO Site',
      status: getDiagnosticStatus([Boolean(siteName), Boolean(siteTagline), Boolean(siteUrl), pingomaticEnabled]),
      detail: `${siteName} · ${siteUrl || 'missing app URL'} · Ping-O-Matic ${pingomaticEnabled ? 'enabled' : 'disabled'}`
    },
    {
      id: 'seo-indexing',
      title: 'Google Indexing API',
      status: googleIndexingEnabled ? getDiagnosticStatus([Boolean(siteUrl), Boolean(googleServiceAccountJson)]) : 'missing',
      detail: googleIndexingEnabled
        ? googleServiceAccountJson
          ? 'Enabled with service account JSON'
          : 'Enabled but missing service account JSON'
        : 'Indexing API disabled'
    },
    {
      id: 'seo-syndication',
      title: 'Syndication Targets',
      status: syndicationEnabled ? getDiagnosticStatus([enabledSyndicationTargets > 0]) : 'missing',
      detail: syndicationEnabled
        ? enabledSyndicationTargets > 0
          ? `${enabledSyndicationTargets} target(s) configured`
          : 'Enabled but no active syndication target found'
        : 'External syndication disabled'
    },
    {
      id: 'seo-link-inspector',
      title: 'Link Inspector',
      status: linkInspectorEnabled ? getDiagnosticStatus([Number(linkInspectorMaxUrls) > 0]) : 'missing',
      detail: linkInspectorEnabled ? `Enabled · up to ${linkInspectorMaxUrls} URLs per run` : 'Link inspector disabled'
    }
  ]
}

export async function saveSetting(input: {
  category: string
  key: string
  value: string | null
  dataType?: SettingDataType
  isSensitive?: boolean
  description?: string | null
}): Promise<void> {
  const db = await getDatabase()
  const canonical = canonicalizeSettingIdentity({ category: input.category, key: input.key })
  const isSensitive = Boolean(input.isSensitive)
  const stored = prepareStoredSettingValue(normalizeSettingValue(canonical, input.value), isSensitive)
  const existing = await db.queryOne<{ id: number }>(
    'SELECT id FROM system_settings WHERE category = ? AND key = ? LIMIT 1',
    [canonical.category, canonical.key]
  )

  if (existing?.id) {
    await db.exec(
      `
        UPDATE system_settings
        SET value = ?, encrypted_value = ?, data_type = ?, is_sensitive = ?, description = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [stored.value, stored.encryptedValue, input.dataType || 'string', isSensitive ? 1 : 0, input.description || null, existing.id]
    )
    return
  }

  await db.exec(
    `
      INSERT INTO system_settings (category, key, value, encrypted_value, data_type, is_sensitive, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [canonical.category, canonical.key, stored.value, stored.encryptedValue, input.dataType || 'string', isSensitive ? 1 : 0, input.description || null]
  )
}

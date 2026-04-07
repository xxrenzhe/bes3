import { getDatabase } from '@/lib/db'
import { GEMINI_ACTIVE_MODEL } from '@/lib/gemini-models'
import { getRuntimeAdminPasswordState, getRuntimeJwtSecretState } from '@/lib/runtime-secrets'
import type { SettingDataType } from '@/lib/types'

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
  data_type: SettingDataType
  is_sensitive: number | boolean
  description: string | null
}): SettingRecord {
  return {
    category: row.category,
    key: row.key,
    value: row.value,
    dataType: row.data_type,
    isSensitive: row.is_sensitive === true || row.is_sensitive === 1,
    description: row.description
  }
}

export async function listSettings(): Promise<SettingRecord[]> {
  const db = await getDatabase()
  const rows = await db.query<{
    category: string
    key: string
    value: string | null
    data_type: SettingDataType
    is_sensitive: number | boolean
    description: string | null
  }>('SELECT category, key, value, data_type, is_sensitive, description FROM system_settings ORDER BY category, key')
  return rows.map(mapSetting)
}

export async function getSettingValue(category: string, key: string): Promise<string | null> {
  const db = await getDatabase()
  const row = await db.queryOne<{ value: string | null }>(
    'SELECT value FROM system_settings WHERE category = ? AND key = ? LIMIT 1',
    [category, key]
  )
  return row?.value ?? null
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

function describeSecretSource(label: string, source: 'env' | 'file' | 'generated' | 'missing'): string {
  switch (source) {
    case 'env':
      return `${label} via env`
    case 'file':
      return `${label} via local secret file`
    case 'generated':
      return `${label} auto-generated locally`
    default:
      return `${label} missing`
  }
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

  const aiProvider = read('ai', 'provider', undefined, 'gemini')
  const aiModel = read('ai', 'geminiModel', 'GEMINI_MODEL', GEMINI_ACTIVE_MODEL)
  const aiKey = read('ai', 'geminiApiKey', 'GEMINI_API_KEY')
  const aiTimeoutMs = read('ai', 'geminiTimeoutMs', 'GEMINI_TIMEOUT_MS', '30000')
  const proxyPool = read('proxy', 'browserProxyUrlsJson', undefined, '[]')
  const amazonToken = read('affiliateSync', 'partnerboostAmazonToken', 'PARTNERBOOST_AMAZON_TOKEN')
  const dtcToken = read('affiliateSync', 'partnerboostDtcToken', 'PARTNERBOOST_DTC_TOKEN')
  const mediaDriver = read('media', 'driver', 'MEDIA_DRIVER', 'local')
  const mediaLocalRoot = read('media', 'localRoot', 'MEDIA_LOCAL_ROOT', 'storage/media')
  const mediaS3Endpoint = read('media', 's3Endpoint', 'S3_ENDPOINT')
  const mediaS3AccessKeyId = read('media', 's3AccessKeyId', 'S3_ACCESS_KEY_ID')
  const mediaS3SecretAccessKey = read('media', 's3SecretAccessKey', 'S3_SECRET_ACCESS_KEY')
  const mediaBucket = read('media', 's3Bucket', 'S3_BUCKET')
  const mediaPublicBaseUrl = read('media', 'publicBaseUrl', 'MEDIA_PUBLIC_BASE_URL')
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
  const runtimePort = process.env.PORT || '80'
  const isJwtStrong = Boolean(jwtSecretState.value) && jwtSecretState.value.length >= 32
  const isAdminPasswordRotated = Boolean(adminPasswordState.value) && adminPasswordState.value.length >= 16
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
      status: getDiagnosticStatus([isJwtStrong, isAdminPasswordRotated]),
      detail: `${describeSecretSource('JWT secret', jwtSecretState.source)} · ${describeSecretSource('Admin password', adminPasswordState.source)} · port ${runtimePort}`
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
      id: 'affiliate-amazon',
      title: 'PartnerBoost Amazon',
      status: getDiagnosticStatus([Boolean(amazonToken)]),
      detail: amazonToken ? 'Amazon sync token configured' : 'Missing Amazon sync token'
    },
    {
      id: 'affiliate-dtc',
      title: 'PartnerBoost DTC',
      status: getDiagnosticStatus([Boolean(dtcToken)]),
      detail: dtcToken ? 'DTC sync token configured' : 'Missing DTC sync token'
    },
    {
      id: 'media',
      title: 'Media Storage',
      status:
        mediaDriver === 's3'
          ? getDiagnosticStatus([
              Boolean(mediaBucket),
              Boolean(mediaPublicBaseUrl),
              Boolean(mediaS3Endpoint),
              Boolean(mediaS3AccessKeyId),
              Boolean(mediaS3SecretAccessKey)
            ])
          : getDiagnosticStatus([Boolean(mediaLocalRoot)]),
      detail:
        mediaDriver === 's3'
          ? `S3 mode · bucket ${mediaBucket || 'missing'} · endpoint ${mediaS3Endpoint || 'missing'} · public URL ${mediaPublicBaseUrl || 'missing'}`
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
  const existing = await db.queryOne<{ id: number }>(
    'SELECT id FROM system_settings WHERE category = ? AND key = ? LIMIT 1',
    [input.category, input.key]
  )

  if (existing?.id) {
    await db.exec(
      `
        UPDATE system_settings
        SET value = ?, data_type = ?, is_sensitive = ?, description = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [input.value, input.dataType || 'string', input.isSensitive ? 1 : 0, input.description || null, existing.id]
    )
    return
  }

  await db.exec(
    `
      INSERT INTO system_settings (category, key, value, data_type, is_sensitive, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [input.category, input.key, input.value, input.dataType || 'string', input.isSensitive ? 1 : 0, input.description || null]
  )
}

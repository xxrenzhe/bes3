import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { fetchWithBrowserProxy } from '@/lib/browser-proxy'
import { getDatabase } from '@/lib/db'
import { getSettingValueOrEnv } from '@/lib/settings'
import { getSiteUrl, toAbsoluteUrl } from '@/lib/site-url'
import type { MediaAssetRole, MediaStorageProvider } from '@/lib/types'

type MediaConfig = {
  driver: MediaStorageProvider
  localRoot: string
  publicBaseUrl: string
  s3Endpoint: string
  s3Region: string
  s3Bucket: string
  s3AccessKeyId: string
  s3SecretAccessKey: string
  s3ForcePathStyle: boolean
}

function normalizeHttpUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function shouldAutoForcePathStyle(endpoint: string): boolean {
  const normalized = normalizeHttpUrl(endpoint)
  if (!normalized) return false

  try {
    const { hostname } = new URL(normalized)
    return !hostname.toLowerCase().endsWith('.amazonaws.com')
  } catch {
    return false
  }
}

function getS3PublicBaseUrl(config: MediaConfig): string {
  const explicitBaseUrl = normalizeHttpUrl(config.publicBaseUrl)
  if (explicitBaseUrl) return explicitBaseUrl

  const endpoint = normalizeHttpUrl(config.s3Endpoint)
  const bucket = config.s3Bucket.trim()
  if (!endpoint || !bucket) return ''

  return `${endpoint}/${bucket}`
}

function buildMediaProxyUrl(storageKey: string): string {
  return `/media/${storageKey.replace(/^\/+/, '')}`
}

export function mediaPublicUrlSql(alias = 'm'): string {
  return `CASE WHEN ${alias}.storage_provider = 's3' THEN '/media/' || ${alias}.storage_key ELSE ${alias}.public_url END`
}

function sameHost(left: string, right: string) {
  try {
    return new URL(left).host.toLowerCase() === new URL(right).host.toLowerCase()
  } catch {
    return false
  }
}

function shouldBypassMediaProxy(sourceUrl: string, config: MediaConfig) {
  const normalizedSourceUrl = toAbsoluteUrl(sourceUrl)
  const publicBaseUrl = getS3PublicBaseUrl(config)
  return sourceUrl.startsWith('/media/') ||
    sameHost(normalizedSourceUrl, getSiteUrl()) ||
    Boolean(publicBaseUrl && sameHost(normalizedSourceUrl, publicBaseUrl))
}

async function getMediaConfig(): Promise<MediaConfig> {
  const driver = (await getSettingValueOrEnv('media', 'driver', 'MEDIA_DRIVER', 'local')) as MediaStorageProvider
  const localRoot = await getSettingValueOrEnv('media', 'localRoot', 'MEDIA_LOCAL_ROOT', 'storage/media')
  const publicBaseUrl = await getSettingValueOrEnv('media', 'publicBaseUrl', 'MEDIA_PUBLIC_BASE_URL')
  const s3Endpoint = await getSettingValueOrEnv('media', 's3Endpoint', 'S3_ENDPOINT')
  const s3Region = await getSettingValueOrEnv('media', 's3Region', 'S3_REGION', 'auto')
  const s3Bucket = await getSettingValueOrEnv('media', 's3Bucket', 'S3_BUCKET')
  const s3AccessKeyId = await getSettingValueOrEnv('media', 's3AccessKeyId', 'S3_ACCESS_KEY_ID')
  const s3SecretAccessKey = await getSettingValueOrEnv('media', 's3SecretAccessKey', 'S3_SECRET_ACCESS_KEY')
  const s3ForcePathStyle = (await getSettingValueOrEnv('media', 's3ForcePathStyle', 'S3_FORCE_PATH_STYLE', 'false')) === 'true'

  return {
    driver,
    localRoot,
    publicBaseUrl,
    s3Endpoint,
    s3Region,
    s3Bucket,
    s3AccessKeyId,
    s3SecretAccessKey,
    s3ForcePathStyle
  }
}

function guessExtension(contentType: string | null): string {
  if (!contentType) return 'jpg'
  if (contentType.includes('png')) return 'png'
  if (contentType.includes('webp')) return 'webp'
  if (contentType.includes('gif')) return 'gif'
  return 'jpg'
}

function guessContentTypeFromKey(storageKey: string): string {
  const extension = path.extname(storageKey).toLowerCase()
  if (extension === '.png') return 'image/png'
  if (extension === '.webp') return 'image/webp'
  if (extension === '.gif') return 'image/gif'
  if (extension === '.avif') return 'image/avif'
  if (extension === '.svg') return 'image/svg+xml'
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg'
  return 'application/octet-stream'
}

function normalizeMediaStorageKey(storageKey: string): string | null {
  const normalizedKey = storageKey.replace(/^\/+/, '')
  if (!normalizedKey || path.isAbsolute(normalizedKey)) return null
  const segments = normalizedKey.split('/').filter(Boolean)
  if (!segments.length || segments.some((segment) => segment === '..')) return null
  return segments.join('/')
}

export async function getResolvedLocalMediaRoot(): Promise<string> {
  const config = await getMediaConfig()
  return path.isAbsolute(config.localRoot) ? config.localRoot : path.join(process.cwd(), config.localRoot)
}

function createS3Client(config: MediaConfig): S3Client {
  return new S3Client({
    region: config.s3Region || 'auto',
    endpoint: normalizeHttpUrl(config.s3Endpoint) || undefined,
    forcePathStyle: config.s3ForcePathStyle || shouldAutoForcePathStyle(config.s3Endpoint),
    credentials: config.s3AccessKeyId && config.s3SecretAccessKey
      ? {
          accessKeyId: config.s3AccessKeyId,
          secretAccessKey: config.s3SecretAccessKey
        }
      : undefined
  })
}

async function readS3Body(body: unknown): Promise<Uint8Array> {
  if (!body) return new Uint8Array()
  if (body instanceof Uint8Array) return body
  if (body instanceof ArrayBuffer) return new Uint8Array(body)

  const payload = body as {
    transformToByteArray?: () => Promise<Uint8Array>
    arrayBuffer?: () => Promise<ArrayBuffer>
    [Symbol.asyncIterator]?: () => AsyncIterator<Uint8Array | Buffer | string>
  }

  if (payload.transformToByteArray) return payload.transformToByteArray()
  if (payload.arrayBuffer) return new Uint8Array(await payload.arrayBuffer())
  if (payload[Symbol.asyncIterator]) {
    const chunks: Buffer[] = []
    for await (const chunk of payload as AsyncIterable<Uint8Array | Buffer | string>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
  }

  return new Uint8Array()
}

export async function readMediaAsset(storageKey: string): Promise<{
  body: Uint8Array
  contentType: string
  cacheControl: string
} | null> {
  const config = await getMediaConfig()
  const normalizedKey = normalizeMediaStorageKey(storageKey)
  if (!normalizedKey) return null

  if (config.driver === 's3') {
    if (!config.s3Bucket) return null
    const response = await createS3Client(config).send(
      new GetObjectCommand({
        Bucket: config.s3Bucket,
        Key: normalizedKey
      })
    )
    return {
      body: await readS3Body(response.Body),
      contentType: response.ContentType || 'application/octet-stream',
      cacheControl: response.CacheControl || 'public, max-age=31536000, immutable'
    }
  }

  const mediaRoot = path.resolve(await getResolvedLocalMediaRoot())
  const filePath = path.resolve(mediaRoot, normalizedKey)
  if (filePath !== mediaRoot && !filePath.startsWith(`${mediaRoot}${path.sep}`)) return null
  const body = await fs.readFile(filePath)
  return {
    body,
    contentType: guessContentTypeFromKey(normalizedKey),
    cacheControl: 'public, max-age=31536000, immutable'
  }
}

export async function persistMediaAsset(input: {
  productId: number
  sourceUrl: string
  assetRole: MediaAssetRole
  index: number
  countryCode?: string | null
}): Promise<string> {
  const config = await getMediaConfig()
  const requestUrl = toAbsoluteUrl(input.sourceUrl)
  const requestInit = {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36'
    }
  }
  const response = shouldBypassMediaProxy(input.sourceUrl, config)
    ? await fetch(requestUrl, requestInit)
    : await fetchWithBrowserProxy(requestUrl, requestInit, input.countryCode)
  if (!response.ok) {
    throw new Error(`Failed to download media: ${response.status}`)
  }

  const bytes = Buffer.from(await response.arrayBuffer())
  const contentType = response.headers.get('content-type')
  const checksum = crypto.createHash('sha1').update(bytes).digest('hex')
  const extension = guessExtension(contentType)
  const fileName = `${input.productId}-${input.assetRole}-${input.index}-${checksum.slice(0, 10)}.${extension}`
  const storageKey = `${new Date().toISOString().slice(0, 7)}/${fileName}`
  const driver = config.driver
  let publicUrl = input.sourceUrl

  if (driver === 'local') {
    const targetPath = path.join(await getResolvedLocalMediaRoot(), storageKey)
    await fs.mkdir(path.dirname(targetPath), { recursive: true })
    await fs.writeFile(targetPath, bytes)
    publicUrl = `/media/${storageKey}`
  } else {
    const bucket = config.s3Bucket
    if (!bucket) {
      throw new Error('S3_BUCKET is required when MEDIA_DRIVER=s3')
    }
    const client = createS3Client(config)
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: storageKey,
        Body: bytes,
        ContentType: contentType || undefined
      })
    )
    publicUrl = buildMediaProxyUrl(storageKey)
  }

  const db = await getDatabase()
  await db.exec(
    `
      INSERT INTO product_media_assets (
        product_id, storage_provider, storage_key, public_url, source_url, mime_type, checksum, asset_role, is_public
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `,
    [input.productId, driver, storageKey, publicUrl, input.sourceUrl, contentType, checksum, input.assetRole]
  )

  return publicUrl
}

import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { fetchWithBrowserProxy } from '@/lib/browser-proxy'
import { getDatabase } from '@/lib/db'
import { getSettingValueOrEnv } from '@/lib/settings'
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

export async function getResolvedLocalMediaRoot(): Promise<string> {
  const config = await getMediaConfig()
  return path.isAbsolute(config.localRoot) ? config.localRoot : path.join(process.cwd(), config.localRoot)
}

function createS3Client(config: MediaConfig): S3Client {
  return new S3Client({
    region: config.s3Region || 'auto',
    endpoint: config.s3Endpoint || undefined,
    forcePathStyle: config.s3ForcePathStyle,
    credentials: config.s3AccessKeyId && config.s3SecretAccessKey
      ? {
          accessKeyId: config.s3AccessKeyId,
          secretAccessKey: config.s3SecretAccessKey
        }
      : undefined
  })
}

export async function persistMediaAsset(input: {
  productId: number
  sourceUrl: string
  assetRole: MediaAssetRole
  index: number
  countryCode?: string | null
}): Promise<string> {
  const response = await fetchWithBrowserProxy(
    input.sourceUrl,
    {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36'
      }
    },
    input.countryCode
  )
  if (!response.ok) {
    throw new Error(`Failed to download media: ${response.status}`)
  }

  const bytes = Buffer.from(await response.arrayBuffer())
  const contentType = response.headers.get('content-type')
  const checksum = crypto.createHash('sha1').update(bytes).digest('hex')
  const extension = guessExtension(contentType)
  const fileName = `${input.productId}-${input.assetRole}-${input.index}-${checksum.slice(0, 10)}.${extension}`
  const storageKey = `${new Date().toISOString().slice(0, 7)}/${fileName}`
  const config = await getMediaConfig()
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
    const baseUrl = config.publicBaseUrl.replace(/\/$/, '')
    publicUrl = baseUrl ? `${baseUrl}/${storageKey}` : input.sourceUrl
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

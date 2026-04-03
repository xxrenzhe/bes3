import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getDatabase } from '@/lib/db'
import type { MediaAssetRole, MediaStorageProvider } from '@/lib/types'

function getMediaDriver(): MediaStorageProvider {
  return (process.env.MEDIA_DRIVER as MediaStorageProvider) || 'local'
}

function getLocalMediaRoot(): string {
  return path.join(process.cwd(), process.env.MEDIA_LOCAL_ROOT || 'storage/media')
}

function guessExtension(contentType: string | null): string {
  if (!contentType) return 'jpg'
  if (contentType.includes('png')) return 'png'
  if (contentType.includes('webp')) return 'webp'
  if (contentType.includes('gif')) return 'gif'
  return 'jpg'
}

function createS3Client(): S3Client {
  return new S3Client({
    region: process.env.S3_REGION || 'auto',
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    credentials: process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.S3_ACCESS_KEY_ID,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
        }
      : undefined
  })
}

export async function persistMediaAsset(input: {
  productId: number
  sourceUrl: string
  assetRole: MediaAssetRole
  index: number
}): Promise<string> {
  const response = await fetch(input.sourceUrl)
  if (!response.ok) {
    throw new Error(`Failed to download media: ${response.status}`)
  }

  const bytes = Buffer.from(await response.arrayBuffer())
  const contentType = response.headers.get('content-type')
  const checksum = crypto.createHash('sha1').update(bytes).digest('hex')
  const extension = guessExtension(contentType)
  const fileName = `${input.productId}-${input.assetRole}-${input.index}-${checksum.slice(0, 10)}.${extension}`
  const storageKey = `${new Date().toISOString().slice(0, 7)}/${fileName}`
  const driver = getMediaDriver()
  let publicUrl = input.sourceUrl

  if (driver === 'local') {
    const targetPath = path.join(getLocalMediaRoot(), storageKey)
    await fs.mkdir(path.dirname(targetPath), { recursive: true })
    await fs.writeFile(targetPath, bytes)
    publicUrl = `/media/${storageKey}`
  } else {
    const bucket = process.env.S3_BUCKET
    if (!bucket) {
      throw new Error('S3_BUCKET is required when MEDIA_DRIVER=s3')
    }
    const client = createS3Client()
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: storageKey,
        Body: bytes,
        ContentType: contentType || undefined
      })
    )
    const baseUrl = process.env.MEDIA_PUBLIC_BASE_URL?.replace(/\/$/, '')
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

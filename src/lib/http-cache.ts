import { createHash } from 'node:crypto'

type CacheableTextResponseOptions = {
  request: Request
  body: string
  contentType: string
  lastModified?: string | Date | null
  cacheControl?: string
  headers?: HeadersInit
  status?: number
}

function toDate(value: string | Date | null | undefined) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function toHttpDate(value: string | Date | null | undefined) {
  return toDate(value)?.toUTCString() || null
}

function normalizeEtag(value: string) {
  return value.trim().replace(/^W\//, '')
}

function etagMatches(headerValue: string | null, etag: string) {
  if (!headerValue) return false

  return headerValue
    .split(',')
    .map((value) => value.trim())
    .some((candidate) => candidate === '*' || normalizeEtag(candidate) === normalizeEtag(etag))
}

function isNotModified(request: Request, etag: string, lastModified: string | null) {
  const ifNoneMatch = request.headers.get('if-none-match')
  if (etagMatches(ifNoneMatch, etag)) {
    return true
  }

  const ifModifiedSince = request.headers.get('if-modified-since')
  if (!ifModifiedSince || !lastModified) {
    return false
  }

  const modifiedAt = Date.parse(lastModified)
  const sinceAt = Date.parse(ifModifiedSince)
  if (Number.isNaN(modifiedAt) || Number.isNaN(sinceAt)) {
    return false
  }

  return modifiedAt <= sinceAt
}

export function getLatestTimestamp(
  values: Array<string | Date | null | undefined>,
  fallback: string | Date = new Date(0).toISOString()
) {
  let latest = toDate(fallback)

  for (const value of values) {
    const candidate = toDate(value)
    if (!candidate) continue
    if (!latest || candidate.getTime() > latest.getTime()) {
      latest = candidate
    }
  }

  return (latest || new Date(0)).toISOString()
}

export function createCacheableTextResponse({
  request,
  body,
  contentType,
  lastModified,
  cacheControl = 'public, s-maxage=900, stale-while-revalidate=3600',
  headers,
  status = 200
}: CacheableTextResponseOptions) {
  const etag = `"${createHash('sha1').update(body).digest('hex')}"`
  const lastModifiedHeader = toHttpDate(lastModified)
  const responseHeaders = new Headers(headers)

  responseHeaders.set('Content-Type', contentType)
  responseHeaders.set('Cache-Control', cacheControl)
  responseHeaders.set('ETag', etag)
  if (lastModifiedHeader) {
    responseHeaders.set('Last-Modified', lastModifiedHeader)
  }

  if (isNotModified(request, etag, lastModifiedHeader)) {
    return new Response(null, {
      status: 304,
      headers: responseHeaders
    })
  }

  return new Response(body, {
    status,
    headers: responseHeaders
  })
}

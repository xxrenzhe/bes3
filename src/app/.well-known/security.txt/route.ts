import { createCacheableTextResponse } from '@/lib/http-cache'
import { buildSecurityTxt } from '@/lib/security-txt'

export async function GET(request: Request) {
  const { body, lastModified } = await buildSecurityTxt()

  return createCacheableTextResponse({
    request,
    body,
    contentType: 'text/plain; charset=utf-8',
    lastModified
  })
}

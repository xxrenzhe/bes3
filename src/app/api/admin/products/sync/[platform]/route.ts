import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { syncPartnerboostAmazonProducts, syncPartnerboostDtcProducts } from '@/lib/partnerboost'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  await requireAdmin()
  const { platform } = await params

  if (platform === 'amazon') {
    return NextResponse.json(await syncPartnerboostAmazonProducts())
  }
  if (platform === 'dtc') {
    return NextResponse.json(await syncPartnerboostDtcProducts())
  }

  return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 })
}

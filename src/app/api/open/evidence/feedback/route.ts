import { NextResponse } from 'next/server'
import { recordEvidenceFeedback } from '@/lib/hardcore-ops'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const analysisReportId = Number(body.analysisReportId)
  const videoId = Number(body.videoId)
  const feedbackType = String(body.feedbackType || 'inaccurate').trim()

  if (!Number.isFinite(analysisReportId) && !Number.isFinite(videoId)) {
    return NextResponse.json({ error: 'analysisReportId_or_videoId_required' }, { status: 400 })
  }

  const feedback = await recordEvidenceFeedback({
    analysisReportId: Number.isFinite(analysisReportId) ? analysisReportId : null,
    videoId: Number.isFinite(videoId) ? videoId : null,
    feedbackType
  })

  return NextResponse.json({
    success: true,
    feedback
  })
}

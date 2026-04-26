import { NextResponse } from 'next/server'
import { recordEvidenceFeedback } from '@/lib/hardcore-ops'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const analysisReportId = Number(body.analysisReportId)
  const videoId = Number(body.videoId)
  const feedbackType = String(body.feedbackType || 'inaccurate').trim()

  const resolvedAnalysisReportId = Number.isFinite(analysisReportId) && analysisReportId > 0 ? analysisReportId : null
  const resolvedVideoId = Number.isFinite(videoId) && videoId > 0 ? videoId : null

  if (!resolvedAnalysisReportId && !resolvedVideoId) {
    return NextResponse.json({ error: 'analysisReportId_or_videoId_required' }, { status: 400 })
  }

  const feedback = await recordEvidenceFeedback({
    analysisReportId: resolvedAnalysisReportId,
    videoId: resolvedVideoId,
    feedbackType
  })

  return NextResponse.json({
    success: true,
    feedback
  })
}

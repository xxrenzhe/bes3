import { NextResponse } from 'next/server'
import { ensurePipelineWorker, getPipelineWorkerRuntimeConfig } from '@/lib/pipeline'

export function GET() {
  void ensurePipelineWorker()
  return NextResponse.json({ ok: true, service: 'bes3', worker: getPipelineWorkerRuntimeConfig() })
}

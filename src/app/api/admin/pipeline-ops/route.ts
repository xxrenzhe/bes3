import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { listPipelineOperations } from '@/lib/pipeline'

export async function GET() {
  await requireAdmin()
  return NextResponse.json(await listPipelineOperations())
}

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { listAdminArticles } from '@/lib/admin-articles'

export async function GET() {
  await requireAdmin()
  return NextResponse.json(await listAdminArticles())
}

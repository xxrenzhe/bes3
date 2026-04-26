import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { listAdminGovernanceSnapshot } from '@/lib/admin-governance'

export async function GET() {
  await requireAdmin()
  return NextResponse.json(await listAdminGovernanceSnapshot())
}

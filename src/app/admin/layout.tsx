import { redirect } from 'next/navigation'
import { AdminShell } from '@/components/layout/AdminShell'
import { readAuthSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode
}) {
  const session = await readAuthSession()
  if (!session) {
    redirect('/login')
  }

  return <AdminShell>{children}</AdminShell>
}

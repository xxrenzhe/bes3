import { redirect } from 'next/navigation'
import { ChangePasswordForm } from '@/components/admin/ChangePasswordForm'
import { readAuthSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function ChangePasswordPage() {
  const session = await readAuthSession()
  if (!session) {
    redirect('/login')
  }
  if (!session.mustChangePassword) {
    redirect('/admin')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <ChangePasswordForm />
    </main>
  )
}

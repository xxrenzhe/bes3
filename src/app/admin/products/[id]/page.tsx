import { notFound } from 'next/navigation'
import { ProductWorkspaceConsole } from '@/components/admin/ProductWorkspaceConsole'
import { getAdminProductWorkspace } from '@/lib/admin-products'

export const dynamic = 'force-dynamic'

export default async function AdminProductWorkspacePage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const workspace = await getAdminProductWorkspace(Number((await params).id))
  if (!workspace) notFound()

  return <ProductWorkspaceConsole initialWorkspace={workspace} />
}

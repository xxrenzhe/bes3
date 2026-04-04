import { PublicShell } from '@/components/layout/PublicShell'
import { ShortlistWorkspace } from '@/components/site/ShortlistWorkspace'

export default function ShortlistPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-7xl space-y-12 px-4 py-14 sm:px-6 lg:px-8">
        <ShortlistWorkspace />
      </div>
    </PublicShell>
  )
}

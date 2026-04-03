'use client'

import { useEffect, useState } from 'react'
import { StatusBadge } from '@/components/admin/StatusBadge'

export function PipelineRunsConsole() {
  const [runs, setRuns] = useState<any[]>([])

  useEffect(() => {
    void fetch('/api/admin/dashboard')
      .then((response) => response.json())
      .then((body) => setRuns(body.recentRuns || []))
  }, [])

  return (
    <div className="space-y-6 p-6 lg:p-10">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-primary">Pipeline Runs</p>
        <h1 className="mt-2 font-[var(--font-display)] text-4xl font-semibold tracking-tight">Recent executions</h1>
      </div>
      <div className="rounded-[32px] border border-border bg-white p-8 shadow-panel">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <tr>
                <th className="pb-3 pr-3">Run</th>
                <th className="pb-3 pr-3">Stage</th>
                <th className="pb-3 pr-3">Status</th>
                <th className="pb-3 pr-3">Updated</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="border-b border-border/70">
                  <td className="py-4 pr-3">
                    <div className="font-medium">{run.product_name || run.source_link}</div>
                    <div className="text-muted-foreground">Run #{run.id}</div>
                  </td>
                  <td className="py-4 pr-3 text-muted-foreground">{run.current_stage || '-'}</td>
                  <td className="py-4 pr-3">
                    <StatusBadge value={run.status} />
                  </td>
                  <td className="py-4 pr-3 text-muted-foreground">{new Date(run.updated_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

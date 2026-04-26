import { getDatabase } from '@/lib/db'

export interface PromptGroup {
  promptId: string
  category: string
  name: string
  description: string
  activeVersion: string
  versionCount: number
  updatedAt: string
}

export interface PromptVersion {
  id: number
  promptId: string
  category: string
  name: string
  version: string
  promptContent: string
  isActive: boolean
  changeNotes: string | null
  createdAt: string
  regressionSummary: PromptRegressionSummary
}

export interface PromptRegressionSummary {
  activeCases: number
  casesWithExpectedOutput: number
  invalidCases: number
  ready: boolean
}

export class PromptActivationGuardError extends Error {
  summary: PromptRegressionSummary

  constructor(summary: PromptRegressionSummary) {
    super('prompt_regression_guard_failed')
    this.summary = summary
  }
}

export async function listPromptGroups(): Promise<PromptGroup[]> {
  const db = await getDatabase()
  const rows = await db.query<{
    prompt_id: string
    category: string
    name: string
    version: string
    created_at: string
    count_versions: number
  }>(
    `
      SELECT p.prompt_id, p.category, p.name, p.version, p.created_at,
        (SELECT COUNT(*) FROM prompt_versions pv WHERE pv.prompt_id = p.prompt_id) AS count_versions
      FROM prompt_versions p
      WHERE p.is_active = 1
      ORDER BY p.category, p.prompt_id
    `
  )

  return rows.map((row) => ({
    promptId: row.prompt_id,
    category: row.category,
    name: row.name,
    description: `${row.category} prompt`,
    activeVersion: row.version,
    versionCount: Number(row.count_versions),
    updatedAt: row.created_at
  }))
}

export async function getPromptVersions(promptId: string): Promise<PromptVersion[]> {
  const db = await getDatabase()
  const [rows, regressionSummary] = await Promise.all([
    db.query<{
    id: number
    prompt_id: string
    category: string
    name: string
    version: string
    prompt_content: string
    is_active: number | boolean
    change_notes: string | null
    created_at: string
    }>(
      `
        SELECT id, prompt_id, category, name, version, prompt_content, is_active, change_notes, created_at
        FROM prompt_versions
        WHERE prompt_id = ?
        ORDER BY created_at DESC, id DESC
      `,
      [promptId]
    ),
    getPromptRegressionSummary(promptId)
  ])

  return rows.map((row) => ({
    id: row.id,
    promptId: row.prompt_id,
    category: row.category,
    name: row.name,
    version: row.version,
    promptContent: row.prompt_content,
    isActive: row.is_active === true || row.is_active === 1,
    changeNotes: row.change_notes,
    createdAt: row.created_at,
    regressionSummary
  }))
}

export async function loadActivePrompt(promptId: string): Promise<string> {
  const db = await getDatabase()
  const row = await db.queryOne<{ prompt_content: string }>(
    'SELECT prompt_content FROM prompt_versions WHERE prompt_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1',
    [promptId]
  )
  if (!row?.prompt_content) {
    throw new Error(`Prompt not found: ${promptId}`)
  }
  return row.prompt_content
}

export async function createPromptVersion(input: {
  promptId: string
  category: string
  name: string
  version: string
  promptContent: string
  changeNotes?: string
  activate?: boolean
  forceActivate?: boolean
}): Promise<void> {
  const db = await getDatabase()
  await db.exec(
    `
      INSERT INTO prompt_versions (prompt_id, category, name, version, prompt_content, is_active, change_notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [input.promptId, input.category, input.name, input.version, input.promptContent, 0, input.changeNotes || null]
  )

  if (input.activate) {
    await activatePromptVersion(input.promptId, input.version, { force: input.forceActivate === true })
  }
}

export async function getPromptRegressionSummary(promptId: string): Promise<PromptRegressionSummary> {
  const db = await getDatabase()
  const rows = await db.query<{ expected_output_json: string | null }>(
    `
      SELECT expected_output_json
      FROM prompt_regression_cases
      WHERE prompt_id = ? AND status = 'active'
    `,
    [promptId]
  )
  const invalidCases = rows.filter((row) => {
    if (!row.expected_output_json) return true
    try {
      JSON.parse(row.expected_output_json)
      return false
    } catch {
      return true
    }
  }).length
  const casesWithExpectedOutput = rows.length - invalidCases

  return {
    activeCases: rows.length,
    casesWithExpectedOutput,
    invalidCases,
    ready: rows.length > 0 && invalidCases === 0
  }
}

export async function activatePromptVersion(
  promptId: string,
  version: string,
  options: { force?: boolean } = {}
): Promise<PromptRegressionSummary> {
  const summary = await getPromptRegressionSummary(promptId)
  if (!summary.ready && !options.force) {
    throw new PromptActivationGuardError(summary)
  }

  const db = await getDatabase()
  await db.exec('UPDATE prompt_versions SET is_active = 0 WHERE prompt_id = ?', [promptId])
  await db.exec('UPDATE prompt_versions SET is_active = 1 WHERE prompt_id = ? AND version = ?', [promptId, version])
  return summary
}

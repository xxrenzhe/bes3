import { getSettingValueOrEnv } from '@/lib/settings'
import { GEMINI_ACTIVE_MODEL, normalizeGeminiModel } from '@/lib/gemini-models'

export type GeminiResponseSchema = {
  type?: 'STRING' | 'NUMBER' | 'INTEGER' | 'BOOLEAN' | 'ARRAY' | 'OBJECT'
  format?: string
  description?: string
  nullable?: boolean
  items?: GeminiResponseSchema
  enum?: string[]
  properties?: Record<string, GeminiResponseSchema>
  required?: string[]
}

export type GeminiGenerateParams = {
  prompt: string
  apiKey?: string | null
  provider?: string | null
  model?: string | null
  temperature?: number
  maxOutputTokens?: number
  timeoutMs?: number
  maxRetries?: number
  responseMimeType?: string
  responseSchema?: GeminiResponseSchema
}

export type GeminiGenerateResult = {
  text: string
  model: string
  usage?: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
  latencyMs?: number
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function extractGeminiText(payload: any): string | null {
  const parts = payload?.candidates?.[0]?.content?.parts
  if (!Array.isArray(parts)) return null

  const text = parts
    .map((part: any) => {
      if (typeof part?.text === 'string') return part.text
      return ''
    })
    .join('')
    .trim()

  return text || null
}

function extractUsage(payload: any): GeminiGenerateResult['usage'] | undefined {
  const usage = payload?.usageMetadata
  if (!usage || typeof usage !== 'object') return undefined

  const inputTokens = Number(usage.promptTokenCount || 0)
  const outputTokens = Number(usage.candidatesTokenCount || 0)
  const totalTokens = Number(usage.totalTokenCount || inputTokens + outputTokens || 0)

  if (!inputTokens && !outputTokens && !totalTokens) return undefined

  return {
    inputTokens,
    outputTokens,
    totalTokens
  }
}

export function extractJsonTextBlock(text: string): string | null {
  const trimmed = String(text || '').trim()
  if (!trimmed) return null

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fencedMatch?.[1]) return fencedMatch[1].trim()

  const arrayStart = trimmed.indexOf('[')
  const objectStart = trimmed.indexOf('{')
  const start =
    arrayStart < 0 ? objectStart : objectStart < 0 ? arrayStart : Math.min(arrayStart, objectStart)

  if (start < 0) return null

  const endArray = trimmed.lastIndexOf(']')
  const endObject = trimmed.lastIndexOf('}')
  const end = Math.max(endArray, endObject)
  if (end <= start) return null

  return trimmed.slice(start, end + 1).trim()
}

async function getGeminiConfig(): Promise<{
  provider: string
  apiKey: string
  model: string
  timeoutMs: number
}> {
  const provider = await getSettingValueOrEnv('ai', 'provider', undefined, 'gemini')
  const apiKey = await getSettingValueOrEnv('ai', 'geminiApiKey', 'GEMINI_API_KEY')
  const model = normalizeGeminiModel(
    await getSettingValueOrEnv('ai', 'geminiModel', 'GEMINI_MODEL', GEMINI_ACTIVE_MODEL)
  )
  const timeoutMs = Math.max(
    5000,
    Number.parseInt(
      await getSettingValueOrEnv('ai', 'geminiTimeoutMs', 'GEMINI_TIMEOUT_MS', '30000'),
      10
    ) || 30000
  )

  return { provider, apiKey, model, timeoutMs }
}

export async function generateGeminiContent(params: GeminiGenerateParams): Promise<GeminiGenerateResult | null> {
  const config = await getGeminiConfig()
  const provider = String(params.provider || config.provider || 'gemini').trim() || 'gemini'
  const apiKey = String(params.apiKey || config.apiKey || '').trim()
  if (provider !== 'gemini') return null
  if (!apiKey) return null

  const model = normalizeGeminiModel(params.model || config.model)
  const timeoutMs = Math.max(5000, params.timeoutMs || config.timeoutMs)
  const maxRetries = Math.max(0, params.maxRetries ?? 2)

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    const startedAt = Date.now()

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: params.prompt }] }],
            generationConfig: {
              temperature: params.temperature ?? 0.4,
              maxOutputTokens: params.maxOutputTokens ?? 4096,
              ...(params.responseMimeType ? { responseMimeType: params.responseMimeType } : {}),
              ...(params.responseSchema ? { responseSchema: params.responseSchema } : {})
            }
          }),
          signal: controller.signal
        }
      )

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        const message =
          payload?.error?.message ||
          payload?.error?.status ||
          `Gemini request failed with ${response.status}`
        if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
          await sleep(400 * (attempt + 1))
          continue
        }
        console.warn(`[ai] Gemini request failed: ${message}`)
        return null
      }

      const text = extractGeminiText(payload)
      if (!text) {
        const finishReason = payload?.candidates?.[0]?.finishReason || 'unknown'
        console.warn(`[ai] Gemini returned no text candidates (finish: ${finishReason})`)
        return null
      }

      return {
        text,
        model,
        usage: extractUsage(payload),
        latencyMs: Date.now() - startedAt
      }
    } catch (error: any) {
      if (attempt < maxRetries) {
        await sleep(400 * (attempt + 1))
        continue
      }
      console.warn(`[ai] Gemini request error: ${error?.message || error}`)
      return null
    } finally {
      clearTimeout(timeout)
    }
  }

  return null
}

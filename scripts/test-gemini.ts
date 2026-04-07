import './load-env'
import { generateGeminiContent } from '@/lib/gemini'
import { GEMINI_ACTIVE_MODEL, normalizeGeminiModel } from '@/lib/gemini-models'

function readCliFlag(name: string): string {
  const prefix = `--${name}=`
  const flag = process.argv.slice(2).find((item) => item.startsWith(prefix))
  return flag ? flag.slice(prefix.length).trim() : ''
}

async function main() {
  const apiKey = readCliFlag('api-key') || process.env.GEMINI_API_KEY || ''
  const requestedModel = readCliFlag('model') || process.env.GEMINI_MODEL || GEMINI_ACTIVE_MODEL
  const model = normalizeGeminiModel(requestedModel)

  if (!apiKey) {
    throw new Error('Missing Gemini API key. Use --api-key=... or set GEMINI_API_KEY.')
  }

  if (requestedModel !== model) {
    console.log(`[ai:test-gemini] Requested model "${requestedModel}" is not supported here. Falling back to "${model}".`)
  }

  const result = await generateGeminiContent({
    apiKey,
    provider: 'gemini',
    model,
    prompt:
      'Reply with a single short JSON object using keys status, provider, and model. Set status to ok.',
    temperature: 0,
    maxOutputTokens: 120,
    responseMimeType: 'application/json',
    responseSchema: {
      type: 'OBJECT',
      required: ['status', 'provider', 'model'],
      properties: {
        status: { type: 'STRING' },
        provider: { type: 'STRING' },
        model: { type: 'STRING' }
      }
    },
    timeoutMs: 30000,
    maxRetries: 1
  })

  if (!result) {
    throw new Error('Gemini request returned no result.')
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        model: result.model,
        usage: result.usage || null,
        latencyMs: result.latencyMs || null,
        text: result.text
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error(`[ai:test-gemini] ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})

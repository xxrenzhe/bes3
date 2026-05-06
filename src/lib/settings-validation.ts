import { GEMINI_ACTIVE_MODEL, getSupportedModelsForProvider, normalizeModelForProvider } from '@/lib/gemini-models'
import { buildProxyUrl, parseProxyEndpoint } from '@/lib/proxy-url-parser'

const GEMINI_OFFICIAL_ENDPOINT = 'https://generativelanguage.googleapis.com'
const GEMINI_RELAY_ENDPOINT = 'https://aicode.cat/v1/messages'
const SENSITIVE_VALUE_PLACEHOLDER = '············'
const VALIDATION_TIMEOUT_MS = 10_000
export const PROXY_VALIDATION_VERSION = 'proxy-validation-v2'
const PROXY_VALIDATION_TARGETS = [
  {
    label: '出口 IP',
    url: 'https://api.ipify.org?format=json',
    requireOk: true
  },
  {
    label: 'YouTube 可达性',
    url: 'https://www.youtube.com/generate_204',
    requireOk: false
  }
]

type GeminiProvider = 'official' | 'relay'

function trimValue(value: string | null | undefined): string {
  return String(value || '').trim()
}

export function normalizeSensitiveValue(value: string | null | undefined): string {
  const trimmed = trimValue(value)
  return trimmed === SENSITIVE_VALUE_PLACEHOLDER ? '' : trimmed
}

function normalizeGeminiProvider(provider?: string | null): GeminiProvider {
  return String(provider || 'official').trim() === 'relay' ? 'relay' : 'official'
}

function getGeminiValidationErrorMessage(error: any): string {
  const rawMessage = String(error?.message || '未知错误')
  const normalizedMessage = rawMessage.toLowerCase()

  if (
    normalizedMessage.includes('api_key_invalid') ||
    normalizedMessage.includes('invalid api key') ||
    normalizedMessage.includes('api key not valid')
  ) {
    return 'API密钥无效，请检查密钥是否正确'
  }

  if (normalizedMessage.includes('401') || normalizedMessage.includes('403')) {
    return 'API密钥无效或当前服务无权限访问'
  }

  if (normalizedMessage.includes('429') || normalizedMessage.includes('quota') || normalizedMessage.includes('rate limit')) {
    return 'API配额不足或触发限流，请稍后重试'
  }

  if (normalizedMessage.includes('timeout') || normalizedMessage.includes('aborted')) {
    return '验证超时，请检查网络、代理或服务商配置'
  }

  return rawMessage
}

function parseJsonSafely(text: string): any {
  if (!text.trim()) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function extractOfficialErrorMessage(payload: any, fallbackStatus: number): string {
  return String(
    payload?.error?.message ||
    payload?.error?.status ||
    `Gemini request failed with ${fallbackStatus}`
  )
}

function extractRelayErrorMessage(payload: any, fallbackStatus: number): string {
  return String(
    payload?.error?.message ||
    payload?.message ||
    payload?.detail ||
    `Relay request failed with ${fallbackStatus}`
  )
}

export async function validateGeminiConfig(
  apiKey: string,
  model: string = GEMINI_ACTIVE_MODEL,
  provider?: string | null
): Promise<{ valid: boolean; message: string }> {
  const normalizedProvider = normalizeGeminiProvider(provider)
  const normalizedModel = normalizeModelForProvider(model, normalizedProvider)
  const supportedModels = getSupportedModelsForProvider(normalizedProvider)
  const normalizedApiKey = trimValue(apiKey)

  if (!normalizedApiKey) {
    return {
      valid: false,
      message: 'API密钥不能为空'
    }
  }

  if (normalizedApiKey.length < 12) {
    return {
      valid: false,
      message: 'API密钥格式不正确'
    }
  }

  if (!supportedModels.includes(normalizedModel)) {
    return {
      valid: false,
      message: `服务商 ${normalizedProvider} 不支持模型: ${model}。支持的模型: ${supportedModels.join(', ')}`
    }
  }

  try {
    if (normalizedProvider === 'relay') {
      const response = await fetch(GEMINI_RELAY_ENDPOINT, {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': normalizedApiKey
        },
        body: JSON.stringify({
          model: normalizedModel,
          messages: [{ role: 'user', content: 'Reply with OK.' }],
          temperature: 0.1,
          max_tokens: 128
        }),
        signal: AbortSignal.timeout(VALIDATION_TIMEOUT_MS)
      })

      const text = await response.text().catch(() => '')
      const payload = parseJsonSafely(text)
      if (!response.ok) {
        throw new Error(extractRelayErrorMessage(payload, response.status))
      }

      return {
        valid: true,
        message: `✅ ${normalizedModel} 模型验证成功（第三方中转模式），连接正常`
      }
    }

    const response = await fetch(
      `${GEMINI_OFFICIAL_ENDPOINT}/v1beta/models/${normalizedModel}:generateContent?key=${encodeURIComponent(normalizedApiKey)}`,
      {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Reply with OK.' }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 128
          }
        }),
        signal: AbortSignal.timeout(VALIDATION_TIMEOUT_MS)
      }
    )

    const text = await response.text().catch(() => '')
    const payload = parseJsonSafely(text)
    if (!response.ok) {
      throw new Error(extractOfficialErrorMessage(payload, response.status))
    }

    return {
      valid: true,
      message: `✅ ${normalizedModel} 模型验证成功（官方模式），连接正常`
    }
  } catch (error: any) {
    return {
      valid: false,
      message: getGeminiValidationErrorMessage(error)
    }
  }
}

type ProxyUrlConfig = {
  country: string
  url: string
}

async function validateSingleProxy(config: ProxyUrlConfig): Promise<{ valid: boolean; message: string }> {
  const parsed = parseProxyEndpoint(config.url)
  if (!parsed || parsed.protocol === 'socks5') {
    return {
      valid: false,
      message: `${config.country} 代理格式错误，请使用 https://user:pass@host:port 或 host:port:username:password`
    }
  }

  try {
    const { ProxyAgent } = await import('undici')
    const proxyUrl = buildProxyUrl(parsed)
    const targetResults = []

    for (const target of PROXY_VALIDATION_TARGETS) {
      const dispatcher = new ProxyAgent(proxyUrl)
      const startedAt = Date.now()
      const response = await fetch(target.url, {
        cache: 'no-store',
        signal: AbortSignal.timeout(VALIDATION_TIMEOUT_MS),
        dispatcher
      } as RequestInit & { dispatcher: unknown })

      if (target.requireOk && !response.ok) {
        const text = await response.text().catch(() => '')
        return {
          valid: false,
          message: `${config.country} 代理${target.label}验证失败：接口返回 ${response.status}${text ? `，${text.trim().slice(0, 120)}` : ''}`
        }
      }

      targetResults.push({
        label: target.label,
        status: response.status,
        ms: Date.now() - startedAt,
        payload: target.url.includes('api.ipify.org') ? await response.json().catch(() => ({} as { ip?: string })) : null
      })
    }

    const ipPayload = targetResults.find((item) => item.label === '出口 IP')?.payload as { ip?: string } | null
    const ip = trimValue(ipPayload?.ip)
    const timing = targetResults.map((item) => `${item.label}${item.status ? ` ${item.status}` : ''}/${item.ms}ms`).join('，')
    return {
      valid: true,
      message: `${config.country} 代理验证成功${ip ? `（出口 IP ${ip}）` : ''}，${timing}`
    }
  } catch (error: any) {
    return {
      valid: false,
      message: `${config.country} 代理连接失败：${error?.message || '请求异常'}`
    }
  }
}

export async function validateProxyPoolConfig(
  rawValue: string
): Promise<{ valid: boolean; message: string; version: string }> {
  let parsed: unknown

  try {
    parsed = JSON.parse(rawValue || '[]')
  } catch {
    return {
      valid: false,
      version: PROXY_VALIDATION_VERSION,
      message: '代理配置 JSON 解析失败'
    }
  }

  if (!Array.isArray(parsed)) {
    return {
      valid: false,
      version: PROXY_VALIDATION_VERSION,
      message: '代理配置格式错误，应为数组格式'
    }
  }

  const proxyUrls = parsed
    .map((item, index) => {
      if (typeof item === 'string') {
        return {
          country: `ROW-${index + 1}`,
          url: item
        }
      }
      if (!item || typeof item !== 'object') return null
      return {
        country: trimValue((item as { country?: string }).country) || `ROW-${index + 1}`,
        url: trimValue((item as { url?: string }).url)
      }
    })
    .filter((item): item is ProxyUrlConfig => Boolean(item?.url))

  if (proxyUrls.length === 0) {
    return {
      valid: true,
      version: PROXY_VALIDATION_VERSION,
      message: '未配置代理URL，代理功能已禁用'
    }
  }

  const seenCountries = new Set<string>()
  for (const item of proxyUrls) {
    const country = item.country.toUpperCase()
    if (seenCountries.has(country)) {
      return {
        valid: false,
        version: PROXY_VALIDATION_VERSION,
        message: `国家 ${country} 重复配置`
      }
    }
    seenCountries.add(country)
  }

  const results = await Promise.all(proxyUrls.map((item) => validateSingleProxy({
    country: item.country.toUpperCase(),
    url: item.url
  })))
  const errors = results.filter((item) => !item.valid).map((item) => item.message)

  if (errors.length > 0) {
    return {
      valid: false,
      version: PROXY_VALIDATION_VERSION,
      message: errors.join('；')
    }
  }

  return {
    valid: true,
    version: PROXY_VALIDATION_VERSION,
    message: `✅ 已配置 ${proxyUrls.length} 个代理URL，连接验证通过：${results.map((item) => item.message).join('；')}`
  }
}

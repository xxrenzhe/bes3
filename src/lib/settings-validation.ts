import { GEMINI_ACTIVE_MODEL, normalizeGeminiModel } from '@/lib/gemini-models'

const GEMINI_OFFICIAL_ENDPOINT = 'https://generativelanguage.googleapis.com'
const GEMINI_RELAY_ENDPOINT = 'https://aicode.cat/v1/messages'
const SENSITIVE_VALUE_PLACEHOLDER = '············'
const VALIDATION_TIMEOUT_MS = 10_000
const RELAY_SUPPORTED_MODELS = ['gpt-5.2'] as const

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

function getSupportedModelsForProvider(provider: GeminiProvider): readonly string[] {
  return provider === 'relay' ? RELAY_SUPPORTED_MODELS : [GEMINI_ACTIVE_MODEL]
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
  const normalizedModel = normalizedProvider === 'relay'
    ? trimValue(model) || RELAY_SUPPORTED_MODELS[0]
    : normalizeGeminiModel(model)
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

type ParsedProxyEndpoint = {
  host: string
  port: number
  username?: string
  password?: string
  protocol: 'http' | 'https'
}

function parseProxyEndpoint(proxyUrl: string): ParsedProxyEndpoint | null {
  const trimmed = trimValue(proxyUrl)
  if (!trimmed) return null

  const direct = trimmed.replace(/^https?:\/\//, '')
  const directParts = direct.split(':')
  if (directParts.length >= 4) {
    const port = Number.parseInt(directParts[1], 10)
    if (Number.isFinite(port)) {
      return {
        host: directParts[0],
        port,
        username: directParts[2] || undefined,
        password: directParts.slice(3).join(':') || undefined,
        protocol: 'http'
      }
    }
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed)
      return {
        host: url.hostname,
        port: url.port ? Number.parseInt(url.port, 10) : url.protocol === 'https:' ? 443 : 80,
        username: url.username || undefined,
        password: url.password || undefined,
        protocol: url.protocol === 'https:' ? 'https' : 'http'
      }
    } catch {
      return null
    }
  }

  const parts = trimmed.split(':')
  if (parts.length === 2) {
    const port = Number.parseInt(parts[1], 10)
    if (Number.isFinite(port)) {
      return {
        host: parts[0],
        port,
        protocol: 'http'
      }
    }
  }

  return null
}

async function validateSingleProxy(config: ProxyUrlConfig): Promise<{ valid: boolean; message: string }> {
  const parsed = parseProxyEndpoint(config.url)
  if (!parsed) {
    return {
      valid: false,
      message: `${config.country} 代理格式错误，请使用 https://user:pass@host:port 或 host:port:username:password`
    }
  }

  try {
    const { ProxyAgent } = await import('undici')
    const auth = parsed.username || parsed.password
      ? `${encodeURIComponent(parsed.username || '')}:${encodeURIComponent(parsed.password || '')}@`
      : ''
    const dispatcher = new ProxyAgent(`${parsed.protocol}://${auth}${parsed.host}:${parsed.port}`)
    const response = await fetch('https://api.ipify.org?format=json', {
      cache: 'no-store',
      signal: AbortSignal.timeout(VALIDATION_TIMEOUT_MS),
      dispatcher
    } as RequestInit & { dispatcher: unknown })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      return {
        valid: false,
        message: `${config.country} 代理连接失败：接口返回 ${response.status}${text ? `，${text.trim().slice(0, 120)}` : ''}`
      }
    }

    const payload = await response.json().catch(() => ({} as { ip?: string }))
    const ip = trimValue(payload?.ip)
    return {
      valid: true,
      message: `${config.country} 代理验证成功${ip ? `（出口 IP ${ip}）` : ''}`
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
): Promise<{ valid: boolean; message: string }> {
  let parsed: unknown

  try {
    parsed = JSON.parse(rawValue || '[]')
  } catch {
    return {
      valid: false,
      message: '代理配置 JSON 解析失败'
    }
  }

  if (!Array.isArray(parsed)) {
    return {
      valid: false,
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
      message: '未配置代理URL，代理功能已禁用'
    }
  }

  const seenCountries = new Set<string>()
  for (const item of proxyUrls) {
    const country = item.country.toUpperCase()
    if (seenCountries.has(country)) {
      return {
        valid: false,
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
      message: errors.join('；')
    }
  }

  return {
    valid: true,
    message: `✅ 已配置 ${proxyUrls.length} 个代理URL，连接验证通过`
  }
}

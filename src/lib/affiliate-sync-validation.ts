const DEFAULT_PARTNERBOOST_BASE_URL = 'https://app.partnerboost.com'
const SENSITIVE_VALUE_PLACEHOLDER = '············'
const VALIDATION_TIMEOUT_MS = 10_000

type ValidationResult = {
  platform: 'partnerboost'
  valid: boolean
  message: string
}

export type AffiliateSyncValidationInput = {
  partnerboostToken?: string | null
  partnerboostBaseUrl?: string | null
}

export type AffiliateSyncValidationSummary = {
  valid: boolean
  message: string
  results: ValidationResult[]
}

function trimValue(value: string | null | undefined): string {
  return String(value || '').trim()
}

function normalizeSensitiveValue(value: string | null | undefined): string {
  const trimmed = trimValue(value)
  return trimmed === SENSITIVE_VALUE_PLACEHOLDER ? '' : trimmed
}

function buildSnippet(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, 160)
}

async function validatePartnerboostConfig(input: AffiliateSyncValidationInput): Promise<ValidationResult> {
  const token = trimValue(input.partnerboostToken)
  const baseUrl = trimValue(input.partnerboostBaseUrl).replace(/\/+$/, '') || DEFAULT_PARTNERBOOST_BASE_URL

  try {
    const response = await fetch(`${baseUrl}/api/datafeed/get_fba_products`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token,
        page_size: 1,
        page: 1,
        default_filter: 0,
        country_code: 'US',
        relationship: 1,
        is_original_currency: 0,
        has_promo_code: 0,
        has_acc: 0,
        filter_sexual_wellness: 0
      }),
      signal: AbortSignal.timeout(VALIDATION_TIMEOUT_MS)
    })

    const text = await response.text().catch(() => '')
    if (!response.ok) {
      return {
        platform: 'partnerboost',
        valid: false,
        message: `PartnerBoost 验证失败：接口返回 ${response.status}${text ? `，${buildSnippet(text)}` : ''}`
      }
    }

    const payload = text
      ? JSON.parse(text) as {
          status?: { code?: number | string; msg?: string }
          data?: { list?: unknown[] | Record<string, unknown> }
        }
      : {}
    const statusCode = Number(payload.status?.code)

    if (!Number.isFinite(statusCode) || statusCode !== 0) {
      return {
        platform: 'partnerboost',
        valid: false,
        message: `PartnerBoost 验证失败：${payload.status?.msg || payload.status?.code || '返回状态异常'}`
      }
    }

    const list = payload.data?.list
    const count = Array.isArray(list)
      ? list.length
      : (list && typeof list === 'object' ? Object.keys(list).length : 0)

    return {
      platform: 'partnerboost',
      valid: true,
      message: `PartnerBoost 验证成功${count > 0 ? `（接口返回 ${count} 条测试记录）` : '（接口可正常访问）'}`
    }
  } catch (error: any) {
    return {
      platform: 'partnerboost',
      valid: false,
      message: `PartnerBoost 验证失败：${error?.message || '请求异常'}`
    }
  }
}

export async function validateAffiliateSyncConfig(
  input: AffiliateSyncValidationInput
): Promise<AffiliateSyncValidationSummary> {
  const partnerboostToken = normalizeSensitiveValue(input.partnerboostToken)

  if (!partnerboostToken) {
    return {
      valid: false,
      message: '请先保存 PartnerBoost Token 配置',
      results: []
    }
  }

  const result = await validatePartnerboostConfig({
    ...input,
    partnerboostToken
  })

  return {
    valid: result.valid,
    message: result.message,
    results: [result]
  }
}

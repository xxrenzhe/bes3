import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getSettingValue } from '@/lib/settings'
import { validateAffiliateSyncConfig } from '@/lib/affiliate-sync-validation'
import { normalizeSensitiveValue, validateGeminiConfig, validateProxyPoolConfig } from '@/lib/settings-validation'
import { GEMINI_ACTIVE_MODEL } from '@/lib/gemini-models'

const DEFAULT_PARTNERBOOST_BASE_URL = 'https://app.partnerboost.com'

function readConfigValue(config: Record<string, unknown>, key: string): string {
  const value = config[key]
  return typeof value === 'string' ? value : ''
}

function normalizeProvider(value: string): 'official' | 'relay' {
  return String(value || 'official').trim() === 'relay' ? 'relay' : 'official'
}

export async function POST(request: Request) {
  try {
    await requireAdmin()

    const body = await request.json().catch(() => ({}))
    const category = String(body?.category || '').trim()
    const config = body?.config && typeof body.config === 'object' && !Array.isArray(body.config)
      ? body.config as Record<string, unknown>
      : {}

    let result: { valid: boolean; message: string }

    switch (category) {
      case 'ai': {
        const provider = normalizeProvider(
          readConfigValue(config, 'gemini_provider') || await getSettingValue('ai', 'gemini_provider') || 'official'
        )
        const model =
          readConfigValue(config, 'gemini_model') ||
          await getSettingValue('ai', 'gemini_model') ||
          GEMINI_ACTIVE_MODEL
        const apiKeySettingKey = provider === 'relay' ? 'gemini_relay_api_key' : 'gemini_api_key'
        const apiKeyLabel = provider === 'relay' ? '第三方中转 API Key' : 'Gemini 官方 API Key'
        const apiKey =
          normalizeSensitiveValue(readConfigValue(config, apiKeySettingKey)) ||
          await getSettingValue('ai', apiKeySettingKey) ||
          ''

        if (!apiKey) {
          return NextResponse.json(
            { error: `请先保存${apiKeyLabel}配置` },
            { status: 400 }
          )
        }

        result = await validateGeminiConfig(apiKey, model, provider)
        break
      }

      case 'proxy': {
        const rawUrls = readConfigValue(config, 'urls') || await getSettingValue('proxy', 'urls') || '[]'
        result = await validateProxyPoolConfig(rawUrls)
        break
      }

      case 'affiliate_sync': {
        const partnerboostToken =
          normalizeSensitiveValue(readConfigValue(config, 'partnerboost_token')) ||
          await getSettingValue('affiliate_sync', 'partnerboost_token') ||
          ''
        const partnerboostBaseUrl =
          readConfigValue(config, 'partnerboost_base_url') ||
          await getSettingValue('affiliate_sync', 'partnerboost_base_url') ||
          DEFAULT_PARTNERBOOST_BASE_URL

        result = await validateAffiliateSyncConfig({
          partnerboostToken,
          partnerboostBaseUrl
        })
        break
      }

      default:
        return NextResponse.json(
          { error: `不支持的配置分类: ${category}` },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      valid: result.valid,
      message: result.message
    })
  } catch (error: any) {
    console.error('配置验证失败:', error)

    return NextResponse.json(
      { error: error?.message || '配置验证失败' },
      { status: 500 }
    )
  }
}

#!/usr/bin/env tsx

import fs from 'node:fs'
import path from 'node:path'

type Gate = {
  area: string
  name: string
  filePath: string
  required: string[]
}

type ViewportGate = {
  label: string
  width: number
  height: number
  requiredPolicy: string[]
}

const root = process.cwd()

function read(filePath: string) {
  return fs.readFileSync(path.join(root, filePath), 'utf8')
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message)
}

function requireIncludes(content: string, filePath: string, required: string[]) {
  const missing = required.filter((needle) => !content.includes(needle))
  assert(missing.length === 0, `${filePath} missing: ${missing.join(', ')}`)
}

function runGate(gate: Gate) {
  const content = read(gate.filePath)
  requireIncludes(content, gate.filePath, gate.required)
  return {
    area: gate.area,
    name: gate.name,
    filePath: gate.filePath
  }
}

function lineIndex(content: string, needle: string) {
  return content.indexOf(needle)
}

function assertBefore(content: string, filePath: string, first: string, second: string, message: string) {
  const firstIndex = lineIndex(content, first)
  const secondIndex = lineIndex(content, second)
  assert(firstIndex >= 0, `${filePath} missing order anchor: ${first}`)
  assert(secondIndex >= 0, `${filePath} missing order anchor: ${second}`)
  assert(firstIndex < secondIndex, `${filePath}: ${message}`)
}

function assertNotIncludes(content: string, filePath: string, forbidden: string[], reason: string) {
  const found = forbidden.filter((needle) => content.includes(needle))
  assert(found.length === 0, `${filePath} includes forbidden pattern(s) for ${reason}: ${found.join(', ')}`)
}

const proactiveDoc = 'docs/planv2/14.Bes3 主动产品优化与转化门禁机制 (Proactive Product Optimization & Conversion Gates).md'
const productPagePath = 'src/app/products/[slug]/page.tsx'
const purchaseCardPath = 'src/components/commerce/PurchaseDecisionCard.tsx'
const goRoutePath = 'src/app/go/[productId]/route.ts'
const preflightPath = 'scripts/preflight-release.sh'

const viewports: ViewportGate[] = [
  { label: 'mobile', width: 390, height: 844, requiredPolicy: ['390x844', '标题、价格、主 CTA 首屏可见'] },
  { label: 'tablet portrait', width: 768, height: 1024, requiredPolicy: ['768x1024', '决策优先于图片'] },
  { label: 'web-tablet breakpoint', width: 1024, height: 768, requiredPolicy: ['1024x768', '不能让商品图占满首屏'] },
  { label: 'narrow web', width: 1100, height: 900, requiredPolicy: ['1100x900', '必须进入 Web 双栏过渡布局'] },
  { label: 'pre-xl web', width: 1279, height: 900, requiredPolicy: ['1279x900', '不能停留在移动端纵向堆叠'] },
  { label: 'laptop', width: 1280, height: 900, requiredPolicy: ['1280x900', '三栏/双栏布局必须可点击'] },
  { label: 'desktop', width: 1440, height: 1000, requiredPolicy: ['1440x1000', '商品身份、图、购买决策、证据入口同屏'] }
]

const gates: Gate[] = [
  {
    area: 'Policy',
    name: 'Proactive optimization plan defines conversion gates',
    filePath: proactiveDoc,
    required: [
      '高意图访问 -> 首屏购买判断 -> 信任证明 -> /go 佣金跳转 -> 数据回流 -> 后台修复下一批阻塞',
      'Buy-ready CTA visibility',
      'Valid affiliate handoff',
      '390x844',
      '1024x768',
      '1100x900',
      '1279x900',
      'SEO/GEO',
      'npm run product:optimization-gates',
      '这套机制的目标是让 Bes3 主动发现'
    ]
  },
  {
    area: 'Product page',
    name: 'Commerce product hero is decision-first across Web and mobile',
    filePath: productPagePath,
    required: [
      'Should you buy it?',
      'lg:grid-cols-[minmax(0,0.96fr)_minmax(340px,0.74fr)]',
      'xl:grid-cols-[minmax(0,0.9fr)_minmax(260px,320px)_minmax(320px,0.58fr)]',
      'lg:hidden',
      'lg:order-3 lg:col-span-2 xl:order-none xl:col-span-1 xl:sticky xl:top-24',
      'lg:order-2 lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1 xl:order-none xl:col-start-auto xl:row-start-auto',
      'lg:col-span-2',
      'PurchaseDecisionCard decision={purchaseDecision} stickyEligible compact',
      'href="#decision-notes"',
      'showAffiliateDisclosure={false}',
      'sizes="(max-width: 1023px) 100vw, (max-width: 1279px) 38vw, 320px"',
      'Open machine payload for AI and search verification'
    ]
  },
  {
    area: 'Purchase card',
    name: 'Compact purchase decision card prioritizes price and CTA before explanation',
    filePath: purchaseCardPath,
    required: [
      'const priceConfidence',
      'const primaryAction',
      'compact ?',
      '{priceConfidence}',
      '{primaryAction}',
      '{summary}',
      'buttonClassName={compact ? \'w-full\' : undefined}',
      '<details className="rounded-2xl',
      'Risks to check',
      'StickyMobileCta'
    ]
  },
  {
    area: 'Affiliate handoff',
    name: '/go route enforces commissionable redirect and attribution',
    filePath: goRoutePath,
    required: [
      'getCommissionableMerchantUrl',
      'recordMerchantClick',
      'getMerchantExitContextFromSearchParams',
      'selectedOffer?.offer_url',
      'activeAffiliateLink?.affiliate_url',
      'NextResponse.redirect(destination, 307)',
      'Cache-Control',
      'getFallbackPath(product)'
    ]
  },
  {
    area: 'SEO/GEO',
    name: 'Product page keeps crawler and AI-readable decision payloads',
    filePath: productPagePath,
    required: [
      'StructuredData',
      'buildProductAggregateSchema',
      'buildFaqSchema',
      'Open product JSON',
      'Open offer JSON',
      'decision-notes',
      'buildPageMetadata',
      'keywords:'
    ]
  },
  {
    area: 'Release',
    name: 'Release preflight runs proactive product optimization gate',
    filePath: preflightPath,
    required: [
      'product optimization gates',
      'npm run product:optimization-gates',
      'BES3_PREFLIGHT_RUN_PRODUCT_UX_AUDIT',
      'npm run product:conversion-ux-audit'
    ]
  },
  {
    area: 'Package',
    name: 'Product optimization gate is executable from npm scripts',
    filePath: 'package.json',
    required: [
      '"product:optimization-gates": "tsx scripts/check-product-optimization-gates.ts"',
      '"product:conversion-ux-audit": "tsx scripts/audit-product-conversion-ux.ts"'
    ]
  },
  {
    area: 'Dynamic audit',
    name: 'Browser conversion audit checks real viewport and affiliate handoff behavior',
    filePath: 'scripts/audit-product-conversion-ux.ts',
    required: [
      'PRODUCT_UX_AUDIT_BASE_URL',
      'collectViewportEvidence',
      'assertViewportEvidence',
      'Visible /go CTA redirects to a commissionable merchant URL',
      'isCommissionableMerchantUrl',
      'horizontal overflow',
      'web-before-xl',
      'decision notes does not span the content grid',
      'console issues'
    ]
  }
]

function checkViewportPolicy() {
  const doc = read(proactiveDoc)
  for (const viewport of viewports) {
    requireIncludes(doc, proactiveDoc, viewport.requiredPolicy)
  }
  return viewports.map(({ label, width, height }) => `${label}:${width}x${height}`)
}

function checkProductPageOrdering() {
  const content = read(productPagePath)
  assertBefore(content, productPagePath, '<p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Should you buy it?</p>', '<Image', 'purchase decision copy must appear before product image in source order')
  assertBefore(content, productPagePath, 'PrimaryCta', '<Image', 'mobile/tablet hero CTA must appear before product image in source order')
  assertNotIncludes(content, productPagePath, ['order-first overflow-hidden'], 'product image must not be forced ahead of decision content')
  assertNotIncludes(content, productPagePath, ['priority\n                  sizes="(max-width: 1279px)'], 'below-fold product image should not keep priority preload')
  assertNotIncludes(content, productPagePath, ['xl:hidden'], 'Web layouts must not wait until 1280px before adapting')
  assertNotIncludes(content, productPagePath, ['xl:grid-cols-[minmax(0,0.9fr)_320px_minmax(360px,0.58fr)]'], 'desktop hero grid must use a fluid narrow-Web transition')
  requireIncludes(content, productPagePath, [
    'lg:grid-cols-[minmax(0,0.96fr)_minmax(340px,0.74fr)]',
    'lg:order-3 lg:col-span-2 xl:order-none xl:col-span-1 xl:sticky xl:top-24',
    'lg:order-2 lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1 xl:order-none xl:col-start-auto xl:row-start-auto',
    'lg:col-span-2'
  ])
}

function checkPurchaseCardOrdering() {
  const content = read(purchaseCardPath)
  assertBefore(content, purchaseCardPath, '{priceConfidence}', '{summary}', 'compact purchase card must show price before summary')
  assertBefore(content, purchaseCardPath, '{primaryAction}', '{summary}', 'compact purchase card must show CTA before summary')
  assertBefore(content, purchaseCardPath, '{summary}', '<details', 'summary should precede collapsed risk details')
}

function checkReleaseGateIsBeforeBuild() {
  const content = read(preflightPath)
  assertBefore(content, preflightPath, 'npm run product:optimization-gates', 'npm run build', 'product optimization gates must run before production build in preflight')
}

function main() {
  const passed = gates.map(runGate)
  const viewportCoverage = checkViewportPolicy()
  checkProductPageOrdering()
  checkPurchaseCardOrdering()
  checkReleaseGateIsBeforeBuild()

  console.log(`Product optimization gates passed (${passed.length} artifact gates, ${viewportCoverage.length} viewport policies)`)
}

main()

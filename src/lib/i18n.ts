export const SUPPORTED_LOCALES = ['en', 'es', 'de', 'fr', 'ja'] as const

export type SiteLocale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: SiteLocale = 'en'
export const LOCALE_COOKIE_NAME = 'bes3_locale'
export const REQUEST_LOCALE_HEADER = 'x-bes3-locale'
export const REQUEST_DISPLAY_PATH_HEADER = 'x-bes3-display-path'

const OG_LOCALE_MAP: Record<SiteLocale, string> = {
  en: 'en_US',
  es: 'es_ES',
  de: 'de_DE',
  fr: 'fr_FR',
  ja: 'ja_JP'
}

const HTML_LANG_MAP: Record<SiteLocale, string> = {
  en: 'en',
  es: 'es',
  de: 'de',
  fr: 'fr',
  ja: 'ja'
}

const LOCALE_LABELS: Record<SiteLocale, string> = {
  en: 'English',
  es: 'Español',
  de: 'Deutsch',
  fr: 'Français',
  ja: '日本語'
}

export type ShellDictionary = {
  skipToMainContent: string
  brandKicker: string
  navStartHere: string
  navSearch: string
  navDirectory: string
  navBrands: string
  navDeals: string
  navAbout: string
  navAlerts: string
  navSignIn: string
  navMenu: string
  footerExplore: string
  footerCompany: string
  footerHome: string
  footerCategories: string
  footerSiteMap: string
  footerShortlist: string
  footerBiggestDiscounts: string
  footerDescription: string
  localeSwitcherLabel: string
}

export type ExitIntentDictionary = {
  kicker: string
  title: string
  description: string
  emailPlaceholder: string
  primaryCta: string
  secondaryCta: string
  helper: string
  reassurance: string
  urgency: string
}

const SHELL_DICTIONARY: Record<SiteLocale, ShellDictionary> = {
  en: {
    skipToMainContent: 'Skip to main content',
    brandKicker: 'Tech Buying Guide',
    navStartHere: 'Start Here',
    navSearch: 'Search',
    navDirectory: 'Directory',
    navBrands: 'Brands',
    navDeals: 'Offers',
    navAbout: 'About',
    navAlerts: 'Wait Updates',
    navSignIn: 'Sign In',
    navMenu: 'Menu',
    footerExplore: 'Explore',
    footerCompany: 'Company',
    footerHome: 'Home',
    footerCategories: 'Categories',
    footerSiteMap: 'Site Map',
    footerShortlist: 'Shortlist',
    footerBiggestDiscounts: 'Biggest Discounts',
    footerDescription: 'Bes3 helps you compare products, read honest reviews, and find verified offers without the usual hype.',
    localeSwitcherLabel: 'Language'
  },
  es: {
    skipToMainContent: 'Ir al contenido principal',
    brandKicker: 'Guía de compra tech',
    navStartHere: 'Empieza aquí',
    navSearch: 'Buscar',
    navDirectory: 'Directorio',
    navBrands: 'Marcas',
    navDeals: 'Ofertas',
    navAbout: 'Acerca de',
    navAlerts: 'Actualizaciones',
    navSignIn: 'Entrar',
    navMenu: 'Menú',
    footerExplore: 'Explorar',
    footerCompany: 'Empresa',
    footerHome: 'Inicio',
    footerCategories: 'Categorías',
    footerSiteMap: 'Mapa del sitio',
    footerShortlist: 'Lista corta',
    footerBiggestDiscounts: 'Mayores descuentos',
    footerDescription: 'Bes3 te ayuda a comparar productos, leer reseñas honestas y encontrar ofertas verificadas sin el ruido habitual.',
    localeSwitcherLabel: 'Idioma'
  },
  de: {
    skipToMainContent: 'Zum Inhalt springen',
    brandKicker: 'Tech-Kaufhilfe',
    navStartHere: 'Erste Schritte',
    navSearch: 'Suche',
    navDirectory: 'Verzeichnis',
    navBrands: 'Marken',
    navDeals: 'Angebote',
    navAbout: 'Über uns',
    navAlerts: 'Warte-Updates',
    navSignIn: 'Anmelden',
    navMenu: 'Menü',
    footerExplore: 'Entdecken',
    footerCompany: 'Unternehmen',
    footerHome: 'Startseite',
    footerCategories: 'Kategorien',
    footerSiteMap: 'Sitemap',
    footerShortlist: 'Merkliste',
    footerBiggestDiscounts: 'Groesste Rabatte',
    footerDescription: 'Bes3 hilft dir, Produkte zu vergleichen, ehrliche Tests zu lesen und verifizierte Angebote ohne üblichen Hype zu finden.',
    localeSwitcherLabel: 'Sprache'
  },
  fr: {
    skipToMainContent: 'Aller au contenu principal',
    brandKicker: "Guide d'achat tech",
    navStartHere: 'Commencer',
    navSearch: 'Recherche',
    navDirectory: 'Annuaire',
    navBrands: 'Marques',
    navDeals: 'Offres',
    navAbout: 'À propos',
    navAlerts: 'Suivi attente',
    navSignIn: 'Connexion',
    navMenu: 'Menu',
    footerExplore: 'Explorer',
    footerCompany: 'Entreprise',
    footerHome: 'Accueil',
    footerCategories: 'Catégories',
    footerSiteMap: 'Plan du site',
    footerShortlist: 'Sélection',
    footerBiggestDiscounts: 'Plus fortes remises',
    footerDescription: 'Bes3 vous aide à comparer des produits, lire des avis honnêtes et trouver des offres vérifiées sans le battage habituel.',
    localeSwitcherLabel: 'Langue'
  },
  ja: {
    skipToMainContent: 'メインコンテンツへ移動',
    brandKicker: 'テック購入ガイド',
    navStartHere: 'はじめに',
    navSearch: '検索',
    navDirectory: '一覧',
    navBrands: 'ブランド',
    navDeals: 'オファー',
    navAbout: 'Bes3について',
    navAlerts: '待機アップデート',
    navSignIn: 'ログイン',
    navMenu: 'メニュー',
    footerExplore: '探す',
    footerCompany: '会社情報',
    footerHome: 'ホーム',
    footerCategories: 'カテゴリ',
    footerSiteMap: 'サイトマップ',
    footerShortlist: '候補リスト',
    footerBiggestDiscounts: '最大割引',
    footerDescription: 'Bes3 は製品比較、率直なレビュー、検証済みオファーをまとめて、無駄な煽りなしで判断を助けます。',
    localeSwitcherLabel: '言語'
  }
}

const EXIT_INTENT_DICTIONARY: Record<SiteLocale, ExitIntentDictionary> = {
  en: {
    kicker: 'Before you go',
    title: 'Not ready to buy yet?',
    description: "Get Bes3's next real price drop, shortlist-worthy offer, or category update before you have to restart your research.",
    emailPlaceholder: 'name@example.com',
    primaryCta: 'Send me the next useful update',
    secondaryCta: 'Keep browsing',
    helper: 'One email when it matters. No blast campaigns, no fake urgency.',
    reassurance: 'Bes3 only sends offer updates, category updates, or price watch notes tied to real buying decisions.',
    urgency: 'Best for people comparing a few finalists or waiting for a better price window.'
  },
  es: {
    kicker: 'Antes de irte',
    title: '¿Aún no quieres comprar?',
    description: 'Recibe la próxima bajada real de precio, oferta útil o actualización de categoría sin tener que empezar tu búsqueda otra vez.',
    emailPlaceholder: 'nombre@ejemplo.com',
    primaryCta: 'Avísame cuando valga la pena',
    secondaryCta: 'Seguir navegando',
    helper: 'Un correo cuando importe. Sin campañas masivas ni urgencia falsa.',
    reassurance: 'Bes3 solo envía actualizaciones y seguimientos de precio ligados a decisiones reales de compra.',
    urgency: 'Ideal si estás comparando finalistas o esperando un mejor precio.'
  },
  de: {
    kicker: 'Bevor du gehst',
    title: 'Noch nicht kaufbereit?',
    description: 'Erhalte den nächsten echten Preisrutsch, ein sinnvolles Angebot oder ein Kategorien-Update, ohne deine Recherche neu zu starten.',
    emailPlaceholder: 'name@beispiel.de',
    primaryCta: 'Beim nächsten sinnvollen Update informieren',
    secondaryCta: 'Weiter stöbern',
    helper: 'Eine Mail, wenn es relevant wird. Kein Spam, keine künstliche Dringlichkeit.',
    reassurance: 'Bes3 sendet nur Hinweise, die zu echten Kaufentscheidungen passen.',
    urgency: 'Hilfreich, wenn du gerade Finalisten vergleichst oder auf ein besseres Preisfenster wartest.'
  },
  fr: {
    kicker: 'Avant de partir',
    title: "Pas encore prêt à acheter ?",
    description: 'Recevez la prochaine vraie baisse de prix, une offre utile ou une mise à jour de catégorie sans relancer toute votre recherche.',
    emailPlaceholder: 'nom@exemple.fr',
    primaryCta: 'Prévenez-moi quand cela vaut le coup',
    secondaryCta: 'Continuer la visite',
    helper: 'Un e-mail quand cela compte. Pas de campagnes massives, pas de fausse urgence.',
    reassurance: 'Bes3 n’envoie que des mises a jour et suivis de prix lies a de vraies decisions d’achat.',
    urgency: 'Utile si vous comparez déjà quelques finalistes ou attendez un meilleur prix.'
  },
  ja: {
    kicker: '離れる前に',
    title: 'まだ買う段階ではありませんか？',
    description: '次の本当に意味のある値下げや有力セール、カテゴリ更新を受け取って、また最初から調べ直す手間を減らせます。',
    emailPlaceholder: 'name@example.com',
    primaryCta: '有益な更新だけ受け取る',
    secondaryCta: 'このまま閲覧する',
    helper: '必要な時だけ 1 通。大量配信や煽り文句はありません。',
    reassurance: 'Bes3 は実際の購入判断に関係する通知だけを送ります。',
    urgency: '候補を絞っている人や、より良い価格を待っている人向けです。'
  }
}

export function isSupportedLocale(value: string | null | undefined): value is SiteLocale {
  return SUPPORTED_LOCALES.includes(String(value || '').toLowerCase() as SiteLocale)
}

export function normalizeLocale(value: string | null | undefined): SiteLocale {
  const normalized = String(value || '').trim().toLowerCase()
  return isSupportedLocale(normalized) ? normalized : DEFAULT_LOCALE
}

export function getLocaleLabel(locale: SiteLocale) {
  return LOCALE_LABELS[locale]
}

export function getShellDictionary(locale: SiteLocale): ShellDictionary {
  return SHELL_DICTIONARY[locale] || SHELL_DICTIONARY[DEFAULT_LOCALE]
}

export function getExitIntentDictionary(locale: SiteLocale): ExitIntentDictionary {
  return EXIT_INTENT_DICTIONARY[locale] || EXIT_INTENT_DICTIONARY[DEFAULT_LOCALE]
}

export function getOgLocale(locale: SiteLocale) {
  return OG_LOCALE_MAP[locale] || OG_LOCALE_MAP[DEFAULT_LOCALE]
}

export function getHtmlLang(locale: SiteLocale) {
  return HTML_LANG_MAP[locale] || HTML_LANG_MAP[DEFAULT_LOCALE]
}

export function getLocaleFromPathname(pathname: string | null | undefined): SiteLocale | null {
  const firstSegment = String(pathname || '')
    .replace(/^\/+/, '')
    .split('/')[0]
    .trim()
    .toLowerCase()
  return isSupportedLocale(firstSegment) ? firstSegment : null
}

export function stripLocaleFromPath(pathname: string | null | undefined) {
  const normalized = String(pathname || '/').trim() || '/'
  if (!normalized.startsWith('/')) return stripLocaleFromPath(`/${normalized}`)
  const locale = getLocaleFromPathname(normalized)
  if (!locale) return normalized

  const stripped = normalized.replace(new RegExp(`^/${locale}(?=/|$)`), '') || '/'
  return stripped.startsWith('/') ? stripped : `/${stripped}`
}

export function addLocaleToPath(pathname: string | null | undefined, locale: SiteLocale) {
  const stripped = stripLocaleFromPath(pathname)
  if (locale === DEFAULT_LOCALE) return stripped
  return stripped === '/' ? `/${locale}` : `/${locale}${stripped}`
}

export function buildLanguageAlternates(pathname: string | null | undefined) {
  const stripped = stripLocaleFromPath(pathname)

  return Object.fromEntries(
    SUPPORTED_LOCALES.map((locale) => [locale, addLocaleToPath(stripped, locale)])
  ) as Record<SiteLocale, string>
}

export function buildLanguageAlternatesWithDefault(pathname: string | null | undefined) {
  const alternates = buildLanguageAlternates(pathname)

  return {
    ...alternates,
    'x-default': addLocaleToPath(pathname, DEFAULT_LOCALE)
  }
}

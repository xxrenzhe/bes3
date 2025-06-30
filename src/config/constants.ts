// 网站配置常量
export const SITE_CONFIG = {
  name: 'Bes3.com',
  shortName: 'Bes3',
  tagline: 'Best Tech Reviews & Expert Analysis 2025',
  description: 'Trusted tech reviews and expert analysis for 2025. Compare smartphones, laptops, smart home devices, AI tools, and more. Unbiased buying guides to help you choose the best tech products in 2025.',
  url: 'https://bes3.com',
  domain: 'bes3.com',
  year: 2025,
  foundingYear: 2020,
  
  // 联系信息
  contact: {
    email: 'contact@bes3.com',
    phone: '+1 (555) BES-TECH',
    phoneNumber: '+15552378324',
    address: 'San Francisco, CA',
    supportEmail: 'support@bes3.com',
    pressEmail: 'press@bes3.com',
    privacyEmail: 'privacy@bes3.com'
  },
  
  // 社交媒体
  social: {
    facebook: 'https://facebook.com/bes3tech',
    twitter: 'https://twitter.com/bes3tech',
    youtube: 'https://youtube.com/bes3tech',
    instagram: 'https://instagram.com/bes3tech',
    linkedin: 'https://linkedin.com/company/bes3tech',
    twitterHandle: '@bes3tech'
  },
  
  // 品牌颜色
  colors: {
    primary: '#dc2626', // red-600
    primaryHover: '#b91c1c', // red-700
    primaryLight: '#fecaca', // red-200
    primaryDark: '#991b1b', // red-800
    accent: '#f59e0b', // amber-500
    success: '#10b981', // emerald-500
    warning: '#f59e0b', // amber-500
    error: '#ef4444', // red-500
    info: '#3b82f6' // blue-500
  },
  
  // 图片和媒体
  media: {
    logo: '/logo.png',
    ogImage: '/og-image.jpg',
    favicon: '/favicon.ico',
    appleTouchIcon: '/apple-touch-icon.png',
    defaultAvatar: 'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=100'
  },
  
  // 性能配置
  performance: {
    loadTimeTarget: 1000, // 1秒
    imageQuality: 80,
    lazyLoadThreshold: 0.1,
    lazyLoadRootMargin: '100px',
    debounceDelay: 300,
    throttleLimit: 100
  },
  
  // 分页配置
  pagination: {
    articlesPerPage: 12,
    searchResultsPerPage: 16,
    relatedArticlesCount: 4,
    trendingArticlesCount: 8,
    featuredArticlesCount: 3,
    categoryArticlesCount: 8
  },
  
  // SEO配置
  seo: {
    defaultKeywords: [
      'tech reviews 2025',
      'product reviews',
      'buying guides',
      'smartphone reviews',
      'laptop reviews',
      'AI tools 2025',
      'smart home 2025',
      'VPN reviews',
      'best tech 2025'
    ],
    maxTitleLength: 60,
    maxDescriptionLength: 160,
    maxKeywords: 10
  }
};

// 外部服务配置
export const EXTERNAL_SERVICES = {
  images: {
    pexelsBaseUrl: 'https://images.pexels.com/photos',
    defaultParams: 'auto=compress&cs=tinysrgb',
    sizes: {
      thumbnail: 'w=200&h=200',
      small: 'w=400&h=300',
      medium: 'w=800&h=600',
      large: 'w=1200&h=800',
      hero: 'w=1600&h=900'
    }
  }
};

// 路由配置
export const ROUTES = {
  home: '/',
  search: '/search',
  about: '/about',
  contact: '/contact',
  category: (slug: string) => `/category/${slug}`,
  article: (slug: string) => `/article/${slug}`,
  author: (name: string) => `/author/${name.toLowerCase().replace(/\s+/g, '-')}`
};

// 表单配置
export const FORM_CONFIG = {
  validation: {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    minNameLength: 2,
    minMessageLength: 10,
    maxMessageLength: 500
  },
  subjects: [
    { value: 'general', label: 'General Inquiry' },
    { value: 'review-request', label: 'Review Request' },
    { value: 'press', label: 'Press & Media' },
    { value: 'partnership', label: 'Partnership' },
    { value: 'technical', label: 'Technical Issue' },
    { value: 'feedback', label: 'Feedback' },
    { value: 'newsletter', label: 'Newsletter Subscription' },
    { value: 'account', label: 'Account Support' },
    { value: 'careers', label: 'Careers' }
  ]
};

// 错误消息
export const ERROR_MESSAGES = {
  network: 'Network error. Please check your connection and try again.',
  timeout: 'Request timeout. Please try again.',
  notFound: 'The requested content was not found.',
  serverError: 'Server error. Please try again later.',
  validation: {
    required: 'This field is required',
    email: 'Please enter a valid email address',
    minLength: (min: number) => `Must be at least ${min} characters long`,
    maxLength: (max: number) => `Must be no more than ${max} characters long`
  }
};

// 成功消息
export const SUCCESS_MESSAGES = {
  contactForm: 'Thank you for your message! We\'ll get back to you within 24-48 hours.',
  newsletter: 'Thanks for subscribing to Bes3 2025!',
  formSubmitted: 'Form submitted successfully!'
};

// 加载消息
export const LOADING_MESSAGES = {
  default: 'Loading...',
  search: 'Searching...',
  submitting: 'Submitting...',
  sending: 'Sending...',
  preparing: 'Preparing your content'
};

// 本地存储键
export const STORAGE_KEYS = {
  theme: 'bes3_theme',
  preferences: 'bes3_preferences',
  searchHistory: 'bes3_search_history',
  readArticles: 'bes3_read_articles'
};

// 时间格式
export const DATE_FORMATS = {
  display: 'MMM dd, yyyy',
  iso: 'yyyy-MM-dd',
  full: 'MMMM dd, yyyy',
  short: 'MM/dd/yyyy'
};

// 响应式断点
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
};
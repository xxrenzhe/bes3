import { EXTERNAL_SERVICES } from './constants';

// 图片配置和URL管理
export const IMAGE_CONFIG = {
  // Pexels 图片基础配置
  pexels: {
    baseUrl: EXTERNAL_SERVICES.images.pexelsBaseUrl,
    params: EXTERNAL_SERVICES.images.defaultParams,
    sizes: EXTERNAL_SERVICES.images.sizes
  },
  
  // 默认图片ID
  defaults: {
    article: '1181244',
    avatar: '771742',
    tech: '1092644',
    ai: '8439093',
    home: '1571460',
    entertainment: '442576',
    wellness: '935777',
    money: '259027',
    news: '5380664'
  }
};

// 生成优化的图片URL
export const generateImageUrl = (
  imageId: string, 
  size: keyof typeof IMAGE_CONFIG.pexels.sizes = 'medium'
): string => {
  const { baseUrl, params, sizes } = IMAGE_CONFIG.pexels;
  return `${baseUrl}/${imageId}/pexels-photo-${imageId}.jpeg?${params}&${sizes[size]}`;
};

// 获取分类默认图片
export const getCategoryImage = (category: string, size: keyof typeof IMAGE_CONFIG.pexels.sizes = 'medium'): string => {
  const categoryKey = category.toLowerCase() as keyof typeof IMAGE_CONFIG.defaults;
  const imageId = IMAGE_CONFIG.defaults[categoryKey] || IMAGE_CONFIG.defaults.article;
  return generateImageUrl(imageId, size);
};

// 验证图片URL的有效性
export const validateImageUrl = (url: string): boolean => {
  try {
    new URL(url);
    return url.includes('pexels.com') || url.includes('unsplash.com') || url.startsWith('/');
  } catch {
    return false;
  }
};

// 图片预加载
export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
};

// 批量预加载图片
export const preloadImages = async (urls: string[]): Promise<void> => {
  const promises = urls.map(url => preloadImage(url));
  await Promise.allSettled(promises);
};

// 已验证的有效图片URL
export const VERIFIED_IMAGES = {
  // 文章图片
  articles: {
    aiScam: generateImageUrl('5380664', 'large'),
    samsungGalaxy: generateImageUrl('1092644', 'large'),
    lgOled: generateImageUrl('1444416', 'large'),
    microsoftPasskeys: generateImageUrl('4164418', 'large'),
    passwordSecurity: generateImageUrl('6963944', 'large'),
    techDeals: generateImageUrl('3962285', 'large'),
    tariffImpact: generateImageUrl('3760067', 'large'),
    aiImageGen: generateImageUrl('8728382', 'large'),
    chatgptComparison: generateImageUrl('8439093', 'large'),
    googleGemini: generateImageUrl('11035471', 'large'),
    aiResume: generateImageUrl('590016', 'large'),
    aiDetection: generateImageUrl('8849295', 'large'),
    vpnReview: generateImageUrl('1181244', 'large'),
    iphone16: generateImageUrl('788946', 'large'),
    displayTech: generateImageUrl('1201996', 'large'),
    laptops: generateImageUrl('18105', 'large'),
    phoneVpn: generateImageUrl('1851415', 'large'),
    cordlessVacuum: generateImageUrl('4099354', 'large'),
    espressoMachine: generateImageUrl('302899', 'large'),
    smartHome: generateImageUrl('1571460', 'large'),
    robotVacuum: generateImageUrl('4107120', 'large'),
    smartThermostat: generateImageUrl('1571463', 'large'),
    nintendoSwitch: generateImageUrl('442576', 'large'),
    streaming: generateImageUrl('4009402', 'large'),
    gamingLaptop: generateImageUrl('1714208', 'large'),
    vrHeadset: generateImageUrl('8728382', 'large'),
    console: generateImageUrl('3945683', 'large'),
    yogaSleep: generateImageUrl('935777', 'large'),
    eyeHealth: generateImageUrl('5327585', 'large'),
    mattress: generateImageUrl('164595', 'large'),
    fitnessTracker: generateImageUrl('4498362', 'large'),
    airPurifier: generateImageUrl('4099354', 'large'),
    coverStory1: generateImageUrl('8386440', 'large'),
    coverStory2: generateImageUrl('3761020', 'large'),
    coverStory3: generateImageUrl('1592384', 'large'),
    starlink: generateImageUrl('586063', 'large'),
    zelleApp: generateImageUrl('259027', 'large'),
    savings: generateImageUrl('3943716', 'large'),
    identityTheft: generateImageUrl('60504', 'large'),
    coins: generateImageUrl('128867', 'large'),
    homeEquity: generateImageUrl('280229', 'large')
  },
  
  // 作者头像
  authors: {
    sarahChen: generateImageUrl('774909', 'thumbnail'),
    mikeRodriguez: generateImageUrl('1300402', 'thumbnail'),
    emmaWilson: generateImageUrl('415829', 'thumbnail'),
    alexKumar: generateImageUrl('1043471', 'thumbnail'),
    davidPark: generateImageUrl('1212984', 'thumbnail'),
    lisaThompson: generateImageUrl('733872', 'thumbnail'),
    jenniferLee: generateImageUrl('1239291', 'thumbnail')
  },
  
  // 分类图片
  categories: {
    news: generateImageUrl('5380664', 'medium'),
    ai: generateImageUrl('8439093', 'medium'),
    tech: generateImageUrl('1092644', 'medium'),
    home: generateImageUrl('1571460', 'medium'),
    entertainment: generateImageUrl('442576', 'medium'),
    wellness: generateImageUrl('935777', 'medium'),
    money: generateImageUrl('259027', 'medium'),
    coverStory: generateImageUrl('8386440', 'medium')
  }
};
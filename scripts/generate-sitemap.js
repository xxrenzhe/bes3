import fs from 'fs';
import path from 'path';

// 生成动态站点地图
const generateSitemap = () => {
  const baseUrl = 'https://bes3.com';
  const currentDate = new Date().toISOString().split('T')[0];
  
  // 静态页面
  const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'daily' },
    { url: '/search', priority: '0.8', changefreq: 'weekly' },
    { url: '/about', priority: '0.6', changefreq: 'monthly' },
    { url: '/contact', priority: '0.5', changefreq: 'monthly' }
  ];
  
  // 分类页面
  const categories = [
    'news', 'ai', 'tech', 'home', 'entertainment', 'wellness', 'money', 'cover-story'
  ];
  
  const categoryPages = categories.map(category => ({
    url: `/category/${category}`,
    priority: '0.9',
    changefreq: 'daily'
  }));
  
  // 文章页面（从数据文件读取）
  let articlePages = [];
  try {
    // 这里可以从实际的数据源读取文章列表
    const sampleArticles = [
      'ai-obituary-scam-investigation-reveals-shocking-truth',
      'samsung-galaxy-s25-ultra-review-camera-ai-revolutionary',
      'best-lg-oled-tv-2025-comprehensive-review-winner',
      'microsoft-ditches-passwords-passkeys-migration-guide',
      'best-vpn-2025-top-services-speed-security-tested',
      'iphone-16-pro-review-2025-camera-features-comprehensive',
      'best-ai-image-generators-2025-dalle-midjourney-comparison',
      'best-cordless-vacuums-2025-two-models-tie-first-place',
      'nintendo-switch-2-stock-tracker-where-when-buy',
      'best-yoga-poses-ultimate-sleep-quality-2025'
    ];
    
    articlePages = sampleArticles.map(slug => ({
      url: `/article/${slug}`,
      priority: '0.8',
      changefreq: 'monthly'
    }));
  } catch (error) {
    console.warn('Could not read articles data:', error.message);
  }
  
  // 合并所有页面
  const allPages = [...staticPages, ...categoryPages, ...articlePages];
  
  // 生成XML
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${allPages.map(page => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
    <mobile:mobile/>
  </url>`).join('\n')}
</urlset>`;
  
  // 写入文件
  const distDir = path.join(process.cwd(), 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  
  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemap);
  console.log('✅ Sitemap generated successfully');
  
  // 生成robots.txt
  const robots = `# Robots.txt for Bes3.com - Best Tech Reviews 2025
# Updated: ${currentDate}

User-agent: *
Allow: /

# Sitemap location
Sitemap: ${baseUrl}/sitemap.xml

# Crawl delay for respectful crawling
Crawl-delay: 1

# Allow all major search engines
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Slurp
Allow: /

User-agent: DuckDuckBot
Allow: /

# Disallow admin and private areas
Disallow: /admin/
Disallow: /private/
Disallow: /api/
Disallow: /*.json$
Disallow: /*?*utm_*
Disallow: /*?*ref=*
Disallow: /*?*fbclid=*

# Block AI training crawlers
User-agent: GPTBot
Disallow: /

User-agent: ChatGPT-User
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: anthropic-ai
Disallow: /

User-agent: Claude-Web
Disallow: /`;
  
  fs.writeFileSync(path.join(distDir, 'robots.txt'), robots);
  console.log('✅ Robots.txt generated successfully');
};

// 运行生成器
generateSitemap();
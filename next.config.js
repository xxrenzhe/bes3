/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  swcMinify: true,
  compress: true,
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: [
      'better-sqlite3',
      'cheerio',
      'postgres',
      'pg',
      'playwright'
    ],
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        'localhost'
      ],
      allowedForwardedHosts: [
        'localhost:3000',
        'localhost'
      ]
    }
  },
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    remotePatterns: [
      { protocol: 'https', hostname: 'm.media-amazon.com' },
      { protocol: 'https', hostname: 'images-na.ssl-images-amazon.com' },
      { protocol: 'https', hostname: 'cdn.partnerboost.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '**' }
    ]
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('better-sqlite3', 'cheerio', 'postgres', 'pg', 'playwright')
    }
    return config
  },
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig

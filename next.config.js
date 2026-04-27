const path = require('path')

function parseAllowedHosts(rawValue) {
  return String(rawValue || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

function buildAllowedHosts() {
  const hosts = new Set([
    'bes3.com',
    'www.bes3.com',
    'localhost',
    'localhost:3000',
    '127.0.0.1',
    '127.0.0.1:3000'
  ])

  const appUrl = String(process.env.NEXT_PUBLIC_APP_URL || '').trim()
  if (appUrl) {
    try {
      const parsed = new URL(appUrl)
      if (parsed.host) hosts.add(parsed.host)
      if (parsed.hostname === 'bes3.com') hosts.add('www.bes3.com')
      if (parsed.hostname === 'www.bes3.com') hosts.add('bes3.com')
    } catch {
      // Ignore invalid URLs here and let runtime env validation fail.
    }
  }

  for (const host of parseAllowedHosts(process.env.BES3_ALLOWED_HOSTS)) {
    hosts.add(host)
  }

  return Array.from(hosts)
}

const allowedHosts = buildAllowedHosts()

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  compress: true,
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  serverExternalPackages: ['better-sqlite3', 'cheerio', 'undici', 'postgres', 'pg', 'playwright'],
  experimental: {
    serverActions: {
      allowedOrigins: allowedHosts,
      allowedForwardedHosts: allowedHosts
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
  eslint: {
    ignoreDuringBuilds: true
  },
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.join(__dirname, 'src')
    }

    if (isServer) {
      config.externals.push('better-sqlite3', 'cheerio', 'undici', 'postgres', 'pg', 'playwright')
    }
    return config
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          }
        ]
      },
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

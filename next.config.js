/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // VPS için production optimizasyonları
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  trailingSlash: true,
  
  // Next.js 15 için experimental ayarlar
  experimental: {
    staticGenerationRetryCount: 0,
    optimizePackageImports: ['@tanstack/react-query'],
    // Hot reload sorunlarını çöz
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  
  // Next.js 15 için server external packages
  serverExternalPackages: [],
  
  // Next.js 15 için static file serving
  assetPrefix: process.env.NODE_ENV === 'development' ? '' : '',
  
  // Next.js 15 için generateStaticParams kaldırıldı
  
  // Development modunda cache sorunlarını çözmek için
  ...(process.env.NODE_ENV === 'development' && {
    onDemandEntries: {
      maxInactiveAge: 25 * 1000,
      pagesBufferLength: 2,
    },
    // Hot reload sorunlarını çöz
    devIndicators: {
      buildActivity: true,
      buildActivityPosition: 'bottom-right',
    },
  }),
 
  // Environment değişkenlerini debug et
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  // PWA ve Push Notification için gerekli headers
  async headers() {
    const headers = [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
          // Safari uyumluluğu için
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'unsafe-none',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      // Uploads klasörü için static file serving
      {
        source: '/uploads/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];

    // Static dosyalar için headers
    headers.push({
      source: '/_next/static/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: process.env.NODE_ENV === 'development' 
            ? 'no-cache, no-store, must-revalidate'
            : 'public, max-age=31536000, immutable',
        },
      ],
    });

    // Next.js 15 için ek static file headers
    headers.push({
      source: '/_next/static/css/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    });

    headers.push({
      source: '/_next/static/chunks/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    });

    return headers;
  },
  // Static file serving için rewrites
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/static/:path*',
      },
    ];
  },
  
  // Webpack konfigürasyonu kaldırıldı - Next.js 15 default ayarları kullan
};

module.exports = nextConfig;

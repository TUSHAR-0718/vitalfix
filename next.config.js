/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
      {
        // Prevent caching API responses at CDN/browser level
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
    ]
  },

  // Increase serverless function timeout for audit route (Vercel Pro: up to 300s)
  // Default Vercel timeout is 10s — our audit needs up to 45s
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Compress responses
  compress: true,

  // Disable x-powered-by header (security)
  poweredByHeader: false,
}

module.exports = nextConfig

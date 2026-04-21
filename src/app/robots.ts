import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/guides/', '/report/', '/library', '/tools', '/checklist', '/pricing', '/docs'],
        disallow: ['/api/'],
      },
    ],
    sitemap: 'https://vitalfix.dev/sitemap.xml',
  }
}

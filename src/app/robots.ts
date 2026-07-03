import type { MetadataRoute } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Keep private / authenticated areas out of search results.
      disallow: ['/api/', '/dashboard', '/coach', '/feedback', '/profile', '/help', '/roadmap', '/admin'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}

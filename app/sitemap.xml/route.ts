import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getNewsArticleSlug } from '@/lib/news-slug'

export async function GET() {
  const baseUrl = 'https://legendholding.com'
  
  // Static pages
  const staticPages = [
    '',
    '/contact',
    '/careers',
    '/careers/jobs',
    '/news',
    '/sitemap',
    '/privacy-policy',
    '/cookie-policy',
    '/who-we-are',
    '/who-we-are/about-us',
    '/who-we-are/journey',
    '/who-we-are/the-team',
    '/our-businesses/legend-auto-services',
    '/our-businesses/legend-commercial-vehicles',
    '/our-businesses/legend-global-media',
    '/our-businesses/legend-green-energy',
    '/our-businesses/legend-motorcycles',
    '/our-businesses/legend-motors-dealership',
    '/our-businesses/legend-motors-trading',
    '/our-businesses/legend-autohub',
    '/our-businesses/legend-technical-services',
    '/our-businesses/legend-travel',
    '/our-businesses/legend-world-rent-a-car',
    '/our-businesses/zul-energy',
  ]

  // Dynamic: published news articles (article-1, article-2, ...)
  let newsPages: { path: string; lastmod?: string }[] = []
  try {
    const result = await query(
      `SELECT id, slug, publication_date FROM news_articles WHERE published = true`,
    )
    const articles = result.rows
    if (articles?.length) {
      newsPages = articles.map((a) => ({
        path: `/news/${getNewsArticleSlug(a)}`,
        lastmod: a.publication_date ? new Date(a.publication_date).toISOString().split('T')[0] : undefined,
      }))
    }
  } catch {
    // Sitemap still works without news entries
  }

  const allUrls = [
    ...staticPages.map((page) => ({ path: page, lastmod: new Date().toISOString().split('T')[0], static: true })),
    ...newsPages.map(({ path, lastmod }) => ({ path, lastmod: lastmod || new Date().toISOString().split('T')[0], static: false })),
  ]

  // Generate XML sitemap
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(({ path, lastmod }) => {
    const loc = `${baseUrl}${path}`
    const changefreq = path === '' ? 'weekly' : path.startsWith('/our-businesses/') ? 'monthly' : path.startsWith('/news/') ? 'weekly' : 'monthly'
    const priority = path === '' ? '1.0' : path.startsWith('/our-businesses/') ? '0.8' : path.startsWith('/news/') ? '0.7' : '0.7'
    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
  }).join('\n')}
</urlset>`

  return new NextResponse(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  })
} 
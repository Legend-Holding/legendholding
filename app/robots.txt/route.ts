import { NextResponse } from 'next/server'

export async function GET() {
  const robotsTxt = `# Legend Holding Group - robots.txt

# Block known spam/malware bots
User-agent: MJ12bot
Disallow: /

User-agent: AhrefsBot
Disallow: /

User-agent: SemrushBot
Disallow: /

User-agent: DotBot
Disallow: /

User-agent: PetalBot
Disallow: /

User-agent: BLEXBot
Disallow: /

User-agent: DataForSeoBot
Disallow: /

# All other crawlers
User-agent: *
Allow: /

# Disallow .html paths (this site has no .html files)
Disallow: /*.html$

# Disallow admin and API pages
Disallow: /admin/
Disallow: /api/

# Disallow internal/approval routes
Disallow: /co-founder-approval/
Disallow: /finance-review/
Disallow: /founder-approval/
Disallow: /workflow/
Disallow: /workflow-submissions/
Disallow: /company/

# Crawl delay
Crawl-delay: 1

# Sitemap
Sitemap: https://legendholding.com/sitemap.xml`

  return new NextResponse(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400',
    },
  })
} 
import { Metadata } from 'next';
import { query } from '@/lib/db';
import { generatePageMetadata } from '@/config/metadata';
import { isNewsIdParam } from '@/lib/news-slug';

interface NewsArticle {
  id: string
  title: string
  excerpt: string
  image_url: string
  category: string
  author: string
  seo_title?: string
  seo_description?: string
  seo_keywords?: string
  seo_image_url?: string
}

export async function generateMetadata(
  props: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await props.params;
  if (!slug) {
    return generatePageMetadata({
      title: 'News Article | Legend Holding Group',
      description: 'Legend Holding Group news and updates.',
      keywords: 'Legend Holding Group, news, article',
    });
  }

  try {
    const isId = isNewsIdParam(slug);
    const result = await query<NewsArticle>(
      `SELECT title, excerpt, image_url, category, author, seo_title, seo_description, seo_keywords, seo_image_url
       FROM news_articles
       WHERE published = true AND ${isId ? 'id = $1' : 'slug = $1'}
       LIMIT 1`,
      [slug],
    );
    const article = result.rows[0];

    if (!article) {
      return generatePageMetadata({
        title: 'News Article | Legend Holding Group',
        description: 'Legend Holding Group news and updates.',
        keywords: 'Legend Holding Group, news, article',
      });
    }

    const seoTitle = article.seo_title || article.title;
    const seoDescription = article.seo_description || article.excerpt;
    const seoKeywords = article.seo_keywords || `Legend Holding Group, ${article.category}, news, article, ${article.author}`;
    const seoImageUrl = article.seo_image_url || article.image_url;

    return generatePageMetadata({
      title: seoTitle,
      description: seoDescription,
      keywords: seoKeywords,
      imageUrl: seoImageUrl,
    });
  } catch (error) {
    console.error('Error generating metadata for article:', error);
    return generatePageMetadata({
      title: 'News Article',
      description: 'Legend Holding Group news and updates.',
      keywords: 'Legend Holding Group, news, updates, articles',
    });
  }
}

export default function NewsArticleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

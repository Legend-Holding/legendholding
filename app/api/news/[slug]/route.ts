import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { isNewsIdParam } from "@/lib/news-slug";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const isId = isNewsIdParam(slug);

    const articleResult = await query(
      `SELECT * FROM news_articles WHERE published = true AND ${isId ? "id" : "slug"} = $1 LIMIT 1`,
      [slug],
    );
    const article = articleResult.rows[0];

    if (!article) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let images: unknown[] = [];
    try {
      const imageResult = await query(
        `SELECT * FROM news_article_images WHERE article_id = $1 ORDER BY image_order ASC`,
        [article.id],
      );
      images = imageResult.rows;
    } catch {
      images = [];
    }

    return NextResponse.json({ article: { ...article, images } });
  } catch (error) {
    console.error("Error fetching article:", error);
    return NextResponse.json({ error: "Failed to fetch article" }, { status: 500 });
  }
}
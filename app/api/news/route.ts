import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const excludeId = searchParams.get("excludeId");
    const category = searchParams.get("category");

    const limit = Number.isFinite(Number(limitParam)) ? Math.max(1, Math.min(50, Number(limitParam))) : null;

    const conditions = ["published = true"];
    const values: unknown[] = [];

    if (category) {
      values.push(category);
      conditions.push(`category = $${values.length}`);
    }

    if (excludeId) {
      values.push(excludeId);
      conditions.push(`id != $${values.length}`);
    }

    let sql = `SELECT * FROM news_articles WHERE ${conditions.join(" AND ")} ORDER BY publication_date DESC, created_at DESC`;
    if (limit) {
      values.push(limit);
      sql += ` LIMIT $${values.length}`;
    }

    const articlesResult = await query(sql, values);

    const articlesWithImages = await Promise.all(
      articlesResult.rows.map(async (article) => {
        try {
          const imageResult = await query(
            `SELECT * FROM news_article_images WHERE article_id = $1 ORDER BY image_order ASC`,
            [article.id],
          );
          return { ...article, images: imageResult.rows };
        } catch {
          return { ...article, images: [] };
        }
      }),
    );

    return NextResponse.json({ articles: articlesWithImages });
  } catch (error) {
    console.error("Error fetching news:", error);
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}
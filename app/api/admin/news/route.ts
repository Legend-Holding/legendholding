import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-auth";
import { getNextArticleSlug } from "@/lib/news-slug";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const payload = verifyAdminSessionToken(token);
  if (!payload) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  return { error: null };
}

export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "10");
  const offset = (page - 1) * limit;

  const countResult = await query(`SELECT COUNT(*) AS total FROM news_articles`);
  const total = parseInt(countResult.rows[0]?.total ?? "0");

  const articlesResult = await query(
    `SELECT * FROM news_articles ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset],
  );

  const articlesWithImages = await Promise.all(
    articlesResult.rows.map(async (article) => {
      try {
        const imgResult = await query(
          `SELECT * FROM news_article_images WHERE article_id = $1 ORDER BY image_order ASC`,
          [article.id],
        );
        return { ...article, images: imgResult.rows };
      } catch {
        return { ...article, images: [] };
      }
    }),
  );

  return NextResponse.json({ articles: articlesWithImages, total });
}

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json().catch(() => ({}));

  if (body.is_featured) {
    await query(`UPDATE news_articles SET is_featured = false`);
  }

  const read_time = body.read_time || `${Number(body.read_time_minutes || 5)} Minutes`;

  const slugResult = await query(`SELECT slug FROM news_articles`);
  const slug = body.slug || getNextArticleSlug(slugResult.rows.map((r) => r.slug));

  const articleResult = await query(
    `INSERT INTO news_articles
     (slug, title, excerpt, content, image_url, category, author, publication_date, read_time, is_featured, published, seo_title, seo_description, seo_keywords)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING *`,
    [
      slug,
      body.title || "",
      body.excerpt || "",
      body.content || "",
      body.image_url || "",
      body.category || "",
      body.author || "",
      body.publication_date || new Date().toISOString().split("T")[0],
      read_time,
      Boolean(body.is_featured),
      body.published !== false,
      body.seo_title || "",
      body.seo_description || "",
      body.seo_keywords || "",
    ],
  );

  const article = articleResult.rows[0];

  const images = Array.isArray(body.images) ? body.images : [];
  if (images.length > 0) {
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (!img?.image_url) continue;
      await query(
        `INSERT INTO news_article_images (article_id, image_url, image_order, image_type, alt_text, caption)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          article.id,
          img.image_url,
          i + 1,
          img.image_type || "content",
          img.alt_text || null,
          img.caption || null,
        ],
      );
    }
  }

  return NextResponse.json(article, { status: 201 });
}



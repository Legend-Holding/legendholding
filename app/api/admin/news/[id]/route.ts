import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-auth";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const payload = verifyAdminSessionToken(token);
  if (!payload) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  return { error: null };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json().catch(() => ({}));

  if (body.is_featured) {
    await query(`UPDATE news_articles SET is_featured = false WHERE id != $1`, [id]);
  }

  const images = Array.isArray(body.images) ? body.images : null;
  if (images) {
    delete body.images;
  }

  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const [key, val] of Object.entries(body)) {
    sets.push(`${key} = $${i++}`);
    values.push(val);
  }
  let result;
  if (sets.length > 0) {
    values.push(id);
    result = await query(
      `UPDATE news_articles SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
      values,
    );
  } else {
    result = await query(`SELECT * FROM news_articles WHERE id = $1`, [id]);
  }
  if (result.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (images) {
    await query(`DELETE FROM news_article_images WHERE article_id = $1`, [id]);
    for (let idx = 0; idx < images.length; idx++) {
      const img = images[idx];
      if (!img?.image_url) continue;
      await query(
        `INSERT INTO news_article_images (article_id, image_url, image_order, image_type, alt_text, caption)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          id,
          img.image_url,
          idx + 1,
          img.image_type || "content",
          img.alt_text || null,
          img.caption || null,
        ],
      );
    }
  }

  return NextResponse.json(result.rows[0]);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await requireAdmin();
  if (error) return error;

  await query(`DELETE FROM news_article_images WHERE article_id = $1`, [id]);
  await query(`DELETE FROM news_articles WHERE id = $1`, [id]);
  return NextResponse.json({ success: true });
}



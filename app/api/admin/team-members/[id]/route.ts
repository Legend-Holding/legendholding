import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";
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

  const sets: string[] = ["updated_at = NOW()"];
  const values: unknown[] = [];
  let i = 1;
  const add = (col: string, val: unknown) => { sets.push(`${col} = $${i++}`); values.push(val); };

  if (body.name !== undefined) add("name", String(body.name).trim());
  if (body.role !== undefined) add("role", String(body.role).trim());
  if (body.company !== undefined) add("company", String(body.company).trim());
  if (body.image !== undefined) add("image", String(body.image).trim());
  if (body.category !== undefined) {
    if (!["board", "ksa", "china"].includes(body.category)) {
      return NextResponse.json({ error: "category must be board, ksa, or china" }, { status: 400 });
    }
    add("category", String(body.category).trim());
  }
  if (body.sort_order !== undefined) add("sort_order", Number(body.sort_order));
  if (body.is_visible !== undefined) add("is_visible", Boolean(body.is_visible));
  if (body.is_spotlight !== undefined) add("is_spotlight", Boolean(body.is_spotlight));
  if (body.seo_description !== undefined) add("seo_description", String(body.seo_description).trim());
  if (body.linkedin !== undefined) add("linkedin", String(body.linkedin).trim());

  values.push(id);
  const result = await query(
    `UPDATE team_members SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
    values,
  );
  if (result.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  revalidatePath('/who-we-are/the-team');
  return NextResponse.json(result.rows[0]);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await requireAdmin();
  if (error) return error;

  await query(`DELETE FROM team_members WHERE id = $1`, [id]);
  revalidatePath('/who-we-are/the-team');
  return NextResponse.json({ success: true });
}



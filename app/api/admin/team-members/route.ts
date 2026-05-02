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

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const result = await query(`SELECT * FROM team_members ORDER BY category ASC, sort_order ASC`);
  return NextResponse.json(result.rows);
}

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const {
    name,
    role,
    company = "Legend Holding Group",
    image,
    category = "board",
    seo_description = "",
    is_spotlight = false,
    linkedin = "",
  } = body;

  if (!name || !role || !image) {
    return NextResponse.json(
      { error: "name, role, and image are required" },
      { status: 400 }
    );
  }

  if (!["board", "ksa", "china"].includes(category)) {
    return NextResponse.json({ error: "category must be board, ksa, or china" }, { status: 400 });
  }

  const maxResult = await query(
    `SELECT COALESCE(MAX(sort_order), 0) AS max FROM team_members WHERE category = $1`,
    [category],
  );
  const sort_order = (maxResult.rows[0]?.max ?? 0) + 1;

  const result = await query(
    `INSERT INTO team_members (name, role, company, image, category, sort_order, is_visible, is_spotlight, seo_description, linkedin)
     VALUES ($1,$2,$3,$4,$5,$6,true,$7,$8,$9) RETURNING *`,
    [String(name).trim(), String(role).trim(), String(company).trim(), String(image).trim(),
     String(category).trim(), sort_order, Boolean(is_spotlight), String(seo_description).trim(), String(linkedin).trim()],
  );
  revalidatePath('/who-we-are/the-team');
  return NextResponse.json(result.rows[0]);
}

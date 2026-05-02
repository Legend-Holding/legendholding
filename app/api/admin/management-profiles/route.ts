import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-auth";

const BUSINESS_CARDS_ONLY_ADMIN_EMAIL = "admin@legendholding.com";

async function requireManagementProfilesAccess() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const payload = verifyAdminSessionToken(token);
  if (!payload?.sub || !payload?.email) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  if (payload.email.toLowerCase() === BUSINESS_CARDS_ONLY_ADMIN_EMAIL) return { error: null };

  const roleResult = await query<{ role: string; permissions: Record<string, boolean> | null }>(
    `SELECT role, permissions FROM user_roles WHERE user_id = $1 LIMIT 1`,
    [payload.sub],
  );
  const roleData = roleResult.rows[0];
  if (!roleData || (roleData.role !== "super_admin" && !roleData.permissions?.management_profiles)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { error: null };
}

function slugFromName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export async function GET(request: Request) {
  const { error } = await requireManagementProfilesAccess();
  if (error) return error;
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const version = (searchParams.get("version")?.trim().toLowerCase() ?? "all") as "all" | "new" | "old";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? "20") || 20));
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (version === "new") { conditions.push(`source = 'new'`); }
  else if (version === "old") { conditions.push(`source != 'new' OR source IS NULL`); }

  if (q) {
    const like = `%${q.replace(/[%_]/g, "\\$&")}%`;
    conditions.push(`(name ILIKE $${i} OR designation ILIKE $${i} OR slug ILIKE $${i} OR legacy_slug ILIKE $${i} OR email ILIKE $${i})`);
    values.push(like); i++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await query(`SELECT COUNT(*) AS total FROM management_profiles ${where}`, values);
  const total = parseInt(countResult.rows[0]?.total ?? "0");

  values.push(pageSize); values.push(offset);
  const result = await query(
    `SELECT * FROM management_profiles ${where} ORDER BY sort_order ASC LIMIT $${i} OFFSET $${i + 1}`,
    values,
  );

  return NextResponse.json({ items: result.rows, total, page, pageSize, query: q, version });
}

export async function POST(request: Request) {
  const { error } = await requireManagementProfilesAccess();
  if (error) return error;
  const body = await request.json().catch(() => ({}));
  const { name, designation, company = "Legend Holding Group", photo, email = "", telephone = "", whatsapp = "", linkedin = "", website = "", location = "", location_link = "" } = body;
  if (!name || !designation || !photo) {
    return NextResponse.json({ error: "name, designation, and photo are required" }, { status: 400 });
  }
  let slug = (body.slug || slugFromName(name)).trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  if (!slug) slug = slugFromName(name);

  const existingSlug = await query(`SELECT id FROM management_profiles WHERE slug = $1 LIMIT 1`, [slug]);
  if (existingSlug.rows.length > 0) slug = `${slug}-${Date.now().toString(36)}`;

  const maxResult = await query(`SELECT COALESCE(MAX(sort_order), 0) AS max FROM management_profiles`);
  const sort_order = (maxResult.rows[0]?.max ?? 0) + 1;

  const result = await query(
    `INSERT INTO management_profiles (slug, name, designation, company, photo, email, telephone, whatsapp, linkedin, website, location, location_link, sort_order, source)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'new') RETURNING *`,
    [slug, String(name).trim(), String(designation).trim(), String(company).trim(), String(photo).trim(),
     String(email).trim(), String(telephone).trim(), String(whatsapp).trim(), String(linkedin).trim(),
     String(website).trim(), String(location).trim(), String(location_link).trim(), sort_order],
  );
  return NextResponse.json(result.rows[0]);
}



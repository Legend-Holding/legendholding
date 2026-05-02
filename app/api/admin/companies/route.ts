import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-auth";

const BUSINESS_CARDS_ONLY_ADMIN_EMAIL = "admin@legendholding.com";

async function requireCompaniesAccess() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const payload = verifyAdminSessionToken(token);
  if (!payload?.sub || !payload?.email) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (payload.email.toLowerCase() === BUSINESS_CARDS_ONLY_ADMIN_EMAIL) {
    return { error: null, payload };
  }

  const roleResult = await query<{ role: string; permissions: Record<string, boolean> | null }>(
    `SELECT role, permissions FROM user_roles WHERE user_id = $1 LIMIT 1`,
    [payload.sub],
  );
  const roleData = roleResult.rows[0];
  const hasManagementProfilesPermission = roleData?.permissions?.management_profiles === true;
  const isSuperAdmin = roleData?.role === "super_admin";

  if (!roleData || (!isSuperAdmin && !hasManagementProfilesPermission)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { error: null, payload };
}

export async function GET(request: Request) {
  const { error } = await requireCompaniesAccess();
  if (error) return error;
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const onlyActive = searchParams.get("active") === "1";

  const conditions: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (onlyActive) { conditions.push(`is_active = TRUE`); }
  if (q) {
    const like = `%${q.replace(/[%_]/g, "\\$&")}%`;
    conditions.push(`(name ILIKE $${i} OR website ILIKE $${i} OR address ILIKE $${i} OR telephone ILIKE $${i})`);
    values.push(like); i++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await query(
    `SELECT * FROM companies ${where} ORDER BY sort_order ASC, name ASC`,
    values,
  );
  return NextResponse.json({ items: result.rows });
}

export async function POST(request: Request) {
  const { error } = await requireCompaniesAccess();
  if (error) return error;
  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const existing = await query(`SELECT id FROM companies WHERE name = $1 LIMIT 1`, [name]);
  if (existing.rows.length > 0) return NextResponse.json({ error: "A company with that name already exists" }, { status: 409 });

  const maxResult = await query(`SELECT COALESCE(MAX(sort_order), 0) AS max FROM companies`);
  const sort_order = (maxResult.rows[0]?.max ?? 0) + 1;

  const result = await query(
    `INSERT INTO companies (name, logo, telephone, website, address, location_link, is_active, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [
      name,
      String(body.logo ?? "").trim(),
      String(body.telephone ?? "").trim(),
      String(body.website ?? "").trim(),
      String(body.address ?? "").trim(),
      String(body.location_link ?? "").trim(),
      body.is_active === false ? false : true,
      sort_order,
    ],
  );
  return NextResponse.json(result.rows[0]);
}



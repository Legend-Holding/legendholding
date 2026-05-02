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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await requireManagementProfilesAccess();
  if (error) return error;
  const body = await request.json().catch(() => ({}));

  const sets: string[] = ["updated_at = NOW()"];
  const values: unknown[] = [];
  let i = 1;
  const add = (col: string, val: unknown) => { sets.push(`${col} = $${i++}`); values.push(val); };

  if (body.name !== undefined) add("name", String(body.name).trim());
  if (body.designation !== undefined) add("designation", String(body.designation).trim());
  if (body.company !== undefined) add("company", String(body.company).trim());
  if (body.photo !== undefined) add("photo", String(body.photo).trim());
  if (body.email !== undefined) add("email", String(body.email).trim());
  if (body.telephone !== undefined) add("telephone", String(body.telephone).trim());
  if (body.whatsapp !== undefined) add("whatsapp", String(body.whatsapp).trim());
  if (body.linkedin !== undefined) add("linkedin", String(body.linkedin).trim());
  if (body.website !== undefined) add("website", String(body.website).trim());
  if (body.location !== undefined) add("location", String(body.location).trim());
  if (body.location_link !== undefined) add("location_link", String(body.location_link).trim());
  if (body.slug !== undefined) add("slug", String(body.slug).trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
  if (body.sort_order !== undefined) add("sort_order", Number(body.sort_order));

  values.push(id);
  const result = await query(
    `UPDATE management_profiles SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
    values,
  );
  if (result.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(result.rows[0]);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await requireManagementProfilesAccess();
  if (error) return error;
  await query(`DELETE FROM management_profiles WHERE id = $1`, [id]);
  return NextResponse.json({ success: true });
}



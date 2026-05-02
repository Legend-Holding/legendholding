import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-auth";

async function requireSuperAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), currentUserId: null };
  const payload = verifyAdminSessionToken(token);
  if (!payload) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), currentUserId: null };

  const roleResult = await query<{ role: string }>(
    `SELECT role FROM user_roles WHERE user_id = $1 LIMIT 1`,
    [payload.sub],
  );
  if (roleResult.rows[0]?.role !== "super_admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), currentUserId: null };
  }
  return { error: null, currentUserId: payload.sub };
}

/** PATCH /api/admin/users/[id] — update role or permissions */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const sets: string[] = ["updated_at = NOW()"];
  const values: unknown[] = [];
  let i = 1;
  if (body.role !== undefined) { sets.push(`role = $${i++}`); values.push(body.role); }
  if (body.permissions !== undefined) { sets.push(`permissions = $${i++}`); values.push(JSON.stringify(body.permissions)); }

  values.push(id);
  const result = await query(
    `UPDATE user_roles SET ${sets.join(", ")} WHERE user_id = $${i} RETURNING *`,
    values,
  );
  if (result.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(result.rows[0]);
}

/** DELETE /api/admin/users/[id] — remove user */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, currentUserId } = await requireSuperAdmin();
  if (error) return error;

  const { id } = await params;
  if (id === currentUserId) return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });

  await query(`DELETE FROM user_roles WHERE user_id = $1`, [id]);
  await query(`DELETE FROM auth.users WHERE id = $1`, [id]);
  return NextResponse.json({ message: "User deleted" });
}



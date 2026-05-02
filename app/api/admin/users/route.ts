import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-auth";

async function requireSuperAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), userId: null };
  const payload = verifyAdminSessionToken(token);
  if (!payload) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), userId: null };

  const roleResult = await query<{ role: string }>(
    `SELECT role FROM user_roles WHERE user_id = $1 LIMIT 1`,
    [payload.sub],
  );
  if (roleResult.rows[0]?.role !== "super_admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), userId: null };
  }
  return { error: null, userId: payload.sub };
}

/** GET /api/admin/users — list all admin users */
export async function GET() {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const result = await query(`SELECT * FROM user_roles ORDER BY email ASC`);
  return NextResponse.json(result.rows);
}

/** POST /api/admin/users — create a new admin user */
export async function POST(request: Request) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const { email, password, role = "admin", permissions } = body;

  if (!email || !password) return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  if (!["admin", "super_admin"].includes(role)) return NextResponse.json({ error: "Role must be admin or super_admin" }, { status: 400 });

  const defaultPermissions = role === "super_admin"
    ? { dashboard: true, submissions: true, news: true, jobs: true, applications: true, newsletters: true, settings: true, customer_care: true, management_profiles: true, team_members: true }
    : { dashboard: true, submissions: false, news: false, jobs: true, applications: true, newsletters: false, settings: false, customer_care: false, management_profiles: false, team_members: false };

  const finalPermissions = permissions || defaultPermissions;
  const cleanEmail = email.trim().toLowerCase();

  // Check if user already exists in auth.users
  const existingUser = await query(
    `SELECT id FROM auth.users WHERE lower(email) = $1 LIMIT 1`,
    [cleanEmail],
  );

  let userId: string;

  if (existingUser.rows.length > 0) {
    userId = existingUser.rows[0].id;
    const hash = await bcrypt.hash(password, 12);
    await query(
      `UPDATE auth.users SET encrypted_password = $1, updated_at = NOW() WHERE id = $2`,
      [hash, userId],
    );
  } else {
    const hash = await bcrypt.hash(password, 12);
    const newUser = await query(
      `INSERT INTO auth.users (instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
       VALUES ('00000000-0000-0000-0000-000000000000', $1, $2, NOW(), NOW(), NOW(), '{}', '{}', 'authenticated', 'authenticated')
       RETURNING id`,
      [cleanEmail, hash],
    );
    userId = newUser.rows[0].id;
  }

  // Upsert user_roles
  await query(
    `INSERT INTO user_roles (user_id, email, role, permissions)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role, permissions = EXCLUDED.permissions, email = EXCLUDED.email, updated_at = NOW()`,
    [userId, cleanEmail, role, JSON.stringify(finalPermissions)],
  );

  const roleResult = await query(`SELECT * FROM user_roles WHERE user_id = $1 LIMIT 1`, [userId]);
  return NextResponse.json(roleResult.rows[0], { status: 201 });
}



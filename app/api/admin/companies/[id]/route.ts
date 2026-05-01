import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-auth";

const BUSINESS_CARDS_ONLY_ADMIN_EMAIL = "admin@legendholding.com";

async function requireCompaniesAccess() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return { error: NextResponse.json({ error: "Server config error" }, { status: 500 }), supabase: null };
  }
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), supabase: null };
  }
  const payload = verifyAdminSessionToken(token);
  if (!payload?.sub || !payload?.email) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), supabase: null };
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (payload.email.toLowerCase() === BUSINESS_CARDS_ONLY_ADMIN_EMAIL) {
    return { error: null, supabase };
  }

  const roleResult = await query<{ role: string; permissions: Record<string, boolean> | null }>(
    `SELECT role, permissions
     FROM user_roles
     WHERE user_id = $1
     LIMIT 1`,
    [payload.sub],
  );
  const roleData = roleResult.rows[0];
  const hasManagementProfilesPermission = roleData?.permissions?.management_profiles === true;
  const isSuperAdmin = roleData?.role === "super_admin";

  if (!roleData || (!isSuperAdmin && !hasManagementProfilesPermission)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), supabase: null };
  }
  return { error: null, supabase };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { error, supabase } = await requireCompaniesAccess();
  if (error) return error;
  const body = await request.json().catch(() => ({}));
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) updates.name = String(body.name).trim();
  if (body.logo !== undefined) updates.logo = String(body.logo).trim();
  if (body.telephone !== undefined) updates.telephone = String(body.telephone).trim();
  if (body.website !== undefined) updates.website = String(body.website).trim();
  if (body.address !== undefined) updates.address = String(body.address).trim();
  if (body.location_link !== undefined) updates.location_link = String(body.location_link).trim();
  if (body.is_active !== undefined) updates.is_active = body.is_active === true;
  if (body.sort_order !== undefined) updates.sort_order = Number(body.sort_order) || 0;

  const { data, error: updateError } = await supabase!
    .from("companies")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { error, supabase } = await requireCompaniesAccess();
  if (error) return error;
  const { error: deleteError } = await supabase!.from("companies").delete().eq("id", id);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

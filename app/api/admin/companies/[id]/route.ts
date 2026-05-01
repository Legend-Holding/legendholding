import { createClient } from "@supabase/supabase-js";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const BUSINESS_CARDS_ONLY_ADMIN_EMAIL = "admin@legendholding.com";

async function requireCompaniesAccess() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return { error: NextResponse.json({ error: "Server config error" }, { status: 500 }), supabase: null };
  }
  const cookieStore = await cookies();
  const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore });
  const { data: { session } } = await supabaseAuth.auth.getSession();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), supabase: null };
  }
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  if (session.user.email === BUSINESS_CARDS_ONLY_ADMIN_EMAIL) {
    return { error: null, supabase };
  }
  const { data: roleData, error: roleError } = await supabase
    .from("user_roles")
    .select("role, permissions")
    .eq("user_id", session.user.id)
    .single();
  if (roleError || !roleData) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), supabase: null };
  }
  const role = (roleData as { role: string; permissions: Record<string, boolean> | null }).role;
  const permissions = (roleData as { permissions: Record<string, boolean> | null }).permissions;
  const isSuperAdmin = role === "super_admin";
  const hasManagementProfilesPermission = permissions?.management_profiles === true;
  if (!isSuperAdmin && !hasManagementProfilesPermission) {
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

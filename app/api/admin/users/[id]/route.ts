import { createClient } from "@supabase/supabase-js";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

async function requireSuperAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return { error: NextResponse.json({ error: "Server config error" }, { status: 500 }), supabase: null, currentUserId: null };
  }
  const cookieStore = await cookies();
  const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore });
  const { data: { session } } = await supabaseAuth.auth.getSession();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), supabase: null, currentUserId: null };
  }
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: roleData, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", session.user.id)
    .single();
  if (roleError || !roleData || (roleData as { role: string }).role !== "super_admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), supabase: null, currentUserId: null };
  }
  return { error: null, supabase, currentUserId: session.user.id };
}

/** PATCH /api/admin/users/[id] — update role or permissions */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, supabase } = await requireSuperAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.role !== undefined) updates.role = body.role;
  if (body.permissions !== undefined) updates.permissions = body.permissions;

  const { data, error: updateErr } = await supabase!
    .from("user_roles")
    .update(updates)
    .eq("user_id", id)
    .select()
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  return NextResponse.json(data);
}

/** DELETE /api/admin/users/[id] — remove user from auth and user_roles */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, supabase, currentUserId } = await requireSuperAdmin();
  if (error) return error;

  const { id } = await params;

  if (id === currentUserId) {
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
  }

  // Remove from user_roles first
  const { error: roleErr } = await supabase!
    .from("user_roles")
    .delete()
    .eq("user_id", id);
  if (roleErr) return NextResponse.json({ error: roleErr.message }, { status: 500 });

  // Delete from Supabase Auth
  const { error: authErr } = await supabase!.auth.admin.deleteUser(id);
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 });

  return NextResponse.json({ message: "User deleted" });
}

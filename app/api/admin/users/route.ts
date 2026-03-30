import { createClient } from "@supabase/supabase-js";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

async function requireSuperAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return { error: NextResponse.json({ error: "Server config error" }, { status: 500 }), supabase: null, userId: null };
  }
  const cookieStore = await cookies();
  const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore });
  const { data: { session } } = await supabaseAuth.auth.getSession();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), supabase: null, userId: null };
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
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), supabase: null, userId: null };
  }
  return { error: null, supabase, userId: session.user.id };
}

/** GET /api/admin/users — list all admin users */
export async function GET() {
  const { error, supabase } = await requireSuperAdmin();
  if (error) return error;

  const { data, error: fetchError } = await supabase!
    .from("user_roles")
    .select("*")
    .order("email", { ascending: true });

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

/** POST /api/admin/users — create a new admin user */
export async function POST(request: Request) {
  const { error, supabase } = await requireSuperAdmin();
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const { email, password, role = "admin", permissions } = body;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  if (!["admin", "super_admin"].includes(role)) {
    return NextResponse.json({ error: "Role must be admin or super_admin" }, { status: 400 });
  }

  const defaultPermissions = role === "super_admin"
    ? { dashboard: true, submissions: true, news: true, jobs: true, applications: true, newsletters: true, settings: true, customer_care: true, management_profiles: true, team_members: true }
    : { dashboard: true, submissions: false, news: false, jobs: true, applications: true, newsletters: false, settings: false, customer_care: false, management_profiles: false, team_members: false };

  const finalPermissions = permissions || defaultPermissions;

  // Create auth user
  const { data: newUser, error: createError } = await supabase!.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
  });

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  // Check if trigger already created user_roles entry
  const { data: existingRole } = await supabase!
    .from("user_roles")
    .select("id")
    .eq("user_id", newUser.user.id)
    .single();

  if (existingRole) {
    const { error: updateErr } = await supabase!
      .from("user_roles")
      .update({ role, permissions: finalPermissions, updated_at: new Date().toISOString() })
      .eq("user_id", newUser.user.id);
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }
  } else {
    const { error: insertErr } = await supabase!
      .from("user_roles")
      .insert({
        user_id: newUser.user.id,
        email: email.trim().toLowerCase(),
        role,
        permissions: finalPermissions,
      });
    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ message: "User created", user_id: newUser.user.id, email, role });
}

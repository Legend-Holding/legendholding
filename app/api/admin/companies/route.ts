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

export async function GET(request: Request) {
  const { error, supabase } = await requireCompaniesAccess();
  if (error) return error;
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const onlyActive = searchParams.get("active") === "1";
  let builder = supabase!
    .from("companies")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (onlyActive) builder = builder.eq("is_active", true);
  if (q) {
    const escaped = q.replace(/[%_]/g, "\\$&");
    builder = builder.or(
      [
        `name.ilike.%${escaped}%`,
        `website.ilike.%${escaped}%`,
        `address.ilike.%${escaped}%`,
        `telephone.ilike.%${escaped}%`,
      ].join(","),
    );
  }
  const { data, error: err } = await builder;
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: Request) {
  const { error, supabase } = await requireCompaniesAccess();
  if (error) return error;
  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const { data: existing } = await supabase!
    .from("companies")
    .select("id")
    .eq("name", name)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "A company with that name already exists" }, { status: 409 });
  }
  const { data: maxOrder } = await supabase!
    .from("companies")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sort_order = ((maxOrder as { sort_order: number } | null)?.sort_order ?? 0) + 1;

  const { data: inserted, error: insertError } = await supabase!
    .from("companies")
    .insert({
      name,
      logo: String(body.logo ?? "").trim(),
      telephone: String(body.telephone ?? "").trim(),
      website: String(body.website ?? "").trim(),
      address: String(body.address ?? "").trim(),
      location_link: String(body.location_link ?? "").trim(),
      is_active: body.is_active === false ? false : true,
      sort_order,
    })
    .select()
    .single();
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  return NextResponse.json(inserted);
}

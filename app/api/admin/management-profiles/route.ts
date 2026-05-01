import { createClient } from "@supabase/supabase-js";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const BUSINESS_CARDS_ONLY_ADMIN_EMAIL = "admin@legendholding.com";

/** Allow super_admin or admin@legendholding.com (Digital Business Cards only). */
async function requireManagementProfilesAccess() {
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

function slugFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export async function GET(request: Request) {
  const { error, supabase } = await requireManagementProfilesAccess();
  if (error) return error;
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const version = (searchParams.get("version")?.trim().toLowerCase() ?? "all") as "all" | "new" | "old";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? "20") || 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let builder = supabase!
    .from("management_profiles")
    .select("*", { count: "exact" })
    .order("sort_order", { ascending: true })
    .range(from, to);

  if (query) {
    const escaped = query.replace(/[%_]/g, "\\$&");
    builder = builder.or(
      [
        `name.ilike.%${escaped}%`,
        `designation.ilike.%${escaped}%`,
        `slug.ilike.%${escaped}%`,
        `legacy_slug.ilike.%${escaped}%`,
        `email.ilike.%${escaped}%`,
        `company.ilike.%${escaped}%`,
      ].join(",")
    );
  }

  if (version === "old") {
    builder = builder.eq("source", "imported");
  } else if (version === "new") {
    builder = builder.eq("source", "new");
  }

  const { data, error: err, count } = await builder;
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });
  return NextResponse.json({
    items: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
    query,
    version,
  });
}

export async function POST(request: Request) {
  const { error, supabase } = await requireManagementProfilesAccess();
  if (error) return error;
  const body = await request.json().catch(() => ({}));
  const {
    name,
    designation,
    company = "Legend Holding Group",
    photo,
    email = "",
    telephone = "",
    whatsapp = "",
    linkedin = "",
    website = "",
    location = "",
    location_link = "",
  } = body;
  if (!name || !designation || !photo) {
    return NextResponse.json(
      { error: "name, designation, and photo are required" },
      { status: 400 }
    );
  }
  let slug = (body.slug || slugFromName(name)).trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  if (!slug) slug = slugFromName(name);
  const { data: existing } = await supabase!.from("management_profiles").select("id").eq("slug", slug).maybeSingle();
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }
  const { data: maxOrder } = await supabase!
    .from("management_profiles")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sort_order = (maxOrder as { sort_order: number } | null)?.sort_order ?? 0;
  const { data: inserted, error: insertError } = await supabase!
    .from("management_profiles")
    .insert({
      slug,
      name: String(name).trim(),
      designation: String(designation).trim(),
      company: String(company).trim(),
      photo: String(photo).trim(),
      email: String(email).trim(),
      telephone: String(telephone).trim(),
      whatsapp: String(whatsapp).trim(),
      linkedin: String(linkedin).trim(),
      website: String(website).trim(),
      location: String(location).trim(),
      location_link: String(location_link).trim(),
      sort_order: sort_order + 1,
      source: "new",
    })
    .select()
    .single();
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  return NextResponse.json(inserted);
}

import { createClient } from "@supabase/supabase-js";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

const BUSINESS_CARDS_ONLY_ADMIN_EMAIL = "admin@legendholding.com";

export async function POST(request: Request) {
  try {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET." },
        { status: 503 }
      );
    }

    const cookieStore = await cookies();
    const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { session } } = await supabaseAuth.auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Allow super_admin, anyone with management_profiles permission, or the
    // dedicated business-cards-only admin (admin@legendholding.com).
    if (session.user.email !== BUSINESS_CARDS_ONLY_ADMIN_EMAIL) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role, permissions")
        .eq("user_id", session.user.id)
        .single();
      const role = (roleData as { role?: string } | null)?.role;
      const permissions = (roleData as { permissions?: Record<string, boolean> | null } | null)?.permissions;
      const isSuperAdmin = role === "super_admin";
      const hasManagementProfilesPermission = permissions?.management_profiles === true;
      if (!roleData || (!isSuperAdmin && !hasManagementProfilesPermission)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const formData = await request.formData();
    const file = formData.get("image") as File | null;
    if (!file || !file.size) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    const dataUri = `data:${file.type};base64,${base64}`;

    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      cloudinary.uploader.upload(dataUri, { folder: "management-profiles" }, (err, res) => {
        if (err) reject(err);
        else if (res?.secure_url) resolve(res);
        else reject(new Error("No URL returned"));
      });
    });

    return NextResponse.json({ url: result.secure_url });
  } catch (e) {
    console.error("Cloudinary upload error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 }
    );
  }
}

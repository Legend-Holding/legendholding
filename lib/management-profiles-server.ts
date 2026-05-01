import { createClient } from "@supabase/supabase-js";
import type { TeamMember } from "@/components/digital-business-card";

/**
 * Server-side only. Fetches management profile by slug from Supabase.
 * Used by profile page and metadata.
 */
export async function getProfileBySlug(slug: string): Promise<TeamMember | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase
    .from("management_profiles")
    .select("slug, name, designation, company, photo, email, telephone, whatsapp, linkedin, website, location, location_link")
    .eq("slug", slug)
    .single();
  if (error || !data) return null;
  return {
    ...(data as Omit<TeamMember, "phone"> & { telephone?: string }),
    phone: (data as { telephone?: string }).telephone ?? "",
  } as TeamMember;
}

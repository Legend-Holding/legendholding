import { query } from "@/lib/db";
import type { TeamMember } from "@/components/digital-business-card";

/**
 * Server-side only. Fetches management profile by slug from Supabase.
 * Used by profile page and metadata.
 */
export async function getProfileBySlug(slug: string): Promise<TeamMember | null> {
  const result = await query(
    `SELECT slug, name, designation, company, photo, email, telephone, whatsapp, linkedin, website, location, location_link
     FROM management_profiles
     WHERE slug = $1
     LIMIT 1`,
    [slug],
  );
  const data = result.rows[0];
  if (!data) return null;
  return {
    ...(data as Omit<TeamMember, "phone"> & { telephone?: string }),
    phone: (data as { telephone?: string }).telephone ?? "",
  } as TeamMember;
}

import { NextResponse } from "next/server";
import { query } from "@/lib/db";

/**
 * Legacy QR redirect handler.
 *
 * Old OutSystems URL format:
 *   https://lpas.legendholding.com/LHGvCard/Vcard?Slug=<legacy>
 *
 * Looks up management_profiles.legacy_slug and 301-redirects to the
 * canonical new profile URL: <site>/profile/<slug>.
 *
 * If NEXT_PUBLIC_SITE_URL is set, the redirect target uses that host
 * (recommended in production so users land on the main domain).
 * Otherwise it falls back to the current request origin.
 */

function getBaseUrl(request: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (envUrl) return envUrl;
  return new URL(request.url).origin;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const legacySlug = (
    requestUrl.searchParams.get("Slug") ||
    requestUrl.searchParams.get("slug") ||
    ""
  ).trim();

  const baseUrl = getBaseUrl(request);

  if (!legacySlug) {
    return NextResponse.redirect(`${baseUrl}/`, 302);
  }

  const result = await query(
    `SELECT slug FROM management_profiles WHERE legacy_slug ILIKE $1 LIMIT 1`,
    [legacySlug],
  );
  const data = result.rows[0];

  if (data?.slug) {
    return NextResponse.redirect(`${baseUrl}/profile/${data.slug}`, 301);
  }

  return NextResponse.redirect(`${baseUrl}/`, 302);
}

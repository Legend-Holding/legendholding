import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const result = await query(
      `SELECT * FROM management_profiles WHERE slug = $1 LIMIT 1`,
      [slug],
    );
    if (result.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const { id, created_at, updated_at, sort_order, ...member } = result.rows[0];
    return NextResponse.json(member);
  } catch (e) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}



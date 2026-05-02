import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const result = await query(
      `SELECT id, slug, name, designation, company, photo, email, whatsapp, linkedin, website, location, sort_order
       FROM management_profiles ORDER BY sort_order ASC`,
    );
    return NextResponse.json(result.rows);
  } catch (e) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}



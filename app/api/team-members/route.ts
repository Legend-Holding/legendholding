import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const result = await query(
      `SELECT name, role, company, image, category, sort_order, is_spotlight, seo_description, linkedin
       FROM team_members WHERE is_visible = true ORDER BY sort_order ASC`,
    );
    const board = result.rows.filter((m) => m.category === "board");
    const ksa = result.rows.filter((m) => m.category === "ksa");
    const china = result.rows.filter((m) => m.category === "china");
    return NextResponse.json({ board, ksa, china });
  } catch (e) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}



import { NextResponse } from "next/server"
import { query } from "@/lib/db"

// GET /api/admin/newsletters
export async function GET() {
  try {
    const result = await query(
      `SELECT * FROM newsletter_subscriptions ORDER BY created_at DESC`,
    )
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("Error fetching newsletter subscriptions:", error)
    return NextResponse.json(
      { error: "Failed to fetch newsletter subscriptions" },
      { status: 500 }
    )
  }
}

// POST /api/admin/newsletters
export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    const existing = await query(
      `SELECT id FROM newsletter_subscriptions WHERE email = $1 LIMIT 1`,
      [email],
    )
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: "Email already subscribed" },
        { status: 400 }
      )
    }

    const result = await query(
      `INSERT INTO newsletter_subscriptions (email, status) VALUES ($1, 'active') RETURNING *`,
      [email],
    )
    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error("Error creating newsletter subscription:", error)
    return NextResponse.json(
      { error: "Failed to create newsletter subscription" },
      { status: 500 }
    )
  }
}


// GET /api/admin/newsletters

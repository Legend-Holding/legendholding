import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const { email, reason } = await req.json()

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    const subResult = await query(
      `SELECT id FROM newsletter_subscriptions WHERE email = $1 AND status = 'active' LIMIT 1`,
      [email.toLowerCase()],
    )
    const subscription = subResult.rows[0]
    if (!subscription) {
      return NextResponse.json(
        { error: "No active subscription found for this email" },
        { status: 404 }
      )
    }

    const pendingResult = await query(
      `SELECT id FROM unsubscribe_requests WHERE newsletter_subscription_id = $1 AND status = 'pending' LIMIT 1`,
      [subscription.id],
    )
    if (pendingResult.rows.length > 0) {
      return NextResponse.json(
        { error: "There is already a pending unsubscribe request for this email" },
        { status: 400 }
      )
    }

    await query(
      `INSERT INTO unsubscribe_requests (newsletter_subscription_id, reason, status) VALUES ($1, $2, 'pending')`,
      [subscription.id, reason || 'No reason provided'],
    )

    return NextResponse.json(
      { message: "Unsubscribe request submitted successfully. You will receive a confirmation email once approved." },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error in unsubscribe request:", error)
    return NextResponse.json(
      { error: "Failed to process unsubscribe request" },
      { status: 500 }
    )
  }
}



import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET() {
  try {
    const result = await query(
      `SELECT ur.*, ns.email AS newsletter_subscription_email
       FROM unsubscribe_requests ur
       LEFT JOIN newsletter_subscriptions ns ON ns.id = ur.newsletter_subscription_id
       ORDER BY ur.created_at DESC`,
    )
    // Shape response to match previous {newsletter_subscription: {email}} structure
    const rows = result.rows.map((r) => {
      const { newsletter_subscription_email, ...rest } = r
      return { ...rest, newsletter_subscription: { email: newsletter_subscription_email } }
    })
    return NextResponse.json(rows)
  } catch (error) {
    console.error("Error fetching unsubscribe requests:", error)
    return NextResponse.json(
      { error: "Failed to fetch unsubscribe requests" },
      { status: 500 }
    )
  }
}



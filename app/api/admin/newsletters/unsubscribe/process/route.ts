import { NextResponse } from "next/server"
import { query, withTransaction } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const { requestId, action, adminComment } = await req.json()

    if (!requestId || !action) {
      return NextResponse.json({ error: "Request ID and action are required" }, { status: 400 })
    }
    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action. Must be either 'approve' or 'reject'" }, { status: 400 })
    }

    const reqResult = await query(
      `SELECT ur.*, ns.email AS subscription_email
       FROM unsubscribe_requests ur
       LEFT JOIN newsletter_subscriptions ns ON ns.id = ur.newsletter_subscription_id
       WHERE ur.id = $1 LIMIT 1`,
      [requestId],
    )
    const request = reqResult.rows[0]
    if (!request) {
      return NextResponse.json({ error: "Unsubscribe request not found" }, { status: 404 })
    }
    if (request.status !== "pending") {
      return NextResponse.json({ error: "This request has already been processed" }, { status: 400 })
    }

    await withTransaction(async (client) => {
      await client.query(
        `UPDATE unsubscribe_requests SET status = $1, admin_comment = $2, processed_at = NOW(), updated_at = NOW() WHERE id = $3`,
        [action === "approve" ? "approved" : "rejected", adminComment || null, requestId],
      )
      if (action === "approve") {
        await client.query(
          `UPDATE newsletter_subscriptions SET status = 'unsubscribed', updated_at = NOW() WHERE id = $1`,
          [request.newsletter_subscription_id],
        )
      }
    })

    return NextResponse.json(
      { message: action === "approve" ? "Unsubscribe request approved and processed successfully" : "Unsubscribe request rejected", email: request.subscription_email },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error processing unsubscribe request:", error)
    return NextResponse.json({ error: "Failed to process unsubscribe request" }, { status: 500 })
  }
}



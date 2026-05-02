import { NextResponse } from "next/server"
import { query } from "@/lib/db"

// PATCH /api/admin/newsletters/[id]
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { status } = await req.json()
    const { id } = params

    const result = await query(
      `UPDATE newsletter_subscriptions SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id],
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Newsletter subscription not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error("Error updating newsletter subscription:", error)
    return NextResponse.json(
      { error: "Failed to update newsletter subscription" },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/newsletters/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const result = await query(
      `DELETE FROM newsletter_subscriptions WHERE id = $1 RETURNING id`,
      [id],
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Newsletter subscription not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: "Newsletter subscription deleted successfully" })
  } catch (error) {
    console.error("Error deleting newsletter subscription:", error)
    return NextResponse.json(
      { error: "Failed to delete newsletter subscription" },
      { status: 500 }
    )
  }
}


// PATCH /api/admin/newsletters/[id]

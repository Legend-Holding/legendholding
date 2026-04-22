import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { query } from '@/lib/db'
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '@/lib/admin-auth'

async function requireAdminSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = verifyAdminSessionToken(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const roleResult = await query(
    `SELECT role
     FROM user_roles
     WHERE user_id = $1
     LIMIT 1`,
    [payload.sub]
  )
  if (!roleResult.rows[0]) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return null
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const authError = await requireAdminSession()
  if (authError) return authError

  try {
    const { id } = await context.params
    const body = await request.json()
    const allowedKeys = [
      'name',
      'email',
      'phone',
      'company',
      'subject',
      'message',
      'resolved',
      'status',
      'admin_comment',
      'company_comment',
      'company_reply',
      'last_reminder_sent_at',
      'last_escalation_sent_at',
      'holding_escalation_sent_at',
    ] as const

    const updates: string[] = []
    const values: unknown[] = []
    let idx = 1

    for (const key of allowedKeys) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        updates.push(`${key} = $${idx++}`)
        values.push(body[key])
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    values.push(id)
    const result = await query(
      `UPDATE customer_care_complaints
       SET ${updates.join(', ')}
       WHERE id = $${idx}
       RETURNING id, created_at, name, email, phone, company, subject, message,
                 resolved, status, admin_comment, company_comment, company_reply,
                 last_reminder_sent_at, last_escalation_sent_at, holding_escalation_sent_at`,
      values
    )

    if (!result.rows[0]) return NextResponse.json({ error: 'Complaint not found' }, { status: 404 })
    return NextResponse.json(result.rows[0])
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update complaint' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const authError = await requireAdminSession()
  if (authError) return authError

  try {
    const { id } = await context.params
    const result = await query('DELETE FROM customer_care_complaints WHERE id = $1 RETURNING id', [id])
    if (!result.rows[0]) return NextResponse.json({ error: 'Complaint not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete complaint' }, { status: 500 })
  }
}

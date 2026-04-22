import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { query } from '@/lib/db'
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '@/lib/admin-auth'

async function requireAdminSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  if (!token) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const payload = verifyAdminSessionToken(token)
  if (!payload) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const roleResult = await query(
    `SELECT role
     FROM user_roles
     WHERE user_id = $1
     LIMIT 1`,
    [payload.sub]
  )
  if (!roleResult.rows[0]) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { error: null as NextResponse | null }
}

export async function GET() {
  const auth = await requireAdminSession()
  if (auth.error) return auth.error

  try {
    const result = await query(
      `SELECT id, created_at, name, email, phone, company, subject, message,
              resolved, status, admin_comment, company_comment, company_reply,
              last_reminder_sent_at, last_escalation_sent_at, holding_escalation_sent_at
       FROM customer_care_complaints
       ORDER BY created_at DESC`
    )
    return NextResponse.json(result.rows)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch complaints' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { query } from '@/lib/db'
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '@/lib/admin-auth'

async function requireAdminSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  if (!token) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), userId: null as string | null }
  }

  const payload = verifyAdminSessionToken(token)
  if (!payload) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), userId: null as string | null }
  }

  const roleResult = await query(
    `SELECT role
     FROM user_roles
     WHERE user_id = $1
     LIMIT 1`,
    [payload.sub]
  )

  if (!roleResult.rows[0]) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), userId: null as string | null }
  }

  return { error: null as NextResponse | null, userId: payload.sub }
}

export async function GET() {
  try {
    const auth = await requireAdminSession()
    if (auth.error) return auth.error

    const columnCheck = await query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'contact_submissions'
           AND column_name = 'resolved'
       ) AS exists`
    )
    const hasResolvedColumn = columnCheck.rows[0]?.exists === true

    const result = await query(
      `SELECT id, created_at, name, email, phone, subject, message, resolved, status
       FROM (
         SELECT id,
                created_at,
                name,
                email,
                phone,
                subject,
                message,
                ${hasResolvedColumn ? 'resolved' : 'false'} AS resolved,
                status,
                ROW_NUMBER() OVER (
                  PARTITION BY id
                  ORDER BY created_at DESC
                ) AS rn
         FROM contact_submissions
       ) deduped
       WHERE rn = 1
       ORDER BY created_at DESC`
    )

    return NextResponse.json(result.rows)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch submissions' }, { status: 500 })
  }
}

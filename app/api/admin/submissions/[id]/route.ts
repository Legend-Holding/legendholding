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
    const resolved = body?.resolved
    const status = body?.status
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

    const updates: string[] = []
    const values: unknown[] = []
    let idx = 1

    if (hasResolvedColumn && typeof resolved === 'boolean') {
      updates.push(`resolved = $${idx++}`)
      values.push(resolved)
    }
    if (typeof status === 'string' && status.trim()) {
      updates.push(`status = $${idx++}`)
      values.push(status.trim())
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    values.push(id)
    const result = await query(
      `UPDATE contact_submissions
       SET ${updates.join(', ')}
       WHERE id = $${idx}
       RETURNING id, created_at, name, email, phone, subject, message,
                 ${hasResolvedColumn ? 'resolved' : 'false AS resolved'},
                 status`,
      values
    )

    if (!result.rows[0]) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update submission' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const authError = await requireAdminSession()
  if (authError) return authError

  try {
    const { id } = await context.params
    const result = await query('DELETE FROM contact_submissions WHERE id = $1 RETURNING id', [id])

    if (!result.rows[0]) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete submission' }, { status: 500 })
  }
}

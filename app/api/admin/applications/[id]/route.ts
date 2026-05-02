import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { query } from '@/lib/db'
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '@/lib/admin-auth'

async function getSessionRole() {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  const payload = token ? verifyAdminSessionToken(token) : null
  if (!payload?.sub) return null
  const roleRes = await query('SELECT role FROM user_roles WHERE user_id = $1 LIMIT 1', [payload.sub])
  const role = roleRes.rows[0]?.role as string | undefined
  if (!role) return null
  return { userId: payload.sub, role }
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionRole()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await context.params

    if (session.role !== 'super_admin') {
      const access = await query(
        `SELECT a.id
         FROM job_applications a
         JOIN jobs j ON j.id = a.job_id
         WHERE a.id = $1 AND (j.created_by = $2 OR j.assigned_to = $2)
         LIMIT 1`,
        [id, session.userId]
      )
      if (!access.rows[0]) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const result = await query(
      `SELECT a.*, j.id AS job_id_ref, j.title AS job_title, j.department AS job_department
       FROM job_applications a
       LEFT JOIN jobs j ON j.id = a.job_id
       WHERE a.id = $1
       LIMIT 1`,
      [id],
    )
    const row = result.rows[0]
    if (!row) return NextResponse.json({ error: 'Application not found' }, { status: 404 })

    const application = {
      ...row,
      job: row.job_id_ref ? { id: row.job_id_ref, title: row.job_title, department: row.job_department } : undefined,
    }

    return NextResponse.json({ application })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load application' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionRole()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await context.params

    if (session.role !== 'super_admin') {
      const access = await query(
        `SELECT a.id
         FROM job_applications a
         JOIN jobs j ON j.id = a.job_id
         WHERE a.id = $1 AND (j.created_by = $2 OR j.assigned_to = $2)
         LIMIT 1`,
        [id, session.userId]
      )
      if (!access.rows[0]) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const deleted = await query('DELETE FROM job_applications WHERE id = $1 RETURNING id', [id])
    if (!deleted.rows[0]) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete application' }, { status: 500 })
  }
}

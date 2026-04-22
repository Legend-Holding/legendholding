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

async function canMutate(jobId: string, userId: string, role: string) {
  if (role === 'super_admin') return true
  const res = await query('SELECT id FROM jobs WHERE id = $1 AND (created_by = $2 OR assigned_to = $2) LIMIT 1', [jobId, userId])
  return Boolean(res.rows[0])
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionRole()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await context.params
    if (!(await canMutate(id, session.userId, session.role))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const fields = ['title','department','location','description','requirements','responsibilities','job_type','status','company','assigned_to'] as const
    const updates: string[] = []
    const values: any[] = []
    let i = 1
    for (const f of fields) {
      if (Object.prototype.hasOwnProperty.call(body, f)) {
        updates.push(`${f} = $${i++}`)
        values.push(body[f])
      }
    }
    if (!updates.length) return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
    values.push(id)
    const res = await query(`UPDATE jobs SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`, values)
    return NextResponse.json(res.rows[0])
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update job' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionRole()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await context.params
    if (!(await canMutate(id, session.userId, session.role))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    await query('DELETE FROM jobs WHERE id = $1', [id])
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete job' }, { status: 500 })
  }
}

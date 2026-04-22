import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { query } from '@/lib/db'
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '@/lib/admin-auth'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value
    const payload = token ? verifyAdminSessionToken(token) : null
    if (!payload?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const roleRes = await query('SELECT role FROM user_roles WHERE user_id = $1 LIMIT 1', [payload.sub])
    if (roleRes.rows[0]?.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const result = await query(
      `SELECT user_id, email, role
       FROM user_roles
       WHERE role IN ('admin','super_admin')
       ORDER BY email ASC`
    )
    return NextResponse.json(result.rows)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch admin users' }, { status: 500 })
  }
}

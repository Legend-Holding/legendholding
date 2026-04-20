import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '@/lib/admin-auth'
import { query } from '@/lib/db'

type UserRole = {
  id: string
  user_id: string
  email: string
  role: 'super_admin' | 'admin'
  permissions: Record<string, boolean>
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value
    if (!token) {
      return NextResponse.json({ user: null, role: null }, { status: 401 })
    }

    const payload = verifyAdminSessionToken(token)
    if (!payload) {
      return NextResponse.json({ user: null, role: null }, { status: 401 })
    }

    const roleResult = await query<UserRole>(
      `SELECT id, user_id, email, role, permissions
       FROM user_roles
       WHERE user_id = $1
       LIMIT 1`,
      [payload.sub],
    )

    return NextResponse.json(
      {
        user: {
          id: payload.sub,
          email: payload.email,
        },
        role: roleResult.rows[0] || null,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error('Admin me error:', error)
    return NextResponse.json({ user: null, role: null }, { status: 500 })
  }
}

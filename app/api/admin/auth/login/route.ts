import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { query } from '@/lib/db'
import { createAdminSessionCookie, createAdminSessionToken } from '@/lib/admin-auth'

type DbUser = {
  id: string
  email: string
  encrypted_password: string
}

type UserRole = {
  id: string
  user_id: string
  email: string
  role: 'super_admin' | 'admin'
  permissions: Record<string, boolean>
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = String(body?.email || '').trim().toLowerCase()
    const password = String(body?.password || '')

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const userResult = await query<DbUser>(
      `SELECT id, email, encrypted_password
       FROM auth.users
       WHERE lower(email) = $1
       LIMIT 1`,
      [email],
    )

    const user = userResult.rows[0]
    if (!user?.encrypted_password) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const ok = await bcrypt.compare(password, user.encrypted_password)
    if (!ok) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const roleResult = await query<UserRole>(
      `SELECT id, user_id, email, role, permissions
       FROM user_roles
       WHERE user_id = $1
       LIMIT 1`,
      [user.id],
    )

    const role = roleResult.rows[0] || null
    const token = createAdminSessionToken(user.id, user.email)

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
        },
        role,
      },
      {
        status: 200,
        headers: {
          'Set-Cookie': createAdminSessionCookie(token),
        },
      },
    )
  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json({ error: 'Failed to authenticate' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { createClearedAdminSessionCookie } from '@/lib/admin-auth'

export async function POST() {
  return NextResponse.json(
    { success: true },
    {
      status: 200,
      headers: {
        'Set-Cookie': createClearedAdminSessionCookie(),
      },
    },
  )
}

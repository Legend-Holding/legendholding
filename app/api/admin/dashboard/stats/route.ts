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

export async function GET() {
  const authError = await requireAdminSession()
  if (authError) return authError

  try {
    const [submissionsCountRes, jobApplicationsCountRes, newsArticlesCountRes] = await Promise.all([
      query('SELECT COUNT(*)::int AS count FROM contact_submissions'),
      query('SELECT COUNT(*)::int AS count FROM job_applications'),
      query('SELECT COUNT(*)::int AS count FROM news_articles'),
    ])

    return NextResponse.json({
      submissionsCount: submissionsCountRes.rows[0]?.count ?? 0,
      jobApplicationsCount: jobApplicationsCountRes.rows[0]?.count ?? 0,
      newsArticlesCount: newsArticlesCountRes.rows[0]?.count ?? 0,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch dashboard stats' }, { status: 500 })
  }
}

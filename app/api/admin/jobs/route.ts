import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { query } from '@/lib/db'
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '@/lib/admin-auth'

async function getSessionRole() {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  const payload = token ? verifyAdminSessionToken(token) : null
  if (!payload?.sub) return null

  const roleRes = await query(
    'SELECT role FROM user_roles WHERE user_id = $1 LIMIT 1',
    [payload.sub]
  )
  const role = roleRes.rows[0]?.role as string | undefined
  if (!role) return null
  return { userId: payload.sub, role }
}

export async function GET() {
  try {
    const session = await getSessionRole()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isSuperAdmin = session.role === 'super_admin'
    const jobsRes = isSuperAdmin
      ? await query(
          `SELECT j.*,
                  urc.email AS created_by_email,
                  urc.role AS created_by_role,
                  ura.email AS assigned_to_email,
                  ura.role AS assigned_to_role
           FROM jobs j
           LEFT JOIN user_roles urc ON urc.user_id = j.created_by
           LEFT JOIN user_roles ura ON ura.user_id = j.assigned_to
           ORDER BY j.created_at DESC`
        )
      : await query(
          `SELECT j.*,
                  urc.email AS created_by_email,
                  urc.role AS created_by_role,
                  ura.email AS assigned_to_email,
                  ura.role AS assigned_to_role
           FROM jobs j
           LEFT JOIN user_roles urc ON urc.user_id = j.created_by
           LEFT JOIN user_roles ura ON ura.user_id = j.assigned_to
           WHERE j.created_by = $1 OR j.assigned_to = $1
           ORDER BY j.created_at DESC`,
          [session.userId]
        )

    const jobs = jobsRes.rows.map((row: any) => ({
      ...row,
      created_by_user: row.created_by_email ? { email: row.created_by_email, role: row.created_by_role } : undefined,
      assigned_to_user: row.assigned_to_email ? { email: row.assigned_to_email, role: row.assigned_to_role } : undefined,
    }))

    return NextResponse.json(jobs)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch jobs' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionRole()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const result = await query(
      `INSERT INTO jobs (title, department, location, description, requirements, responsibilities, job_type, status, company, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        body.title ?? '',
        body.department ?? '',
        body.location ?? '',
        body.description ?? [],
        body.requirements ?? [],
        body.responsibilities ?? [],
        body.job_type ?? 'Full-time',
        body.status ?? 'active',
        body.company ?? '',
        session.userId,
      ]
    )
    return NextResponse.json(result.rows[0])
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create job' }, { status: 500 })
  }
}

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

export async function GET(request: Request) {
  try {
    const session = await getSessionRole()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') || '1')
    const pageSize = Number(url.searchParams.get('pageSize') || '10')
    const statusFilter = url.searchParams.get('status') || 'all'
    const jobFilter = url.searchParams.get('job') || 'active'
    const offset = Math.max(0, (page - 1) * pageSize)

    const whereBase = session.role === 'super_admin'
      ? ''
      : 'WHERE (j.created_by = $1 OR j.assigned_to = $1)'

    const roleParam = session.role === 'super_admin' ? [] : [session.userId]

    const jobsRes = await query(
      `SELECT DISTINCT j.id, j.title, j.department, j.status
       FROM jobs j
       ${whereBase}
       ORDER BY j.title ASC`,
      roleParam
    )
    const jobs = jobsRes.rows

    let filteredJobIds = jobs.map((j: any) => j.id)
    if (jobFilter === 'active' || jobFilter === 'inactive') {
      filteredJobIds = jobs.filter((j: any) => j.status === jobFilter).map((j: any) => j.id)
    } else if (jobFilter) {
      filteredJobIds = jobs.filter((j: any) => j.id === jobFilter).map((j: any) => j.id)
    }

    if (filteredJobIds.length === 0) {
      return NextResponse.json({
        applications: [],
        jobs,
        totalCount: 0,
        filteredCount: 0,
        statusCounts: { pending: 0, reviewed: 0, shortlisted: 0, rejected: 0, hired: 0 },
      })
    }

    const statusWhere = statusFilter === 'all' ? `AND a.status != 'rejected'` : `AND a.status = $4`
    const params: any[] = [filteredJobIds, pageSize, offset]
    if (statusFilter !== 'all') params.push(statusFilter)

    const applicationsRes = await query(
      `SELECT a.id, a.job_id, a.full_name, a.email, a.phone, a.resume_url, a.cover_letter, a.status, a.created_at,
              j.id AS job_id_join, j.title AS job_title, j.department AS job_department, j.status AS job_status
       FROM job_applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.job_id = ANY($1::uuid[])
         ${statusWhere}
       ORDER BY a.created_at DESC
       LIMIT $2 OFFSET $3`,
      params
    )

    const countParams: any[] = [filteredJobIds]
    if (statusFilter !== 'all') countParams.push(statusFilter)
    const filteredCountRes = await query(
      `SELECT COUNT(*)::int AS count
       FROM job_applications a
       WHERE a.job_id = ANY($1::uuid[])
         ${statusFilter === 'all' ? `AND a.status != 'rejected'` : `AND a.status = $2`}`,
      countParams
    )

    const totalCountRes = await query(
      `SELECT COUNT(*)::int AS count
       FROM job_applications a
       WHERE a.job_id = ANY($1::uuid[])
         AND a.status != 'rejected'`,
      [filteredJobIds]
    )

    const statusCountsRes = await query(
      `SELECT status, COUNT(*)::int AS count
       FROM job_applications
       WHERE job_id = ANY($1::uuid[])
       GROUP BY status`,
      [filteredJobIds]
    )

    const statusCounts = { pending: 0, reviewed: 0, shortlisted: 0, rejected: 0, hired: 0 } as Record<string, number>
    for (const row of statusCountsRes.rows as any[]) {
      if (row.status in statusCounts) statusCounts[row.status] = row.count
    }

    const applications = applicationsRes.rows.map((r: any) => ({
      id: r.id,
      job_id: r.job_id,
      full_name: r.full_name,
      email: r.email,
      phone: r.phone,
      resume_url: r.resume_url,
      cover_letter: r.cover_letter,
      status: r.status,
      created_at: r.created_at,
      job: {
        id: r.job_id_join,
        title: r.job_title,
        department: r.job_department,
        status: r.job_status,
      },
    }))

    return NextResponse.json({
      applications,
      jobs,
      totalCount: totalCountRes.rows[0]?.count ?? 0,
      filteredCount: filteredCountRes.rows[0]?.count ?? 0,
      statusCounts,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch applications' }, { status: 500 })
  }
}

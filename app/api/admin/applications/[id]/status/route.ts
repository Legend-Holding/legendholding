import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sendApplicationRejectionEmail } from '@/lib/email';
import { query } from '@/lib/db';
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '@/lib/admin-auth';

const VALID_STATUSES = ['pending', 'reviewed', 'shortlisted', 'rejected', 'hired'];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: applicationId } = await params;
    if (!applicationId) {
      return NextResponse.json({ error: 'Application ID is required' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { status: newStatus } = body;
    if (!newStatus || !VALID_STATUSES.includes(newStatus)) {
      return NextResponse.json(
        { error: `Status must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
    const payload = token ? verifyAdminSessionToken(token) : null;
    if (!payload?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roleResult = await query(
      `SELECT role
       FROM user_roles
       WHERE user_id = $1
       LIMIT 1`,
      [payload.sub]
    );
    const role = roleResult.rows[0]?.role as string | undefined;
    if (role !== 'super_admin' && role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Rejected applications cannot be changed to any other status
    const currentResult = await query(
      `SELECT status
       FROM job_applications
       WHERE id = $1
       LIMIT 1`,
      [applicationId]
    );
    const currentApp = currentResult.rows[0] as { status: string } | undefined;
    if (!currentApp) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }
    const currentStatus = currentApp.status;
    if (currentStatus === 'rejected') {
      return NextResponse.json(
        { error: 'Rejected applications cannot be changed.' },
        { status: 400 }
      );
    }

    if (newStatus === 'rejected') {
      // --- Daily rejection email limit: 50 per day ---
      const DAILY_REJECTION_LIMIT = 50;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const countResult = await query(
        `SELECT COUNT(*)::int AS count
         FROM job_applications
         WHERE status = $1
           AND updated_at >= $2`,
        ['rejected', todayStart.toISOString()]
      );
      const todayRejectionCount = countResult.rows[0]?.count ?? 0;
      if ((todayRejectionCount ?? 0) >= DAILY_REJECTION_LIMIT) {
        return NextResponse.json(
          {
            error: 'Daily rejection email limit reached (50/day). Please try again tomorrow.',
            emailLimitReached: true,
          },
          { status: 429 }
        );
      }
      // --- End limit check ---

      const applicationResult = await query(
        `SELECT ja.id, ja.full_name, ja.email, j.id AS job_id, j.title, j.department
         FROM job_applications ja
         LEFT JOIN jobs j ON j.id = ja.job_id
         WHERE ja.id = $1
         LIMIT 1`,
        [applicationId]
      );
      const application = applicationResult.rows[0];
      if (!application) {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 });
      }

      const positionTitle = application?.title ?? 'the position you applied for';
      const fullName = application?.full_name ?? '';
      const applicantFirstName = fullName.trim().split(/\s+/)[0] || 'Applicant';
      const applicantEmail = application?.email;

      if (!applicantEmail) {
        return NextResponse.json({ error: 'Application has no email' }, { status: 400 });
      }

      await query(
        `UPDATE job_applications
         SET status = $1, updated_at = NOW()
         WHERE id = $2`,
        ['rejected', applicationId]
      );

      let emailSent = false;
      if (process.env.RESEND_API_KEY) {
        try {
          await sendApplicationRejectionEmail({
            applicantFirstName,
            applicantEmail,
            positionTitle,
          });
          emailSent = true;
        } catch (emailError) {
          console.error('Failed to send rejection email:', emailError);
        }
      }

      return NextResponse.json({ success: true, status: 'rejected', emailSent });
    }

    await query(
      `UPDATE job_applications
       SET status = $1, updated_at = NOW()
       WHERE id = $2`,
      [newStatus, applicationId]
    );

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    console.error('Error updating application status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

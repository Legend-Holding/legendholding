import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { cookies } from 'next/headers';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('company_session')?.value;
    if (!sessionToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = Buffer.from(sessionToken, 'base64').toString('utf-8');
    const [companyId] = decoded.split(':');

    const companyRes = await query(
      `SELECT company_name FROM company_credentials WHERE id = $1 LIMIT 1`,
      [companyId],
    );
    const company = companyRes.rows[0];
    if (!company) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const complaintRes = await query(
      `SELECT * FROM customer_care_complaints WHERE id = $1 AND company = $2 LIMIT 1`,
      [id, company.company_name],
    );
    const complaint = complaintRes.rows[0];
    if (!complaint) return NextResponse.json({ error: 'Complaint not found or access denied' }, { status: 404 });

    if (complaint.status !== 'replied') {
      return NextResponse.json(
        { error: 'Complaint must be replied before marking as resolved' },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { companyComment } = body;
    if (!companyComment || !companyComment.trim()) {
      return NextResponse.json({ error: 'Resolution comment is required' }, { status: 400 });
    }

    await query(
      `UPDATE customer_care_complaints SET resolved = true, company_comment = $1 WHERE id = $2`,
      [companyComment.trim(), id],
    );

    return NextResponse.json({ success: true, message: 'Complaint marked as resolved' }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error marking complaint as resolved:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update complaint' },
      { status: 500 },
    );
  }
}

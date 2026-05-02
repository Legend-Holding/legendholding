import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET() {
  try {
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

    const result = await query(
      `SELECT * FROM customer_care_complaints
       WHERE company = $1
       ORDER BY created_at DESC`,
      [company.company_name],
    );

    return NextResponse.json({ complaints: result.rows });
  } catch (error: unknown) {
    console.error('Company complaints fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch complaints' },
      { status: 500 },
    );
  }
}

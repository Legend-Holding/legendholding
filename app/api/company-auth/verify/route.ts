import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET(_request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('company_session')?.value;
    if (!sessionToken) return NextResponse.json({ authenticated: false }, { status: 401 });

    const decoded = Buffer.from(sessionToken, 'base64').toString('utf-8');
    const [companyId] = decoded.split(':');

    const result = await query(
      `SELECT id, company_name, email FROM company_credentials WHERE id = $1 LIMIT 1`,
      [companyId],
    );
    const company = result.rows[0];
    if (!company) return NextResponse.json({ authenticated: false }, { status: 401 });

    return NextResponse.json({
      authenticated: true,
      company: { id: company.id, companyName: company.company_name, email: company.email },
    });
  } catch (error: unknown) {
    console.error('Session verification error:', error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}

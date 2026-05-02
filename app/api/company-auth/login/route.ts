import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import * as bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const result = await query(
      `SELECT * FROM company_credentials WHERE email = $1 LIMIT 1`,
      [email.toLowerCase().trim()],
    );
    const company = result.rows[0];

    if (!company) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const isValidPassword = await bcrypt.compare(password, company.password_hash);
    if (!isValidPassword) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const sessionToken = Buffer.from(`${company.id}:${Date.now()}`).toString('base64');

    return NextResponse.json(
      { success: true, company: { id: company.id, companyName: company.company_name, email: company.email }, sessionToken },
      { status: 200, headers: { 'Set-Cookie': `company_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400` } },
    );
  } catch (error: unknown) {
    console.error('Company login error:', error);
    return NextResponse.json({ error: 'Failed to authenticate' }, { status: 500 });
  }
}



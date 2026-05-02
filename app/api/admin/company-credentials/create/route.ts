import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import * as bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { companyName, email, password } = body;

    if (!companyName || !email || !password) {
      return NextResponse.json(
        { error: 'Company name, email, and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    const existingCompany = await query(
      `SELECT id FROM company_credentials WHERE company_name = $1 LIMIT 1`,
      [companyName],
    );
    if (existingCompany.rows[0]) {
      return NextResponse.json(
        { error: 'Company credentials already exist for this company' },
        { status: 400 }
      );
    }

    const existingEmail = await query(
      `SELECT id FROM company_credentials WHERE email = $1 LIMIT 1`,
      [email.toLowerCase().trim()],
    );
    if (existingEmail.rows[0]) {
      return NextResponse.json(
        { error: 'This email is already registered' },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO company_credentials (company_name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, company_name, email`,
      [companyName, email.toLowerCase().trim(), passwordHash],
    );
    const data = result.rows[0];

    return NextResponse.json(
      {
        success: true,
        company: {
          id: data.id,
          companyName: data.company_name,
          email: data.email,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Create company credentials error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create company credentials' },
      { status: 500 }
    );
  }
}

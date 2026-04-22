import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import {
  checkRateLimit,
  isSpamSubmission,
  isSubmittedTooFast,
  validateHoneypot,
  getClientIp,
} from '@/lib/anti-spam';

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);

    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        { error: 'Too many submissions. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();

    if (!validateHoneypot(body._hp)) {
      return NextResponse.json(
        { message: 'Contact form submitted successfully' },
        { status: 200 }
      );
    }

    if (body._ts && isSubmittedTooFast(body._ts)) {
      return NextResponse.json(
        { error: 'Please take a moment to fill in the form properly.' },
        { status: 400 }
      );
    }

    const spamCheck = isSpamSubmission({
      name: body.name,
      email: body.email,
      subject: body.subject,
      message: body.message,
    });

    if (spamCheck.isSpam) {
      console.log(`Spam blocked [${clientIp}]: ${spamCheck.reason}`);
      return NextResponse.json(
        { error: 'Your submission could not be processed. Please use valid information.' },
        { status: 400 }
      );
    }

    const requiredFields = ['name', 'email', 'subject', 'message'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Insert into contact_submissions table
    try {
      await query(
        `INSERT INTO contact_submissions
         (name, email, phone, subject, message, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [body.name, body.email, body.phone || null, body.subject, body.message, 'pending']
      );
    } catch (error: any) {
      console.error('Postgres error:', error);
      return NextResponse.json(
        { error: error?.message || 'Failed to submit contact form' },
        { status: 500 }
      );
    }

    console.log('Form submitted successfully');
    return NextResponse.json(
      { message: 'Contact form submitted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit contact form' },
      { status: 500 }
    );
  }
} 
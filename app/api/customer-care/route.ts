import { NextResponse } from 'next/server';
import { sendCustomerCareComplaintEmail } from '@/lib/email';
import { getCompanyEmail } from '@/lib/company-email-map';
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
        { message: 'Customer care complaint submitted successfully' },
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

    const requiredFields = ['name', 'email', 'phone', 'company', 'subject', 'message'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address' },
        { status: 400 }
      );
    }

    // Get company email
    const companyEmail = getCompanyEmail(body.company);
    if (!companyEmail) {
      console.error(`No email address configured for company: ${body.company}`);
      // Still insert the complaint, but don't send email
      try {
        const result = await query(
          `INSERT INTO customer_care_complaints
           (name, email, phone, company, subject, message, status, resolved)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING *`,
          [body.name, body.email, body.phone, body.company, body.subject, body.message, 'pending', false]
        );
        const inserted = result.rows[0];
        return NextResponse.json(
          {
            message: 'Customer care complaint submitted successfully',
            data: inserted,
            warning: 'Email not sent - company email not configured'
          },
          { status: 200 }
        );
      } catch (error: any) {
        console.error('Postgres error:', error);
        return NextResponse.json(
          { error: error?.message || 'Failed to submit customer care complaint' },
          { status: 500 }
        );
      }
    }

    // Insert into customer_care_complaints table with status 'sent'
    let insertedRow: any;
    try {
      const result = await query(
        `INSERT INTO customer_care_complaints
         (name, email, phone, company, subject, message, status, resolved)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [body.name, body.email, body.phone, body.company, body.subject, body.message, 'sent', false]
      );
      insertedRow = result.rows[0];
    } catch (error: any) {
      console.error('Postgres error:', error);
      return NextResponse.json(
        { error: error?.message || 'Failed to submit customer care complaint' },
        { status: 500 }
      );
    }

    // Send email to company immediately
    try {
      await sendCustomerCareComplaintEmail({
        name: body.name,
        email: body.email,
        phone: body.phone,
        company: body.company,
        subject: body.subject,
        message: body.message,
        adminComment: null,
        companyEmail: companyEmail,
      });
      console.log('Email sent to company successfully');
    } catch (emailError: any) {
      console.error('Error sending email to company:', emailError);
      // Don't fail the request if email fails - complaint is already saved
    }

    console.log('Customer care complaint submitted successfully');
    return NextResponse.json(
      { 
        message: 'Customer care complaint submitted successfully',
        data: insertedRow
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit customer care complaint' },
      { status: 500 }
    );
  }
}



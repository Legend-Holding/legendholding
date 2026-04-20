import { NextResponse } from 'next/server';
import { sendCustomerCareComplaintEmail, getCompanyEmail } from '@/lib/email';
import { query } from '@/lib/db';

export async function POST(request: Request) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY environment variable is not set');
      return NextResponse.json({ error: 'Resend API key not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { complaintId, adminComment } = body;

    if (!complaintId) {
      return NextResponse.json(
        { error: 'Complaint ID is required' },
        { status: 400 }
      );
    }

    // Fetch the complaint
    const complaintResult = await query(
      'SELECT * FROM customer_care_complaints WHERE id = $1 LIMIT 1',
      [complaintId]
    );
    const complaint = complaintResult.rows[0];
    if (!complaint) {
      return NextResponse.json(
        { error: 'Complaint not found' },
        { status: 404 }
      );
    }

    // Get company email
    const companyEmail = getCompanyEmail(complaint.company);
    if (!companyEmail) {
      return NextResponse.json(
        { error: `No email address configured for company: ${complaint.company}` },
        { status: 400 }
      );
    }

    // Send email
    try {
      await sendCustomerCareComplaintEmail({
        name: complaint.name,
        email: complaint.email,
        phone: complaint.phone,
        company: complaint.company,
        subject: complaint.subject,
        message: complaint.message,
        adminComment: adminComment || null,
        companyEmail: companyEmail,
      });

      // Update complaint with admin comment and mark as sent
      try {
        await query(
          `UPDATE customer_care_complaints
           SET admin_comment = $1, status = $2
           WHERE id = $3`,
          [adminComment || null, 'sent', complaintId]
        );
      } catch (updateError) {
        console.error('Error updating complaint:', updateError);
        // Don't fail the request if update fails, email was sent
      }

      return NextResponse.json(
        { 
          message: 'Email sent successfully',
          companyEmail: companyEmail
        },
        { status: 200 }
      );
    } catch (emailError: any) {
      console.error('Error sending email:', emailError);
      return NextResponse.json(
        { error: `Failed to send email: ${emailError.message || 'Unknown error'}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}

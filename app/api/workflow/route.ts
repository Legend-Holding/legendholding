import { NextResponse } from 'next/server';
import { query as dbQuery, withTransaction } from '@/lib/db';
import { sendWorkflowApprovalEmail, sendWorkflowRejectionEmail } from '@/lib/email';

// Route segment config - increase body size limit to 30MB
export const runtime = 'nodejs';
export const maxDuration = 30;


export async function POST(request: Request) {
  try {
      // Parse JSON body (files are now uploaded directly to Supabase Storage)
      const body = await request.json();
      const { name, email, subject, message, files: uploadedFiles } = body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'Name, email, subject, and message are required' },
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

    // Files may be pre-uploaded; just use the provided URLs
    const filesData = uploadedFiles || [];

    const result = await dbQuery(
      `INSERT INTO workflow_submissions (name, email, subject, message, files, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [name, email, subject, message, JSON.stringify(filesData.length > 0 ? filesData : [])],
    );
    const data = result.rows[0];

    return NextResponse.json(
      { 
        message: 'Workflow document submitted successfully',
        data
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit workflow document' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve workflow submissions (for admin or user)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const email = searchParams.get('email'); // Filter by user email

    const conditions: string[] = [];
    const params: unknown[] = [];
    if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
    if (email) { params.push(email); conditions.push(`email = $${params.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await dbQuery(
      `SELECT * FROM workflow_submissions ${where} ORDER BY created_at DESC`,
      params,
    );

    return NextResponse.json(
      { data: result.rows },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch workflow submissions' },
      { status: 500 }
    );
  }
}

// PATCH endpoint to update workflow submission status (approve/reject)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, reviewer, comment, submitterSignature, founderSignature } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: 'ID and status are required' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['pending', 'finance_approved', 'finance_rejected', 'cofounder_approved', 'cofounder_rejected', 'approved', 'founder_rejected'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: pending, finance_approved, finance_rejected, cofounder_approved, cofounder_rejected, approved, or founder_rejected' },
        { status: 400 }
      );
    }

    // Prepare update fields based on reviewer
    const setClauses: string[] = ['status = $1'];
    const params: unknown[] = [status];
    
    if (reviewer === 'finance' && (status === 'finance_approved' || status === 'finance_rejected')) {
      params.push(new Date().toISOString()); setClauses.push(`finance_reviewed_at = $${params.length}`);
      if (comment) { params.push(comment); setClauses.push(`finance_comment = $${params.length}`); }
    } else if (reviewer === 'cofounder' && (status === 'cofounder_approved' || status === 'cofounder_rejected')) {
      params.push(new Date().toISOString()); setClauses.push(`cofounder_reviewed_at = $${params.length}`);
      if (comment) { params.push(comment); setClauses.push(`cofounder_comment = $${params.length}`); }
    } else if (reviewer === 'founder' && (status === 'approved' || status === 'founder_rejected')) {
      params.push(new Date().toISOString()); setClauses.push(`founder_reviewed_at = $${params.length}`);
      if (comment) { params.push(comment); setClauses.push(`founder_comment = $${params.length}`); }
      if (status === 'approved') {
        if (submitterSignature) { params.push(submitterSignature); setClauses.push(`submitter_signature = $${params.length}`); }
        if (founderSignature) { params.push(founderSignature); setClauses.push(`founder_signature = $${params.length}`); }
      }
    }

    params.push(id);
    const idParam = `$${params.length}`;

    const fetchRes = await dbQuery(
      `SELECT name, email, subject FROM workflow_submissions WHERE id = $1 LIMIT 1`,
      [id],
    );
    const submissionData = fetchRes.rows[0];
    if (!submissionData) return NextResponse.json({ error: 'Submission not found' }, { status: 404 });

    const updateRes = await dbQuery(
      `UPDATE workflow_submissions SET ${setClauses.join(', ')} WHERE id = ${idParam} RETURNING *`,
      params,
    );
    const data = updateRes.rows[0];

    // Send email notifications based on status
    try {
      // Send rejection email immediately for any rejection
      if (status === 'finance_rejected' || status === 'cofounder_rejected' || status === 'founder_rejected') {
        await sendWorkflowRejectionEmail({
          name: submissionData.name,
          email: submissionData.email,
          subject: submissionData.subject,
          reviewer: reviewer as 'finance' | 'cofounder' | 'founder',
          comment: comment || null,
        });
      }
      
      // Send approval email only when Founder approves (final approval)
      if (status === 'approved' && reviewer === 'founder') {
        await sendWorkflowApprovalEmail({
          name: submissionData.name,
          email: submissionData.email,
          subject: submissionData.subject,
          comment: comment || null,
        });
      }
      
      // Note: We don't send emails for finance_approved or cofounder_approved
      // as these are intermediate approvals, not final
    } catch (emailError) {
      // Log email error but don't fail the request
      console.error('Error sending email notification:', emailError);
      // Continue with the response even if email fails
    }

    return NextResponse.json(
      { 
        message: 'Workflow submission updated successfully',
        data
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update workflow submission' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete workflow submission
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const email = searchParams.get('email'); // Email for ownership validation

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    if (email) {
      const subRes = await dbQuery(
        `SELECT email FROM workflow_submissions WHERE id = $1 LIMIT 1`,
        [id],
      );
      const submission = subRes.rows[0];
      if (!submission) {
        return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
      }
      if (submission.email !== email) {
        return NextResponse.json(
          { error: 'You can only delete your own submissions' },
          { status: 403 }
        );
      }
    }

    await dbQuery(`DELETE FROM workflow_submissions WHERE id = $1`, [id]);

    return NextResponse.json(
      { message: 'Workflow submission deleted successfully' },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete workflow submission' },
      { status: 500 }
    );
  }
}


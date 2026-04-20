import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getCompanyEmail, getBusinessHeadEmail } from '@/lib/company-email-map';
import { query } from '@/lib/db';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: Request) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
    }

    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const sixDaysInMs = 6 * 24 * 60 * 60 * 1000;

    // Find complaints that need reminders
    // 1. Status is 'sent' and created_at is more than 48 hours ago (not reviewed)
    // 2. Status is 'reviewed' and reviewed_at is more than 48 hours ago (reviewed but not replied)
    // 3. Created more than 3 days ago and not resolved (escalation to business head)
    // 4. last_escalation_sent_at (business head email) was 6+ days ago and still not resolved → escalate to complaints@legendholding.com
    
    // Get complaints with status 'sent' that are older than 48 hours
    const sentComplaintsResult = await query(
      `SELECT * FROM customer_care_complaints
       WHERE status = $1
         AND created_at < $2
         AND resolved = $3`,
      ['sent', fortyEightHoursAgo.toISOString(), false]
    );
    const sentComplaints = sentComplaintsResult.rows;

    // Get complaints with status 'reviewed' that were reviewed more than 48 hours ago
    const reviewedComplaintsResult = await query(
      `SELECT * FROM customer_care_complaints
       WHERE status = $1
         AND reviewed_at IS NOT NULL
         AND reviewed_at < $2
         AND resolved = $3`,
      ['reviewed', fortyEightHoursAgo.toISOString(), false]
    );
    const reviewedComplaints = reviewedComplaintsResult.rows;

    // Get complaints that are 3+ days old, not resolved, and not yet escalated to business head
    const escalatedComplaintsResult = await query(
      `SELECT * FROM customer_care_complaints
       WHERE created_at < $1
         AND resolved = $2
         AND last_escalation_sent_at IS NULL`,
      [threeDaysAgo.toISOString(), false]
    );
    const escalatedComplaints = escalatedComplaintsResult.rows;

    // Get complaints where business head was emailed 6+ days ago and still not resolved (escalate to holding)
    const sixDaysAgo = new Date(now.getTime() - sixDaysInMs);
    const holdingEscalationComplaintsResult = await query(
      `SELECT * FROM customer_care_complaints
       WHERE last_escalation_sent_at IS NOT NULL
         AND last_escalation_sent_at < $1
         AND resolved = $2
         AND holding_escalation_sent_at IS NULL`,
      [sixDaysAgo.toISOString(), false]
    );
    const holdingEscalationComplaints = holdingEscalationComplaintsResult.rows;

    // Combine reminder lists (48-hour reminders)
    const reminderComplaints = [...(sentComplaints || []), ...(reviewedComplaints || [])];
    
    // Separate escalated complaints (3-day escalation to business head)
    const escalatedComplaintsList = escalatedComplaints || [];
    const holdingEscalationList = holdingEscalationComplaints || [];

    const remindersSent = [];
    const escalationsSent = [];
    const holdingEscalationsSent = [];
    const errors = [];

    // Process 48-hour reminders
    for (const complaint of reminderComplaints) {
      try {
        const companyEmail = getCompanyEmail(complaint.company);
        if (!companyEmail) {
          console.error(`No email address configured for company: ${complaint.company}`);
          continue;
        }

        // Check if we already sent a reminder in the last 24 hours to prevent duplicates
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        if (complaint.last_reminder_sent_at && new Date(complaint.last_reminder_sent_at) > twentyFourHoursAgo) {
          console.log(`Skipping reminder for complaint ${complaint.id} - reminder sent recently`);
          continue;
        }
        
        let emailSubject = '';
        let emailHtml = '';

        if (complaint.status === 'sent') {
          // Not reviewed after 48 hours
          emailSubject = `Reminder: Action Required - Customer Complaint Review`;
          emailHtml = `
            <!DOCTYPE html>
            <html xmlns="http://www.w3.org/1999/xhtml">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, Helvetica, sans-serif;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: #ffffff; max-width: 600px;">
                      
                      <!-- Header -->
                      <tr>
                        <td style="background-color: #f59e0b; padding: 40px 30px; text-align: center;">
                          <h1 style="margin: 0; padding: 0; font-size: 28px; font-weight: bold; color: #ffffff; font-family: Arial, Helvetica, sans-serif;">⚠️ Reminder: Action Required</h1>
                        </td>
                      </tr>
                      
                      <!-- Content -->
                      <tr>
                        <td style="padding: 40px 30px; background-color: #ffffff;">
                          <p style="margin: 0 0 25px 0; padding: 0; font-size: 16px; color: #4b5563; line-height: 1.6; font-family: Arial, Helvetica, sans-serif;">
                            Dear Team,
                          </p>
                          
                          <p style="margin: 0 0 25px 0; padding: 0; font-size: 16px; color: #4b5563; line-height: 1.6; font-family: Arial, Helvetica, sans-serif;">
                            This is a reminder that a customer complaint was submitted <strong>more than 48 hours ago</strong> and requires your immediate attention.
                          </p>
                          
                          <!-- Complaint Details Box -->
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; margin: 25px 0;">
                            <tr>
                              <td style="padding: 20px;">
                                <p style="margin: 0 0 10px 0; padding: 0; font-size: 14px; color: #6b7280; font-family: Arial, Helvetica, sans-serif;"><strong>Customer:</strong> ${complaint.name}</p>
                                <p style="margin: 0 0 10px 0; padding: 0; font-size: 14px; color: #6b7280; font-family: Arial, Helvetica, sans-serif;"><strong>Subject:</strong> ${complaint.subject}</p>
                                <p style="margin: 0 0 10px 0; padding: 0; font-size: 14px; color: #6b7280; font-family: Arial, Helvetica, sans-serif;"><strong>Submitted:</strong> ${new Date(complaint.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                              </td>
                            </tr>
                          </table>
                          
                          <p style="margin: 25px 0 0 0; padding: 0; font-size: 16px; color: #4b5563; line-height: 1.6; font-family: Arial, Helvetica, sans-serif;">
                            Please log in to your portal and review this complaint immediately.
                          </p>
                          
                          <!-- Warning Box -->
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; margin: 25px 0;">
                            <tr>
                              <td style="padding: 15px 20px;">
                                <p style="margin: 0; padding: 0; font-size: 14px; color: #92400e; line-height: 1.6; font-family: Arial, Helvetica, sans-serif;">
                                  <strong style="color: #92400e;">⚠️ Important:</strong> Delayed responses will be escalated to higher management.
                                </p>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- Login Link -->
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 30px 0;">
                            <tr>
                              <td align="center" style="padding: 20px 0;">
                                <a href="https://www.legendholding.com/company/login" 
                                   style="display: inline-block; 
                                          background-color: #EE8900 !important; 
                                          color: #ffffff !important; 
                                          padding: 16px 32px; 
                                          border-radius: 8px; 
                                          text-decoration: none; 
                                          font-size: 16px; 
                                          font-weight: 600; 
                                          font-family: Arial, Helvetica, sans-serif;">
                                  Login to Portal
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <!-- Footer -->
                      <tr>
                        <td style="background-color: #f3f4f6; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                          <p style="margin: 0; padding: 0; font-size: 12px; color: #9ca3af; line-height: 1.8; font-family: Arial, Helvetica, sans-serif;">© ${new Date().getFullYear()} Legend Holding Group. All rights reserved.</p>
                        </td>
                      </tr>
                      
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `;
        } else if (complaint.status === 'reviewed') {
          // Reviewed but not replied after 48 hours
          emailSubject = `Urgent Reminder: Customer Complaint Requires Response`;
          emailHtml = `
            <!DOCTYPE html>
            <html xmlns="http://www.w3.org/1999/xhtml">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, Helvetica, sans-serif;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: #ffffff; max-width: 600px;">
                      
                      <!-- Header -->
                      <tr>
                        <td style="background-color: #dc2626; padding: 40px 30px; text-align: center;">
                          <h1 style="margin: 0; padding: 0; font-size: 28px; font-weight: bold; color: #ffffff; font-family: Arial, Helvetica, sans-serif;">🚨 Urgent Reminder</h1>
                        </td>
                      </tr>
                      
                      <!-- Content -->
                      <tr>
                        <td style="padding: 40px 30px; background-color: #ffffff;">
                          <p style="margin: 0 0 25px 0; padding: 0; font-size: 16px; color: #4b5563; line-height: 1.6; font-family: Arial, Helvetica, sans-serif;">
                            Dear Team,
                          </p>
                          
                          <p style="margin: 0 0 25px 0; padding: 0; font-size: 16px; color: #4b5563; line-height: 1.6; font-family: Arial, Helvetica, sans-serif;">
                            This is an urgent reminder regarding a customer complaint that was reviewed <strong>more than 48 hours ago</strong> but has not yet been responded to.
                          </p>
                          
                          <!-- Complaint Details Box -->
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; margin: 25px 0;">
                            <tr>
                              <td style="padding: 20px;">
                                <p style="margin: 0 0 10px 0; padding: 0; font-size: 14px; color: #6b7280; font-family: Arial, Helvetica, sans-serif;"><strong>Customer:</strong> ${complaint.name}</p>
                                <p style="margin: 0 0 10px 0; padding: 0; font-size: 14px; color: #6b7280; font-family: Arial, Helvetica, sans-serif;"><strong>Subject:</strong> ${complaint.subject}</p>
                                <p style="margin: 0 0 10px 0; padding: 0; font-size: 14px; color: #6b7280; font-family: Arial, Helvetica, sans-serif;"><strong>Submitted:</strong> ${new Date(complaint.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                              </td>
                            </tr>
                          </table>
                          
                          <p style="margin: 25px 0 0 0; padding: 0; font-size: 16px; color: #4b5563; line-height: 1.6; font-family: Arial, Helvetica, sans-serif;">
                            Please log in to your portal and respond to the customer immediately.
                          </p>
                          
                          <!-- Critical Warning Box -->
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fee2e2; border-left: 4px solid #dc2626; margin: 25px 0;">
                            <tr>
                              <td style="padding: 15px 20px;">
                                <p style="margin: 0; padding: 0; font-size: 14px; color: #991b1b; line-height: 1.6; font-family: Arial, Helvetica, sans-serif;">
                                  <strong style="color: #991b1b;">🚨 Critical:</strong> If this complaint is not resolved promptly, it will be escalated to the business head for immediate intervention.
                                </p>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- Login Link -->
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 30px 0;">
                            <tr>
                              <td align="center" style="padding: 20px 0;">
                                <a href="https://www.legendholding.com/company/login" 
                                   style="display: inline-block; 
                                          background-color: #EE8900 !important; 
                                          color: #ffffff !important; 
                                          padding: 16px 32px; 
                                          border-radius: 8px; 
                                          text-decoration: none; 
                                          font-size: 16px; 
                                          font-weight: 600; 
                                          font-family: Arial, Helvetica, sans-serif;">
                                  Login to Portal
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <!-- Footer -->
                      <tr>
                        <td style="background-color: #f3f4f6; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                          <p style="margin: 0; padding: 0; font-size: 12px; color: #9ca3af; line-height: 1.8; font-family: Arial, Helvetica, sans-serif;">© ${new Date().getFullYear()} Legend Holding Group. All rights reserved.</p>
                        </td>
                      </tr>
                      
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `;
        }

        // Send reminder email
        const emailResponse = await resend.emails.send({
          from: 'complaints@legendholding.com',
          to: [companyEmail],
          subject: emailSubject,
          html: emailHtml,
        });

        if (emailResponse.error) {
          console.error(`Error sending reminder for complaint ${complaint.id}:`, emailResponse.error);
          errors.push({ complaintId: complaint.id, error: emailResponse.error });
        } else {
          remindersSent.push(complaint.id);
          console.log(`Reminder sent for complaint ${complaint.id} to ${companyEmail}`);

          await query(
            'UPDATE customer_care_complaints SET last_reminder_sent_at = $1 WHERE id = $2',
            [now.toISOString(), complaint.id]
          );
        }
      } catch (error: any) {
        console.error(`Error processing reminder for complaint ${complaint.id}:`, error);
        errors.push({ complaintId: complaint.id, error: error.message });
      }
    }

    // Process 3-day escalations to business heads
    for (const complaint of escalatedComplaintsList) {
      try {
        const businessHeadEmail = getBusinessHeadEmail(complaint.company);
        if (!businessHeadEmail) {
          console.error(`No business head email configured for company: ${complaint.company}`);
          continue;
        }

        // Check if we already sent an escalation in the last 24 hours to prevent duplicates
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        if (complaint.last_escalation_sent_at && new Date(complaint.last_escalation_sent_at) > twentyFourHoursAgo) {
          console.log(`Skipping escalation for complaint ${complaint.id} - escalation sent recently`);
          continue;
        }

        const emailSubject = `Urgent: Unresolved Customer Complaint - ${complaint.company}`;
        const emailHtml = `
          <!DOCTYPE html>
          <html xmlns="http://www.w3.org/1999/xhtml">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, Helvetica, sans-serif;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
              <tr>
                <td align="center" style="padding: 20px 0;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: #ffffff; max-width: 600px;">
                    
                    <!-- Header -->
                    <tr>
                      <td style="background-color: #dc2626; padding: 40px 30px; text-align: center;">
                        <h1 style="margin: 0; padding: 0; font-size: 28px; font-weight: bold; color: #ffffff; font-family: Arial, Helvetica, sans-serif;">🚨 Urgent Escalation</h1>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px 30px; background-color: #ffffff;">
                        <p style="margin: 0 0 25px 0; padding: 0; font-size: 16px; color: #4b5563; line-height: 1.6; font-family: Arial, Helvetica, sans-serif;">
                          Dear Business Unit head,
                        </p>
                        
                        <p style="margin: 0 0 25px 0; padding: 0; font-size: 16px; color: #4b5563; line-height: 1.6; font-family: Arial, Helvetica, sans-serif;">
                          Please note there is a complaint on <strong style="color: #dc2626;">${complaint.company}</strong> that was assigned 3 days ago, and Not resolved, please let your team resolved it as soon as possible.
                        </p>
                        
                        <!-- Complaint Details Box -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; margin: 25px 0;">
                          <tr>
                            <td style="padding: 20px;">
                              <p style="margin: 0 0 10px 0; padding: 0; font-size: 14px; color: #6b7280; font-family: Arial, Helvetica, sans-serif;"><strong>Company:</strong> ${complaint.company}</p>
                              <p style="margin: 0 0 10px 0; padding: 0; font-size: 14px; color: #6b7280; font-family: Arial, Helvetica, sans-serif;"><strong>Customer:</strong> ${complaint.name}</p>
                              <p style="margin: 0 0 10px 0; padding: 0; font-size: 14px; color: #6b7280; font-family: Arial, Helvetica, sans-serif;"><strong>Email:</strong> ${complaint.email}</p>
                              <p style="margin: 0 0 10px 0; padding: 0; font-size: 14px; color: #6b7280; font-family: Arial, Helvetica, sans-serif;"><strong>Phone:</strong> ${complaint.phone}</p>
                              <p style="margin: 0 0 10px 0; padding: 0; font-size: 14px; color: #6b7280; font-family: Arial, Helvetica, sans-serif;"><strong>Subject:</strong> ${complaint.subject}</p>
                              <p style="margin: 0 0 10px 0; padding: 0; font-size: 14px; color: #6b7280; font-family: Arial, Helvetica, sans-serif;"><strong>Message:</strong> ${complaint.message}</p>
                              <p style="margin: 0 0 10px 0; padding: 0; font-size: 14px; color: #6b7280; font-family: Arial, Helvetica, sans-serif;"><strong>Submitted:</strong> ${new Date(complaint.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                              <p style="margin: 0; padding: 0; font-size: 14px; color: #6b7280; font-family: Arial, Helvetica, sans-serif;"><strong>Status:</strong> ${complaint.status}</p>
                            </td>
                          </tr>
                        </table>
                        
                        <!-- Critical Warning Box -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fee2e2; border-left: 4px solid #dc2626; margin: 25px 0;">
                          <tr>
                            <td style="padding: 15px 20px;">
                              <p style="margin: 0; padding: 0; font-size: 14px; color: #991b1b; line-height: 1.6; font-family: Arial, Helvetica, sans-serif;">
                                <strong style="color: #991b1b;">⚠️ Action Required:</strong> This complaint requires immediate attention and resolution.
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f3f4f6; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                        <p style="margin: 0; padding: 0; font-size: 12px; color: #9ca3af; line-height: 1.8; font-family: Arial, Helvetica, sans-serif;">© ${new Date().getFullYear()} Legend Holding Group. All rights reserved.</p>
                      </td>
                    </tr>
                    
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `;

        // Send escalation email to business head
        const emailResponse = await resend.emails.send({
          from: 'complaints@legendholding.com',
          to: [businessHeadEmail],
          subject: emailSubject,
          html: emailHtml,
        });

        if (emailResponse.error) {
          console.error(`Error sending escalation for complaint ${complaint.id}:`, emailResponse.error);
          errors.push({ complaintId: complaint.id, error: emailResponse.error, type: 'escalation' });
        } else {
          escalationsSent.push(complaint.id);
          console.log(`Escalation sent for complaint ${complaint.id} to business head ${businessHeadEmail}`);
          
          // Update last_escalation_sent_at timestamp
          await query(
            'UPDATE customer_care_complaints SET last_escalation_sent_at = $1 WHERE id = $2',
            [now.toISOString(), complaint.id]
          );
        }
      } catch (error: any) {
        console.error(`Error processing escalation for complaint ${complaint.id}:`, error);
        errors.push({ complaintId: complaint.id, error: error.message, type: 'escalation' });
      }
    }

    // Process 6-day escalation to holding (after business head was notified)
    const holdingInboxEmail = 'mira.wu@legendholding.com';
    for (const complaint of holdingEscalationList) {
      try {
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        if (complaint.holding_escalation_sent_at && new Date(complaint.holding_escalation_sent_at) > twentyFourHoursAgo) {
          continue;
        }

        const emailSubject = `Holding Escalation: Unresolved complaint after 6 days - ${complaint.company}`;
        const emailHtml = `
          <!DOCTYPE html>
          <html xmlns="http://www.w3.org/1999/xhtml">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, Helvetica, sans-serif;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
              <tr>
                <td align="center" style="padding: 20px 0;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: #ffffff; max-width: 600px;">
                    
                    <!-- Header -->
                    <tr>
                      <td style="background-color: #991b1b; padding: 40px 30px; text-align: center;">
                        <h1 style="margin: 0; padding: 0; font-size: 28px; font-weight: bold; color: #ffffff; font-family: Arial, Helvetica, sans-serif;">Holding Escalation</h1>
                        <p style="margin: 10px 0 0 0; padding: 0; font-size: 16px; color: #fecaca; font-family: Arial, Helvetica, sans-serif;">Complaint still unresolved 6 days after business head notification</p>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px 30px; background-color: #ffffff;">
                        <p style="margin: 0 0 25px 0; padding: 0; font-size: 16px; color: #4b5563; line-height: 1.6; font-family: Arial, Helvetica, sans-serif;">
                          This complaint was escalated to the business head of <strong>${complaint.company}</strong> and remains unresolved 6 days after that notification.
                        </p>
                        
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; margin: 25px 0;">
                          <tr>
                            <td style="padding: 20px;">
                              <p style="margin: 0 0 10px 0; padding: 0; font-size: 14px; color: #6b7280; font-family: Arial, Helvetica, sans-serif;"><strong>Company:</strong> ${complaint.company}</p>
                              <p style="margin: 0 0 10px 0; padding: 0; font-size: 14px; color: #6b7280; font-family: Arial, Helvetica, sans-serif;"><strong>Customer:</strong> ${complaint.name}</p>
                              <p style="margin: 0 0 10px 0; padding: 0; font-size: 14px; color: #6b7280; font-family: Arial, Helvetica, sans-serif;"><strong>Email:</strong> ${complaint.email}</p>
                              <p style="margin: 0 0 10px 0; padding: 0; font-size: 14px; color: #6b7280; font-family: Arial, Helvetica, sans-serif;"><strong>Phone:</strong> ${complaint.phone}</p>
                              <p style="margin: 0 0 10px 0; padding: 0; font-size: 14px; color: #6b7280; font-family: Arial, Helvetica, sans-serif;"><strong>Subject:</strong> ${complaint.subject}</p>
                              <p style="margin: 0 0 10px 0; padding: 0; font-size: 14px; color: #6b7280; font-family: Arial, Helvetica, sans-serif;"><strong>Message:</strong> ${complaint.message}</p>
                              <p style="margin: 0 0 10px 0; padding: 0; font-size: 14px; color: #6b7280; font-family: Arial, Helvetica, sans-serif;"><strong>Submitted:</strong> ${new Date(complaint.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                              <p style="margin: 0 0 10px 0; padding: 0; font-size: 14px; color: #6b7280; font-family: Arial, Helvetica, sans-serif;"><strong>Business head notified:</strong> ${complaint.last_escalation_sent_at ? new Date(complaint.last_escalation_sent_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}</p>
                              <p style="margin: 0; padding: 0; font-size: 14px; color: #6b7280; font-family: Arial, Helvetica, sans-serif;"><strong>Status:</strong> ${complaint.status}</p>
                            </td>
                          </tr>
                        </table>
                        
                        <p style="margin: 25px 0 0 0; padding: 0; font-size: 16px; color: #4b5563; line-height: 1.6; font-family: Arial, Helvetica, sans-serif;">
                          Holding-level follow-up is required.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f3f4f6; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                        <p style="margin: 0; padding: 0; font-size: 12px; color: #9ca3af; line-height: 1.8; font-family: Arial, Helvetica, sans-serif;">© ${new Date().getFullYear()} Legend Holding Group. All rights reserved.</p>
                      </td>
                    </tr>
                    
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `;

        const emailResponse = await resend.emails.send({
          from: 'complaints@legendholding.com',
          to: [holdingInboxEmail],
          subject: emailSubject,
          html: emailHtml,
        });

        if (emailResponse.error) {
          console.error(`Error sending holding escalation for complaint ${complaint.id}:`, emailResponse.error);
          errors.push({ complaintId: complaint.id, error: emailResponse.error, type: 'holding_escalation' });
        } else {
          holdingEscalationsSent.push(complaint.id);
          console.log(`Holding escalation sent for complaint ${complaint.id} to ${holdingInboxEmail}`);
          await query(
            'UPDATE customer_care_complaints SET holding_escalation_sent_at = $1 WHERE id = $2',
            [now.toISOString(), complaint.id]
          );
        }
      } catch (error: any) {
        console.error(`Error processing holding escalation for complaint ${complaint.id}:`, error);
        errors.push({ complaintId: complaint.id, error: error.message, type: 'holding_escalation' });
      }
    }

    return NextResponse.json({
      message: 'Reminder and escalation check completed',
      remindersSent: remindersSent.length,
      escalationsSent: escalationsSent.length,
      holdingEscalationsSent: holdingEscalationsSent.length,
      errors: errors.length,
      details: {
        reminders: remindersSent,
        escalations: escalationsSent,
        holdingEscalations: holdingEscalationsSent,
        errors: errors
      }
    });
  } catch (error: any) {
    console.error('Error in reminder check:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process reminders' },
      { status: 500 }
    );
  }
}

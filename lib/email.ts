import { Resend } from 'resend';
import { getUserByEmail } from './workflow-users';

function getResend(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('Missing RESEND_API_KEY');
  }
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendContactFormEmail(data: {
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
}) {
  try {
    const { name, email, phone, subject, message } = data;

    // Use your verified domain email address
    const fromEmail = 'no-reply@legendholding.com';
    
    // Contact form submissions go to the configured email address
    // Set CONTACT_FORM_RECIPIENT_EMAIL in .env.local or use default
    const recipientEmail = process.env.CONTACT_FORM_RECIPIENT_EMAIL || 'info@legendholding.com';

    const emailResponse = await getResend().emails.send({
      from: fromEmail,
      to: [recipientEmail],
      replyTo: email, // The sender's email address
      subject: `New Contact Form Submission: ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #5E366D; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background-color: #f9f9f9; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>New Contact Form Submission</h2>
              </div>
              <div class="content">
                <p><strong>From:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
                <p><strong>Subject:</strong> ${subject}</p>
                <h3>Message:</h3>
                <p>${message}</p>
              </div>
              <div class="footer">
                <p>This is an automated message from your website's contact form.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log('Email sent successfully:', emailResponse);
    return emailResponse;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

/** Send rejection email to job applicant when admin/super-admin sets status to Rejected. */
export async function sendApplicationRejectionEmail(data: {
  applicantFirstName: string;
  applicantEmail: string;
  positionTitle: string;
}) {
  try {
    const { applicantFirstName, applicantEmail, positionTitle } = data;
    const fromEmail = 'no-reply@legendholding.com';
    const bannerUrl = 'https://res.cloudinary.com/dzfhqvxnf/image/upload/v1770727232/email-banner_i8poc9.png';

    const emailResponse = await getResend().emails.send({
      from: fromEmail,
      to: [applicantEmail],
      subject: `Update on your application – Legend Holding Group`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; }
              .container { max-width: 600px; margin: 0 auto; padding: 0; }
              .banner { display: block; width: 100%; max-width: 600px; height: auto; }
              .content { padding: 24px; background-color: #f9f9f9; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <a href="https://legendholding.com" target="_blank" rel="noopener noreferrer" style="display:block;text-decoration:none;"><img src="${bannerUrl}" alt="Legend Holding Group" class="banner" width="600" style="border:0;outline:none;" /></a>
              <div class="content">
                <p>Dear ${applicantFirstName},</p>
                <p>Thank you for submitting your resume and for your interest in Legend Holding Group for the position of <strong>${positionTitle}</strong>.</p>
                <p>After careful review of your qualifications and experience, we must unfortunately inform you that we are unable to offer you a position at this time.</p>
                <p>However, given your skill set, we would like to keep your resume in our applicant database, should a position become available in the future. This database is accessible to recruitment and staffing teams within the Group.</p>
                <p>Best Regards,<br>People and Culture Team</p>
              </div>
              <div class="footer">
                <p>Legend Holding Group</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    return emailResponse;
  } catch (error) {
    console.error('Error sending application rejection email:', error);
    throw error;
  }
}

export async function sendWorkflowApprovalEmail(data: {
  name: string;
  email: string;
  subject: string;
  comment?: string | null;
}) {
  try {
    const { name, email, subject, comment } = data;

    // Use your verified domain email address
    const fromEmail = 'no-reply@legendholding.com';

    const emailResponse = await getResend().emails.send({
      from: fromEmail,
      to: [email],
      subject: `Annual Budget Plan Approved: ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
                line-height: 1.6; 
                color: #333333; 
                background-color: #f5f5f5;
                padding: 20px;
              }
              .email-container { 
                max-width: 600px; 
                margin: 0 auto; 
                background-color: #ffffff;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              }
              .header { 
                background: linear-gradient(135deg, #5D376E 0%, #7B4A8F 100%);
                color: white; 
                padding: 40px 30px;
                text-align: center;
              }
              .header h1 {
                font-size: 28px;
                font-weight: 700;
                margin-bottom: 10px;
                color: white;
              }
              .content { 
                padding: 40px 30px; 
                background-color: #ffffff;
              }
              .greeting {
                font-size: 18px;
                color: #5D376E;
                font-weight: 600;
                margin-bottom: 20px;
              }
              .approval-badge { 
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white; 
                padding: 16px 32px; 
                border-radius: 8px; 
                display: inline-block; 
                margin: 30px 0;
                font-size: 18px;
                font-weight: 700;
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
              }
              .info-box { 
                background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
                border-left: 4px solid #5D376E; 
                padding: 20px; 
                margin: 25px 0; 
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
              }
              .info-box strong {
                color: #5D376E;
                font-size: 16px;
                display: block;
                margin-bottom: 10px;
              }
              .comment-box {
                background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
                border-left: 4px solid #10b981;
                padding: 20px;
                margin: 25px 0;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
              }
              .comment-box strong {
                color: #059669;
                font-size: 16px;
                display: block;
                margin-bottom: 10px;
              }
              .footer { 
                text-align: center; 
                padding: 30px; 
                color: #666666; 
                font-size: 14px; 
                background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
                border-top: 1px solid #e5e7eb;
              }
              .footer-text {
                color: #6b7280;
                line-height: 1.8;
              }
              .divider {
                height: 1px;
                background: linear-gradient(90deg, transparent, #e5e7eb, transparent);
                margin: 30px 0;
              }
              @media only screen and (max-width: 600px) {
                .content { padding: 30px 20px; }
                .header { padding: 30px 20px; }
                .header h1 { font-size: 24px; }
              }
            </style>
          </head>
          <body>
            <div class="email-container">
              <div class="header">
                <h1>✓ Submission Approved</h1>
                <p style="margin-top: 10px; opacity: 0.95;">Your workflow has been fully approved</p>
              </div>
              <div class="content">
                <p class="greeting">Dear ${name},</p>
                
                <p style="font-size: 16px; color: #4b5563; margin-bottom: 25px;">
                  We are pleased to inform you that your workflow submission has been <strong style="color: #5D376E;">fully approved</strong> by all reviewers and has successfully completed the approval process.
                </p>
                
                <div style="text-align: center;">
                  <div class="approval-badge">
                    ✓ FULLY APPROVED
                  </div>
                </div>

                <div class="info-box">
                  <strong>📋 Submission Details</strong>
                  <p style="margin: 8px 0; color: #374151;"><strong>Subject:</strong> ${subject}</p>
                  <p style="margin: 8px 0; color: #374151;"><strong>Status:</strong> <span style="color: #10b981; font-weight: 600;">Fully Approved</span></p>
                </div>

                ${comment ? `
                <div class="comment-box">
                  <strong>💬 Final Review Comment</strong>
                  <p style="margin-top: 10px; color: #374151; white-space: pre-wrap;">${comment.replace(/\n/g, '<br>')}</p>
                </div>
                ` : ''}

                <div class="divider"></div>

                <p style="font-size: 16px; color: #4b5563; margin-bottom: 15px;">
                  Your submission has been processed and is now complete. If you have any questions or need further assistance, please don't hesitate to contact us.
                </p>
              </div>
              <div class="footer">
                <p class="footer-text">
                  <strong>Legend Holding Group</strong><br>
                  This is an automated message. Please do not reply to this email.<br>
                  <span style="color: #9ca3af; font-size: 12px;">© ${new Date().getFullYear()} Legend Holding Group. All rights reserved.</span>
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log('Workflow approval email sent successfully:', emailResponse);
    return emailResponse;
  } catch (error) {
    console.error('Error sending workflow approval email:', error);
    throw error;
  }
}

export async function sendWorkflowRejectionEmail(data: {
  name: string;
  email: string;
  subject: string;
  reviewer: 'finance' | 'cofounder' | 'founder';
  comment?: string | null;
}) {
  try {
    const { name, email, subject, reviewer, comment } = data;

    // Use your verified domain email address
    const fromEmail = 'no-reply@legendholding.com';

    const reviewerName = reviewer === 'finance' 
      ? 'Rejeesh' 
      : reviewer === 'cofounder' 
      ? 'Mrs. Mira' 
      : 'Founder';

    // Extract first name from full name
    const firstName = name.split(' ')[0];

    // Get personalized workflow link based on submitter's email
    const user = getUserByEmail(email);
    const workflowLink = user 
      ? `https://www.legendholding.com/workflow?id=${user.id}`
      : 'https://www.legendholding.com/workflow';

    const emailResponse = await getResend().emails.send({
      from: fromEmail,
      to: [email],
      subject: `Annual Budget Plan Update: ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
                line-height: 1.6; 
                color: #333333; 
                background-color: #f5f5f5;
                padding: 20px;
              }
              .email-container { 
                max-width: 600px; 
                margin: 0 auto; 
                background-color: #ffffff;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              }
              .header { 
                background: linear-gradient(135deg, #5D376E 0%, #7B4A8F 100%);
                color: white; 
                padding: 40px 30px;
                text-align: center;
              }
              .header h1 {
                font-size: 28px;
                font-weight: 700;
                margin-bottom: 10px;
                color: white;
              }
              .content { 
                padding: 40px 30px; 
                background-color: #ffffff;
              }
              .greeting {
                font-size: 18px;
                color: #5D376E;
                font-weight: 600;
                margin-bottom: 20px;
              }
              .rejection-badge { 
                background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
                color: white; 
                padding: 16px 32px; 
                border-radius: 8px; 
                display: inline-block; 
                margin: 30px 0;
                font-size: 18px;
                font-weight: 700;
                box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
              }
              .info-box { 
                background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
                border-left: 4px solid #dc2626; 
                padding: 20px; 
                margin: 25px 0; 
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
              }
              .info-box strong {
                color: #991b1b;
                font-size: 16px;
                display: block;
                margin-bottom: 10px;
              }
              .comment-box {
                background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
                border-left: 4px solid #EE8900;
                padding: 20px;
                margin: 25px 0;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
              }
              .comment-box strong {
                color: #c2410c;
                font-size: 16px;
                display: block;
                margin-bottom: 10px;
              }
              .reviewer-badge {
                display: inline-block;
                background: linear-gradient(135deg, #5D376E 0%, #7B4A8F 100%);
                color: white;
                padding: 8px 16px;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 600;
                margin-top: 5px;
              }
              .footer { 
                text-align: center; 
                padding: 30px; 
                color: #666666; 
                font-size: 14px; 
                background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
                border-top: 1px solid #e5e7eb;
              }
              .footer-text {
                color: #6b7280;
                line-height: 1.8;
              }
              .divider {
                height: 1px;
                background: linear-gradient(90deg, transparent, #e5e7eb, transparent);
                margin: 30px 0;
              }
              .action-button {
                display: inline-block;
                background: linear-gradient(135deg, #EE8900 0%, #d97706 100%);
                color: white;
                padding: 16px 32px;
                border-radius: 8px;
                text-decoration: none;
                font-size: 16px;
                font-weight: 600;
                margin: 25px 0;
                box-shadow: 0 4px 12px rgba(238, 137, 0, 0.3);
                transition: all 0.3s ease;
              }
              .action-button:hover {
                background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
                box-shadow: 0 6px 16px rgba(238, 137, 0, 0.4);
              }
              @media only screen and (max-width: 600px) {
                .content { padding: 30px 20px; }
                .header { padding: 30px 20px; }
                .header h1 { font-size: 24px; }
                .action-button {
                  padding: 14px 28px;
                  font-size: 15px;
                }
              }
            </style>
          </head>
          <body>
            <div class="email-container">
              <div class="header">
                <h1>Submission Update</h1>
                <p style="margin-top: 10px; opacity: 0.95;">Review status notification</p>
              </div>
              <div class="content">
                <p class="greeting">Dear ${firstName},</p>
                
                <p style="font-size: 16px; color: #4b5563; margin-bottom: 25px;">
                  Unfortunately the Annual plan need more modification, please review the comments and re-upload again.
                </p>
                
                <div style="text-align: center;">
                  <div class="rejection-badge">
                    REJECTED BY ${reviewerName.toUpperCase()}
                  </div>
                </div>

                <div class="info-box">
                  <strong>📋 Submission Details</strong>
                  <p style="margin: 8px 0; color: #374151;"><strong>Subject:</strong> ${subject}</p>
                  <p style="margin: 8px 0; color: #374151;"><strong>Rejected by:</strong> <span style="color: #5D376E; font-weight: 600;">${reviewerName}</span></p>
                  <p style="margin: 8px 0; color: #374151;"><strong>Status:</strong> <span style="color: #dc2626; font-weight: 600;">Rejected</span></p>
                </div>

                ${comment ? `
                <div class="comment-box">
                  <strong>💬 Review Comment</strong>
                  <p style="margin-top: 10px; color: #374151; white-space: pre-wrap;">${comment.replace(/\n/g, '<br>')}</p>
                </div>
                ` : ''}

                <div class="divider"></div>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${workflowLink}" 
                     style="display: inline-block; 
                            background: linear-gradient(135deg, #EE8900 0%, #d97706 100%); 
                            background-color: #EE8900;
                            color: #ffffff !important; 
                            padding: 16px 32px; 
                            border-radius: 8px; 
                            text-decoration: none; 
                            font-size: 16px; 
                            font-weight: 600; 
                            box-shadow: 0 4px 12px rgba(238, 137, 0, 0.3);
                            mso-padding-alt: 0;
                            text-align: center;">
                    <!--[if mso]>
                    <i style="letter-spacing: 25px; mso-font-width: -100%; mso-text-raise: 30pt;">&nbsp;</i>
                    <![endif]-->
                    <span style="mso-text-raise: 15pt; color: #ffffff; font-weight: 600;">Resubmit Annual Plan</span>
                    <!--[if mso]>
                    <i style="letter-spacing: 25px; mso-font-width: -100%;">&nbsp;</i>
                    <![endif]-->
                  </a>
                </div>

                <p style="font-size: 16px; color: #4b5563; margin-bottom: 15px; text-align: center;">
                  Thank you for understanding.
                </p>
              </div>
              <div class="footer">
                <p class="footer-text">
                  <strong>Legend Holding Group</strong><br>
                  This is an automated message. Please do not reply to this email.<br>
                  <span style="color: #9ca3af; font-size: 12px;">© ${new Date().getFullYear()} Legend Holding Group. All rights reserved.</span>
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log('Workflow rejection email sent successfully:', emailResponse);
    return emailResponse;
  } catch (error) {
    console.error('Error sending workflow rejection email:', error);
    throw error;
  }
}

// Import company email mapping from separate file
import { getCompanyEmail as getCompanyEmailFromMap } from './company-email-map';

// Re-export for backward compatibility
export function getCompanyEmail(companyName: string): string | null {
  return getCompanyEmailFromMap(companyName);
}

export async function sendCustomerCareComplaintEmail(data: {
  name: string;
  email: string;
  phone: string;
  company: string;
  subject: string;
  message: string;
  adminComment?: string | null;
  companyEmail: string;
}) {
  try {
    const { name, email, phone, company, subject, message, adminComment, companyEmail } = data;

    // Use no-reply email address
    const fromEmail = 'no-reply@legendholding.com';

    // Escape HTML to prevent XSS and ensure proper rendering
    const escapeHtml = (text: string) => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safePhone = escapeHtml(phone);
    const safeCompany = escapeHtml(company);
    const safeSubject = escapeHtml(subject);
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');
    const safeAdminComment = adminComment ? escapeHtml(adminComment).replace(/\n/g, '<br>') : '';

    const emailResponse = await getResend().emails.send({
      from: fromEmail,
      to: [companyEmail],
      // No replyTo - customers cannot reply to no-reply address
      subject: `Customer Care Complaint - Action Required`,
      html: `
        <!DOCTYPE html>
        <html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <!--[if mso]>
          <noscript>
            <xml>
              <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
              </o:OfficeDocumentSettings>
            </xml>
          </noscript>
          <![endif]-->
        </head>
        <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, Helvetica, sans-serif;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
            <tr>
              <td align="center" style="padding: 20px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: #ffffff; max-width: 600px;">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background-color: #5D376E; padding: 40px 30px; text-align: center;">
                      <h1 style="margin: 0; padding: 0; font-size: 28px; font-weight: bold; color: #ffffff; font-family: Arial, Helvetica, sans-serif;">Customer Care Complaint</h1>
                      <p style="margin: 10px 0 0 0; padding: 0; font-size: 16px; color: #ffffff; font-family: Arial, Helvetica, sans-serif;">Action Required</p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px; background-color: #ffffff;">
                      <p style="margin: 0 0 25px 0; padding: 0; font-size: 16px; color: #4b5563; line-height: 1.6; font-family: Arial, Helvetica, sans-serif;">
                        Dear Team,
                      </p>
                      
                      <p style="margin: 0 0 25px 0; padding: 0; font-size: 16px; color: #4b5563; line-height: 1.6; font-family: Arial, Helvetica, sans-serif;">
                        A complaint has been filed by a Legend customer regarding your company's product or service.
                      </p>
                      
                      <p style="margin: 0 0 25px 0; padding: 0; font-size: 16px; color: #4b5563; line-height: 1.6; font-family: Arial, Helvetica, sans-serif;">
                        Kindly log in to your account and respond to the customer through the official portal to ensure transparency and a swift resolution.
                      </p>
                      
                      <!-- Warning Box -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; margin: 25px 0;">
                        <tr>
                          <td style="padding: 15px 20px;">
                            <p style="margin: 0; padding: 0; font-size: 14px; color: #92400e; line-height: 1.6; font-family: Arial, Helvetica, sans-serif;">
                              <strong style="color: #92400e;">⚠️ Important:</strong> Please note that delayed responses will be escalated to higher management.
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
                        <tr>
                          <td align="center" style="padding: 10px 0;">
                            <p style="margin: 0; padding: 0; font-size: 14px; color: #6b7280; font-family: Arial, Helvetica, sans-serif;">
                              Link: <a href="https://www.legendholding.com/company/login" style="color: #5D376E; text-decoration: underline;">https://www.legendholding.com/company/login</a>
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f3f4f6; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0 0 10px 0; padding: 0; font-size: 14px; color: #6b7280; line-height: 1.8; font-family: Arial, Helvetica, sans-serif;">
                        This is a system generated message
                      </p>
                      <p style="margin: 0; padding: 0; font-size: 12px; color: #9ca3af; line-height: 1.8; font-family: Arial, Helvetica, sans-serif;">© ${new Date().getFullYear()} Legend Holding Group. All rights reserved.</p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log('Customer care complaint email sent successfully:', emailResponse);
    return emailResponse;
  } catch (error) {
    console.error('Error sending customer care complaint email:', error);
    throw error;
  }
} 
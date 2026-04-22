import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST(request: Request) {
  console.log('POST /api/job-applications - Request received')
  
  try {
    console.log('Processing job application request')

    // Parse the request body
    let applicationData
    try {
      applicationData = await request.json()
      console.log('Successfully parsed request body:', {
        job_id: applicationData.job_id,
        full_name: applicationData.full_name,
        email: applicationData.email,
        has_resume_url: !!applicationData.resume_url
      })
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError)
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    
    // Validate required fields
    if (!applicationData.job_id || !applicationData.full_name || !applicationData.email || !applicationData.phone || !applicationData.resume_url) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate that the job exists and is active
    const jobResult = await query(
      `SELECT id, title, status
       FROM jobs
       WHERE id = $1
         AND status = $2
       LIMIT 1`,
      [applicationData.job_id, 'active']
    )
    const job = jobResult.rows[0]

    if (!job) {
      return NextResponse.json({ error: 'Job not found or is not active' }, { status: 404 })
    }

    // Check if user has already applied for this job
    const normalizedEmail = applicationData.email.trim().toLowerCase()
    const existingResult = await query(
      `SELECT id
       FROM job_applications
       WHERE job_id = $1
         AND email = $2
       LIMIT 1`,
      [applicationData.job_id, normalizedEmail]
    )
    const existingApplication = existingResult.rows[0]

    if (existingApplication) {
      return NextResponse.json({ error: 'You have already applied for this position' }, { status: 409 })
    }

    const insertResult = await query(
      `INSERT INTO job_applications
       (job_id, full_name, email, phone, resume_url, cover_letter, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING id`,
      [
        applicationData.job_id,
        applicationData.full_name.trim(),
        normalizedEmail,
        applicationData.phone.trim(),
        applicationData.resume_url,
        applicationData.cover_letter?.trim() || null,
        'pending',
      ]
    )
    const newApplication = insertResult.rows[0]

    console.log(`Successfully created application: ${newApplication.id} for job: ${job.title}`)
    const successResponse = { 
      success: true, 
      applicationId: newApplication.id,
      message: 'Application submitted successfully'
    }
    console.log('Returning success response:', successResponse)
    return NextResponse.json(successResponse)

  } catch (error) {
    console.error('Error in job applications API:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    const errorResponse = { 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }
    console.log('Returning error response:', errorResponse)
    return NextResponse.json(errorResponse, { status: 500 })
  }
} 
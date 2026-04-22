import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

// Simple UUID v4 format check to reject obviously invalid IDs early
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params in Next.js 15
    const { id } = await params

    // Validate ID format before hitting the database
    if (!id || !UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const result = await query(
      `SELECT *
       FROM jobs
       WHERE id = $1
         AND status = $2
       LIMIT 1`,
      [id, 'active']
    )
    const job = result.rows[0]

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    console.log(`Successfully fetched job: ${job.title}`)

    // Return with cache headers to reduce redundant invocations
    return NextResponse.json(job, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    console.error('Error in careers job API:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 
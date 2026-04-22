import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
  try {
    const result = await query(
      `SELECT *
       FROM jobs
       WHERE status = $1
       ORDER BY created_at DESC`,
      ['active']
    )
    const jobs = result.rows

    console.log(`Successfully fetched ${jobs?.length || 0} jobs`)
    return NextResponse.json(jobs || [])
  } catch (error) {
    console.error('Error in careers jobs API:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 
import { NextResponse } from 'next/server'
// Deprecated one-time endpoint — no longer needed.
export async function POST() {
  return NextResponse.json({ error: 'Gone' }, { status: 410 })
}

/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

function classifyResumeUrl(value) {
  if (!value) return 'empty'
  if (String(value).startsWith('data:')) return 'base64'
  if (/^https?:\/\//i.test(String(value))) return 'absolute_url'
  return 'relative_or_storage_path'
}

function escapeCsv(value) {
  const s = String(value ?? '')
  if (s.includes('"') || s.includes(',') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

async function main() {
  const {
    POSTGRES_HOST,
    POSTGRES_PORT,
    POSTGRES_DB,
    POSTGRES_USER,
    POSTGRES_PASSWORD,
    POSTGRES_SSL,
  } = process.env

  if (!POSTGRES_HOST || !POSTGRES_DB || !POSTGRES_USER) {
    console.error('Missing required env vars: POSTGRES_HOST, POSTGRES_DB, POSTGRES_USER')
    process.exit(1)
  }

  const sslEnabled = String(POSTGRES_SSL ?? 'false').toLowerCase() === 'true'
  const client = new Client({
    host: POSTGRES_HOST,
    port: POSTGRES_PORT ? Number(POSTGRES_PORT) : 5432,
    database: POSTGRES_DB,
    user: POSTGRES_USER,
    password: POSTGRES_PASSWORD ?? '',
    ssl: sslEnabled ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000,
  })

  const outputDir = path.resolve(process.cwd(), 'reports')
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const jsonPath = path.join(outputDir, `resume-migration-manifest-${timestamp}.json`)
  const csvPath = path.join(outputDir, `resume-migration-manifest-${timestamp}.csv`)

  try {
    await client.connect()
    const result = await client.query(
      `SELECT id, job_id, full_name, email, resume_url, created_at, updated_at
       FROM job_applications
       ORDER BY created_at DESC`
    )

    const rows = result.rows.map((r) => ({
      ...r,
      resume_type: classifyResumeUrl(r.resume_url),
    }))

    const summary = rows.reduce(
      (acc, row) => {
        acc.total += 1
        if (row.resume_type === 'base64') acc.base64 += 1
        else if (row.resume_type === 'absolute_url') acc.absolute_url += 1
        else if (row.resume_type === 'relative_or_storage_path') acc.relative_or_storage_path += 1
        else acc.empty += 1
        return acc
      },
      { total: 0, base64: 0, absolute_url: 0, relative_or_storage_path: 0, empty: 0 }
    )

    fs.mkdirSync(outputDir, { recursive: true })
    fs.writeFileSync(
      jsonPath,
      JSON.stringify(
        {
          generated_at: new Date().toISOString(),
          summary,
          rows,
        },
        null,
        2
      ),
      'utf8'
    )

    const header = ['id', 'job_id', 'full_name', 'email', 'resume_type', 'resume_url', 'created_at', 'updated_at']
    const csvLines = [
      header.join(','),
      ...rows.map((r) =>
        [
          escapeCsv(r.id),
          escapeCsv(r.job_id),
          escapeCsv(r.full_name),
          escapeCsv(r.email),
          escapeCsv(r.resume_type),
          escapeCsv(r.resume_url),
          escapeCsv(r.created_at),
          escapeCsv(r.updated_at),
        ].join(',')
      ),
    ]
    fs.writeFileSync(csvPath, csvLines.join('\n'), 'utf8')

    console.log('[resume-manifest] Export complete')
    console.log('[resume-manifest] Summary:', summary)
    console.log('[resume-manifest] JSON:', jsonPath)
    console.log('[resume-manifest] CSV:', csvPath)
  } catch (err) {
    console.error('[resume-manifest] Failed:', err && err.message ? err.message : err)
    process.exitCode = 1
  } finally {
    try {
      await client.end()
    } catch {}
  }
}

main()

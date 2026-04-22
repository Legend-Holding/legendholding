/* eslint-disable no-console */
const { Client } = require('pg')

function isBase64DataUrl(value) {
  if (!value) return false
  return String(value).startsWith('data:')
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

  try {
    await client.connect()
    const result = await client.query(
      `SELECT id, job_id, full_name, email, resume_url, created_at
       FROM job_applications
       WHERE resume_url IS NOT NULL
         AND btrim(resume_url) <> ''
       ORDER BY created_at DESC`
    )

    const nonBase64 = result.rows.filter((row) => !isBase64DataUrl(row.resume_url))

    console.log(`[non-base64-resumes] Total scanned: ${result.rows.length}`)
    console.log(`[non-base64-resumes] Found: ${nonBase64.length}`)

    if (nonBase64.length === 0) {
      return
    }

    console.log('\n[non-base64-resumes] Records:\n')
    for (const row of nonBase64) {
      console.log(
        JSON.stringify(
          {
            id: row.id,
            job_id: row.job_id,
            full_name: row.full_name,
            email: row.email,
            resume_url: row.resume_url,
            created_at: row.created_at,
          },
          null,
          2
        )
      )
    }
  } catch (err) {
    console.error('[non-base64-resumes] Failed:', err && err.message ? err.message : err)
    process.exitCode = 1
  } finally {
    try {
      await client.end()
    } catch {}
  }
}

main()

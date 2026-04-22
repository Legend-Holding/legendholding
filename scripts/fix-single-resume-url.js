/* eslint-disable no-console */
const { Client } = require('pg')

function getArg(name) {
  const prefix = `--${name}=`
  const match = process.argv.find((arg) => arg.startsWith(prefix))
  return match ? match.slice(prefix.length) : ''
}

async function main() {
  const id = getArg('id')
  const newUrl = getArg('new-url')
  const expectedOld = getArg('expected-old')
  const dryRun = process.argv.includes('--dry-run')

  if (!id) {
    console.error('Missing required argument: --id=<application-id>')
    process.exit(1)
  }

  if (!dryRun && !newUrl) {
    console.error('Missing required argument: --new-url=<final-resume-url> (or use --dry-run)')
    process.exit(1)
  }

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

    const current = await client.query(
      `SELECT id, full_name, email, resume_url, created_at
       FROM job_applications
       WHERE id = $1
       LIMIT 1`,
      [id]
    )

    const row = current.rows[0]
    if (!row) {
      console.error(`No application found for id: ${id}`)
      process.exit(1)
    }

    console.log('[resume-fix] Current row:')
    console.log(JSON.stringify(row, null, 2))

    if (dryRun) {
      console.log('[resume-fix] Dry run only. No update executed.')
      return
    }

    if (expectedOld && row.resume_url !== expectedOld) {
      console.error('[resume-fix] Abort: current resume_url does not match --expected-old')
      console.error(`[resume-fix] current: ${row.resume_url}`)
      console.error(`[resume-fix] expected: ${expectedOld}`)
      process.exit(1)
    }

    const update = await client.query(
      `UPDATE job_applications
       SET resume_url = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, full_name, email, resume_url, updated_at`,
      [newUrl, id]
    )

    console.log('[resume-fix] Updated row:')
    console.log(JSON.stringify(update.rows[0], null, 2))
  } catch (err) {
    console.error('[resume-fix] Failed:', err && err.message ? err.message : err)
    process.exitCode = 1
  } finally {
    try {
      await client.end()
    } catch {}
  }
}

main()

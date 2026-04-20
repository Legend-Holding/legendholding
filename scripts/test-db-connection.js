/* eslint-disable no-console */
// Quick connection test for the staging Postgres.
// Usage: npm run db:test:staging

const { Client } = require('pg')

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
    console.error('Missing required env: POSTGRES_HOST / POSTGRES_DB / POSTGRES_USER')
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
    connectionTimeoutMillis: 10_000,
  })

  console.log(`[db-test] Connecting to ${POSTGRES_USER}@${POSTGRES_HOST}:${POSTGRES_PORT ?? 5432}/${POSTGRES_DB} (ssl=${sslEnabled})`)
  try {
    await client.connect()
    const { rows } = await client.query('SELECT current_database() AS db, current_user AS usr, version() AS version')
    console.log('[db-test] OK:', rows[0])
    process.exit(0)
  } catch (err) {
    console.error('[db-test] FAILED:', err && err.message ? err.message : err)
    process.exit(1)
  } finally {
    try { await client.end() } catch {}
  }
}

main()

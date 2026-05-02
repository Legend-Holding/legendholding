import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg'

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined
}

function buildPool(): Pool | null {
  const {
    DATABASE_URL,
    POSTGRES_HOST,
    POSTGRES_PORT,
    POSTGRES_DB,
    POSTGRES_USER,
    POSTGRES_PASSWORD,
    POSTGRES_SSL,
    POSTGRES_MAX_CONNECTIONS,
  } = process.env

  const maxConns = POSTGRES_MAX_CONNECTIONS ? Number(POSTGRES_MAX_CONNECTIONS) : 10

  // Prefer DATABASE_URL — avoids dotenv special-character parsing issues.
  if (DATABASE_URL) {
    return new Pool({
      connectionString: DATABASE_URL,
      ssl: false,
      max: maxConns,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    })
  }

  if (!POSTGRES_HOST || !POSTGRES_DB || !POSTGRES_USER) {
    return null
  }

  const sslEnabled = String(POSTGRES_SSL ?? 'false').toLowerCase() === 'true'

  return new Pool({
    host: POSTGRES_HOST,
    port: POSTGRES_PORT ? Number(POSTGRES_PORT) : 5432,
    database: POSTGRES_DB,
    user: POSTGRES_USER,
    password: POSTGRES_PASSWORD ?? '',
    ssl: sslEnabled ? { rejectUnauthorized: false } : false,
    max: maxConns,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  })
}

function getPool(): Pool | null {
  if (!global.__pgPool) {
    const p = buildPool()
    if (!p) return null
    p.on('error', (err) => {
      // Keep the process alive; log so idle client errors are observable.
      console.error('[pg] idle client error:', err)
    })
    global.__pgPool = p
  }
  return global.__pgPool ?? null
}

function requirePool(): Pool {
  const p = getPool()
  if (!p) {
    throw new Error(
      'Postgres config missing. Required env: POSTGRES_HOST, POSTGRES_DB, POSTGRES_USER (and POSTGRES_PASSWORD).',
    )
  }
  return p
}

// Kept for backward compatibility if any caller imports `pool` directly.
export const pool = null as unknown as Pool

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: readonly unknown[],
): Promise<QueryResult<T>> {
  return requirePool().query<T>(text, params as unknown[] | undefined)
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await requirePool().connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}

export async function checkDbConnection(): Promise<boolean> {
  try {
    const result = await requirePool().query('SELECT 1 AS ok')
    return result.rows?.[0]?.ok === 1
  } catch (err) {
    console.error('[pg] connection check failed:', err)
    return false
  }
}

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg'

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined
}

function isBuildTime(): boolean {
  return (
    process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.VERCEL_ENV === undefined && typeof window === 'undefined' && !process.env.POSTGRES_HOST
  )
}

function buildPool(): Pool {
  const {
    POSTGRES_HOST,
    POSTGRES_PORT,
    POSTGRES_DB,
    POSTGRES_USER,
    POSTGRES_PASSWORD,
    POSTGRES_SSL,
    POSTGRES_MAX_CONNECTIONS,
  } = process.env

  if (!POSTGRES_HOST || !POSTGRES_DB || !POSTGRES_USER) {
    if (isBuildTime()) {
      console.warn('[pg] Skipping pool creation during build time (missing env vars)')
      return null as unknown as Pool
    }
    throw new Error(
      'Postgres config missing. Required env: POSTGRES_HOST, POSTGRES_DB, POSTGRES_USER (and POSTGRES_PASSWORD).',
    )
  }

  const sslEnabled = String(POSTGRES_SSL ?? 'false').toLowerCase() === 'true'

  return new Pool({
    host: POSTGRES_HOST,
    port: POSTGRES_PORT ? Number(POSTGRES_PORT) : 5432,
    database: POSTGRES_DB,
    user: POSTGRES_USER,
    password: POSTGRES_PASSWORD ?? '',
    ssl: sslEnabled ? { rejectUnauthorized: false } : false,
    max: POSTGRES_MAX_CONNECTIONS ? Number(POSTGRES_MAX_CONNECTIONS) : 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  })
}

function getPool(): Pool {
  if (!global.__pgPool) {
    const p = buildPool()
    if (!p) {
      return null as unknown as Pool
    }
    p.on('error', (err) => {
      // Keep the process alive; log so idle client errors are observable.
      console.error('[pg] idle client error:', err)
    })
    global.__pgPool = p
  }
  return global.__pgPool
}

export const pool: Pool = new Proxy({} as Pool, {
  get(_target, prop, receiver) {
    const actualPool = getPool()
    return Reflect.get(actualPool as unknown as object, prop, receiver)
  },
})

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: readonly unknown[],
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params as unknown[] | undefined)
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect()
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
    const result = await getPool().query('SELECT 1 AS ok')
    return result.rows?.[0]?.ok === 1
  } catch (err) {
    console.error('[pg] connection check failed:', err)
    return false
  }
}

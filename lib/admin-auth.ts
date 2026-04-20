import crypto from 'crypto'

export const ADMIN_SESSION_COOKIE = 'admin_session'
const SESSION_TTL_SECONDS = 60 * 60 * 24 // 24 hours

type SessionPayload = {
  sub: string
  email: string
  exp: number
}

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.POSTGRES_PASSWORD
  if (!secret) {
    throw new Error('Missing ADMIN_SESSION_SECRET (or POSTGRES_PASSWORD fallback)')
  }
  return secret
}

function toBase64Url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url')
}

function fromBase64Url(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8')
}

function sign(data: string): string {
  return crypto.createHmac('sha256', getSecret()).update(data).digest('base64url')
}

export function createAdminSessionToken(userId: string, email: string): string {
  const payload: SessionPayload = {
    sub: userId,
    email,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  }

  const encodedPayload = toBase64Url(JSON.stringify(payload))
  const signature = sign(encodedPayload)
  return `${encodedPayload}.${signature}`
}

export function verifyAdminSessionToken(token: string): SessionPayload | null {
  try {
    const [encodedPayload, signature] = token.split('.')
    if (!encodedPayload || !signature) return null

    const expected = sign(encodedPayload)
    if (signature !== expected) return null

    const payload = JSON.parse(fromBase64Url(encodedPayload)) as SessionPayload
    if (!payload?.sub || !payload?.email || !payload?.exp) return null
    if (payload.exp < Math.floor(Date.now() / 1000)) return null

    return payload
  } catch {
    return null
  }
}

function getCookieAttributes(maxAge = SESSION_TTL_SECONDS): string {
  const isProd = process.env.NODE_ENV === 'production'
  return [
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    isProd ? 'Secure' : '',
    `Max-Age=${maxAge}`,
  ]
    .filter(Boolean)
    .join('; ')
}

export function createAdminSessionCookie(token: string): string {
  return `${ADMIN_SESSION_COOKIE}=${token}; ${getCookieAttributes()}`
}

export function createClearedAdminSessionCookie(): string {
  return `${ADMIN_SESSION_COOKIE}=; ${getCookieAttributes(0)}`
}

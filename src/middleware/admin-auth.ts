import type { Context, Next } from 'hono'
import { env } from '../config/env.js'
import { HttpError } from '../utils/http-error.js'

export interface AdminAuthContext {
  tokenType: 'admin'
}

export async function adminAuth(c: Context, next: Next) {
  const secret = env.ADMIN_JWT_SECRET.trim()
  if (env.NODE_ENV === 'production' && secret.length === 0) {
    throw new HttpError(500, 'Admin auth is not configured', 'ADMIN_AUTH_NOT_CONFIGURED')
  }

  const header = c.req.header('authorization') ?? ''
  const match = /^Bearer\s+(.+)$/i.exec(header)
  const token = match?.[1]?.trim() ?? ''

  if (secret.length === 0 || token.length === 0 || token !== secret) {
    throw new HttpError(401, 'Missing or invalid admin token', 'UNAUTHORIZED')
  }

  c.set('adminAuth', { tokenType: 'admin' } satisfies AdminAuthContext)
  await next()
}

export function getAdminAuth(c: Context): AdminAuthContext {
  const auth = c.get('adminAuth') as AdminAuthContext | undefined
  if (!auth) throw new HttpError(401, 'Missing admin auth context', 'UNAUTHORIZED')
  return auth
}

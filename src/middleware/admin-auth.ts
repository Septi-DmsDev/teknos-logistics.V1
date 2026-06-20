import type { AdminOperatorRole } from '@prisma/client'
import type { Context, MiddlewareHandler } from 'hono'
import { env } from '../config/env.js'
import type { SupabaseAdminAuthService } from '../services/supabase-admin-auth.service.js'
import { HttpError } from '../utils/http-error.js'

export type AdminAuthProvider = 'static-token' | 'supabase'

export interface AdminAuthContext {
  provider: AdminAuthProvider
  tokenType: 'admin' | 'supabase'
  operatorId?: string
  supabaseUserId?: string
  email?: string
  role?: AdminOperatorRole
}

export function adminAuth(supabaseAuth?: SupabaseAdminAuthService): MiddlewareHandler {
  return async (c, next) => {
    const token = extractBearerToken(c.req.header('authorization') ?? '')

    if (env.ADMIN_AUTH_PROVIDER === 'supabase') {
      if (!supabaseAuth) throw new HttpError(500, 'Supabase admin auth is not configured', 'ADMIN_AUTH_NOT_CONFIGURED')
      if (!token) throw new HttpError(401, 'Missing or invalid admin session', 'UNAUTHORIZED')
      c.set('adminAuth', await supabaseAuth.verifyBearerToken(token) satisfies AdminAuthContext)
      await next()
      return
    }

    const secret = env.ADMIN_JWT_SECRET.trim()
    if (env.NODE_ENV === 'production' && secret.length === 0) {
      throw new HttpError(500, 'Admin auth is not configured', 'ADMIN_AUTH_NOT_CONFIGURED')
    }

    if (secret.length === 0 || token.length === 0 || token !== secret) {
      throw new HttpError(401, 'Missing or invalid admin token', 'UNAUTHORIZED')
    }

    c.set('adminAuth', { provider: 'static-token', tokenType: 'admin' } satisfies AdminAuthContext)
    await next()
  }
}

export function getAdminAuth(c: Context): AdminAuthContext {
  const auth = c.get('adminAuth') as AdminAuthContext | undefined
  if (!auth) throw new HttpError(401, 'Missing admin auth context', 'UNAUTHORIZED')
  return auth
}

function extractBearerToken(header: string): string {
  const match = /^Bearer\s+(.+)$/i.exec(header)
  return match?.[1]?.trim() ?? ''
}

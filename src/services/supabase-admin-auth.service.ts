import { jwtVerify } from 'jose'
import type { AdminOperatorRole } from '@prisma/client'
import { env } from '../config/env.js'
import type { AdminOperatorRepository } from '../repositories/admin-operator.repository.js'
import { HttpError } from '../utils/http-error.js'

export interface SupabaseAdminAuthResult {
  provider: 'supabase'
  tokenType: 'supabase'
  operatorId: string
  supabaseUserId: string
  email: string
  role: AdminOperatorRole
}

interface SupabaseJwtPayload {
  sub?: string
  email?: string
  role?: string
  aud?: string | string[]
  exp?: number
}

export class SupabaseAdminAuthService {
  private readonly secret: Uint8Array

  constructor(private readonly operators: AdminOperatorRepository) {
    this.secret = new TextEncoder().encode(env.SUPABASE_JWT_SECRET)
  }

  async verifyBearerToken(token: string): Promise<SupabaseAdminAuthResult> {
    const { payload } = await jwtVerify(token, this.secret, { algorithms: ['HS256'] }).catch(() => {
      throw new HttpError(401, 'Missing or invalid admin session', 'UNAUTHORIZED')
    })

    const claims = payload as SupabaseJwtPayload
    const supabaseUserId = claims.sub?.trim()
    if (!supabaseUserId) throw new HttpError(401, 'Admin session is missing user subject', 'UNAUTHORIZED')

    const operator = await this.operators.findActiveBySupabaseUserId(supabaseUserId)
    if (!operator) throw new HttpError(403, 'Admin operator is not allowed', 'ADMIN_OPERATOR_NOT_ALLOWED')

    return {
      provider: 'supabase',
      tokenType: 'supabase',
      operatorId: operator.id,
      supabaseUserId: operator.supabaseUserId,
      email: operator.email,
      role: operator.role,
    }
  }
}

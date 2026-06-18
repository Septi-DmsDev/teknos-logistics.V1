import type { Context, Next } from 'hono'
import type { MerchantRepository } from '../repositories/merchant.repository.js'
import { hashApiKey, safeEqualHex } from '../utils/crypto.js'
import { HttpError } from '../utils/http-error.js'

export interface AuthContext {
  merchantId: string
  apiKeyId: string
}

export function apiKeyAuth(merchantRepository: MerchantRepository) {
  return async (c: Context, next: Next) => {
    const header = c.req.header('authorization') ?? ''
    const match = /^Bearer\s+(tlg_[A-Za-z0-9_-]+)$/i.exec(header)
    if (!match?.[1]) throw new HttpError(401, 'Missing or invalid API key', 'UNAUTHORIZED')

    const plaintext = match[1]
    const keyHash = hashApiKey(plaintext)
    const apiKey = await merchantRepository.findActiveApiKeyByPrefix(plaintext.slice(0, 16))
    if (!apiKey || !safeEqualHex(keyHash, apiKey.keyHash) || !apiKey.merchant.isActive) {
      throw new HttpError(401, 'Missing or invalid API key', 'UNAUTHORIZED')
    }

    await merchantRepository.markApiKeyUsed(apiKey.id)
    c.set('auth', { merchantId: apiKey.merchantId, apiKeyId: apiKey.id } satisfies AuthContext)
    await next()
  }
}

export function getAuth(c: Context): AuthContext {
  const auth = c.get('auth') as AuthContext | undefined
  if (!auth) throw new HttpError(401, 'Missing auth context', 'UNAUTHORIZED')
  return auth
}

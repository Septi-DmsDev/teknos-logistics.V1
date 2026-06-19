import type { Context, Next } from 'hono'
import { HttpError } from '../utils/http-error.js'

interface RateLimitOptions {
  windowMs: number
  maxRequests: number
  keyPrefix: string
}

interface RateLimitBucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, RateLimitBucket>()

export function rateLimit(options: RateLimitOptions) {
  return async (c: Context, next: Next) => {
    if (options.maxRequests <= 0 || options.windowMs <= 0) {
      await next()
      return
    }

    const now = Date.now()
    cleanupExpiredBuckets(now)

    const key = buildRateLimitKey(c, options.keyPrefix)
    const bucket = buckets.get(key)

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs })
      await next()
      return
    }

    if (bucket.count >= options.maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
      c.header('Retry-After', String(retryAfterSeconds))
      throw new HttpError(429, 'Too many requests', 'RATE_LIMITED')
    }

    bucket.count += 1
    await next()
  }
}

function buildRateLimitKey(c: Context, prefix: string): string {
  const forwardedFor = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
  const realIp = c.req.header('x-real-ip')?.trim()
  const apiKeyPrefix = extractBearerPrefix(c.req.header('authorization') ?? '')
  const principal = apiKeyPrefix ? `bearer:${apiKeyPrefix}` : `ip:${forwardedFor || realIp || 'unknown'}`
  return `${prefix}:${principal}`
}

function extractBearerPrefix(header: string): string | null {
  const match = /^Bearer\s+(.+)$/i.exec(header)
  const token = match?.[1]?.trim() ?? ''
  return token.length > 0 ? token.slice(0, 16) : null
}

function cleanupExpiredBuckets(now: number): void {
  if (buckets.size < 1000) return

  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

import type { Context, Next } from 'hono'
import type { AdminAuditRepository } from '../repositories/admin-audit.repository.js'

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export function adminAudit(audits: AdminAuditRepository) {
  return async (c: Context, next: Next) => {
    const method = c.req.method.toUpperCase()
    if (!MUTATION_METHODS.has(method)) {
      await next()
      return
    }

    const startedAt = Date.now()
    try {
      await next()
    } finally {
      const audit = {
        method,
        path: new URL(c.req.url).pathname,
        status: c.res.status || 500,
        durationMs: Date.now() - startedAt,
        requestId: c.req.header('x-request-id') ?? null,
        ipAddress: firstHeaderValue(c.req.header('x-forwarded-for')) ?? c.req.header('x-real-ip') ?? null,
        userAgent: c.req.header('user-agent')?.slice(0, 255) ?? null,
      }

      console.info('[admin-audit]', audit)
      audits.create(audit).catch(() => {
        console.error('[admin-audit] failed to persist audit log')
      })
    }
  }
}

function firstHeaderValue(value: string | undefined): string | null {
  const first = value?.split(',')[0]?.trim()
  return first && first.length > 0 ? first : null
}

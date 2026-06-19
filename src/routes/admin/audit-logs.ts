import type { Hono } from 'hono'
import type { AdminAuditService } from '../../services/admin-audit.service.js'
import { adminAuditLogListQuerySchema } from '../../schemas/admin.js'
import { parseQuery } from './helpers.js'

export function mountAdminAuditLogRoutes(app: Hono, audits: AdminAuditService): void {
  app.get('/admin/audit-logs', async (c) => {
    const query = parseQuery(c, adminAuditLogListQuerySchema)
    const logs = await audits.listAuditLogs(query)
    return c.json({ logs })
  })
}

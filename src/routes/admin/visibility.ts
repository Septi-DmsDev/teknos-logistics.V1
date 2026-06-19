import type { Hono } from 'hono'
import type { AdminVisibilityService } from '../../services/admin-visibility.service.js'
import { adminShipmentListQuerySchema, adminWebhookRelayListQuerySchema } from '../../schemas/admin.js'
import { parseQuery } from './helpers.js'

export function mountAdminVisibilityRoutes(app: Hono, visibility: AdminVisibilityService): void {
  app.get('/admin/shipments', async (c) => {
    const query = parseQuery(c, adminShipmentListQuerySchema)
    const shipments = await visibility.listShipments(query)
    return c.json({ shipments })
  })

  app.get('/admin/webhook-relays', async (c) => {
    const query = parseQuery(c, adminWebhookRelayListQuerySchema)
    const attempts = await visibility.listWebhookRelays(query)
    return c.json({ attempts })
  })
}

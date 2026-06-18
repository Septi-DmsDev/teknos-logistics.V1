import type { Hono } from 'hono'
import type { ShipmentService } from '../../services/shipment.service.js'
import { getAuth } from '../../middleware/api-key-auth.js'
import { shipmentRequestSchema } from '../../schemas/api.js'

export function mountShipmentRoutes(app: Hono, shipmentService: ShipmentService): void {
  app.post('/v1/shipments', async (c) => {
    const auth = getAuth(c)
    const input = shipmentRequestSchema.parse(await c.req.json())
    const result = await shipmentService.bookShipment(auth.merchantId, input)
    return c.json(result, result.idempotent ? 200 : 201)
  })

  app.get('/v1/shipments/:id/tracking', async (c) => {
    const auth = getAuth(c)
    const result = await shipmentService.getTracking(auth.merchantId, c.req.param('id'))
    return c.json(result)
  })
}

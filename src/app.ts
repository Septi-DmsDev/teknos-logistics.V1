import { Hono } from 'hono'
import { ZodError } from 'zod'
import { env } from './config/env.js'
import { prisma } from './db/client.js'
import { ProviderRegistry } from './couriers/registry.js'
import { MockAdapter } from './couriers/mock/mock.adapter.js'
import { JneAdapter } from './couriers/jne/jne.adapter.js'
import { MerchantRepository } from './repositories/merchant.repository.js'
import { RateCacheRepository } from './repositories/rate-cache.repository.js'
import { ShipmentRepository } from './repositories/shipment.repository.js'
import { WebhookRepository } from './repositories/webhook.repository.js'
import { apiKeyAuth } from './middleware/api-key-auth.js'
import { RateService } from './services/rate.service.js'
import { ShipmentService } from './services/shipment.service.js'
import { CourierWebhookService } from './services/courier-webhook.service.js'
import { mountRateRoutes } from './routes/v1/rates.js'
import { mountShipmentRoutes } from './routes/v1/shipments.js'
import { mountJneWebhookRoutes } from './routes/webhooks/jne.js'
import { sanitizeError } from './utils/http-error.js'

export function createApp() {
  const app = new Hono()
  const registry = new ProviderRegistry([new MockAdapter(), new JneAdapter(env)])
  const merchantRepository = new MerchantRepository(prisma)
  const rateCacheRepository = new RateCacheRepository(prisma)
  const shipmentRepository = new ShipmentRepository(prisma)
  const webhookRepository = new WebhookRepository(prisma)
  const rateService = new RateService(registry, rateCacheRepository)
  const shipmentService = new ShipmentService(registry, shipmentRepository, webhookRepository)
  const courierWebhookService = new CourierWebhookService(registry, shipmentRepository, webhookRepository)

  app.onError((error, c) => {
    if (error instanceof ZodError) return c.json({ error: 'Invalid request', code: 'VALIDATION_ERROR', issues: error.issues }, 400)
    const sanitized = sanitizeError(error)
    return new Response(JSON.stringify(sanitized.body), {
      status: sanitized.status,
      headers: { 'Content-Type': 'application/json' },
    })
  })

  app.get('/health', (c) => c.json({ ok: true, service: 'teknos-logistics' }))
  app.use('/v1/*', apiKeyAuth(merchantRepository))
  mountRateRoutes(app, rateService)
  mountShipmentRoutes(app, shipmentService)
  mountJneWebhookRoutes(app, env, courierWebhookService)

  return app
}

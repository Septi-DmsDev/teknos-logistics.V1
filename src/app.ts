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
import { AdminConfigRepository } from './repositories/admin-config.repository.js'
import { apiKeyAuth } from './middleware/api-key-auth.js'
import { adminAuth } from './middleware/admin-auth.js'
import { RateService } from './services/rate.service.js'
import { ShipmentService } from './services/shipment.service.js'
import { CourierWebhookService } from './services/courier-webhook.service.js'
import { AdminConfigService } from './services/admin-config.service.js'
import { AdminApiKeyService } from './services/admin-api-key.service.js'
import { AdminVisibilityService } from './services/admin-visibility.service.js'
import { mountRateRoutes } from './routes/v1/rates.js'
import { mountShipmentRoutes } from './routes/v1/shipments.js'
import { mountJneWebhookRoutes } from './routes/webhooks/jne.js'
import { mountAdminMerchantRoutes } from './routes/admin/merchants.js'
import { mountAdminStoreRoutes } from './routes/admin/stores.js'
import { mountAdminCourierServiceRoutes } from './routes/admin/courier-services.js'
import { mountAdminVisibilityRoutes } from './routes/admin/visibility.js'
import { openApiContract } from './contracts/openapi.js'
import { sanitizeError } from './utils/http-error.js'

export function createApp() {
  const app = new Hono()
  const registry = new ProviderRegistry([new MockAdapter(), new JneAdapter(env)])
  const merchantRepository = new MerchantRepository(prisma)
  const rateCacheRepository = new RateCacheRepository(prisma)
  const shipmentRepository = new ShipmentRepository(prisma)
  const webhookRepository = new WebhookRepository(prisma)
  const adminConfigRepository = new AdminConfigRepository(prisma)
  const rateService = new RateService(registry, rateCacheRepository)
  const shipmentService = new ShipmentService(registry, shipmentRepository, webhookRepository)
  const courierWebhookService = new CourierWebhookService(registry, shipmentRepository, webhookRepository)
  const adminConfigService = new AdminConfigService(adminConfigRepository)
  const adminApiKeyService = new AdminApiKeyService(merchantRepository)
  const adminVisibilityService = new AdminVisibilityService(shipmentRepository, webhookRepository)

  app.onError((error, c) => {
    if (error instanceof ZodError) return c.json({ error: 'Invalid request', code: 'VALIDATION_ERROR', issues: error.issues }, 400)
    const sanitized = sanitizeError(error)
    return new Response(JSON.stringify(sanitized.body), {
      status: sanitized.status,
      headers: { 'Content-Type': 'application/json' },
    })
  })

  app.get('/health', (c) => c.json({ ok: true, service: 'teknos-logistics' }))
  app.get('/openapi.json', (c) => c.json(openApiContract))
  app.use('/admin/*', adminAuth)
  app.use('/v1/*', apiKeyAuth(merchantRepository))
  mountAdminMerchantRoutes(app, merchantRepository, adminApiKeyService, adminVisibilityService)
  mountAdminStoreRoutes(app, adminConfigService)
  mountAdminCourierServiceRoutes(app, adminConfigService)
  mountAdminVisibilityRoutes(app, adminVisibilityService)
  mountRateRoutes(app, rateService)
  mountShipmentRoutes(app, shipmentService)
  mountJneWebhookRoutes(app, env, courierWebhookService)

  return app
}

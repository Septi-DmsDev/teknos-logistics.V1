import type { Hono } from 'hono'
import type { AdminApiKeyService } from '../../services/admin-api-key.service.js'
import type { AdminVisibilityService } from '../../services/admin-visibility.service.js'
import type { MerchantRepository } from '../../repositories/merchant.repository.js'
import {
  adminApiKeyCreateSchema,
  adminApiKeyUpdateSchema,
  adminMerchantCreateSchema,
  adminMerchantListQuerySchema,
  adminMerchantUpdateSchema,
  adminPaginationSchema,
  adminWebhookEndpointCreateSchema,
  adminWebhookEndpointUpdateSchema,
} from '../../schemas/admin.js'
import { parseJson, parseQuery } from './helpers.js'

export function mountAdminMerchantRoutes(
  app: Hono,
  merchants: MerchantRepository,
  apiKeys: AdminApiKeyService,
  visibility: AdminVisibilityService
): void {
  app.get('/admin/merchants', async (c) => {
    const query = parseQuery(c, adminMerchantListQuerySchema)
    const result = await merchants.listAdminMerchants({ limit: query.limit, offset: query.offset, search: query.search, isActive: query.is_active })
    return c.json({ merchants: result })
  })

  app.post('/admin/merchants', async (c) => {
    const input = await parseJson(c, adminMerchantCreateSchema)
    const merchant = await merchants.createAdminMerchant(input)
    return c.json({ merchant }, 201)
  })

  app.patch('/admin/merchants/:merchantId', async (c) => {
    const input = await parseJson(c, adminMerchantUpdateSchema)
    const merchant = await merchants.updateAdminMerchant(c.req.param('merchantId'), input)
    return c.json({ merchant })
  })

  app.get('/admin/merchants/:merchantId/api-keys', async (c) => {
    const query = parseQuery(c, adminPaginationSchema)
    const result = await apiKeys.listApiKeys({ merchantId: c.req.param('merchantId'), limit: query.limit, offset: query.offset })
    return c.json({ apiKeys: result })
  })

  app.post('/admin/merchants/:merchantId/api-keys', async (c) => {
    const input = await parseJson(c, adminApiKeyCreateSchema.omit({ merchant_id: true }))
    const result = await apiKeys.createApiKey({ ...input, merchant_id: c.req.param('merchantId') })
    return c.json(result, 201)
  })

  app.patch('/admin/api-keys/:apiKeyId', async (c) => {
    const input = await parseJson(c, adminApiKeyUpdateSchema)
    const apiKey = await apiKeys.updateApiKey(c.req.param('apiKeyId'), input)
    return c.json({ apiKey })
  })

  app.get('/admin/merchants/:merchantId/webhook-endpoints', async (c) => {
    const query = parseQuery(c, adminPaginationSchema)
    const endpoints = await visibility.listWebhookEndpoints({ merchantId: c.req.param('merchantId'), limit: query.limit, offset: query.offset })
    return c.json({ endpoints })
  })

  app.post('/admin/merchants/:merchantId/webhook-endpoints', async (c) => {
    const input = await parseJson(c, adminWebhookEndpointCreateSchema)
    const endpoint = await visibility.createWebhookEndpoint({ ...input, merchant_id: c.req.param('merchantId') })
    return c.json({ endpoint }, 201)
  })

  app.patch('/admin/webhook-endpoints/:endpointId', async (c) => {
    const input = await parseJson(c, adminWebhookEndpointUpdateSchema)
    const endpoint = await visibility.updateWebhookEndpoint(c.req.param('endpointId'), input)
    return c.json({ endpoint })
  })
}

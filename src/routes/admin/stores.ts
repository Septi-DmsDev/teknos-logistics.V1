import type { Hono } from 'hono'
import { z } from 'zod'
import type { AdminConfigService } from '../../services/admin-config.service.js'
import {
  adminOriginCreateSchema,
  adminOriginUpdateSchema,
  adminPaginationSchema,
  adminStoreCreateSchema,
  adminStoreUpdateSchema,
} from '../../schemas/admin.js'
import { parseJson, parseQuery } from './helpers.js'

export function mountAdminStoreRoutes(app: Hono, configs: AdminConfigService): void {
  app.get('/admin/merchants/:merchantId/stores', async (c) => {
    const query = parseQuery(c, adminPaginationSchema)
    const stores = await configs.listStores({ merchantId: c.req.param('merchantId'), limit: query.limit, offset: query.offset })
    return c.json({ stores })
  })

  app.post('/admin/merchants/:merchantId/stores', async (c) => {
    const input = await parseJson(c, adminStoreCreateSchema)
    const store = await configs.createStore({ ...input, merchant_id: c.req.param('merchantId') })
    return c.json({ store }, 201)
  })

  app.patch('/admin/stores/:storeId', async (c) => {
    const input = await parseJson(c, adminStoreUpdateSchema)
    const store = await configs.updateStore(c.req.param('storeId'), input)
    return c.json({ store })
  })

  app.get('/admin/merchants/:merchantId/origins', async (c) => {
    const query = parseQuery(c, adminPaginationSchema)
    const storeId = z.string().trim().min(1).max(64).optional().parse(new URL(c.req.url).searchParams.get('store_id') ?? undefined)
    const origins = await configs.listOrigins({ merchantId: c.req.param('merchantId'), storeId, limit: query.limit, offset: query.offset })
    return c.json({ origins })
  })

  app.post('/admin/merchants/:merchantId/origins', async (c) => {
    const input = await parseJson(c, adminOriginCreateSchema)
    const origin = await configs.createOrigin({ ...input, merchant_id: c.req.param('merchantId') })
    return c.json({ origin }, 201)
  })

  app.patch('/admin/origins/:originId', async (c) => {
    const input = await parseJson(c, adminOriginUpdateSchema)
    const origin = await configs.updateOrigin(c.req.param('originId'), input)
    return c.json({ origin })
  })
}

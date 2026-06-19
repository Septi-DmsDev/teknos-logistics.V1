import type { Hono } from 'hono'
import { z } from 'zod'
import type { AdminConfigService } from '../../services/admin-config.service.js'
import {
  adminCourierServiceCreateSchema,
  adminCourierServiceUpdateSchema,
  adminMerchantCourierServiceUpsertSchema,
  adminPaginationSchema,
} from '../../schemas/admin.js'
import { courierCodeSchema } from '../../schemas/api.js'
import { parseJson, parseQuery } from './helpers.js'

export function mountAdminCourierServiceRoutes(app: Hono, configs: AdminConfigService): void {
  app.get('/admin/courier-services', async (c) => {
    const query = parseQuery(c, adminPaginationSchema)
    const search = new URL(c.req.url).searchParams
    const courierValue = search.get('courier')
    const statusValue = search.get('status')
    const services = await configs.listCourierServices({
      limit: query.limit,
      offset: query.offset,
      courier: courierValue ? courierCodeSchema.parse(courierValue) : undefined,
      status: z.enum(['ACTIVE', 'INACTIVE']).optional().parse(statusValue ?? undefined),
    })
    return c.json({ services })
  })

  app.post('/admin/courier-services', async (c) => {
    const input = await parseJson(c, adminCourierServiceCreateSchema)
    const service = await configs.upsertCourierService(input)
    return c.json({ service }, 201)
  })

  app.patch('/admin/courier-services/:serviceId', async (c) => {
    const input = await parseJson(c, adminCourierServiceUpdateSchema)
    const service = await configs.updateCourierService(c.req.param('serviceId'), input)
    return c.json({ service })
  })

  app.get('/admin/merchants/:merchantId/courier-services', async (c) => {
    const query = parseQuery(c, adminPaginationSchema)
    const services = await configs.listMerchantCourierServices({ merchantId: c.req.param('merchantId'), limit: query.limit, offset: query.offset })
    return c.json({ services })
  })

  app.put('/admin/merchants/:merchantId/courier-services/:serviceId', async (c) => {
    const input = await parseJson(c, adminMerchantCourierServiceUpsertSchema)
    const service = await configs.upsertMerchantCourierService({
      ...input,
      merchant_id: c.req.param('merchantId'),
      courier_service_id: c.req.param('serviceId'),
    })
    return c.json({ service })
  })
}

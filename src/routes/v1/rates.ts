import type { Hono } from 'hono'
import type { RateService } from '../../services/rate.service.js'
import { rateRequestSchema } from '../../schemas/api.js'

export function mountRateRoutes(app: Hono, rateService: RateService): void {
  app.post('/v1/rates', async (c) => {
    const input = rateRequestSchema.parse(await c.req.json())
    const rates = await rateService.getRates(input)
    return c.json({ rates })
  })
}

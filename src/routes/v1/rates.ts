import type { Hono } from 'hono'
import { getAuth } from '../../middleware/api-key-auth.js'
import type { RateService } from '../../services/rate.service.js'
import type { DestinationResolutionService } from '../../services/destination-resolution.service.js'
import { rateRequestSchema, rateResolveRequestSchema } from '../../schemas/api.js'

export function mountRateRoutes(app: Hono, rateService: RateService, destinationResolution: DestinationResolutionService): void {
  app.post('/v1/rates/resolve', async (c) => {
    const auth = getAuth(c)
    const input = rateResolveRequestSchema.parse(await c.req.json())
    const result = await destinationResolution.resolveRates(auth.merchantId, input)
    return c.json(result)
  })

  app.post('/v1/rates', async (c) => {
    const input = rateRequestSchema.parse(await c.req.json())
    const rates = await rateService.getRates(input)
    return c.json({ rates })
  })
}

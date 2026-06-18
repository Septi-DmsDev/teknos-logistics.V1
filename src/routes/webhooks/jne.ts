import type { Hono } from 'hono'
import type { Env } from '../../config/env.js'
import type { CourierWebhookService } from '../../services/courier-webhook.service.js'
import { HttpError } from '../../utils/http-error.js'

export function mountJneWebhookRoutes(app: Hono, env: Env, service: CourierWebhookService): void {
  app.post('/webhooks/jne', async (c) => {
    const token = c.req.header('x-jne-token') ?? c.req.header('x-webhook-token')
    if (!env.JNE_WEBHOOK_TOKEN || token !== env.JNE_WEBHOOK_TOKEN) {
      throw new HttpError(401, 'Invalid webhook token', 'INVALID_WEBHOOK_TOKEN')
    }

    const payload = await c.req.json()
    const shipment = await service.handleCourierWebhook('JNE', payload)
    return c.json({ ok: true, shipment })
  })
}

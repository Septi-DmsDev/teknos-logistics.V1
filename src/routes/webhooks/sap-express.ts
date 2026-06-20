import { timingSafeEqual } from 'node:crypto'
import type { Hono } from 'hono'
import type { Env } from '../../config/env.js'
import type { CourierWebhookService } from '../../services/courier-webhook.service.js'
import { HttpError } from '../../utils/http-error.js'

export function mountSapExpressWebhookRoutes(app: Hono, env: Env, service: CourierWebhookService): void {
  app.post('/webhooks/sap-express', async (c) => {
    const token = c.req.header('x-sap-token') ?? c.req.header('x-webhook-token') ?? ''
    if (!isValidWebhookToken(token, env.SAP_WEBHOOK_TOKEN)) {
      throw new HttpError(401, 'Invalid webhook token', 'INVALID_WEBHOOK_TOKEN')
    }

    const payload = await readJsonPayload(c.req.raw)
    const result = await service.handleCourierWebhook('SAP_EXPRESS', payload)
    return c.json({ ok: true, duplicate: result.duplicate, shipment: result.shipment })
  })
}

async function readJsonPayload(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    throw new HttpError(400, 'Invalid JSON payload', 'INVALID_JSON_PAYLOAD')
  }
}

function isValidWebhookToken(token: string, expected: string): boolean {
  if (!token || !expected) return false
  const tokenBuffer = Buffer.from(token, 'utf8')
  const expectedBuffer = Buffer.from(expected, 'utf8')
  if (tokenBuffer.length !== expectedBuffer.length) return false
  return timingSafeEqual(tokenBuffer, expectedBuffer)
}
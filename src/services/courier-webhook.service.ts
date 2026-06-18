import { createHash } from 'node:crypto'
import type { CourierCode, NormalizedTrackingEvent } from '../couriers/types.js'
import type { ProviderRegistry } from '../couriers/registry.js'
import type { ShipmentRecord, ShipmentRepository } from '../repositories/shipment.repository.js'
import type { WebhookRepository } from '../repositories/webhook.repository.js'
import { HttpError } from '../utils/http-error.js'

export interface CourierWebhookResult {
  shipment: ShipmentRecord
  duplicate: boolean
}

export class CourierWebhookService {
  constructor(
    private readonly registry: ProviderRegistry,
    private readonly shipments: ShipmentRepository,
    private readonly webhooks: WebhookRepository
  ) {}

  async handleCourierWebhook(courier: CourierCode, rawPayload: unknown): Promise<CourierWebhookResult> {
    const provider = this.registry.get(courier)
    const normalized = provider.normalizeWebhook(rawPayload)
    if (!normalized?.waybillId) {
      await this.webhooks.createCourierEvent({ courier, rawPayload })
      throw new HttpError(400, 'Webhook payload cannot be normalized', 'INVALID_WEBHOOK_PAYLOAD')
    }

    const shipment = await this.shipments.findByWaybill(courier, normalized.waybillId)
    if (!shipment) {
      await this.webhooks.createCourierEvent({ courier, rawPayload, normalized })
      throw new HttpError(404, 'Shipment not found for webhook', 'SHIPMENT_NOT_FOUND')
    }

    const eventKey = createWebhookEventKey(courier, normalized)
    const updated = await this.shipments.applyTrackingEvent(shipment.id, normalized)
    const { event, created } = await this.webhooks.createCourierEventOnce({
      courier,
      eventKey,
      shipmentId: shipment.id,
      rawPayload,
      normalized,
    })

    if (!created) {
      return { shipment: updated, duplicate: true }
    }

    await this.webhooks.queueMerchantRelays(event.id, shipment.merchantId)
    return { shipment: updated, duplicate: false }
  }
}

function createWebhookEventKey(courier: CourierCode, normalized: NormalizedTrackingEvent): string {
  const basis = stableJson({
    courier,
    waybillId: normalized.waybillId,
    status: normalized.status,
    occurredAt: normalized.occurredAt,
    description: normalized.description,
  })
  return createHash('sha256').update(basis, 'utf8').digest('hex')
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}


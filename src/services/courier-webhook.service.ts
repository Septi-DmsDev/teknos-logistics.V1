import type { CourierCode } from '../couriers/types.js'
import type { ProviderRegistry } from '../couriers/registry.js'
import type { ShipmentRepository } from '../repositories/shipment.repository.js'
import type { WebhookRepository } from '../repositories/webhook.repository.js'
import { HttpError } from '../utils/http-error.js'

export class CourierWebhookService {
  constructor(
    private readonly registry: ProviderRegistry,
    private readonly shipments: ShipmentRepository,
    private readonly webhooks: WebhookRepository
  ) {}

  async handleCourierWebhook(courier: CourierCode, rawPayload: unknown) {
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

    const updated = await this.shipments.applyTrackingEvent(shipment.id, normalized)
    const event = await this.webhooks.createCourierEvent({ courier, shipmentId: shipment.id, rawPayload, normalized })
    await this.webhooks.queueMerchantRelays(event.id, shipment.merchantId)
    return updated
  }
}

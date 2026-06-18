import type { ProviderRegistry } from '../couriers/registry.js'
import type { ShipmentRepository } from '../repositories/shipment.repository.js'
import type { WebhookRepository } from '../repositories/webhook.repository.js'
import type { ShipmentRequest } from '../schemas/api.js'
import { HttpError } from '../utils/http-error.js'

export class ShipmentService {
  constructor(
    private readonly registry: ProviderRegistry,
    private readonly shipments: ShipmentRepository,
    private readonly webhooks: WebhookRepository
  ) {}

  async bookShipment(merchantId: string, input: ShipmentRequest) {
    const draft = await this.shipments.createDraft(merchantId, input)
    const provider = this.registry.get(input.courier)
    const booking = await provider.bookShipment({
      externalOrderId: input.external_order_id,
      serviceCode: input.service_code,
      originCode: input.origin_code,
      destCode: input.dest_code,
      weightGrams: input.weight_grams,
      recipientName: input.recipient.name,
      recipientPhone: input.recipient.phone,
      recipientAddress: input.recipient.address,
      goodsValueIdr: input.goods_value_idr,
      isCod: input.is_cod,
    })
    const booked = await this.shipments.markBooked(draft.id, booking)
    const event = await this.webhooks.createCourierEvent({
      courier: input.courier,
      shipmentId: booked.id,
      rawPayload: booking,
      normalized: {
        status: 'BOOKED',
        description: 'Resi dibuat',
        occurredAt: new Date().toISOString(),
        waybillId: booking.waybillId,
        externalOrderId: input.external_order_id,
      },
    })
    await this.webhooks.queueMerchantRelays(event.id, merchantId)
    return booked
  }

  async getTracking(merchantId: string, shipmentId: string) {
    const shipment = await this.shipments.findByMerchantAndId(merchantId, shipmentId)
    if (!shipment) throw new HttpError(404, 'Shipment not found', 'SHIPMENT_NOT_FOUND')
    return shipment
  }
}

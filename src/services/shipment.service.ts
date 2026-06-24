import type { ProviderRegistry } from '../couriers/registry.js'
import type { CancelShipmentResult } from '../couriers/types.js'
import type { ShipmentRecord, ShipmentRepository, ShipmentWithTracking } from '../repositories/shipment.repository.js'
import type { WebhookRepository } from '../repositories/webhook.repository.js'
import type { ShipmentRequest } from '../schemas/api.js'
import { HttpError } from '../utils/http-error.js'

export interface ShipmentDto {
  id: string
  externalOrderId: string
  courier: string
  status: string
  waybillId: string | null
  serviceCode: string
  serviceName: string | null
  originCode: string
  destCode: string
  weightGrams: number
  rateIdr: number | null
  bookedAt: string | null
  deliveredAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ShipmentBookingResponse {
  shipment: ShipmentDto
  idempotent: boolean
}

export interface ShipmentTrackingResponse {
  shipment: ShipmentDto
  tracking: Array<{
    id: string
    status: string
    description: string
    occurredAt: string
    createdAt: string
  }>
}

export class ShipmentService {
  constructor(
    private readonly registry: ProviderRegistry,
    private readonly shipments: ShipmentRepository,
    private readonly webhooks: WebhookRepository
  ) {}

  async bookShipment(merchantId: string, input: ShipmentRequest): Promise<ShipmentBookingResponse> {
    const existing = await this.shipments.findByMerchantAndExternalOrderId(merchantId, input.external_order_id)
    if (existing?.waybillId && existing.status !== 'DRAFT') {
      return { shipment: toShipmentDto(existing), idempotent: true }
    }

    const draft = await this.shipments.upsertDraft(merchantId, input)
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
    return { shipment: toShipmentDto(booked), idempotent: false }
  }

  async getTracking(merchantId: string, shipmentId: string): Promise<ShipmentTrackingResponse> {
    const shipment = await this.shipments.findByMerchantAndId(merchantId, shipmentId)
    if (!shipment) throw new HttpError(404, 'Shipment not found', 'SHIPMENT_NOT_FOUND')
    return toTrackingDto(shipment)
  }

  async cancelShipment(merchantId: string, shipmentId: string, reason?: string): Promise<CancelShipmentResult> {
    const shipment = await this.shipments.findByMerchantAndId(merchantId, shipmentId)
    if (!shipment) throw new HttpError(404, 'Shipment not found', 'SHIPMENT_NOT_FOUND')

    const terminalStatuses: ReadonlyArray<string> = ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED']
    if (terminalStatuses.includes(shipment.status)) {
      throw new HttpError(
        409,
        `Tidak bisa cancel: paket sudah berstatus ${shipment.status}. Hubungi kurir langsung.`,
        'SHIPMENT_ALREADY_IN_TRANSIT'
      )
    }

    const provider = this.registry.get(shipment.courier as import('../couriers/types.js').CourierCode)
    const waybillId = shipment.waybillId ?? ''

    let result: CancelShipmentResult
    if (typeof provider.cancelShipment === 'function') {
      result = await provider.cancelShipment(waybillId, reason)
    } else {
      result = { status: 'MANUAL_REQUIRED', waybillId, message: 'Kurir ini tidak mendukung cancel via API.' }
    }

    if (result.status === 'CANCELLED') {
      await this.shipments.markCancelled(shipmentId)
    }

    return result
  }
}

function toShipmentDto(shipment: ShipmentRecord): ShipmentDto {
  return {
    id: shipment.id,
    externalOrderId: shipment.externalOrderId,
    courier: shipment.courier,
    status: shipment.status,
    waybillId: shipment.waybillId,
    serviceCode: shipment.serviceCode,
    serviceName: shipment.serviceName,
    originCode: shipment.originCode,
    destCode: shipment.destCode,
    weightGrams: shipment.weightGrams,
    rateIdr: shipment.rateIdr,
    bookedAt: shipment.bookedAt?.toISOString() ?? null,
    deliveredAt: shipment.deliveredAt?.toISOString() ?? null,
    createdAt: shipment.createdAt.toISOString(),
    updatedAt: shipment.updatedAt.toISOString(),
  }
}

function toTrackingDto(shipment: ShipmentWithTracking): ShipmentTrackingResponse {
  return {
    shipment: toShipmentDto(shipment),
    tracking: shipment.tracking.map((event) => ({
      id: event.id,
      status: event.status,
      description: event.description,
      occurredAt: event.occurredAt.toISOString(),
      createdAt: event.createdAt.toISOString(),
    })),
  }
}

import type { PrismaClient, ShipmentStatus } from '@prisma/client'
import type { BookShipmentResult, CourierCode, NormalizedTrackingEvent } from '../couriers/types.js'
import type { ShipmentRequest } from '../schemas/api.js'

export interface ShipmentRecord {
  id: string
  merchantId: string
  externalOrderId: string
  status: ShipmentStatus
  waybillId: string | null
}

export class ShipmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createDraft(merchantId: string, input: ShipmentRequest): Promise<ShipmentRecord> {
    return this.prisma.shipment.create({
      data: {
        merchantId,
        externalOrderId: input.external_order_id,
        courier: input.courier,
        serviceCode: input.service_code,
        serviceName: input.service_name,
        originCode: input.origin_code,
        destCode: input.dest_code,
        weightGrams: input.weight_grams,
        rateIdr: input.rate_idr,
        recipientName: input.recipient.name,
        recipientPhone: input.recipient.phone,
        recipientAddress: input.recipient.address,
      },
      select: baseSelect,
    })
  }

  async markBooked(id: string, result: BookShipmentResult): Promise<ShipmentRecord> {
    return this.prisma.shipment.update({
      where: { id },
      data: {
        courierOrderId: result.courierOrderId,
        waybillId: result.waybillId,
        status: 'BOOKED',
        bookedAt: new Date(),
        tracking: {
          create: {
            status: 'BOOKED',
            description: 'Resi dibuat',
            occurredAt: new Date(),
          },
        },
      },
      select: baseSelect,
    })
  }

  async findByMerchantAndId(merchantId: string, id: string) {
    return this.prisma.shipment.findFirst({
      where: { id, merchantId },
      include: { tracking: { orderBy: { occurredAt: 'asc' } } },
    })
  }

  async findByWaybill(courier: CourierCode, waybillId: string): Promise<ShipmentRecord | null> {
    return this.prisma.shipment.findFirst({ where: { courier, waybillId }, select: baseSelect })
  }

  async applyTrackingEvent(shipmentId: string, event: NormalizedTrackingEvent): Promise<ShipmentRecord> {
    const occurredAt = new Date(event.occurredAt)
    return this.prisma.shipment.update({
      where: { id: shipmentId },
      data: {
        status: event.status,
        deliveredAt: event.status === 'DELIVERED' ? occurredAt : undefined,
        tracking: {
          upsert: {
            where: {
              shipmentId_status_occurredAt_description: {
                shipmentId,
                status: event.status,
                occurredAt,
                description: event.description,
              },
            },
            update: {},
            create: {
              status: event.status,
              description: event.description,
              occurredAt,
            },
          },
        },
      },
      select: baseSelect,
    })
  }
}

const baseSelect = {
  id: true,
  merchantId: true,
  externalOrderId: true,
  status: true,
  waybillId: true,
} as const

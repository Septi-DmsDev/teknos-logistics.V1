import type { Prisma, PrismaClient, ShipmentStatus } from '@prisma/client'
import type { BookShipmentResult, CourierCode, NormalizedTrackingEvent } from '../couriers/types.js'
import type { ShipmentRequest } from '../schemas/api.js'

export interface ShipmentRecord {
  id: string
  merchantId: string
  externalOrderId: string
  courier: CourierCode
  status: ShipmentStatus
  waybillId: string | null
  serviceCode: string
  serviceName: string | null
  originCode: string
  destCode: string
  weightGrams: number
  rateIdr: number | null
  bookedAt: Date | null
  deliveredAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type ShipmentWithTracking = Prisma.ShipmentGetPayload<{
  select: typeof shipmentWithTrackingSelect
}>

export class ShipmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByMerchantAndExternalOrderId(merchantId: string, externalOrderId: string): Promise<ShipmentRecord | null> {
    return this.prisma.shipment.findUnique({
      where: { merchantId_externalOrderId: { merchantId, externalOrderId } },
      select: baseSelect,
    })
  }

  async upsertDraft(merchantId: string, input: ShipmentRequest): Promise<ShipmentRecord> {
    const data = mapShipmentInput(merchantId, input)
    return this.prisma.shipment.upsert({
      where: { merchantId_externalOrderId: { merchantId, externalOrderId: input.external_order_id } },
      update: data,
      create: data,
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

  async findByMerchantAndId(merchantId: string, id: string): Promise<ShipmentWithTracking | null> {
    return this.prisma.shipment.findFirst({
      where: { id, merchantId },
      select: shipmentWithTrackingSelect,
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

function mapShipmentInput(merchantId: string, input: ShipmentRequest) {
  return {
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
  }
}

const baseSelect = {
  id: true,
  merchantId: true,
  externalOrderId: true,
  courier: true,
  status: true,
  waybillId: true,
  serviceCode: true,
  serviceName: true,
  originCode: true,
  destCode: true,
  weightGrams: true,
  rateIdr: true,
  bookedAt: true,
  deliveredAt: true,
  createdAt: true,
  updatedAt: true,
} as const

const shipmentWithTrackingSelect = {
  ...baseSelect,
  tracking: {
    select: {
      id: true,
      status: true,
      description: true,
      occurredAt: true,
      createdAt: true,
    },
    orderBy: { occurredAt: 'asc' as const },
  },
} as const

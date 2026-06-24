import type { Prisma, PrismaClient, ShipmentStatus } from '@prisma/client'
import type { BookShipmentResult, CourierCode, NormalizedTrackingEvent } from '../couriers/types.js'
import type { ShipmentRequest } from '../schemas/api.js'
import type { AdminShipmentListQuery } from '../schemas/admin.js'

type AdminShipmentListParams = Partial<AdminShipmentListQuery>

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

export type AdminShipmentRecord = Prisma.ShipmentGetPayload<{
  select: typeof adminShipmentSelect
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

  async listAdminShipments(params: AdminShipmentListParams = {}): Promise<AdminShipmentRecord[]> {
    const limit = params.limit ?? 50
    const offset = params.offset ?? 0
    return this.prisma.shipment.findMany({
      where: {
        merchantId: params.merchant_id,
        status: params.status,
        courier: params.courier,
        externalOrderId: params.external_order_id,
        waybillId: params.waybill_id,
      },
      select: adminShipmentSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: limit,
      skip: offset,
    })
  }

  async markCancelled(id: string): Promise<ShipmentRecord> {
    return this.prisma.shipment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        tracking: {
          create: {
            status: 'CANCELLED',
            description: 'Pengiriman dibatalkan oleh merchant',
            occurredAt: new Date(),
          },
        },
      },
      select: baseSelect,
    })
  }

  async applyTrackingEvent(shipmentId: string, event: NormalizedTrackingEvent): Promise<ShipmentRecord> {
    const occurredAt = new Date(event.occurredAt)
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.shipment.findUniqueOrThrow({ where: { id: shipmentId }, select: baseSelect })
      const nextStatus = shouldAdvanceStatus(current.status, event.status) ? event.status : current.status
      return tx.shipment.update({
        where: { id: shipmentId },
        data: {
          status: nextStatus,
          deliveredAt: event.status === 'DELIVERED' ? occurredAt : current.deliveredAt,
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

const statusRank: Record<ShipmentStatus, number> = {
  DRAFT: 0,
  BOOKED: 1,
  PICKED_UP: 2,
  IN_TRANSIT: 3,
  OUT_FOR_DELIVERY: 4,
  DELIVERED: 5,
  RETURNED: 5,
  FAILED: 5,
  CANCELLED: 5,
}

function shouldAdvanceStatus(current: ShipmentStatus, next: ShipmentStatus): boolean {
  return statusRank[next] >= statusRank[current]
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

const adminShipmentSelect = {
  ...baseSelect,
  courierOrderId: true,
  merchant: { select: { id: true, slug: true, name: true, isActive: true } },
  _count: { select: { tracking: true, events: true } },
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

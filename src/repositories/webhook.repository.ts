import { Prisma } from '@prisma/client'
import type { PrismaClient, WebhookRelayStatus } from '@prisma/client'
import type { CourierCode, NormalizedTrackingEvent } from '../couriers/types.js'
import type {
  AdminWebhookEndpointCreateInput,
  AdminWebhookEndpointUpdateInput,
  AdminWebhookRelayListQuery,
} from '../schemas/admin.js'

type AdminWebhookRelayListParams = Partial<AdminWebhookRelayListQuery>

export type RelayAttemptWithPayload = Awaited<ReturnType<WebhookRepository['findDueRelayAttempts']>>[number]
export type AdminWebhookEndpointRecord = Prisma.MerchantWebhookEndpointGetPayload<{
  select: typeof adminWebhookEndpointSelect
}>
export type AdminWebhookRelayAttemptRecord = Prisma.WebhookRelayAttemptGetPayload<{
  select: typeof adminWebhookRelayAttemptSelect
}>

export interface PaginationParams {
  limit?: number
  offset?: number
}

export interface AdminWebhookEndpointListParams extends PaginationParams {
  merchantId?: string
  isActive?: boolean
}

export class WebhookRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createCourierEvent(input: {
    courier: CourierCode
    shipmentId?: string
    rawPayload: unknown
    normalized?: NormalizedTrackingEvent
  }) {
    return this.prisma.webhookEvent.create({
      data: {
        courier: input.courier,
        shipmentId: input.shipmentId,
        eventType: 'shipment.status_updated',
        rawPayload: toJsonObject(input.rawPayload),
        normalized: input.normalized ? toJsonObject(input.normalized) : undefined,
        processedAt: input.normalized ? new Date() : undefined,
      },
    })
  }

  async createCourierEventOnce(input: {
    courier: CourierCode
    eventKey: string
    shipmentId?: string
    rawPayload: unknown
    normalized: NormalizedTrackingEvent
  }): Promise<{ event: Awaited<ReturnType<PrismaClient['webhookEvent']['create']>>, created: boolean }> {
    try {
      const event = await this.prisma.webhookEvent.create({
        data: {
          eventKey: input.eventKey,
          courier: input.courier,
          shipmentId: input.shipmentId,
          eventType: 'shipment.status_updated',
          rawPayload: toJsonObject(input.rawPayload),
          normalized: toJsonObject(input.normalized),
          processedAt: new Date(),
        },
      })
      return { event, created: true }
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const event = await this.prisma.webhookEvent.findUniqueOrThrow({ where: { eventKey: input.eventKey } })
        return { event, created: false }
      }
      throw error
    }
  }

  async queueMerchantRelays(eventId: string, merchantId: string) {
    const endpoints = await this.prisma.merchantWebhookEndpoint.findMany({
      where: { merchantId, isActive: true },
      select: { id: true },
    })

    if (endpoints.length === 0) return []
    await this.prisma.webhookRelayAttempt.createMany({
      data: endpoints.map((endpoint) => ({
        eventId,
        endpointId: endpoint.id,
        status: 'PENDING',
        attemptCount: 0,
        nextRetryAt: new Date(),
      })),
      skipDuplicates: true,
    })
    return endpoints
  }

  async findDueRelayAttempts(limit: number, now = new Date()) {
    return this.prisma.webhookRelayAttempt.findMany({
      where: {
        status: 'PENDING',
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
      },
      orderBy: [{ nextRetryAt: 'asc' }, { createdAt: 'asc' }],
      take: limit,
      include: {
        endpoint: {
          select: { id: true, url: true, secret: true, merchantId: true, isActive: true },
        },
        event: {
          select: {
            id: true,
            eventType: true,
            courier: true,
            shipmentId: true,
            normalized: true,
            receivedAt: true,
            shipment: {
              select: {
                id: true,
                merchantId: true,
                externalOrderId: true,
                courier: true,
                waybillId: true,
                status: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    })
  }

  async markRelaySuccess(id: string, httpStatus: number) {
    return this.updateRelayAttempt(id, 'SUCCESS', httpStatus, null, null)
  }

  async markRelayFailure(input: { id: string; httpStatus?: number; message: string; nextRetryAt: Date | null; final: boolean }) {
    return this.updateRelayAttempt(input.id, input.final ? 'FAILED' : 'PENDING', input.httpStatus, input.message, input.nextRetryAt)
  }

  async listAdminWebhookEndpoints(params: AdminWebhookEndpointListParams = {}): Promise<AdminWebhookEndpointRecord[]> {
    const { limit, offset } = normalizePagination(params)
    return this.prisma.merchantWebhookEndpoint.findMany({
      where: {
        merchantId: params.merchantId,
        isActive: params.isActive,
      },
      select: adminWebhookEndpointSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: limit,
      skip: offset,
    })
  }

  async createAdminWebhookEndpoint(input: AdminWebhookEndpointCreateInput): Promise<AdminWebhookEndpointRecord> {
    return this.prisma.merchantWebhookEndpoint.create({
      data: {
        merchantId: input.merchant_id,
        url: input.url,
        secret: input.secret,
        isActive: input.is_active,
      },
      select: adminWebhookEndpointSelect,
    })
  }

  async updateAdminWebhookEndpoint(id: string, input: AdminWebhookEndpointUpdateInput): Promise<AdminWebhookEndpointRecord> {
    return this.prisma.merchantWebhookEndpoint.update({
      where: { id },
      data: {
        url: input.url,
        secret: input.secret,
        isActive: input.is_active,
      },
      select: adminWebhookEndpointSelect,
    })
  }

  async listAdminWebhookRelays(params: AdminWebhookRelayListParams = {}): Promise<AdminWebhookRelayAttemptRecord[]> {
    const { limit, offset } = normalizePagination(params)
    return this.prisma.webhookRelayAttempt.findMany({
      where: {
        eventId: params.event_id,
        endpointId: params.endpoint_id,
        status: params.status,
        endpoint: params.merchant_id ? { merchantId: params.merchant_id } : undefined,
      },
      select: adminWebhookRelayAttemptSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: limit,
      skip: offset,
    })
  }

  private async updateRelayAttempt(id: string, status: WebhookRelayStatus, httpStatus: number | undefined, lastError: string | null, nextRetryAt: Date | null) {
    return this.prisma.webhookRelayAttempt.update({
      where: { id },
      data: {
        status,
        httpStatus,
        lastError,
        nextRetryAt,
        attemptCount: { increment: 1 },
      },
    })
  }
}

function normalizePagination(params: PaginationParams): Required<PaginationParams> {
  return {
    limit: params.limit ?? 50,
    offset: params.offset ?? 0,
  }
}

function toJsonObject(value: unknown): object {
  if (value && typeof value === 'object') return value
  return { value }
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

const adminWebhookEndpointSelect = {
  id: true,
  merchantId: true,
  url: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  merchant: { select: { id: true, slug: true, name: true, isActive: true } },
  _count: { select: { attempts: true } },
} as const

const adminWebhookRelayAttemptSelect = {
  id: true,
  eventId: true,
  endpointId: true,
  status: true,
  httpStatus: true,
  attemptCount: true,
  nextRetryAt: true,
  lastError: true,
  createdAt: true,
  updatedAt: true,
  endpoint: {
    select: {
      id: true,
      merchantId: true,
      url: true,
      isActive: true,
      merchant: { select: { id: true, slug: true, name: true, isActive: true } },
    },
  },
  event: {
    select: {
      id: true,
      eventKey: true,
      shipmentId: true,
      courier: true,
      eventType: true,
      receivedAt: true,
      processedAt: true,
      shipment: {
        select: {
          id: true,
          merchantId: true,
          externalOrderId: true,
          courier: true,
          waybillId: true,
          status: true,
          updatedAt: true,
        },
      },
    },
  },
} as const

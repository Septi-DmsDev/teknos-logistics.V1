import { Prisma } from '@prisma/client'
import type { PrismaClient, WebhookRelayStatus } from '@prisma/client'
import type { CourierCode, NormalizedTrackingEvent } from '../couriers/types.js'

export type RelayAttemptWithPayload = Awaited<ReturnType<WebhookRepository['findDueRelayAttempts']>>[number]

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

function toJsonObject(value: unknown): object {
  if (value && typeof value === 'object') return value
  return { value }
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

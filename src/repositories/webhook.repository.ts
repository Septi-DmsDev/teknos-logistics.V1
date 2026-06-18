import type { PrismaClient } from '@prisma/client'
import type { CourierCode, NormalizedTrackingEvent } from '../couriers/types.js'

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
}

function toJsonObject(value: unknown): object {
  if (value && typeof value === 'object') return value
  return { value }
}

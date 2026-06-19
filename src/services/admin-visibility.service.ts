import type { AdminShipmentRecord, ShipmentRepository } from '../repositories/shipment.repository.js'
import type {
  AdminWebhookEndpointRecord,
  AdminWebhookEndpointListParams,
  AdminWebhookRelayAttemptRecord,
  WebhookRepository,
} from '../repositories/webhook.repository.js'
import type {
  AdminShipmentListQuery,
  AdminWebhookEndpointCreateInput,
  AdminWebhookEndpointUpdateInput,
  AdminWebhookRelayListQuery,
} from '../schemas/admin.js'

interface MerchantSummaryDto {
  id: string
  slug: string
  name: string
  isActive: boolean
}

export interface AdminShipmentDto {
  id: string
  merchantId: string
  externalOrderId: string
  courier: string
  status: string
  waybillId: string | null
  courierOrderId: string | null
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
  merchant: MerchantSummaryDto
  counts: {
    tracking: number
    events: number
  }
}

export interface AdminWebhookEndpointDto {
  id: string
  merchantId: string
  url: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  merchant: MerchantSummaryDto
  counts: {
    attempts: number
  }
}

export interface AdminWebhookRelayDto {
  id: string
  eventId: string
  endpointId: string
  status: string
  httpStatus: number | null
  attemptCount: number
  nextRetryAt: string | null
  lastError: string | null
  createdAt: string
  updatedAt: string
  endpoint: {
    id: string
    merchantId: string
    url: string
    isActive: boolean
    merchant: MerchantSummaryDto
  }
  event: {
    id: string
    eventKey: string | null
    shipmentId: string | null
    courier: string
    eventType: string
    receivedAt: string
    processedAt: string | null
    shipment: {
      id: string
      merchantId: string
      externalOrderId: string
      courier: string
      waybillId: string | null
      status: string
      updatedAt: string
    } | null
  }
}

export class AdminVisibilityService {
  constructor(
    private readonly shipments: ShipmentRepository,
    private readonly webhooks: WebhookRepository
  ) {}

  async listShipments(params: Partial<AdminShipmentListQuery> = {}): Promise<AdminShipmentDto[]> {
    const shipments = await this.shipments.listAdminShipments(params)
    return shipments.map(toShipmentDto)
  }

  async listWebhookEndpoints(params: AdminWebhookEndpointListParams = {}): Promise<AdminWebhookEndpointDto[]> {
    const endpoints = await this.webhooks.listAdminWebhookEndpoints(params)
    return endpoints.map(toWebhookEndpointDto)
  }

  async createWebhookEndpoint(input: AdminWebhookEndpointCreateInput): Promise<AdminWebhookEndpointDto> {
    return toWebhookEndpointDto(await this.webhooks.createAdminWebhookEndpoint(input))
  }

  async updateWebhookEndpoint(id: string, input: AdminWebhookEndpointUpdateInput): Promise<AdminWebhookEndpointDto> {
    return toWebhookEndpointDto(await this.webhooks.updateAdminWebhookEndpoint(id, input))
  }

  async listWebhookRelays(params: Partial<AdminWebhookRelayListQuery> = {}): Promise<AdminWebhookRelayDto[]> {
    const relays = await this.webhooks.listAdminWebhookRelays(params)
    return relays.map(toWebhookRelayDto)
  }
}

function toShipmentDto(shipment: AdminShipmentRecord): AdminShipmentDto {
  return {
    id: shipment.id,
    merchantId: shipment.merchantId,
    externalOrderId: shipment.externalOrderId,
    courier: shipment.courier,
    status: shipment.status,
    waybillId: shipment.waybillId,
    courierOrderId: shipment.courierOrderId,
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
    merchant: toMerchantSummaryDto(shipment.merchant),
    counts: {
      tracking: shipment._count.tracking,
      events: shipment._count.events,
    },
  }
}

function toWebhookEndpointDto(endpoint: AdminWebhookEndpointRecord): AdminWebhookEndpointDto {
  return {
    id: endpoint.id,
    merchantId: endpoint.merchantId,
    url: endpoint.url,
    isActive: endpoint.isActive,
    createdAt: endpoint.createdAt.toISOString(),
    updatedAt: endpoint.updatedAt.toISOString(),
    merchant: toMerchantSummaryDto(endpoint.merchant),
    counts: { attempts: endpoint._count.attempts },
  }
}

function toWebhookRelayDto(relay: AdminWebhookRelayAttemptRecord): AdminWebhookRelayDto {
  return {
    id: relay.id,
    eventId: relay.eventId,
    endpointId: relay.endpointId,
    status: relay.status,
    httpStatus: relay.httpStatus,
    attemptCount: relay.attemptCount,
    nextRetryAt: relay.nextRetryAt?.toISOString() ?? null,
    lastError: relay.lastError,
    createdAt: relay.createdAt.toISOString(),
    updatedAt: relay.updatedAt.toISOString(),
    endpoint: {
      id: relay.endpoint.id,
      merchantId: relay.endpoint.merchantId,
      url: relay.endpoint.url,
      isActive: relay.endpoint.isActive,
      merchant: toMerchantSummaryDto(relay.endpoint.merchant),
    },
    event: {
      id: relay.event.id,
      eventKey: relay.event.eventKey,
      shipmentId: relay.event.shipmentId,
      courier: relay.event.courier,
      eventType: relay.event.eventType,
      receivedAt: relay.event.receivedAt.toISOString(),
      processedAt: relay.event.processedAt?.toISOString() ?? null,
      shipment: relay.event.shipment
        ? {
            id: relay.event.shipment.id,
            merchantId: relay.event.shipment.merchantId,
            externalOrderId: relay.event.shipment.externalOrderId,
            courier: relay.event.shipment.courier,
            waybillId: relay.event.shipment.waybillId,
            status: relay.event.shipment.status,
            updatedAt: relay.event.shipment.updatedAt.toISOString(),
          }
        : null,
    },
  }
}

function toMerchantSummaryDto(merchant: MerchantSummaryDto): MerchantSummaryDto {
  return {
    id: merchant.id,
    slug: merchant.slug,
    name: merchant.name,
    isActive: merchant.isActive,
  }
}

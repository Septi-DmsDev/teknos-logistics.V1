import { courierCapabilities } from '../capabilities.js'
import type { BookShipmentParams, BookShipmentResult, CourierRate, LogisticsProvider, NormalizedTrackingEvent, RateParams } from '../types.js'

export class MockAdapter implements LogisticsProvider {
  readonly courier = 'MOCK' as const
  readonly capabilities = courierCapabilities.MOCK

  async getRates(_params: RateParams): Promise<CourierRate[]> {
    return [
      { courier: 'MOCK', serviceCode: 'REG', serviceName: 'Mock Regular', priceIdr: 12000, etd: '2-3 hari', cached: false },
      { courier: 'MOCK', serviceCode: 'YES', serviceName: 'Mock Express', priceIdr: 22000, etd: '1 hari', cached: false },
    ]
  }

  async bookShipment(params: BookShipmentParams): Promise<BookShipmentResult> {
    const suffix = params.externalOrderId.replace(/[^A-Za-z0-9]/g, '').slice(-8).padStart(8, '0')
    return { courier: 'MOCK', courierOrderId: `MOCK-${suffix}`, waybillId: `MOCKAWB${suffix}`, status: 'BOOKED' }
  }

  async trackShipment(waybillId: string): Promise<NormalizedTrackingEvent[]> {
    return [
      { waybillId, status: 'BOOKED', description: 'Resi dibuat', occurredAt: new Date().toISOString() },
      { waybillId, status: 'IN_TRANSIT', description: 'Paket dalam perjalanan', occurredAt: new Date().toISOString() },
    ]
  }

  normalizeWebhook(rawPayload: unknown): NormalizedTrackingEvent | null {
    if (!rawPayload || typeof rawPayload !== 'object') return null
    const payload = rawPayload as Record<string, unknown>
    const waybillId = typeof payload.waybill_id === 'string' ? payload.waybill_id : undefined
    if (!waybillId) return null
    return {
      waybillId,
      status: 'IN_TRANSIT',
      description: 'Mock webhook update',
      occurredAt: new Date().toISOString(),
    }
  }
}

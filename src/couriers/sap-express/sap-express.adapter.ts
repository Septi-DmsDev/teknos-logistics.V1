import { HttpError } from '../../utils/http-error.js'
import { courierCapabilities } from '../capabilities.js'
import type { BookShipmentParams, BookShipmentResult, CourierRate, LogisticsProvider, NormalizedTrackingEvent, RateParams } from '../types.js'
import { mapSapExpressStatus } from './sap-express.normalizer.js'

export class SapExpressAdapter implements LogisticsProvider {
  readonly courier = 'SAP_EXPRESS' as const
  readonly capabilities = courierCapabilities.SAP_EXPRESS

  async getRates(_params: RateParams): Promise<CourierRate[]> {
    throw notImplemented('rates')
  }

  async bookShipment(_params: BookShipmentParams): Promise<BookShipmentResult> {
    throw notImplemented('booking')
  }

  async trackShipment(_waybillId: string): Promise<NormalizedTrackingEvent[]> {
    throw notImplemented('tracking')
  }

  normalizeWebhook(rawPayload: unknown): NormalizedTrackingEvent | null {
    if (!rawPayload || typeof rawPayload !== 'object') return null
    const payload = rawPayload as Record<string, unknown>
    const waybillId = firstString(payload, ['waybill_id', 'awb', 'awb_no', 'resi', 'connote'])
    const status = firstString(payload, ['status', 'status_code', 'shipment_status', 'description'])
    if (!waybillId || !status) return null
    return {
      waybillId,
      status: mapSapExpressStatus(status),
      description: firstString(payload, ['description', 'status_desc', 'remark']) ?? status,
      occurredAt: firstString(payload, ['occurred_at', 'event_time', 'updated_at']) ?? new Date().toISOString(),
    }
  }
}

function notImplemented(operation: string): HttpError {
  return new HttpError(501, `SAP Express ${operation} integration is not implemented yet`, 'COURIER_NOT_IMPLEMENTED')
}

function firstString(payload: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = payload[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return undefined
}

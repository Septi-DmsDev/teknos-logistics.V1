import { HttpError } from '../../utils/http-error.js'
import { courierCapabilities } from '../capabilities.js'
import type { BookShipmentParams, BookShipmentResult, CourierRate, LogisticsProvider, NormalizedTrackingEvent, RateParams } from '../types.js'
import { mapJntStatus } from './jnt.normalizer.js'

export class JntAdapter implements LogisticsProvider {
  readonly courier = 'JNT' as const
  readonly capabilities = courierCapabilities.JNT

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
    const waybillId = firstString(payload, ['waybill_id', 'awb', 'awb_no', 'cnote_no', 'billcode'])
    const status = firstString(payload, ['status', 'status_code', 'pod_status', 'scan_type'])
    if (!waybillId || !status) return null
    return {
      waybillId,
      status: mapJntStatus(status),
      description: firstString(payload, ['description', 'status_desc', 'remark', 'scan_desc']) ?? status,
      occurredAt: firstString(payload, ['occurred_at', 'scan_time', 'updated_at']) ?? new Date().toISOString(),
    }
  }
}

function notImplemented(operation: string): HttpError {
  return new HttpError(501, `JNT ${operation} integration is not implemented yet`, 'COURIER_NOT_IMPLEMENTED')
}

function firstString(payload: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = payload[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return undefined
}

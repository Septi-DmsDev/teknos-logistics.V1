import type { Env } from '../../config/env.js'
import type { BookShipmentParams, BookShipmentResult, CourierRate, LogisticsProvider, NormalizedTrackingEvent, RateParams } from '../types.js'
import { JneClient } from './jne.client.js'
import { mapJneStatus } from './jne.normalizer.js'

export class JneAdapter implements LogisticsProvider {
  readonly courier = 'JNE' as const
  private readonly client: JneClient

  constructor(env: Env, fetcher?: typeof fetch) {
    this.client = new JneClient(env, fetcher)
  }

  async getRates(params: RateParams): Promise<CourierRate[]> {
    const raw = await this.client.tariff({ from: params.originCode, thru: params.destCode, weightGrams: params.weightGrams })
    const prices = extractArray(raw, ['price', 'prices', 'data'])
    return prices.map((item) => ({
      courier: 'JNE' as const,
      serviceCode: readString(item, ['service_code', 'service', 'code']) || 'REG',
      serviceName: readString(item, ['service_display', 'service_name', 'name']) || 'JNE Service',
      priceIdr: readNumber(item, ['price', 'tariff', 'amount']) || 0,
      etd: readString(item, ['etd', 'estimate', 'duration']) || '',
      cached: false,
    })).filter((rate) => rate.priceIdr > 0)
  }

  async bookShipment(params: BookShipmentParams): Promise<BookShipmentResult> {
    const raw = await this.client.generateCnote({
      orderNumber: params.externalOrderId,
      serviceCode: params.serviceCode,
      destinationCode: params.destCode,
      recipientName: params.recipientName,
      recipientAddress: params.recipientAddress,
      recipientPhone: params.recipientPhone,
      weightGrams: params.weightGrams,
      goodsValueIdr: params.goodsValueIdr ?? 0,
      isCod: params.isCod ?? false,
    })
    const detail = extractArray(raw, ['detail', 'data'])
    const first = detail[0] ?? (typeof raw === 'object' && raw ? raw as Record<string, unknown> : {})
    const waybillId = readString(first, ['cnote_no', 'waybill_id', 'awb'])
    if (!waybillId) throw new Error('JNE generatecnote did not return a waybill')
    return { courier: 'JNE', courierOrderId: waybillId, waybillId, status: 'BOOKED' }
  }

  async trackShipment(waybillId: string): Promise<NormalizedTrackingEvent[]> {
    const raw = await this.client.track(waybillId)
    const history = extractArray(raw, ['history', 'data'])
    return history.map((item) => ({
      waybillId,
      status: mapJneStatus(readString(item, ['code', 'status', 'pod_status'])),
      description: readString(item, ['desc', 'description', 'note']) || 'JNE tracking update',
      occurredAt: readString(item, ['date', 'created_at', 'updated_at']) || new Date().toISOString(),
    }))
  }

  normalizeWebhook(rawPayload: unknown): NormalizedTrackingEvent | null {
    if (!rawPayload || typeof rawPayload !== 'object') return null
    const payload = rawPayload as Record<string, unknown>
    const waybillId = readString(payload, ['cnote_no', 'waybill_id', 'awb', 'tracking_number'])
    if (!waybillId) return null
    return {
      waybillId,
      externalOrderId: readString(payload, ['order_id', 'external_order_id']),
      status: mapJneStatus(readString(payload, ['status', 'pod_status', 'code'])),
      description: readString(payload, ['description', 'desc', 'note']) || 'JNE webhook update',
      occurredAt: readString(payload, ['date', 'updated_at', 'created_at']) || new Date().toISOString(),
    }
  }
}

function extractArray(raw: unknown, keys: string[]): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw.filter(isRecord)
  if (!isRecord(raw)) return []
  for (const key of keys) {
    const value = raw[key]
    if (Array.isArray(value)) return value.filter(isRecord)
  }
  return []
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function readString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return undefined
}

function readNumber(record: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number') return value
    if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value)
  }
  return undefined
}

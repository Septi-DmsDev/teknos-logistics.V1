import type { Env } from '../../config/env.js'
import { courierCapabilities } from '../capabilities.js'
import type { BookShipmentParams, BookShipmentResult, CourierRate, LogisticsProvider, NormalizedTrackingEvent, RateParams } from '../types.js'
import { HttpError } from '../../utils/http-error.js'
import { JneClient } from './jne.client.js'
import { mapJneStatus } from './jne.normalizer.js'
import type { JneGenerateCnoteDetail, JneGenerateCnoteResponse, JneTariffItem, JneTrackHistoryItem, JneTrackResponse } from './jne.types.js'

export class JneAdapter implements LogisticsProvider {
  readonly courier = 'JNE' as const
  readonly capabilities = courierCapabilities.JNE
  private readonly client: JneClient

  constructor(private readonly env: Env, fetcher?: typeof fetch) {
    this.client = new JneClient(env, fetcher)
  }

  async getRates(params: RateParams): Promise<CourierRate[]> {
    const raw = await this.client.tariff({ from: params.originCode, thru: params.destCode, weightGrams: params.weightGrams })
    const prices = extractTariffItems(raw)

    const eligibleCodServices = new Set(
      this.env.JNE_COD_ELIGIBLE_SERVICES.split(',').map((s) => s.trim().toUpperCase())
    )

    return prices.map((item) => {
      const serviceCode = item.service_code ?? item.service ?? item.code ?? 'REG'
      // service_display is the short name (e.g. "REG", "JTR") while service_code may have suffix (e.g. "REG23")
      const serviceDisplay = item.service_display ?? item.service_name ?? serviceCode
      const availableForCod = params.isCod
        ? eligibleCodServices.has(serviceCode.toUpperCase()) || eligibleCodServices.has(serviceDisplay.toUpperCase())
        : undefined
      const codFee = (params.isCod && availableForCod === true && params.goodsValueIdr != null)
        ? Math.max(this.env.JNE_COD_MIN_FEE_IDR, Math.ceil(params.goodsValueIdr * this.env.JNE_COD_FEE_PERCENT / 100))
        : undefined

      const etdUnit = item.times === 'H' ? 'jam' : 'hari'
      const etd = item.etd ?? item.estimate ?? item.duration
        ?? (item.etd_from ? `${item.etd_from}-${item.etd_thru} ${etdUnit}` : '')

      return {
        courier: 'JNE' as const,
        serviceCode,
        serviceName: serviceDisplay,
        priceIdr: toNumber(item.price ?? item.tariff ?? item.amount),
        etd,
        cached: false,
        availableForCod,
        codFee,
      }
    }).filter((rate) => rate.priceIdr > 0)
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
    const detail = extractGenerateDetail(raw)
    const first = detail[0] ?? {}
    const waybillId = first.cnote_no ?? first.waybill_id ?? first.awb
    if (!waybillId) {
      throw new HttpError(502, 'JNE generatecnote did not return a waybill', 'JNE_BOOKING_INVALID_RESPONSE')
    }
    return { courier: 'JNE', courierOrderId: waybillId, waybillId, status: 'BOOKED' }
  }

  async trackShipment(waybillId: string): Promise<NormalizedTrackingEvent[]> {
    const raw = await this.client.track(waybillId)
    if (typeof raw.error === 'string' && raw.error.trim()) {
      throw new HttpError(404, `JNE tracking unavailable for waybill ${waybillId.slice(0, 6)}***`, 'JNE_TRACK_NOT_FOUND')
    }
    const history = extractTrackHistory(raw)
    return history.map((item) => ({
      waybillId,
      status: mapJneStatus(item.code ?? item.status ?? item.pod_status),
      description: item.desc ?? item.description ?? item.note ?? 'JNE tracking update',
      occurredAt: item.date ?? item.created_at ?? item.updated_at ?? new Date().toISOString(),
    }))
  }

  normalizeWebhook(rawPayload: unknown): NormalizedTrackingEvent | null {
    if (!isRecord(rawPayload)) return null
    const waybillId = readString(rawPayload, ['cnote_no', 'waybill_id', 'awb', 'tracking_number'])
    if (!waybillId) return null
    return {
      waybillId,
      externalOrderId: readString(rawPayload, ['order_id', 'external_order_id']),
      status: mapJneStatus(readString(rawPayload, ['status', 'pod_status', 'code'])),
      description: readString(rawPayload, ['description', 'desc', 'note']) ?? 'JNE webhook update',
      occurredAt: readString(rawPayload, ['date', 'updated_at', 'created_at']) ?? new Date().toISOString(),
    }
  }
}

function extractTariffItems(raw: JneTariffItem[] | Record<string, unknown>): JneTariffItem[] {
  if (Array.isArray(raw)) return raw
  if (Array.isArray(raw.price)) return raw.price
  if (Array.isArray(raw.prices)) return raw.prices
  if (Array.isArray(raw.data)) return raw.data as JneTariffItem[]
  return []
}

function extractGenerateDetail(raw: JneGenerateCnoteResponse): JneGenerateCnoteDetail[] {
  if (Array.isArray(raw.detail)) return raw.detail
  if (Array.isArray(raw.data)) return raw.data
  return []
}

function extractTrackHistory(raw: JneTrackResponse): JneTrackHistoryItem[] {
  if (Array.isArray(raw.history)) return raw.history
  if (Array.isArray(raw.data)) return raw.data
  return []
}

function toNumber(value: string | number | undefined): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value)
  return 0
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

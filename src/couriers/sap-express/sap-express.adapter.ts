import type { Env } from '../../config/env.js'
import { HttpError } from '../../utils/http-error.js'
import { courierCapabilities } from '../capabilities.js'
import type { BookShipmentParams, BookShipmentResult, CancelShipmentResult, CourierRate, LogisticsProvider, NormalizedTrackingEvent, RateParams } from '../types.js'
import { SapExpressClient } from './sap-express.client.js'
import { mapSapExpressStatus } from './sap-express.normalizer.js'
import type { SapBookingData, SapRateData, SapRateResponse, SapRateService, SapTrackEvent } from './sap-express.types.js'

const DEFAULT_VOLUMETRIC = '10x10x10'

export class SapExpressAdapter implements LogisticsProvider {
  readonly courier = 'SAP_EXPRESS' as const
  readonly capabilities = courierCapabilities.SAP_EXPRESS
  private readonly client: SapExpressClient

  constructor(private readonly env: Env, fetcher?: typeof fetch) {
    this.client = new SapExpressClient(env, fetcher)
  }

  async getRates(params: RateParams): Promise<CourierRate[]> {
    const raw = await this.client.rates({
      origin: params.originCode,
      destination: params.destCode,
      weight: toSapKg(params.weightGrams),
      customer_code: this.getCustomerCode(params.isCod),
      volumetric: DEFAULT_VOLUMETRIC,
    })
    const { services, coverageCod } = extractRateResult(raw)
    return services.map((service) => {
      const availableForCod = params.isCod ? coverageCod : undefined
      const codFee = (params.isCod && coverageCod && params.goodsValueIdr != null)
        ? Math.max(this.env.SAP_COD_MIN_FEE_IDR, Math.ceil(params.goodsValueIdr * this.env.SAP_COD_FEE_PERCENT / 100))
        : undefined
      return {
        courier: 'SAP_EXPRESS' as const,
        serviceCode: service.service_type_code,
        serviceName: service.service_type_name,
        priceIdr: toNumber(service.total_cost),
        etd: normalizeSla(service.sla),
        cached: false,
        availableForCod,
        codFee,
      }
    }).filter((rate) => rate.serviceCode && rate.priceIdr > 0)
  }

  async bookShipment(params: BookShipmentParams): Promise<BookShipmentResult> {
    const codValue = params.isCod ? resolveCodValue(params.goodsValueIdr) : undefined
    const raw = await this.client.book({
      customer_code: this.getCustomerCode(params.isCod),
      reference_no: normalizeReference(params.externalOrderId),
      service_type_code: params.serviceCode,
      ...(codValue ? { cod_value: codValue } : {}),
      pickup_place: this.env.SAP_PICKUP_PLACE,
      koli: '1',
      weight: toSapKg(params.weightGrams),
      volumetric: DEFAULT_VOLUMETRIC,
      destination_district_code: params.destCode,
      pickup_name: requiredEnv(this.env.SAP_SHIPPER_NAME, 'SAP_SHIPPER_NAME'),
      pickup_address: requiredEnv(this.env.SAP_SHIPPER_ADDRESS, 'SAP_SHIPPER_ADDRESS'),
      pickup_phone: requiredEnv(this.env.SAP_SHIPPER_PHONE, 'SAP_SHIPPER_PHONE'),
      pickup_contact: requiredEnv(this.env.SAP_SHIPPER_CONTACT, 'SAP_SHIPPER_CONTACT'),
      pickup_district_code: requiredEnv(this.env.SAP_ORIGIN_DISTRICT_CODE, 'SAP_ORIGIN_DISTRICT_CODE'),
      shipment_type_code: this.env.SAP_SHIPMENT_TYPE_CODE,
      shipment_content_code: this.env.SAP_SHIPMENT_CONTENT_CODE,
      shipper_name: requiredEnv(this.env.SAP_SHIPPER_NAME, 'SAP_SHIPPER_NAME'),
      shipper_address: requiredEnv(this.env.SAP_SHIPPER_ADDRESS, 'SAP_SHIPPER_ADDRESS'),
      shipper_phone: requiredEnv(this.env.SAP_SHIPPER_PHONE, 'SAP_SHIPPER_PHONE'),
      shipper_contact: requiredEnv(this.env.SAP_SHIPPER_CONTACT, 'SAP_SHIPPER_CONTACT'),
      receiver_name: params.recipientName,
      receiver_address: params.recipientAddress,
      receiver_phone: params.recipientPhone,
      receiver_contact: params.recipientName,
    })
    const data = extractBookingData(raw.data)
    if (!data?.awb_no) throw new HttpError(502, 'SAP Express booking did not return an AWB', 'SAP_BOOKING_INVALID_RESPONSE')
    return { courier: 'SAP_EXPRESS', courierOrderId: data.reference_no || data.awb_no, waybillId: data.awb_no, status: 'BOOKED' }
  }

  async cancelShipment(waybillId: string, reason = 'Order dibatalkan oleh merchant'): Promise<CancelShipmentResult> {
    await this.client.cancelPickup({
      awb_no: waybillId,
      desc: reason,
      reason_detail_code: 'GLD009',
    })
    return {
      status: 'CANCELLED',
      waybillId,
      message: 'Pengiriman SAP Express berhasil dibatalkan',
    }
  }

  async trackShipment(waybillId: string): Promise<NormalizedTrackingEvent[]> {
    const raw = await this.client.track(waybillId)
    const events = Array.isArray(raw.data) ? raw.data : []
    if (events.length === 0) throw new HttpError(404, `SAP Express tracking unavailable for waybill ${waybillId.slice(0, 6)}***`, 'SAP_TRACK_NOT_FOUND')
    return events.map((event) => toTrackingEvent(event, waybillId))
  }

  normalizeWebhook(rawPayload: unknown): NormalizedTrackingEvent | null {
    if (!isRecord(rawPayload)) return null
    const event = normalizeWebhookPayload(rawPayload)
    if (!event.awb_no || !event.rowstate_name) return null
    return toTrackingEvent(event, event.awb_no)
  }

  private getCustomerCode(isCod?: boolean): string {
    if (isCod) {
      return requiredEnv(this.env.SAP_CUSTOMER_CODE_COD || this.env.SAP_CUSTOMER_CODE, 'SAP_CUSTOMER_CODE_COD')
    }
    return requiredEnv(this.env.SAP_CUSTOMER_CODE_NON_COD || this.env.SAP_CUSTOMER_CODE, 'SAP_CUSTOMER_CODE_NON_COD')
  }
}

function extractRateResult(raw: SapRateResponse): { services: SapRateService[]; coverageCod: boolean } {
  if (Array.isArray(raw.data)) return { services: raw.data, coverageCod: false }
  const data = raw.data as SapRateData | undefined
  return {
    services: Array.isArray(data?.services) ? data.services : [],
    coverageCod: data?.coverage_cod === true,
  }
}

function extractBookingData(data: SapBookingData | []): SapBookingData | null {
  return Array.isArray(data) ? null : data
}

function toTrackingEvent(event: SapTrackEvent, fallbackWaybillId: string): NormalizedTrackingEvent {
  const statusText = event.rowstate_name?.trim() || event.rowstate_web?.trim() || event.description?.trim() || 'SAP Express tracking update'
  return {
    waybillId: event.awb_no || fallbackWaybillId,
    externalOrderId: event.reference_no,
    status: mapSapExpressStatus(statusText),
    description: event.description?.trim() || statusText,
    occurredAt: event.create_date || new Date().toISOString(),
  }
}

function normalizeWebhookPayload(payload: Record<string, unknown>): SapTrackEvent {
  return {
    awb_no: readString(payload, ['awb_no', 'awb', 'waybill_id']) ?? '',
    reference_no: readString(payload, ['reference_no', 'external_order_id']) ?? '',
    service_type_code: readString(payload, ['service_type_code']) ?? '',
    origin: readString(payload, ['origin']) ?? '',
    destination: readString(payload, ['destination']) ?? '',
    shipping_cost: readString(payload, ['shipping_cost']) ?? '',
    rowstate: readString(payload, ['rowstate', 'status']) ?? '',
    rowstate_name: readString(payload, ['rowstate_name', 'status_name', 'status', 'description']) ?? '',
    rowstate_web: readString(payload, ['rowstate_web']) ?? '',
    pod_status_code: readString(payload, ['pod_status_code']) ?? null,
    pod_status_name: readString(payload, ['pod_status_name']) ?? null,
    description: readString(payload, ['description', 'status_desc', 'remark']) ?? '',
    create_date: readString(payload, ['create_date', 'created_at', 'occurred_at', 'event_time', 'updated_at']) ?? new Date().toISOString(),
    current_branch_name: readString(payload, ['current_branch_name']) ?? '',
    origin_code: readString(payload, ['origin_code']) ?? '',
    destination_code: readString(payload, ['destination_code']) ?? '',
    lead_time_order: 0,
    lead_time_status: '',
    lead_time_limit: '',
  }
}

function toSapKg(weightGrams: number): number {
  return Math.max(1, Math.ceil(weightGrams / 1000))
}

function toNumber(value: number | string | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.-]/g, ''))
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function resolveCodValue(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new HttpError(400, 'SAP Express COD booking requires a positive cod_value', 'SAP_COD_VALUE_REQUIRED')
  }
  return Math.round(value)
}

function normalizeSla(value: string | undefined): string {
  const trimmed = value?.trim()
  return trimmed && trimmed !== '-' ? trimmed : ''
}

function normalizeReference(value: string): string {
  const normalized = value.replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 20)
  return normalized || `TLG-${Date.now()}`.slice(0, 20)
}

function requiredEnv(value: string, name: string): string {
  if (!value.trim()) throw new HttpError(503, `${name} is required for SAP Express`, 'SAP_NOT_CONFIGURED')
  return value.trim()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function readString(payload: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = payload[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return undefined
}

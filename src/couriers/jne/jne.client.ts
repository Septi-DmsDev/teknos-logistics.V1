import type { Env } from '../../config/env.js'
import { HttpError } from '../../utils/http-error.js'
import type { JneGenerateCnoteResponse, JneTariffResponse, JneTrackResponse } from './jne.types.js'

type JnePostBody = Record<string, string>
const DEFAULT_TIMEOUT_MS = 15_000
const JNE_BASE_KEYS = ['JNE_API_BASE_URL', 'JNE_USERNAME', 'JNE_API_KEY'] as const
const JNE_TARIFF_KEYS = [...JNE_BASE_KEYS, 'JNE_ORIGIN_CODE'] as const
const JNE_TRACK_KEYS = JNE_BASE_KEYS
const JNE_BOOKING_KEYS = [...JNE_TARIFF_KEYS, 'JNE_CUST_NO', 'JNE_BRANCH_CODE', 'JNE_SHIPPER_NAME', 'JNE_SHIPPER_ADDR1', 'JNE_SHIPPER_CITY', 'JNE_SHIPPER_PHONE', 'JNE_SHIPPER_ZIP'] as const

export class JneClient {
  constructor(private readonly env: Env, private readonly fetcher: typeof fetch = fetch) {}

  assertConfigured(required: readonly (keyof Env)[] = JNE_BOOKING_KEYS): void {
    const missing = required.filter((key) => !this.env[key])
    if (missing.length > 0) {
      throw new HttpError(503, `JNE is not fully configured: ${missing.join(', ')}`, 'JNE_NOT_CONFIGURED')
    }
  }
  async tariff(params: { from: string; thru: string; weightGrams: number }): Promise<JneTariffResponse> {
    this.assertConfigured(JNE_TARIFF_KEYS)
    return this.post<JneTariffResponse>('pricedev', {
      from: params.from,
      thru: params.thru,
      weight: String(Math.max(1, Math.ceil(params.weightGrams / 1000))),
    }, { operation: 'tariff', meta: { from: params.from, thru: params.thru } })
  }

  async generateCnote(params: {
    orderNumber: string
    serviceCode: string
    destinationCode: string
    recipientName: string
    recipientAddress: string
    recipientPhone: string
    recipientZip?: string
    recipientCity?: string
    recipientAddr2?: string
    shipperAddr2?: string
    weightGrams: number
    goodsValueIdr: number
    isCod: boolean
  }): Promise<JneGenerateCnoteResponse> {
    this.assertConfigured()
    return this.post<JneGenerateCnoteResponse>('generatecnote', {
      OLSHOP_BRANCH: this.env.JNE_BRANCH_CODE,
      OLSHOP_CUST: this.env.JNE_CUST_NO,
      OLSHOP_ORDERID: params.orderNumber.slice(0, 20),
      OLSHOP_SHIPPER_NAME: this.env.JNE_SHIPPER_NAME,
      OLSHOP_SHIPPER_ADDR1: this.env.JNE_SHIPPER_ADDR1,
      OLSHOP_SHIPPER_ADDR2: params.shipperAddr2 ?? '',
      OLSHOP_SHIPPER_CITY: this.env.JNE_SHIPPER_CITY,
      OLSHOP_SHIPPER_REGION: this.env.JNE_SHIPPER_CITY,
      OLSHOP_SHIPPER_ZIP: this.env.JNE_SHIPPER_ZIP,
      OLSHOP_SHIPPER_PHONE: this.env.JNE_SHIPPER_PHONE,
      OLSHOP_RECEIVER_NAME: params.recipientName,
      OLSHOP_RECEIVER_ADDR1: params.recipientAddress,
      OLSHOP_RECEIVER_ADDR2: params.recipientAddr2 ?? '',
      OLSHOP_RECEIVER_CITY: params.recipientCity ?? params.destinationCode,
      OLSHOP_RECEIVER_REGION: params.recipientCity ?? params.destinationCode,
      OLSHOP_RECEIVER_ZIP: params.recipientZip ?? '',
      OLSHOP_RECEIVER_PHONE: params.recipientPhone,
      OLSHOP_ORIG: this.env.JNE_ORIGIN_CODE,
      OLSHOP_DEST: params.destinationCode,
      OLSHOP_SERVICE: params.serviceCode,
      OLSHOP_WEIGHT: String(Math.max(1, Math.ceil(params.weightGrams / 1000))),
      OLSHOP_QTY: '1',
      OLSHOP_GOODSDESC: 'Shipment',
      OLSHOP_GOODSVALUE: String(params.goodsValueIdr),
      OLSHOP_GOODSTYPE: '2',
      OLSHOP_INSURANCE_VALUE: '0',
      OLSHOP_COD_FLAG: params.isCod ? 'YES' : 'N',
      OLSHOP_COD_AMOUNT: params.isCod ? String(params.goodsValueIdr) : '0',
      OLSHOP_INS_FLAG: 'N',
    }, { operation: 'generatecnote', meta: { orderId: params.orderNumber.slice(0, 20), destinationCode: params.destinationCode } })
  }

  async track(waybillId: string): Promise<JneTrackResponse> {
    this.assertConfigured(JNE_TRACK_KEYS)
    const body = new URLSearchParams({ username: this.env.JNE_USERNAME, api_key: this.env.JNE_API_KEY })
    return this.request<JneTrackResponse>(`${this.baseUrl()}/list/v1/cnote/${encodeURIComponent(waybillId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    }, { operation: 'track', meta: { waybillId: redact(waybillId) } })
  }

  private async post<T>(path: string, body: JnePostBody, context: RequestContext): Promise<T> {
    return this.request<T>(`${this.baseUrl()}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username: this.env.JNE_USERNAME, api_key: this.env.JNE_API_KEY, ...body }),
    }, context)
  }

  private async request<T>(url: string, init: RequestInit, context: RequestContext): Promise<T> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)
    const startedAt = Date.now()
    try {
      const response = await this.fetcher(url, { ...init, signal: controller.signal })
      const durationMs = Date.now() - startedAt
      const json = await response.json() as T
      console.warn('[JNE]', { operation: context.operation, durationMs, responseStatus: response.status, ...context.meta })
      if (!response.ok) {
        throw new HttpError(502, `JNE ${context.operation} failed with HTTP ${response.status}`, 'JNE_HTTP_ERROR')
      }
      return json
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn('[JNE] request failed', { operation: context.operation, error: message, ...context.meta })
      if (error instanceof HttpError) throw error
      throw new HttpError(502, `JNE ${context.operation} request failed`, 'JNE_REQUEST_FAILED')
    } finally {
      clearTimeout(timer)
    }
  }

  private baseUrl(): string {
    return this.env.JNE_API_BASE_URL.replace(/\/$/, '')
  }
}

interface RequestContext {
  operation: string
  meta: Record<string, string | number>
}

function redact(value: string): string {
  return value.length <= 6 ? '***' : `${value.slice(0, 6)}***`
}



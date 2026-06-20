import type { Env } from '../../config/env.js'
import { HttpError } from '../../utils/http-error.js'
import type { SapBookingResponse, SapRateResponse, SapTrackResponse } from './sap-express.types.js'

const DEFAULT_TIMEOUT_MS = 15_000

export interface SapRateRequest {
  origin: string
  destination: string
  weight: number
  customer_code: string
  volumetric: string
}

export interface SapBookingRequest {
  customer_code: string
  reference_no: string
  service_type_code: string
  pickup_place: string
  koli: string
  weight: number
  volumetric: string
  destination_district_code: string
  pickup_name: string
  pickup_address: string
  pickup_phone: string
  pickup_contact: string
  pickup_district_code: string
  shipment_type_code: string
  shipment_content_code: string
  shipper_name: string
  shipper_address: string
  shipper_phone: string
  shipper_contact: string
  receiver_name: string
  receiver_address: string
  receiver_phone: string
  receiver_contact: string
}

export interface SapClientConfig {
  apiBaseUrl: string
  trackingBaseUrl: string
  apiKey: string
}

export class SapExpressClient {
  private readonly config: SapClientConfig

  constructor(env: Env, private readonly fetcher: typeof fetch = fetch) {
    const apiBaseUrl = env.SAP_API_BASE_URL || 'https://apisanbox.coresyssap.com'
    this.config = {
      apiBaseUrl: trimTrailingSlash(apiBaseUrl),
      trackingBaseUrl: trimTrailingSlash(env.SAP_TRACKING_BASE_URL || apiBaseUrl),
      apiKey: env.SAP_API_KEY,
    }
  }

  async rates(input: SapRateRequest): Promise<SapRateResponse> {
    return this.postJson<SapRateResponse>(`${this.config.apiBaseUrl}/v2/master/shipment_cost`, input, 'SAP_RATE_FAILED')
  }

  async book(input: SapBookingRequest): Promise<SapBookingResponse> {
    return this.postJson<SapBookingResponse>(`${this.config.apiBaseUrl}/v2/shipment/pickup/create`, input, 'SAP_BOOKING_FAILED')
  }

  async track(waybillId: string): Promise<SapTrackResponse> {
    const url = new URL(`${this.config.trackingBaseUrl}/v2/shipment/tracking`)
    url.searchParams.set('awb_no', waybillId)
    return this.requestJson<SapTrackResponse>(url.toString(), { method: 'GET' }, 'SAP_TRACKING_FAILED')
  }

  private async postJson<TResponse>(url: string, body: unknown, code: string): Promise<TResponse> {
    return this.requestJson<TResponse>(url, { method: 'POST', body: JSON.stringify(body) }, code)
  }

  private async requestJson<TResponse>(url: string, init: RequestInit, code: string): Promise<TResponse> {
    if (!this.config.apiKey) throw new HttpError(503, 'SAP Express API key is not configured', 'SAP_NOT_CONFIGURED')

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)
    try {
      const response = await this.fetcher(url, {
        ...init,
        signal: controller.signal,
        headers: {
          api_key: this.config.apiKey,
          'content-type': 'application/json',
          ...(init.headers || {}),
        },
      })

      const payload = await readPayload(response)
      if (!response.ok) {
        throw new HttpError(response.status >= 500 ? 503 : 502, `SAP Express request failed: HTTP ${response.status}`, code)
      }
      return payload as TResponse
    } catch (error) {
      if (error instanceof HttpError) throw error
      throw new HttpError(502, 'SAP Express request failed', code)
    } finally {
      clearTimeout(timer)
    }
  }
}

async function readPayload(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return {}
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new HttpError(502, 'SAP Express returned invalid JSON', 'SAP_INVALID_JSON')
  }
}

function trimTrailingSlash(value: string): string {
  return value.replace(new RegExp('/$'), '')
}

import type { Env } from '../../config/env.js'
import { HttpError } from '../../utils/http-error.js'

type JnePostBody = Record<string, string>

export class JneClient {
  constructor(private readonly env: Env, private readonly fetcher: typeof fetch = fetch) {}

  async tariff(params: { from: string; thru: string; weightGrams: number }): Promise<unknown> {
    return this.post('pricedev', {
      from: params.from,
      thru: params.thru,
      weight: String(Math.max(1, Math.ceil(params.weightGrams / 1000))),
    })
  }

  async generateCnote(params: {
    orderNumber: string
    serviceCode: string
    destinationCode: string
    recipientName: string
    recipientAddress: string
    recipientPhone: string
    weightGrams: number
    goodsValueIdr: number
    isCod: boolean
  }): Promise<unknown> {
    const weightKg = Math.max(1, Math.ceil(params.weightGrams / 1000))
    return this.post('generatecnote', {
      OLSHOP_BRANCH: this.env.JNE_BRANCH_CODE,
      OLSHOP_CUST: this.env.JNE_CUST_NO,
      OLSHOP_ORDERID: params.orderNumber.slice(0, 20),
      OLSHOP_SHIPPER_NAME: this.env.JNE_SHIPPER_NAME,
      OLSHOP_SHIPPER_ADDR1: this.env.JNE_SHIPPER_ADDR1,
      OLSHOP_SHIPPER_CITY: this.env.JNE_SHIPPER_CITY,
      OLSHOP_SHIPPER_REGION: this.env.JNE_SHIPPER_CITY,
      OLSHOP_SHIPPER_ZIP: this.env.JNE_SHIPPER_ZIP,
      OLSHOP_SHIPPER_PHONE: this.env.JNE_SHIPPER_PHONE,
      OLSHOP_RECEIVER_NAME: params.recipientName,
      OLSHOP_RECEIVER_ADDR1: params.recipientAddress,
      OLSHOP_RECEIVER_CITY: params.destinationCode,
      OLSHOP_RECEIVER_REGION: params.destinationCode,
      OLSHOP_RECEIVER_ZIP: '',
      OLSHOP_RECEIVER_PHONE: params.recipientPhone,
      OLSHOP_ORIG: this.env.JNE_ORIGIN_CODE,
      OLSHOP_DEST: params.destinationCode,
      OLSHOP_SERVICE: params.serviceCode,
      OLSHOP_WEIGHT: String(weightKg),
      OLSHOP_QTY: '1',
      OLSHOP_GOODSDESC: 'Shipment',
      OLSHOP_GOODSVALUE: String(params.goodsValueIdr),
      OLSHOP_GOODSTYPE: '2',
      OLSHOP_INSURANCE_VALUE: '0',
      OLSHOP_COD_FLAG: params.isCod ? 'YES' : 'N',
      OLSHOP_COD_AMOUNT: params.isCod ? String(params.goodsValueIdr) : '0',
      OLSHOP_INS_FLAG: 'N',
    })
  }

  async track(waybillId: string): Promise<unknown> {
    const baseUrl = this.getBaseUrl()
    const body = new URLSearchParams({ username: this.env.JNE_USERNAME, api_key: this.env.JNE_API_KEY })
    const response = await this.fetcher(`${baseUrl}/list/v1/cnote/${encodeURIComponent(waybillId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    return response.json()
  }

  private async post(path: string, body: JnePostBody): Promise<unknown> {
    const baseUrl = this.getBaseUrl()
    const credentials = { username: this.env.JNE_USERNAME, api_key: this.env.JNE_API_KEY }
    const response = await this.fetcher(`${baseUrl}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ ...credentials, ...body }),
    })
    return response.json()
  }

  private getBaseUrl(): string {
    if (!this.env.JNE_API_BASE_URL) throw new HttpError(503, 'JNE is not configured', 'JNE_NOT_CONFIGURED')
    return this.env.JNE_API_BASE_URL.replace(/\/$/, '')
  }
}

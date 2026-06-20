import { SapExpressAdapter } from '../src/couriers/sap-express/sap-express.adapter.js'
import { loadEnv } from '../src/config/env.js'

const calls: Array<{ url: string; init: RequestInit }> = []
const fetcher: typeof fetch = async (url, init = {}) => {
  calls.push({ url: String(url), init })
  const urlText = String(url)
  if (urlText.includes('/v2/master/shipment_cost')) {
    return jsonResponse({
      status: 'success',
      msg: 'ok',
      data: {
        origin: 'JI1606',
        destination: 'JK00',
        coverage_cod: false,
        services: [{ service_type_code: 'REG', service_type_name: 'Regular', total_cost: 15000, sla: '2-3', cost: 15000, minimum_kilo: 1, kilo_divider: 4000, insurance_cost: 0, insurance_admin_cost: 0, packing_cost: 0, volumetric_kg: 1, weight: 1, final_weight: 1, discount: '0', surcharge: 0, markup_percentage: '0' }],
      },
    })
  }
  if (urlText.includes('/v2/shipment/pickup/create')) {
    return jsonResponse({ status: 'success', msg: 'ok', data: { awb_no: 'SAP123456789', reference_no: 'ORDER-1', origin_branch_code: 'JI', destination_branch_code: 'JK', tlc_branch_code: 'TLC', label: '' } })
  }
  if (urlText.includes('/v2/shipment/tracking')) {
    return jsonResponse({ status: 'success', msg: 'ok', data: [trackingEvent('SAP123456789', 'DELIVERY ')] })
  }
  return jsonResponse({ status: 'fail', msg: 'unexpected url', data: [] }, 404)
}

const env = loadEnv({
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/postgres',
  NODE_ENV: 'test',
  SAP_API_KEY: 'sap-test-key',
  SAP_API_BASE_URL: 'https://sap.example.test/',
  SAP_TRACKING_BASE_URL: 'https://track.sap.example.test/',
  SAP_CUSTOMER_CODE: 'CUST01',
  SAP_ORIGIN_DISTRICT_CODE: 'JI1606',
  SAP_PICKUP_PLACE: '1',
  SAP_SHIPMENT_TYPE_CODE: 'SHTPC',
  SAP_SHIPMENT_CONTENT_CODE: 'SHTPC',
  SAP_SHIPPER_NAME: 'Teknos',
  SAP_SHIPPER_ADDRESS: 'Jl Test',
  SAP_SHIPPER_PHONE: '08123456789',
  SAP_SHIPPER_CONTACT: 'Ops',
  SAP_WEBHOOK_TOKEN: 'webhook-token',
})

const adapter = new SapExpressAdapter(env, fetcher)
const rates = await adapter.getRates({ originCode: 'JI1606', destCode: 'JK00', weightGrams: 900, courier: 'SAP_EXPRESS' })
assert(rates.length === 1, 'expected one SAP rate')
assert(rates[0]?.priceIdr === 15000, 'expected total_cost as price')
assert(rates[0]?.serviceCode === 'REG', 'expected service code')

const booking = await adapter.bookShipment({
  externalOrderId: 'ORDER-1/TEST',
  serviceCode: 'REG',
  originCode: 'JI1606',
  destCode: 'JK00',
  weightGrams: 1200,
  recipientName: 'Customer',
  recipientPhone: '08123456780',
  recipientAddress: 'Jl Customer',
})
assert(booking.waybillId === 'SAP123456789', 'expected booking AWB')

const tracking = await adapter.trackShipment('SAP123456789')
assert(tracking[0]?.status === 'OUT_FOR_DELIVERY', 'expected SAP DELIVERY tracking normalized to OUT_FOR_DELIVERY')

const webhook = adapter.normalizeWebhook({ awb_no: 'SAP123456789', rowstate_name: 'POD - DELIVERED', description: 'Delivered', create_date: '2026-06-20T00:00:00.000Z' })
assert(webhook?.status === 'DELIVERED', 'expected delivered webhook status')

const firstCall = calls[0]
assert(firstCall?.init.headers && (firstCall.init.headers as Record<string, string>).api_key === 'sap-test-key', 'expected api_key header')
assert(firstCall?.url === 'https://sap.example.test/v2/master/shipment_cost', 'expected trimmed SAP base URL')

console.log(JSON.stringify({ ok: true, calls: calls.length, rates: rates.length, waybillId: booking.waybillId }, null, 2))

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } })
}

function trackingEvent(awbNo: string, rowstateName: string) {
  return {
    awb_no: awbNo,
    reference_no: 'ORDER-1',
    service_type_code: 'REG',
    origin: 'JI1606',
    destination: 'JK00',
    shipping_cost: '15000',
    rowstate: 'DLV',
    rowstate_name: rowstateName,
    rowstate_web: rowstateName,
    pod_status_code: null,
    pod_status_name: null,
    description: rowstateName,
    create_date: '2026-06-20T00:00:00.000Z',
    current_branch_name: 'Jakarta',
    origin_code: 'JI1606',
    destination_code: 'JK00',
    lead_time_order: 0,
    lead_time_status: '',
    lead_time_limit: '',
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

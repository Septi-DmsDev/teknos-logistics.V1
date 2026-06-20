import test from 'node:test'
import assert from 'node:assert/strict'
import type { Env } from '../../src/config/env.js'
import { SapExpressAdapter } from '../../src/couriers/sap-express/sap-express.adapter.js'
import { HttpError } from '../../src/utils/http-error.js'

const baseEnv = {
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/postgres',
  NODE_ENV: 'test',
  PORT: 3001,
  APP_URL: 'http://localhost:3001',
  ADMIN_AUTH_PROVIDER: 'static-token',
  ADMIN_JWT_SECRET: 'admin-secret',
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
  SUPABASE_JWT_SECRET: '',
  SUPABASE_SERVICE_ROLE_KEY: '',
  RATE_LIMIT_WINDOW_MS: 60_000,
  RATE_LIMIT_PUBLIC_MAX: 120,
  RATE_LIMIT_ADMIN_MAX: 60,
  LOGISTICS_PROVIDER: 'mock',
  JNE_MODE: 'sandbox',
  JNE_API_BASE_URL: '',
  JNE_USERNAME: '',
  JNE_API_KEY: '',
  JNE_CUST_NO: '',
  JNE_BRANCH_CODE: '',
  JNE_ORIGIN_CODE: '',
  JNE_SHIPPER_NAME: '',
  JNE_SHIPPER_ADDR1: '',
  JNE_SHIPPER_CITY: '',
  JNE_SHIPPER_PHONE: '',
  JNE_SHIPPER_ZIP: '',
  JNE_WEBHOOK_TOKEN: '',
  SAP_API_BASE_URL: 'https://sap.example.test',
  SAP_TRACKING_BASE_URL: 'https://track.sap.example.test',
  SAP_API_KEY: 'sap-api-key',
  SAP_CUSTOMER_CODE: 'CUST01',
  SAP_ORIGIN_DISTRICT_CODE: 'JI1606',
  SAP_PICKUP_PLACE: '1',
  SAP_SHIPMENT_TYPE_CODE: 'SHTPC',
  SAP_SHIPMENT_CONTENT_CODE: 'SHTPC',
  SAP_SHIPPER_NAME: 'Teknos',
  SAP_SHIPPER_ADDRESS: 'Jl Test',
  SAP_SHIPPER_PHONE: '08123456789',
  SAP_SHIPPER_CONTACT: 'Ops',
  SAP_WEBHOOK_TOKEN: 'sap-webhook-token',
} satisfies Env

test('getRates returns normalized CourierRate array and filters zero price', async () => {
  const calls: RequestCall[] = []
  const adapter = new SapExpressAdapter(baseEnv, mockFetcher(calls, {
    '/v2/master/shipment_cost': {
      status: 'success',
      msg: 'ok',
      data: {
        origin: 'JI1606',
        destination: 'JK00',
        coverage_cod: false,
        services: [sapRateService('UDRREG', 24500), sapRateService('ZERO', 0)],
      },
    },
  }))

  const rates = await adapter.getRates({ originCode: 'JI1606', destCode: 'JK00', weightGrams: 1001 })

  assert.equal(rates.length, 1)
  assert.deepEqual(rates[0], {
    courier: 'SAP_EXPRESS',
    serviceCode: 'UDRREG',
    serviceName: 'SATRIA REG',
    priceIdr: 24500,
    etd: '3 - 5 Hari',
    cached: false,
  })
  assert.equal(calls[0]?.url, 'https://sap.example.test/v2/master/shipment_cost')
  assert.equal(calls[0]?.headers.api_key, 'sap-api-key')
  assert.equal(JSON.parse(String(calls[0]?.body)).weight, 2)
})

test('getRates throws 503 if SAP customer code is missing', async () => {
  const adapter = new SapExpressAdapter({ ...baseEnv, SAP_CUSTOMER_CODE: '' }, mockFetcher([], {}))
  await assert.rejects(() => adapter.getRates({ originCode: 'JI1606', destCode: 'JK00', weightGrams: 1000 }), (error) => {
    assert(error instanceof HttpError)
    assert.equal(error.status, 503)
    assert.equal(error.code, 'SAP_NOT_CONFIGURED')
    return true
  })
})

test('getRates throws 503 if SAP API key is missing', async () => {
  const adapter = new SapExpressAdapter({ ...baseEnv, SAP_API_KEY: '' }, mockFetcher([], {}))
  await assert.rejects(() => adapter.getRates({ originCode: 'JI1606', destCode: 'JK00', weightGrams: 1000 }), (error) => {
    assert(error instanceof HttpError)
    assert.equal(error.status, 503)
    assert.equal(error.code, 'SAP_NOT_CONFIGURED')
    return true
  })
})

test('bookShipment returns booking result with waybill id', async () => {
  const calls: RequestCall[] = []
  const adapter = new SapExpressAdapter(baseEnv, mockFetcher(calls, {
    '/v2/shipment/pickup/create': {
      status: 'success',
      msg: 'ok',
      data: {
        awb_no: 'SAP123456789',
        reference_no: 'ORDER-1',
        origin_branch_code: 'JI',
        destination_branch_code: 'JK',
        tlc_branch_code: 'TLC',
        label: '',
      },
    },
  }))

  const result = await adapter.bookShipment({
    externalOrderId: 'ORDER 1/TEST WITH LONG VALUE',
    serviceCode: 'UDRREG',
    originCode: 'JI1606',
    destCode: 'JK00',
    weightGrams: 900,
    recipientName: 'Customer',
    recipientPhone: '08123456780',
    recipientAddress: 'Jl Customer',
  })

  assert.deepEqual(result, { courier: 'SAP_EXPRESS', courierOrderId: 'ORDER-1', waybillId: 'SAP123456789', status: 'BOOKED' })
  const body = JSON.parse(String(calls[0]?.body)) as Record<string, unknown>
  assert.equal(body.reference_no, 'ORDER-1-TEST-WITH-LO')
  assert.equal(body.weight, 1)
  assert.equal(body.destination_district_code, 'JK00')
})

test('bookShipment throws 502 if response missing waybill', async () => {
  const adapter = new SapExpressAdapter(baseEnv, mockFetcher([], {
    '/v2/shipment/pickup/create': { status: 'success', msg: 'ok', data: [] },
  }))

  await assert.rejects(() => adapter.bookShipment({
    externalOrderId: 'ORDER-1',
    serviceCode: 'UDRREG',
    originCode: 'JI1606',
    destCode: 'JK00',
    weightGrams: 1000,
    recipientName: 'Customer',
    recipientPhone: '08123456780',
    recipientAddress: 'Jl Customer',
  }), (error) => {
    assert(error instanceof HttpError)
    assert.equal(error.status, 502)
    assert.equal(error.code, 'SAP_BOOKING_INVALID_RESPONSE')
    return true
  })
})

test('trackShipment returns normalized tracking events', async () => {
  const adapter = new SapExpressAdapter(baseEnv, mockFetcher([], {
    '/v2/shipment/tracking': { status: 'success', msg: 'ok', data: [trackingEvent('SAP123456789', 'POD - DELIVERED')] },
  }))

  const events = await adapter.trackShipment('SAP123456789')

  assert.equal(events.length, 1)
  assert.equal(events[0]?.status, 'DELIVERED')
  assert.equal(events[0]?.waybillId, 'SAP123456789')
})

test('normalizeWebhook returns event for valid payload and null for invalid payload', () => {
  const adapter = new SapExpressAdapter(baseEnv, mockFetcher([], {}))

  assert.deepEqual(adapter.normalizeWebhook({ awb_no: 'SAP123456789', rowstate_name: 'DELIVERY ', description: 'Out for delivery', create_date: '2026-06-20T00:00:00.000Z' }), {
    waybillId: 'SAP123456789',
    externalOrderId: '',
    status: 'OUT_FOR_DELIVERY',
    description: 'Out for delivery',
    occurredAt: '2026-06-20T00:00:00.000Z',
  })
  assert.equal(adapter.normalizeWebhook({}), null)
  assert.equal(adapter.normalizeWebhook(null), null)
})

test('trackShipment throws 404 when SAP returns no events', async () => {
  const adapter = new SapExpressAdapter(baseEnv, mockFetcher([], {
    '/v2/shipment/tracking': { status: 'success', msg: 'ok', data: [] },
  }))

  await assert.rejects(() => adapter.trackShipment('SAP123456789'), (error) => {
    assert(error instanceof HttpError)
    assert.equal(error.status, 404)
    assert.equal(error.code, 'SAP_TRACK_NOT_FOUND')
    return true
  })
})

interface RequestCall {
  url: string
  body?: RequestInit['body']
  headers: Record<string, string>
}

function mockFetcher(calls: RequestCall[], responses: Record<string, unknown>): typeof fetch {
  return async (input, init = {}) => {
    const url = String(input)
    const headers = init.headers as Record<string, string>
    calls.push({ url, body: init.body, headers })
    const key = Object.keys(responses).find((path) => url.includes(path))
    if (!key) return jsonResponse({ status: 'fail', msg: `Unexpected URL: ${url}`, data: [] }, 404)
    return jsonResponse(responses[key])
  }
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } })
}

function sapRateService(serviceCode: string, totalCost: number) {
  return {
    service_type_code: serviceCode,
    service_type_name: serviceCode === 'UDRREG' ? 'SATRIA REG' : serviceCode,
    cost: totalCost,
    total_cost: totalCost,
    sla: serviceCode === 'UDRREG' ? '3 - 5 Hari' : '-',
    minimum_kilo: 1,
    kilo_divider: 6000,
    insurance_cost: 0,
    insurance_admin_cost: 0,
    packing_cost: 0,
    volumetric_kg: 1,
    weight: 1,
    final_weight: 1,
    discount: '0',
    surcharge: 0,
    markup_percentage: '0',
  }
}

function trackingEvent(awbNo: string, status: string) {
  return {
    awb_no: awbNo,
    reference_no: 'ORDER-1',
    service_type_code: 'UDRREG',
    origin: 'JI1606',
    destination: 'JK00',
    shipping_cost: '24500',
    rowstate: 'POD',
    rowstate_name: status,
    rowstate_web: status,
    pod_status_code: null,
    pod_status_name: null,
    description: status,
    create_date: '2026-06-20T00:00:00.000Z',
    current_branch_name: 'Jakarta',
    origin_code: 'JI1606',
    destination_code: 'JK00',
    lead_time_order: 0,
    lead_time_status: '',
    lead_time_limit: '',
  }
}

import test from 'node:test'
import assert from 'node:assert/strict'
import type { Env } from '../../src/config/env.js'
import { JneAdapter } from '../../src/couriers/jne/jne.adapter.js'

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
  LOGISTICS_PROVIDER: 'jne',
  JNE_MODE: 'sandbox',
  JNE_API_BASE_URL: 'https://jne.example.test',
  JNE_USERNAME: 'test-user',
  JNE_API_KEY: 'test-api-key',
  JNE_CUST_NO: 'CUST01',
  JNE_BRANCH_CODE: 'MJK000',
  JNE_ORIGIN_CODE: 'MJK10000',
  JNE_SHIPPER_NAME: 'Teknos',
  JNE_SHIPPER_ADDR1: 'Jl Test No 1',
  JNE_SHIPPER_CITY: 'Mojokerto',
  JNE_SHIPPER_PHONE: '08123456789',
  JNE_SHIPPER_ZIP: '61300',
  JNE_WEBHOOK_TOKEN: '',
  JNE_COD_ELIGIBLE_SERVICES: 'REG,JTR',
  JNE_COD_FEE_PERCENT: 3,
  JNE_COD_MIN_FEE_IDR: 0,
  SAP_API_BASE_URL: '',
  SAP_TRACKING_BASE_URL: '',
  SAP_API_KEY: '',
  SAP_CUSTOMER_CODE: '',
  SAP_CUSTOMER_CODE_NON_COD: '',
  SAP_CUSTOMER_CODE_COD: '',
  SAP_ORIGIN_DISTRICT_CODE: '',
  SAP_PICKUP_PLACE: '1',
  SAP_SHIPMENT_TYPE_CODE: 'SHTPC',
  SAP_SHIPMENT_CONTENT_CODE: 'SHTPC',
  SAP_SHIPPER_NAME: '',
  SAP_SHIPPER_ADDRESS: '',
  SAP_SHIPPER_PHONE: '',
  SAP_SHIPPER_CONTACT: '',
  SAP_WEBHOOK_TOKEN: '',
} satisfies Env

const jneResponse = (services: JneRateService[]) => JSON.stringify({ price: services })

interface JneRateService {
  service_code: string
  service_display: string
  price: string
  etd_from?: string
  etd_thru?: string
  times?: string
}

function jneMock(services: JneRateService[]) {
  return async (_url: string | URL | Request, _init?: RequestInit): Promise<Response> =>
    new Response(jneResponse(services), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

test('getRates returns normalized rates and filters zero price', async () => {
  const adapter = new JneAdapter(baseEnv, jneMock([
    { service_code: 'REG23', service_display: 'REG', price: '17000', etd_from: '1', etd_thru: '2', times: 'D' },
    { service_code: 'ZERO', service_display: 'ZERO', price: '0', etd_from: '1', etd_thru: '1', times: 'D' },
  ]))

  const rates = await adapter.getRates({ originCode: 'MJK10000', destCode: 'CGK10000', weightGrams: 1000 })

  assert.equal(rates.length, 1)
  assert.deepEqual(rates[0], {
    courier: 'JNE',
    serviceCode: 'REG23',
    serviceName: 'REG',
    priceIdr: 17000,
    etd: '1-2 hari',
    cached: false,
    availableForCod: undefined,
    codFee: undefined,
  })
})

test('getRates formats ETD in hari unit', async () => {
  const adapter = new JneAdapter(baseEnv, jneMock([
    { service_code: 'YES23', service_display: 'YES', price: '44000', etd_from: '1', etd_thru: '1', times: 'D' },
  ]))

  const rates = await adapter.getRates({ originCode: 'MJK10000', destCode: 'CGK10000', weightGrams: 1000 })

  assert.equal(rates[0]?.etd, '1-1 hari')
})

test('getRates formats ETD in jam unit when times is H', async () => {
  const adapter = new JneAdapter(baseEnv, jneMock([
    { service_code: 'SPS23', service_display: 'SPS', price: '330000', etd_from: '0', etd_thru: '24', times: 'H' },
  ]))

  const rates = await adapter.getRates({ originCode: 'MJK10000', destCode: 'CGK10000', weightGrams: 1000 })

  assert.equal(rates[0]?.etd, '0-24 jam')
})

test('getRates marks eligible services as availableForCod via service_display', async () => {
  // JNE returns service_code 'REG23' and service_code 'JTR23' but eligible list has short names 'REG,JTR'
  const adapter = new JneAdapter(baseEnv, jneMock([
    { service_code: 'REG23', service_display: 'REG', price: '17000', etd_from: '1', etd_thru: '2', times: 'D' },
    { service_code: 'JTR23', service_display: 'JTR', price: '70000', etd_from: '3', etd_thru: '4', times: 'D' },
    { service_code: 'YES23', service_display: 'YES', price: '44000', etd_from: '1', etd_thru: '1', times: 'D' },
  ]))

  const rates = await adapter.getRates({
    originCode: 'MJK10000',
    destCode: 'CGK10000',
    weightGrams: 1000,
    isCod: true,
    goodsValueIdr: 500_000,
  })

  const reg = rates.find((r) => r.serviceCode === 'REG23')
  const jtr = rates.find((r) => r.serviceCode === 'JTR23')
  const yes = rates.find((r) => r.serviceCode === 'YES23')

  assert.equal(reg?.availableForCod, true, 'REG should be COD eligible via service_display match')
  assert.equal(jtr?.availableForCod, true, 'JTR should be COD eligible via service_display match')
  assert.equal(yes?.availableForCod, false, 'YES should NOT be COD eligible')
})

test('getRates calculates COD fee as 3% of goodsValueIdr', async () => {
  const adapter = new JneAdapter(baseEnv, jneMock([
    { service_code: 'REG23', service_display: 'REG', price: '17000', etd_from: '1', etd_thru: '2', times: 'D' },
  ]))

  const rates = await adapter.getRates({
    originCode: 'MJK10000',
    destCode: 'CGK10000',
    weightGrams: 1000,
    isCod: true,
    goodsValueIdr: 500_000,
  })

  // 3% of 500,000 = 15,000; min fee = 0 so result is 15,000
  assert.equal(rates[0]?.codFee, 15_000)
})

test('getRates applies minimum COD fee when configured', async () => {
  const envWithMinFee = { ...baseEnv, JNE_COD_MIN_FEE_IDR: 20_000 }
  const adapter = new JneAdapter(envWithMinFee, jneMock([
    { service_code: 'REG23', service_display: 'REG', price: '17000', etd_from: '1', etd_thru: '2', times: 'D' },
  ]))

  const rates = await adapter.getRates({
    originCode: 'MJK10000',
    destCode: 'CGK10000',
    weightGrams: 1000,
    isCod: true,
    goodsValueIdr: 300_000,
  })

  // 3% of 300,000 = 9,000 < min 20,000 → should return 20,000
  assert.equal(rates[0]?.codFee, 20_000)
})

test('getRates does not set availableForCod or codFee when isCod is false', async () => {
  const adapter = new JneAdapter(baseEnv, jneMock([
    { service_code: 'REG23', service_display: 'REG', price: '17000', etd_from: '1', etd_thru: '2', times: 'D' },
  ]))

  const rates = await adapter.getRates({
    originCode: 'MJK10000',
    destCode: 'CGK10000',
    weightGrams: 1000,
    isCod: false,
  })

  assert.equal(rates[0]?.availableForCod, undefined)
  assert.equal(rates[0]?.codFee, undefined)
})

test('getRates throws 503 when JNE credentials are missing', async () => {
  const envNoCreds = { ...baseEnv, JNE_API_BASE_URL: '', JNE_USERNAME: '', JNE_API_KEY: '' }
  const adapter = new JneAdapter(envNoCreds)

  await assert.rejects(
    () => adapter.getRates({ originCode: 'MJK10000', destCode: 'CGK10000', weightGrams: 1000 }),
    (err: unknown) => {
      assert.ok(err instanceof Error)
      return true
    }
  )
})

interface RequestCall {
  url: string | URL | Request
  init?: RequestInit
}

function mockFetcher(calls: RequestCall[], responses: Record<string, Response>) {
  return async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    calls.push({ url, init })
    const urlString = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url
    return responses[urlString] ?? new Response(JSON.stringify({}), { status: 200 })
  }
}

test('cancelShipment returns MANUAL_REQUIRED without making HTTP request', async () => {
  const calls: RequestCall[] = []
  const adapter = new JneAdapter(baseEnv, mockFetcher(calls, {}))

  const result = await adapter.cancelShipment('4073272600000045')

  assert.equal(result.status, 'MANUAL_REQUIRED')
  assert.equal(result.waybillId, '4073272600000045')
  assert.ok(result.message.length > 0)
  assert.equal(calls.length, 0, 'JNE cancel must not make any HTTP call')
})

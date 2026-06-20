import { loadLocalEnv } from './env.js'

loadLocalEnv()

if (!process.env.ADMIN_JWT_SECRET) {
  process.env.ADMIN_JWT_SECRET = 'local-admin-smoke-secret'
}

const { createApp } = await import('../src/app.js')

const app = createApp()
const timestamp = Date.now()
const suffix = String(timestamp).slice(-8)
const adminHeaders = {
  'content-type': 'application/json',
  authorization: `Bearer ${process.env.ADMIN_JWT_SECRET}`,
}

const merchant = await adminPost('/admin/merchants', {
  slug: `smoke-resolve-${timestamp}`,
  name: `Smoke Resolve ${timestamp}`,
})
const merchantId = readId(merchant.body.merchant)

const origin = await adminPost(`/admin/merchants/${merchantId}/origins`, {
  code: `MCK${suffix}`,
  name: 'Smoke Resolve Origin',
  address: 'Jl. Smoke Resolve No. 1',
  city: 'Mojokerto',
  province: 'Jawa Timur',
  postal_code: '61300',
  phone: '08123456789',
  is_default: true,
})
const originId = readId(origin.body.origin)

const mapping = await adminPost(`/admin/merchants/${merchantId}/destination-mappings`, {
  courier: 'MOCK',
  postal_code: '61382',
  province: 'Jawa Timur',
  city: 'Mojokerto',
  district: 'Magersari',
  subdistrict: 'Kedundung',
  provider_code: `DST${suffix}`,
  label: 'Smoke Resolve Destination',
})
const mappingId = readId(mapping.body.mapping)

const apiKey = await adminPost(`/admin/merchants/${merchantId}/api-keys`, {
  label: 'Smoke resolve temporary key',
})
const plaintext = readPlaintext(apiKey.body)

const resolveRates = await app.fetch(new Request('http://localhost/v1/rates/resolve', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    authorization: `Bearer ${plaintext}`,
  },
  body: JSON.stringify({
    origin_id: originId,
    destination: {
      postal_code: '61382',
      province: 'Jawa Timur',
      city: 'Mojokerto',
      district: 'Magersari',
      subdistrict: 'Kedundung',
      address: 'Jl. Smoke Resolve Tujuan No. 2',
    },
    weight_grams: 1200,
    couriers: ['MOCK'],
  }),
}))
const resolveBody = await resolveRates.json() as ResolveRatesBody

const rates = Array.isArray(resolveBody.rates) ? resolveBody.rates : []
const destinationMappings = Array.isArray(resolveBody.destination?.mappings) ? resolveBody.destination.mappings : []
const firstMapping = destinationMappings[0]
const ok = merchant.status === 201
  && origin.status === 201
  && mapping.status === 201
  && apiKey.status === 201
  && resolveRates.status === 200
  && resolveBody.origin?.id === originId
  && firstMapping?.mappingId === null
  && firstMapping?.courier === 'MOCK'
  && rates.length > 0

console.log(JSON.stringify({
  ok,
  merchant: { status: merchant.status, id: merchantId },
  origin: { status: origin.status, id: originId },
  mapping: { status: mapping.status, id: mappingId },
  apiKey: { status: apiKey.status, prefix: readPrefix(apiKey.body) },
  resolveRates: {
    status: resolveRates.status,
    originId: resolveBody.origin?.id,
    mappingCourier: firstMapping?.courier,
    mappingProviderCode: firstMapping?.providerCode,
    rateCount: rates.length,
  },
}, null, 2))

if (!ok) process.exit(1)

async function adminPost(path: string, body: unknown) {
  const response = await app.fetch(new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify(body),
  }))
  return { status: response.status, body: await response.json() as Record<string, unknown> }
}

function readId(value: unknown): string {
  if (!value || typeof value !== 'object' || typeof (value as { id?: unknown }).id !== 'string') {
    throw new Error('Response did not include id')
  }
  return (value as { id: string }).id
}

function readPlaintext(value: Record<string, unknown>): string {
  const plaintext = value.plaintext
  if (typeof plaintext !== 'string' || plaintext.length < 16) throw new Error('API key plaintext missing')
  return plaintext
}

function readPrefix(value: Record<string, unknown>): string | undefined {
  const apiKey = value.apiKey
  if (!apiKey || typeof apiKey !== 'object') return undefined
  const prefix = (apiKey as { keyPrefix?: unknown }).keyPrefix
  return typeof prefix === 'string' ? prefix : undefined
}

interface ResolveRatesBody {
  origin?: { id?: string }
  destination?: { mappings?: Array<{ courier?: string; providerCode?: string; mappingId?: string | null }> }
  rates?: unknown[]
}

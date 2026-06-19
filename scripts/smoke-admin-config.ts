import { loadLocalEnv } from './env.js'

loadLocalEnv()

if (!process.env.ADMIN_JWT_SECRET) {
  process.env.ADMIN_JWT_SECRET = 'local-admin-smoke-secret'
}

const { createApp } = await import('../src/app.js')

const app = createApp()
const timestamp = Date.now()
const merchantSlug = `smoke-logistics-${timestamp}`
const adminHeaders = {
  'content-type': 'application/json',
  authorization: `Bearer ${process.env.ADMIN_JWT_SECRET}`,
}

const merchant = await request('/admin/merchants', {
  slug: merchantSlug,
  name: `Smoke Logistics ${timestamp}`,
})

const merchantId = readId(merchant.body.merchant)

const store = await request(`/admin/merchants/${merchantId}/stores`, {
  slug: 'main-branch',
  name: 'Main Branch',
})

const storeId = readId(store.body.store)

const origin = await request(`/admin/merchants/${merchantId}/origins`, {
  store_id: storeId,
  code: `ORG${String(timestamp).slice(-8)}`,
  name: 'Smoke Origin',
  address: 'Jl. Smoke Logistics No. 1',
  city: 'Mojokerto',
  province: 'Jawa Timur',
  postal_code: '61300',
  phone: '08123456789',
  is_default: true,
})

const originId = readId(origin.body.origin)

const courierService = await request('/admin/courier-services', {
  courier: 'MOCK',
  service_code: `REG-${String(timestamp).slice(-6)}`,
  service_name: 'Mock Regular Smoke',
  metadata: { smoke: true },
})

const courierServiceId = readId(courierService.body.service)

const assignment = await request(`/admin/merchants/${merchantId}/courier-services/${courierServiceId}`, {
  origin_id: originId,
  status: 'ACTIVE',
}, 'PUT')

const [stores, origins, services, merchantServices, shipments, relays] = await Promise.all([
  get(`/admin/merchants/${merchantId}/stores`),
  get(`/admin/merchants/${merchantId}/origins`),
  get('/admin/courier-services?courier=MOCK&status=ACTIVE'),
  get(`/admin/merchants/${merchantId}/courier-services`),
  get(`/admin/shipments?merchant_id=${merchantId}`),
  get(`/admin/webhook-relays?merchant_id=${merchantId}`),
])

const ok = merchant.status === 201
  && store.status === 201
  && origin.status === 201
  && courierService.status === 201
  && assignment.status === 200
  && Array.isArray(stores.body.stores)
  && Array.isArray(origins.body.origins)
  && Array.isArray(services.body.services)
  && Array.isArray(merchantServices.body.services)
  && Array.isArray(shipments.body.shipments)
  && Array.isArray(relays.body.attempts)

console.log(JSON.stringify({
  ok,
  merchant: { status: merchant.status, id: merchantId, slug: merchantSlug },
  store: { status: store.status, id: storeId },
  origin: { status: origin.status, id: originId },
  courierService: { status: courierService.status, id: courierServiceId },
  assignment: { status: assignment.status, id: readId(assignment.body.service) },
  lists: {
    stores: stores.body.stores.length,
    origins: origins.body.origins.length,
    services: services.body.services.length,
    merchantServices: merchantServices.body.services.length,
    shipments: shipments.body.shipments.length,
    relays: relays.body.attempts.length,
  },
}, null, 2))

if (!ok) process.exit(1)

async function request(path: string, body: unknown, method = 'POST') {
  const response = await app.fetch(new Request(`http://localhost${path}`, {
    method,
    headers: adminHeaders,
    body: JSON.stringify(body),
  }))
  return { status: response.status, body: await response.json() as Record<string, unknown> }
}

async function get(path: string) {
  const response = await app.fetch(new Request(`http://localhost${path}`, { headers: adminHeaders }))
  return { status: response.status, body: await response.json() as Record<string, unknown> }
}

function readId(value: unknown): string {
  if (!value || typeof value !== 'object' || typeof (value as { id?: unknown }).id !== 'string') {
    throw new Error('Response did not include id')
  }
  return (value as { id: string }).id
}

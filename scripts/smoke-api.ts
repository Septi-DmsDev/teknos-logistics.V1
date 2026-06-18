import { createApp } from '../src/app.js'
import { loadLocalEnv } from './env.js'

loadLocalEnv()

const apiKey = process.env.TEKNOS_INTERNAL_API_KEY
if (!apiKey) throw new Error('TEKNOS_INTERNAL_API_KEY missing in .env.local')

const app = createApp()
const headers = {
  'content-type': 'application/json',
  authorization: `Bearer ${apiKey}`,
}
const externalOrderId = process.env.SMOKE_EXTERNAL_ORDER_ID ?? `TKN-SMOKE-${Date.now()}`

const rates = await request('/v1/rates', {
  origin_code: 'MJK10000',
  dest_code: 'CGK10000',
  weight_grams: 1500,
  couriers: ['MOCK'],
})

const firstBooking = await request('/v1/shipments', {
  external_order_id: externalOrderId,
  courier: 'MOCK',
  service_code: 'REG',
  origin_code: 'MJK10000',
  dest_code: 'CGK10000',
  weight_grams: 1500,
  recipient: { name: 'Teknos Smoke', phone: '08123456789', address: 'Jl. Smoke Test No. 1' },
})

const secondBooking = await request('/v1/shipments', {
  external_order_id: externalOrderId,
  courier: 'MOCK',
  service_code: 'REG',
  origin_code: 'MJK10000',
  dest_code: 'CGK10000',
  weight_grams: 1500,
  recipient: { name: 'Teknos Smoke', phone: '08123456789', address: 'Jl. Smoke Test No. 1' },
})

const shipmentId = firstBooking.body.shipment?.id
if (!shipmentId) throw new Error('Smoke booking did not return shipment id')
const tracking = await app.fetch(new Request(`http://localhost/v1/shipments/${shipmentId}/tracking`, { headers }))
const trackingBody = await tracking.json()

console.log(JSON.stringify({
  ok: true,
  rates: { status: rates.status, count: rates.body.rates?.length ?? 0 },
  booking: { status: firstBooking.status, shipmentId, shipmentStatus: firstBooking.body.shipment?.status, hasWaybill: Boolean(firstBooking.body.shipment?.waybillId) },
  idempotency: { status: secondBooking.status, idempotent: secondBooking.body.idempotent, sameShipment: secondBooking.body.shipment?.id === shipmentId },
  tracking: { status: tracking.status, count: trackingBody.tracking?.length ?? 0 },
}, null, 2))

async function request(path: string, body: unknown) {
  const response = await app.fetch(new Request(`http://localhost${path}`, { method: 'POST', headers, body: JSON.stringify(body) }))
  return { status: response.status, body: await response.json() as Record<string, unknown> }
}

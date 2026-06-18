import { createApp } from '../src/app.js'
import { createPrismaClient } from '../src/db/client.js'
import { loadLocalEnv } from './env.js'

loadLocalEnv()

const token = process.env.JNE_WEBHOOK_TOKEN
if (!token) throw new Error('JNE_WEBHOOK_TOKEN missing in .env.local')

const prisma = createPrismaClient()
const app = createApp()
const waybillId = `JNESMOKE${Date.now()}`
const occurredAt = new Date('2026-06-18T06:40:00.000Z').toISOString()

try {
  const merchant = await prisma.merchant.upsert({
    where: { slug: 'teknos' },
    update: { isActive: true },
    create: { slug: 'teknos', name: 'Teknos Internal', isActive: true },
    select: { id: true },
  })

  await prisma.shipment.create({
    data: {
      merchantId: merchant.id,
      externalOrderId: `WEBHOOK-SMOKE-${waybillId}`,
      courier: 'JNE',
      courierOrderId: waybillId,
      waybillId,
      status: 'BOOKED',
      serviceCode: 'REG',
      serviceName: 'JNE Regular',
      originCode: process.env.JNE_ORIGIN_CODE || 'MJK10000',
      destCode: process.env.JNE_SMOKE_DEST_CODE || 'CGK10302',
      weightGrams: 1000,
      recipientName: 'Webhook Smoke',
      recipientPhone: '0800000000',
      recipientAddress: 'Synthetic local smoke shipment',
      bookedAt: new Date(),
    },
  })

  const payload = {
    cnote_no: waybillId,
    status: 'DELIVERED',
    description: 'Webhook smoke delivered',
    date: occurredAt,
  }

  const first = await postWebhook(payload)
  const second = await postWebhook(payload)
  const tracking = await prisma.shipmentTracking.count({ where: { shipment: { waybillId } } })
  const events = await prisma.webhookEvent.count({ where: { shipment: { waybillId }, eventKey: { not: null } } })

  console.log(JSON.stringify({
    ok: first.status === 200 && second.status === 200 && second.body.duplicate === true && tracking === 1 && events === 1,
    first: { status: first.status, duplicate: first.body.duplicate, shipmentStatus: first.body.shipment?.status },
    second: { status: second.status, duplicate: second.body.duplicate, shipmentStatus: second.body.shipment?.status },
    trackingCount: tracking,
    eventCount: events,
  }, null, 2))
} finally {
  await prisma.$disconnect()
}

interface WebhookSmokeResponse {
  duplicate?: boolean
  shipment?: { status?: string }
  [key: string]: unknown
}

async function postWebhook(payload: unknown) {
  const response = await app.fetch(new Request('http://localhost/webhooks/jne', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-jne-token': token as string,
    },
    body: JSON.stringify(payload),
  }))
  return { status: response.status, body: await response.json() as WebhookSmokeResponse }
}


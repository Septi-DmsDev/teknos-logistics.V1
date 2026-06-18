import { createServer } from 'node:http'
import { randomBytes } from 'node:crypto'
import { createPrismaClient } from '../src/db/client.js'
import { WebhookRepository } from '../src/repositories/webhook.repository.js'
import { WebhookRelayService } from '../src/services/webhook-relay.service.js'
import { verifyWebhookSignature } from '../src/utils/crypto.js'
import { loadLocalEnv } from './env.js'

loadLocalEnv()

const prisma = createPrismaClient()
const endpointSecret = randomBytes(32).toString('base64url')
let received = 0
let signatureValid = false
let receivedEventId = ''

const server = createServer(async (req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405).end()
    return
  }

  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(Buffer.from(chunk))
  const body = Buffer.concat(chunks).toString('utf8')
  received += 1
  receivedEventId = String(req.headers['x-teknos-event-id'] ?? '')
  signatureValid = verifyWebhookSignature(body, String(req.headers['x-teknos-signature'] ?? ''), endpointSecret)
  res.writeHead(signatureValid ? 204 : 401).end()
})

try {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Local smoke server failed to bind')
  const endpointUrl = `http://127.0.0.1:${address.port}/webhooks/logistics`

  const merchant = await prisma.merchant.upsert({
    where: { slug: 'teknos' },
    update: { isActive: true },
    create: { slug: 'teknos', name: 'Teknos Internal', isActive: true },
    select: { id: true },
  })

  const endpoint = await prisma.merchantWebhookEndpoint.create({
    data: {
      merchantId: merchant.id,
      url: endpointUrl,
      secret: endpointSecret,
      isActive: true,
    },
    select: { id: true },
  })

  const shipment = await prisma.shipment.create({
    data: {
      merchantId: merchant.id,
      externalOrderId: `RELAY-SMOKE-${Date.now()}`,
      courier: 'JNE',
      courierOrderId: `RELAY${Date.now()}`,
      waybillId: `RELAY${Date.now()}`,
      status: 'DELIVERED',
      serviceCode: 'REG',
      serviceName: 'JNE Regular',
      originCode: process.env.JNE_ORIGIN_CODE || 'MJK10000',
      destCode: process.env.JNE_SMOKE_DEST_CODE || 'CGK10302',
      weightGrams: 1000,
      recipientName: 'Relay Smoke',
      recipientPhone: '0800000000',
      recipientAddress: 'Synthetic relay smoke shipment',
      bookedAt: new Date(),
      deliveredAt: new Date(),
    },
    select: { id: true },
  })

  const event = await prisma.webhookEvent.create({
    data: {
      eventKey: `relay-smoke-${Date.now()}`,
      shipmentId: shipment.id,
      courier: 'JNE',
      eventType: 'shipment.status_updated',
      rawPayload: { smoke: true },
      normalized: {
        waybillId: 'RELAYSMOKE',
        status: 'DELIVERED',
        description: 'Relay smoke delivered',
        occurredAt: new Date().toISOString(),
      },
      processedAt: new Date(),
    },
    select: { id: true },
  })

  const attempt = await prisma.webhookRelayAttempt.create({
    data: {
      eventId: event.id,
      endpointId: endpoint.id,
      status: 'PENDING',
      attemptCount: 0,
      nextRetryAt: new Date(),
    },
    select: { id: true },
  })

  const result = await new WebhookRelayService(new WebhookRepository(prisma)).processDue({ limit: 10, timeoutMs: 5_000 })
  const updatedAttempt = await prisma.webhookRelayAttempt.findUniqueOrThrow({ where: { id: attempt.id } })

  console.log(JSON.stringify({
    ok: result.success === 1 && updatedAttempt.status === 'SUCCESS' && received === 1 && signatureValid && receivedEventId === event.id,
    result,
    relayAttempt: {
      status: updatedAttempt.status,
      attemptCount: updatedAttempt.attemptCount,
      httpStatus: updatedAttempt.httpStatus,
    },
    received,
    signatureValid,
  }, null, 2))
} finally {
  await prisma.$disconnect()
  await new Promise<void>((resolve) => server.close(() => resolve()))
}

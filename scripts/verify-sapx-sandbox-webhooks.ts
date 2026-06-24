import { loadLocalEnv } from './env.js'
loadLocalEnv()
const { createPrismaClient } = await import('../src/db/client.js')
const prisma = createPrismaClient()

const awbs = ['DEV00845560419', 'DEV00845560420']

try {
  const shipments = await prisma.shipment.findMany({
    where: { waybillId: { in: awbs } },
    include: {
      trackingEvents: { orderBy: { occurredAt: 'asc' } },
    },
    orderBy: { createdAt: 'asc' },
  })

  for (const shipment of shipments) {
    console.log(JSON.stringify({
      waybillId: shipment.waybillId,
      externalOrderId: shipment.externalOrderId,
      status: shipment.status,
      bookedAt: shipment.bookedAt,
      deliveredAt: shipment.deliveredAt,
      updatedAt: shipment.updatedAt,
      trackingCount: shipment.trackingEvents.length,
      trackingEvents: shipment.trackingEvents.map((e) => ({
        status: e.status,
        description: e.description,
        occurredAt: e.occurredAt,
        isDuplicate: e.isDuplicate ?? false,
      })),
    }, null, 2))
  }

  if (shipments.length === 0) {
    console.log(JSON.stringify({ ok: false, error: 'No shipments found for sandbox AWBs' }))
  }
} finally {
  await prisma.$disconnect()
}

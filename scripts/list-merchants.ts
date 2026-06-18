import { loadLocalEnv } from './env.js'

loadLocalEnv()

const { createPrismaClient } = await import('../src/db/client.js')
const prisma = createPrismaClient()

try {
  const merchants = await prisma.merchant.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      isActive: true,
      apiKeys: { select: { id: true, keyPrefix: true, label: true, isActive: true, createdAt: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
  console.log(JSON.stringify({ ok: true, merchants }, null, 2))
} finally {
  await prisma.$disconnect()
}

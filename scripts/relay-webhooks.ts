import { createPrismaClient } from '../src/db/client.js'
import { WebhookRepository } from '../src/repositories/webhook.repository.js'
import { WebhookRelayService } from '../src/services/webhook-relay.service.js'
import { loadLocalEnv, parseArgs } from './env.js'

loadLocalEnv()
const args = parseArgs(process.argv.slice(2))
const limit = typeof args.limit === 'string' ? Number(args.limit) : undefined

const prisma = createPrismaClient()
try {
  const service = new WebhookRelayService(new WebhookRepository(prisma))
  const result = await service.processDue({ limit })
  console.log(JSON.stringify({ ok: true, ...result }, null, 2))
} finally {
  await prisma.$disconnect()
}

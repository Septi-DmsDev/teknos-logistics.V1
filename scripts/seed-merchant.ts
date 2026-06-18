import { loadLocalEnv, parseArgs } from './env.js'

loadLocalEnv()

const args = parseArgs(process.argv.slice(2))
const slug = String(args.slug ?? process.env.SEED_MERCHANT_SLUG ?? 'teknos')
const name = String(args.name ?? process.env.SEED_MERCHANT_NAME ?? 'Teknos Internal')

const { createPrismaClient } = await import('../src/db/client.js')
const prisma = createPrismaClient()

try {
  const merchant = await prisma.merchant.upsert({
    where: { slug },
    update: { name, isActive: true },
    create: { slug, name, isActive: true },
    select: { id: true, slug: true, name: true, isActive: true },
  })

  console.log(JSON.stringify({ ok: true, merchant }, null, 2))
} finally {
  await prisma.$disconnect()
}

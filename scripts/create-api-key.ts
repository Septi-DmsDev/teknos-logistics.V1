import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createApiKey } from '../src/utils/crypto.js'
import { loadLocalEnv, parseArgs } from './env.js'

loadLocalEnv()

const args = parseArgs(process.argv.slice(2))
const merchantSlug = String(args['merchant-slug'] ?? args.merchant ?? process.env.SEED_MERCHANT_SLUG ?? 'teknos')
const label = String(args.label ?? 'local')
const environment = args.environment === 'test' ? 'test' : 'live'
const writeEnv = typeof args['write-env'] === 'string' ? args['write-env'] : undefined

const { createPrismaClient } = await import('../src/db/client.js')
const prisma = createPrismaClient()

try {
  const merchant = await prisma.merchant.findUnique({ where: { slug: merchantSlug }, select: { id: true, slug: true } })
  if (!merchant) throw new Error(`Merchant not found: ${merchantSlug}. Run npm run seed:merchant first.`)

  const key = createApiKey(environment)
  const apiKey = await prisma.apiKey.create({
    data: {
      merchantId: merchant.id,
      keyHash: key.keyHash,
      keyPrefix: key.keyPrefix,
      label,
      isActive: true,
    },
    select: { id: true, keyPrefix: true, label: true, merchantId: true, createdAt: true },
  })

  if (writeEnv) writeSecretToEnvLocal(writeEnv, key.plaintext)

  const result = {
    ok: true,
    apiKey,
    plaintext: writeEnv ? `stored in .env.local as ${writeEnv}` : key.plaintext,
  }

  console.log(JSON.stringify(result, null, 2))
} finally {
  await prisma.$disconnect()
}

function writeSecretToEnvLocal(name: string, value: string): void {
  if (!/^[A-Z_][A-Z0-9_]*$/.test(name)) throw new Error(`Invalid env var name: ${name}`)
  const path = '.env.local'
  const line = `${name}="${value}"`
  const lines = existsSync(path) ? readFileSync(path, 'utf8').trimEnd().split(/\r?\n/) : []
  const index = lines.findIndex((item) => item.startsWith(`${name}=`))
  if (index >= 0) {
    lines[index] = line
  } else {
    lines.push(line)
  }
  writeFileSync(path, `${lines.join('\n')}\n`)
}


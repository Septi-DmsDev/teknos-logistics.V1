import { prisma } from '../src/db/client.js'
import { loadLocalEnv, parseArgs } from './env.js'

loadLocalEnv()

const args = parseArgs(process.argv.slice(2))
const days = Number(args.days ?? process.env.ADMIN_AUDIT_RETENTION_DAYS ?? 90)
const dryRun = args['dry-run'] !== false

if (!Number.isInteger(days) || days < 1 || days > 3650) {
  throw new Error('--days must be an integer between 1 and 3650')
}

const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
const where = { createdAt: { lt: cutoff } }
const matching = await prisma.adminAuditLog.count({ where })
let deleted = 0

if (!dryRun) {
  const result = await prisma.adminAuditLog.deleteMany({ where })
  deleted = result.count
}

console.log(JSON.stringify({
  ok: true,
  dryRun,
  days,
  cutoff: cutoff.toISOString(),
  matching,
  deleted,
}, null, 2))

await prisma.$disconnect()

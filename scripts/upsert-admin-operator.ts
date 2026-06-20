import { AdminOperatorRole } from '@prisma/client'
import { loadLocalEnv, parseArgs } from './env.js'

loadLocalEnv()

const args = parseArgs(process.argv.slice(2))
const supabaseUserId = stringArg(args['supabase-user-id'] ?? args.user)
const email = stringArg(args.email)
const role = roleArg(args.role ?? 'SUPER_ADMIN')

if (!supabaseUserId) throw new Error('Missing --supabase-user-id')
if (!email) throw new Error('Missing --email')

const { createPrismaClient } = await import('../src/db/client.js')
const prisma = createPrismaClient()

try {
  const operator = await prisma.adminOperator.upsert({
    where: { supabaseUserId },
    create: { supabaseUserId, email, role, isActive: true },
    update: { email, role, isActive: true },
    select: { id: true, supabaseUserId: true, email: true, role: true, isActive: true, updatedAt: true },
  })

  console.log(JSON.stringify({ ok: true, operator }, null, 2))
} finally {
  await prisma.$disconnect()
}

function stringArg(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function roleArg(value: unknown): AdminOperatorRole {
  const role = stringArg(value)
  if (!Object.values(AdminOperatorRole).includes(role as AdminOperatorRole)) {
    throw new Error(`Invalid role: ${role}. Use one of ${Object.values(AdminOperatorRole).join(', ')}`)
  }
  return role as AdminOperatorRole
}

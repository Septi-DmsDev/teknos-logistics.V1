import { AdminOperatorRole } from '@prisma/client'
import { loadLocalEnv, parseArgs } from './env.js'

loadLocalEnv()

const args = parseArgs(process.argv.slice(2))
const email = stringArg(args.email ?? process.env.ADMIN_BOOTSTRAP_EMAIL)
const password = stringArg(args.password ?? process.env.ADMIN_BOOTSTRAP_PASSWORD)
const role = roleArg(args.role ?? 'SUPER_ADMIN')
const supabaseUrl = requiredEnv('SUPABASE_URL').replace(/\/$/, '')
const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY')

if (!email) throw new Error('Missing admin email. Set ADMIN_BOOTSTRAP_EMAIL or pass --email')
if (!password) throw new Error('Missing admin password. Set ADMIN_BOOTSTRAP_PASSWORD or pass --password')

const { createPrismaClient } = await import('../src/db/client.js')
const prisma = createPrismaClient()

try {
  const user = await ensureSupabaseUser({ supabaseUrl, serviceRoleKey, email, password })
  const operator = await prisma.adminOperator.upsert({
    where: { supabaseUserId: user.id },
    create: { supabaseUserId: user.id, email: user.email ?? email, role, isActive: true },
    update: { email: user.email ?? email, role, isActive: true },
    select: { id: true, supabaseUserId: true, email: true, role: true, isActive: true, updatedAt: true },
  })

  console.log(JSON.stringify({ ok: true, user: { id: user.id, email: user.email, created: user.created }, operator }, null, 2))
} finally {
  await prisma.$disconnect()
}

async function ensureSupabaseUser(input: { supabaseUrl: string; serviceRoleKey: string; email: string; password: string }): Promise<{ id: string; email?: string; created: boolean }> {
  const existing = await findUserByEmail(input)
  if (existing) return { ...existing, created: false }

  const response = await fetch(`${input.supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: adminHeaders(input.serviceRoleKey),
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { source: 'teknos-logistics-admin-bootstrap' },
    }),
  })

  const body = await response.json().catch(() => ({})) as SupabaseUserResponse
  if (!response.ok || !body.id) {
    throw new Error(`Supabase admin user create failed: HTTP ${response.status} ${safeError(body)}`)
  }
  return { id: body.id, email: body.email ?? input.email, created: true }
}

async function findUserByEmail(input: { supabaseUrl: string; serviceRoleKey: string; email: string }): Promise<{ id: string; email?: string } | null> {
  const response = await fetch(`${input.supabaseUrl}/auth/v1/admin/users?per_page=100`, {
    method: 'GET',
    headers: adminHeaders(input.serviceRoleKey),
  })
  const body = await response.json().catch(() => ({})) as SupabaseUsersResponse
  if (!response.ok) throw new Error(`Supabase admin users lookup failed: HTTP ${response.status} ${safeError(body)}`)
  const users = Array.isArray(body.users) ? body.users : []
  const found = users.find((user) => user.email?.toLowerCase() === input.email.toLowerCase())
  return found?.id ? { id: found.id, email: found.email } : null
}

function adminHeaders(serviceRoleKey: string): Record<string, string> {
  return {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
    'content-type': 'application/json',
  }
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} missing in .env.local`)
  return value
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

function safeError(body: unknown): string {
  if (!body || typeof body !== 'object') return ''
  const record = body as Record<string, unknown>
  const message = typeof record.msg === 'string' ? record.msg : typeof record.message === 'string' ? record.message : 'unknown error'
  return message.slice(0, 200)
}

interface SupabaseUserResponse {
  id?: string
  email?: string
  msg?: string
  message?: string
}

interface SupabaseUsersResponse {
  users?: SupabaseUserResponse[]
  msg?: string
  message?: string
}

import { loadLocalEnv } from './env.js'

loadLocalEnv()
process.env.ADMIN_AUTH_PROVIDER = 'supabase'

const email = requiredEnv('ADMIN_BOOTSTRAP_EMAIL')
const password = requiredEnv('ADMIN_BOOTSTRAP_PASSWORD')
const supabaseUrl = requiredEnv('SUPABASE_URL').replace(/\/$/, '')
const anonKey = requiredEnv('SUPABASE_ANON_KEY')

const { createApp } = await import('../src/app.js')

const token = await signIn(email, password)
const app = createApp()
const headers = { authorization: `Bearer ${token}` }

const merchants = await app.fetch(new Request('http://localhost/admin/merchants?limit=1', { headers }))
if (!merchants.ok) throw new Error(`Supabase admin auth read failed: HTTP ${merchants.status}`)

const auditTrigger = await app.fetch(new Request('http://localhost/admin/merchants', {
  method: 'POST',
  headers: { ...headers, 'content-type': 'application/json' },
  body: JSON.stringify({ slug: `supabase-smoke-${Date.now()}`, name: 'Supabase Smoke Merchant' }),
}))
if (auditTrigger.status !== 201) throw new Error(`Supabase admin auth mutation failed: HTTP ${auditTrigger.status}`)

const auditLogs = await app.fetch(new Request('http://localhost/admin/audit-logs?limit=5', { headers }))
const auditBody = await auditLogs.json() as { logs?: Array<{ authProvider?: string | null; actorEmail?: string | null; actorRole?: string | null }> }
const logs = Array.isArray(auditBody.logs) ? auditBody.logs : []
const matchedAudit = logs.find((log) => log.authProvider === 'supabase' && log.actorEmail === email)

const ok = merchants.status === 200 && auditTrigger.status === 201 && auditLogs.status === 200 && Boolean(matchedAudit)
console.log(JSON.stringify({
  ok,
  auth: { provider: 'supabase', email, tokenReceived: Boolean(token) },
  merchants: { status: merchants.status },
  mutation: { status: auditTrigger.status },
  audit: { status: auditLogs.status, hasSupabaseIdentity: Boolean(matchedAudit), role: matchedAudit?.actorRole ?? null },
}, null, 2))

if (!ok) process.exit(1)

async function signIn(email: string, password: string): Promise<string> {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })
  const body = await response.json().catch(() => ({})) as { access_token?: string; error_description?: string; msg?: string; message?: string }
  if (!response.ok || !body.access_token) {
    throw new Error(`Supabase sign-in failed: HTTP ${response.status} ${safeError(body)}`)
  }
  return body.access_token
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} missing in .env.local`)
  return value
}

function safeError(body: Record<string, unknown>): string {
  const message = typeof body.error_description === 'string'
    ? body.error_description
    : typeof body.msg === 'string'
      ? body.msg
      : typeof body.message === 'string'
        ? body.message
        : 'unknown error'
  return message.slice(0, 160)
}

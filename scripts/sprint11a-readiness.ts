import { existsSync, readFileSync } from 'node:fs'

const checks = [
  checkFileIncludes('.env.example', ['ADMIN_AUTH_PROVIDER', 'SUPABASE_URL', 'SUPABASE_JWT_SECRET', 'SUPABASE_SERVICE_ROLE_KEY']),
  checkFileIncludes('prisma/schema.prisma', ['enum AdminOperatorRole', 'model AdminOperator', 'operatorId', 'authProvider']),
  checkFileIncludes('prisma/migrations/20260620113000_add_admin_operators/migration.sql', ['CREATE TABLE "AdminOperator"', 'ALTER TABLE "AdminAuditLog" ADD COLUMN "operatorId"']),
  checkFileIncludes('src/middleware/admin-auth.ts', ['ADMIN_AUTH_PROVIDER', 'supabaseAuth.verifyBearerToken', 'static-token']),
  checkFileIncludes('src/services/supabase-admin-auth.service.ts', ['jwtVerify', 'SUPABASE_JWT_SECRET', 'ADMIN_OPERATOR_NOT_ALLOWED']),
  checkFileIncludes('src/repositories/admin-operator.repository.ts', ['AdminOperatorRepository', 'findActiveBySupabaseUserId']),
  checkFileIncludes('src/middleware/admin-audit.ts', ['getAdminAuth', 'operatorId', 'authProvider']),
  checkFileIncludes('scripts/upsert-admin-operator.ts', ['adminOperator.upsert', 'supabase-user-id']),
  checkFileIncludes('scripts/bootstrap-supabase-admin.ts', ['SUPABASE_SERVICE_ROLE_KEY', 'email_confirm', 'adminOperator.upsert']),
  checkFileIncludes('scripts/smoke-supabase-admin-auth.ts', ['ADMIN_AUTH_PROVIDER', 'supabase', 'hasSupabaseIdentity']),
  checkFileIncludes('src/routes/admin-ui.ts', ['/admin-ui/config.json', 'supabaseAnonKey']),
  checkFileIncludes('src/admin-ui/script.ts', ['loginWithSupabase', '/auth/v1/token?grant_type=password', 'AUTH_PROVIDER_KEY']),
  checkFileIncludes('src/admin-ui/html.ts', ['admin-email', 'admin-password', 'data-auth-field']),
  checkFileIncludes('docs/superpowers/specs/2026-06-20-supabase-admin-auth-foundation.md', ['Supabase Auth', 'AdminOperator']),
  checkFileIncludes('docs/superpowers/plans/2026-06-20-supabase-admin-auth-foundation.md', ['Operator schema', 'Supabase token verifier']),
]

const ok = checks.every((check) => check.ok)
console.log(JSON.stringify({ ok, checks }, null, 2))
if (!ok) process.exit(1)

function checkFileIncludes(file: string, patterns: string[]) {
  if (!existsSync(file)) return { name: file, ok: false, details: ['missing'] }
  const text = readFileSync(file, 'utf8')
  const missing = patterns.filter((pattern) => !text.includes(pattern))
  return { name: file, ok: missing.length === 0, details: missing.length ? missing.map((pattern) => `missing:${pattern}`) : [`patterns=${patterns.length}`] }
}

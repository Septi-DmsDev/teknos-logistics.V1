import { existsSync, readFileSync } from 'node:fs'

const checks = [
  checkFileIncludes('src/app.ts', ['app.get(\'/ready\'', 'rateLimit({ keyPrefix: \'admin\'', 'rateLimit({ keyPrefix: \'merchant\'', 'rateLimit({ keyPrefix: \'webhook\'', 'adminAudit(adminAuditRepository)']),
  checkFileIncludes('prisma/schema.prisma', ['model AdminAuditLog', '@@index([createdAt])']),
  checkFileIncludes('src/routes/admin/audit-logs.ts', ['mountAdminAuditLogRoutes', '/admin/audit-logs']),
  checkFileIncludes('scripts/cleanup-admin-audit-logs.ts', ['ADMIN_AUDIT_RETENTION_DAYS', 'dry-run']),
  checkFileIncludes('docs/SPRINT_8_HARDENING_RUNBOOK.md', ['Sprint 8 Hardening Runbook', 'Validation Gate', 'Rollback Notes']),
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

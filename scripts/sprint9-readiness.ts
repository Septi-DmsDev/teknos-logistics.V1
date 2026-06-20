import { existsSync, readFileSync } from 'node:fs'

const checks = [
  checkFileIncludes('src/routes/admin-ui.ts', ['/admin-ui', '/admin-ui/assets/styles.css', '/admin-ui/assets/app.js']),
  checkFileIncludes('src/admin-ui/html.ts', ['Admin Control Center', 'token-form', 'content-panel']),
  checkFileIncludes('src/admin-ui/script.ts', [
    'loadDashboard',
    'loadMerchants',
    'loadStoresOrigins',
    'loadCourierServicesPage',
    'loadShipmentsPage',
    'loadWebhookRelaysPage',
    'loadAuditLogsPage',
    'No AWB Action',
  ]),
  checkFileIncludes('src/admin-ui/styles.ts', ['.admin-shell', '.management-grid', '.dashboard-grid', '.truncate-text']),
  checkFileIncludes('scripts/smoke-admin-ui.ts', ['/admin/merchants?limit=1', '/admin/audit-logs?limit=1', 'no awb booking action']),
  checkFileIncludes('package.json', ['"smoke:admin-ui"', '"sprint9:readiness"']),
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

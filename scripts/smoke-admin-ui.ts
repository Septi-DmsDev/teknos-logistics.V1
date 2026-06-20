import { loadLocalEnv } from './env.js'

loadLocalEnv()

if (!process.env.ADMIN_JWT_SECRET) {
  process.env.ADMIN_JWT_SECRET = 'local-admin-ui-smoke-secret'
}

const { createApp } = await import('../src/app.js')

const app = createApp()
const adminHeaders = { authorization: `Bearer ${process.env.ADMIN_JWT_SECRET}` }

const [html, css, js, health, ready, merchants, auditLogs] = await Promise.all([
  get('/admin-ui'),
  get('/admin-ui/assets/styles.css'),
  get('/admin-ui/assets/app.js'),
  get('/health'),
  get('/ready'),
  get('/admin/merchants?limit=1', adminHeaders),
  get('/admin/audit-logs?limit=1', adminHeaders),
])

const htmlText = await html.response.text()
const cssText = await css.response.text()
const jsText = await js.response.text()
const healthBody = await readJson(health.response)
const readyBody = await readJson(ready.response)
const merchantsBody = await readJson(merchants.response)
const auditLogsBody = await readJson(auditLogs.response)

const checks = [
  check('admin-ui html route', html.status === 200 && html.contentType.includes('text/html') && htmlText.includes('Admin Control Center')),
  check('admin-ui css route', css.status === 200 && css.contentType.includes('text/css') && cssText.includes('.admin-shell')),
  check('admin-ui js route', js.status === 200 && js.contentType.includes('application/javascript') && jsText.includes('loadDashboard')),
  check('health route', health.status === 200 && healthBody?.ok === true),
  check('ready route', ready.status === 200 && readyBody?.ok === true),
  check('admin merchants read', merchants.status === 200 && Array.isArray(merchantsBody?.merchants)),
  check('admin audit logs read', auditLogs.status === 200 && Array.isArray(auditLogsBody?.logs)),
  check('no awb booking action in admin ui', !/data-action="[^"]*(generatecnote|awb|booking)/i.test(jsText) && !/\/generatecnote/i.test(jsText)),
]

const ok = checks.every((item) => item.ok)
console.log(JSON.stringify({ ok, checks }, null, 2))
if (!ok) process.exit(1)

async function get(path: string, headers: Record<string, string> = {}) {
  const response = await app.fetch(new Request(`http://localhost${path}`, { headers }))
  return { response, status: response.status, contentType: response.headers.get('content-type') || '' }
}

async function readJson(response: Response): Promise<Record<string, unknown> | null> {
  try {
    return await response.clone().json() as Record<string, unknown>
  } catch {
    return null
  }
}

function check(name: string, ok: boolean) {
  return { name, ok }
}


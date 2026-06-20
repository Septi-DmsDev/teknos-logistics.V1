import { existsSync, readFileSync } from 'node:fs'

const checks = [
  checkFileIncludes('src/couriers/capabilities.ts', ['JNT', 'SAP_EXPRESS', 'implementationStatus', 'destinationCodeFormat']),
  checkFileIncludes('src/couriers/jnt/jnt.adapter.ts', ['JntAdapter', 'COURIER_NOT_IMPLEMENTED', 'normalizeWebhook']),
  checkFileIncludes('src/couriers/sap-express/sap-express.adapter.ts', ['SapExpressAdapter', 'COURIER_NOT_IMPLEMENTED', 'normalizeWebhook']),
  checkFileIncludes('src/app.ts', ['new JntAdapter()', 'new SapExpressAdapter()', 'mountCourierRoutes(app)']),
  checkFileIncludes('src/routes/v1/couriers.ts', ['/v1/couriers/capabilities', 'listCourierCapabilities']),
  checkFileIncludes('src/contracts/openapi.ts', ['/v1/couriers/capabilities', 'CourierCapabilityResponse']),
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

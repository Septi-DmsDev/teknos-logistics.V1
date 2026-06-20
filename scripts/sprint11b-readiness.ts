import { existsSync, readFileSync } from 'node:fs'

const checks = [
  checkFileIncludes('src/config/env.ts', ['SAP_API_BASE_URL', 'SAP_TRACKING_BASE_URL', 'SAP_API_KEY', 'SAP_WEBHOOK_TOKEN']),
  checkFileIncludes('.env.example', ['SAP_API_BASE_URL=', 'SAP_API_KEY=', 'SAP_WEBHOOK_TOKEN=']),
  checkFileIncludes('src/couriers/sap-express/sap-express.client.ts', ['/v2/master/shipment_cost', '/v2/shipment/pickup/create', '/v2/shipment/tracking', 'api_key']),
  checkFileIncludes('src/couriers/sap-express/sap-express.adapter.ts', ['getRates', 'bookShipment', 'trackShipment', 'normalizeWebhook', 'SAP_NOT_CONFIGURED']),
  checkFileIncludes('src/couriers/capabilities.ts', ["courier: 'SAP_EXPRESS'", "implementationStatus: 'ACTIVE'", 'supportsRates: true', 'supportsBooking: true', 'supportsTracking: true']),
  checkFileIncludes('src/app.ts', ['new SapExpressAdapter(env)', 'mountSapExpressWebhookRoutes(app, env, courierWebhookService)']),
  checkFileIncludes('src/routes/webhooks/sap-express.ts', ["/webhooks/sap-express", 'x-sap-token', "handleCourierWebhook('SAP_EXPRESS'"]),
  checkFileIncludes('src/contracts/openapi.ts', ["'/webhooks/sap-express'", 'x-sap-token']),
  checkFileIncludes('scripts/smoke-sap-express-adapter.ts', ['SapExpressAdapter', 'sap-test-key', 'POD - DELIVERED']),
  checkFileIncludes('tests/sap-express/sap-express.normalizer.test.ts', ['mapSapExpressStatus', 'POD - DELIVERED', 'OUT_FOR_DELIVERY']),
  checkFileIncludes('tests/sap-express/sap-express.adapter.test.ts', ['getRates returns normalized CourierRate array', 'bookShipment returns booking result', 'trackShipment returns normalized tracking events']),
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

import { createApp } from '../src/app.js'

const app = createApp()
const response = await app.fetch(new Request('http://localhost/openapi.json'))

if (!response.ok) throw new Error(`OpenAPI contract returned HTTP ${response.status}`)

const contract = await response.json() as OpenApiLike
const requiredPaths = ['/v1/rates', '/v1/shipments', '/v1/shipments/{id}/tracking', '/webhooks/jne'] as const
const missingPaths = requiredPaths.filter((path) => !contract.paths[path])

if (missingPaths.length > 0) throw new Error(`OpenAPI contract missing paths: ${missingPaths.join(', ')}`)
if (contract.openapi !== '3.1.0') throw new Error(`Unexpected OpenAPI version: ${contract.openapi}`)
if (!contract.components?.securitySchemes?.bearerAuth) throw new Error('OpenAPI contract missing bearerAuth scheme')

const rates = contract.paths['/v1/rates']?.post
const shipments = contract.paths['/v1/shipments']?.post
const tracking = contract.paths['/v1/shipments/{id}/tracking']?.get
const jneWebhook = contract.paths['/webhooks/jne']?.post

if (!rates?.security?.length) throw new Error('/v1/rates must require bearer auth')
if (!shipments?.security?.length) throw new Error('/v1/shipments must require bearer auth')
if (!tracking?.security?.length) throw new Error('/v1/shipments/{id}/tracking must require bearer auth')
if (!jneWebhook?.parameters?.some((parameter) => parameter.name === 'x-jne-token')) throw new Error('/webhooks/jne must document x-jne-token')

console.log(JSON.stringify({
  ok: true,
  openapi: contract.openapi,
  title: contract.info.title,
  requiredPaths: requiredPaths.length,
  bearerAuth: true,
  jneWebhookTokenHeader: true,
}, null, 2))

interface OpenApiLike {
  openapi: string
  info: { title: string }
  paths: Record<string, Record<string, OperationLike> | undefined>
  components?: { securitySchemes?: Record<string, unknown> }
}

interface OperationLike {
  security?: unknown[]
  parameters?: Array<{ name?: string }>
}

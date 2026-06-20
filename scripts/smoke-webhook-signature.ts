import { signWebhook, verifyWebhookSignature } from '../src/utils/crypto.js'

const secret = 'test-webhook-secret-min-16'
const payload = JSON.stringify({ id: 'evt_test', type: 'tracking.updated', shipment: { id: 'shp_test' } })
const signature = signWebhook(payload, secret)

assert(signature.startsWith('sha256='), 'signature must use sha256= prefix')
assert(verifyWebhookSignature(payload, signature, secret), 'signature must verify exact payload')
assert(!verifyWebhookSignature(`${payload} `, signature, secret), 'signature must reject changed payload')
assert(!verifyWebhookSignature(payload, signature, 'wrong-secret-min-16'), 'signature must reject wrong secret')
assert(!verifyWebhookSignature(payload, signature.replace('sha256=', ''), secret), 'signature must reject missing prefix')

console.log(JSON.stringify({ ok: true, signatureFormat: 'sha256=<hmac-sha256-hex>', signedPayload: 'exact JSON request body' }, null, 2))

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export function hashApiKey(plaintext: string): string {
  return createHash('sha256').update(plaintext, 'utf8').digest('hex')
}

export function createApiKey(environment: 'test' | 'live' = 'live') {
  const plaintext = `tlg_${environment}_${randomBytes(32).toString('base64url')}`
  return {
    plaintext,
    keyHash: hashApiKey(plaintext),
    keyPrefix: plaintext.slice(0, 16),
  }
}

export function safeEqualHex(leftHex: string, rightHex: string): boolean {
  const left = Buffer.from(leftHex, 'hex')
  const right = Buffer.from(rightHex, 'hex')
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export function signWebhook(payload: string, secret: string): string {
  return `sha256=${createHmac('sha256', secret).update(payload, 'utf8').digest('hex')}`
}

export function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  if (!signature.startsWith('sha256=') || !secret) return false
  const expected = Buffer.from(signWebhook(payload, secret), 'utf8')
  const actual = Buffer.from(signature, 'utf8')
  if (actual.length !== expected.length) return false
  return timingSafeEqual(actual, expected)
}

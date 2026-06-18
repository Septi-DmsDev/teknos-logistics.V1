import type { RelayAttemptWithPayload, WebhookRepository } from '../repositories/webhook.repository.js'
import { signWebhook } from '../utils/crypto.js'

const DEFAULT_LIMIT = 25
const DEFAULT_TIMEOUT_MS = 10_000
const DEFAULT_MAX_ATTEMPTS = 5
const BASE_RETRY_DELAY_MS = 60_000
const MAX_RETRY_DELAY_MS = 30 * 60_000

export interface WebhookRelayRunResult {
  processed: number
  success: number
  failed: number
  retry: number
}

export interface WebhookRelayOptions {
  limit?: number
  timeoutMs?: number
  maxAttempts?: number
}

export class WebhookRelayService {
  constructor(
    private readonly webhooks: WebhookRepository,
    private readonly fetcher: typeof fetch = fetch
  ) {}

  async processDue(options: WebhookRelayOptions = {}): Promise<WebhookRelayRunResult> {
    const limit = options.limit ?? DEFAULT_LIMIT
    const attempts = await this.webhooks.findDueRelayAttempts(limit)
    const result: WebhookRelayRunResult = { processed: 0, success: 0, failed: 0, retry: 0 }

    for (const attempt of attempts) {
      result.processed += 1
      const outcome = await this.processAttempt(attempt, options)
      result[outcome] += 1
    }

    return result
  }

  private async processAttempt(attempt: RelayAttemptWithPayload, options: WebhookRelayOptions): Promise<'success' | 'failed' | 'retry'> {
    if (!attempt.endpoint.isActive) {
      await this.webhooks.markRelayFailure({
        id: attempt.id,
        message: 'Merchant webhook endpoint is inactive',
        nextRetryAt: null,
        final: true,
      })
      return 'failed'
    }

    const payload = buildRelayPayload(attempt)
    const body = JSON.stringify(payload)
    const headers = {
      'content-type': 'application/json',
      'user-agent': 'teknos-logistics-webhook-relay/0.1',
      'x-teknos-event-id': attempt.event.id,
      'x-teknos-signature': signWebhook(body, attempt.endpoint.secret),
    }

    try {
      const response = await fetchWithTimeout(this.fetcher, attempt.endpoint.url, {
        method: 'POST',
        headers,
        body,
      }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS)

      if (response.ok) {
        await this.webhooks.markRelaySuccess(attempt.id, response.status)
        return 'success'
      }

      const final = isPermanentHttpStatus(response.status) || attempt.attemptCount + 1 >= (options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS)
      await this.webhooks.markRelayFailure({
        id: attempt.id,
        httpStatus: response.status,
        message: `Merchant webhook returned HTTP ${response.status}`,
        nextRetryAt: final ? null : nextRetryAt(attempt.attemptCount + 1),
        final,
      })
      return final ? 'failed' : 'retry'
    } catch (error) {
      const final = attempt.attemptCount + 1 >= (options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS)
      await this.webhooks.markRelayFailure({
        id: attempt.id,
        message: sanitizeErrorMessage(error),
        nextRetryAt: final ? null : nextRetryAt(attempt.attemptCount + 1),
        final,
      })
      return final ? 'failed' : 'retry'
    }
  }
}

function buildRelayPayload(attempt: RelayAttemptWithPayload) {
  return {
    id: attempt.event.id,
    type: attempt.event.eventType,
    createdAt: attempt.event.receivedAt.toISOString(),
    courier: attempt.event.courier,
    shipment: attempt.event.shipment ? {
      id: attempt.event.shipment.id,
      merchantId: attempt.event.shipment.merchantId,
      externalOrderId: attempt.event.shipment.externalOrderId,
      courier: attempt.event.shipment.courier,
      waybillId: attempt.event.shipment.waybillId,
      status: attempt.event.shipment.status,
      updatedAt: attempt.event.shipment.updatedAt.toISOString(),
    } : null,
    tracking: attempt.event.normalized,
  }
}

async function fetchWithTimeout(fetcher: typeof fetch, url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetcher(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

function isPermanentHttpStatus(status: number): boolean {
  return status >= 400 && status < 500 && status !== 408 && status !== 409 && status !== 425 && status !== 429
}

function nextRetryAt(attemptCount: number): Date {
  const delayMs = Math.min(BASE_RETRY_DELAY_MS * 2 ** Math.max(0, attemptCount - 1), MAX_RETRY_DELAY_MS)
  return new Date(Date.now() + delayMs)
}

function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.name === 'AbortError' ? 'Merchant webhook request timed out' : error.message.slice(0, 300)
  return 'Merchant webhook request failed'
}

# teknos.id Integration Handoff

Date: 2026-06-19
Status: Sprint 6 handoff artifact; Sprint 9 Admin Control Center complete inside `teknos-logistics`

This document is the copy-ready handoff for the future parent `teknos.id` integration. It is intentionally stored in `teknos-logistics`; do not edit parent `teknos.id` from this sprint.

Target model: `teknos.id` owns commerce; `teknos-logistics` owns logistics operations. Parent web should not rebuild resi recap, courier config, branch/origin logistics config, tracking history, retry logs, or courier reporting.

## Boundary

- Parent `teknos.id` remains read-only until the user opens a separate explicit parent-repo task.
- All API keys and webhook secrets are server-only.
- Keep parent integration minimal: API URL/key, feature flag, rates call, shipment creation call, tracking read, and webhook receiver.
- Rates and tracking are safe read flows; JNE shipment booking can create a real AWB/resi and requires explicit operator approval.
- The current machine-readable contract is available from `GET /openapi.json` and checked by `npm run contract:check`.
- Before opening a parent-repo implementation task, run `npm run sprint6:readiness` in `teknos-logistics`.
- Sprint 9 Admin Control Center lives entirely inside `teknos-logistics` at `/admin-ui`: merchant/store/origin/courier config, operations visibility, and smoke/readiness validation. Parent `teknos.id` should still consume only the simplified merchant API and webhook contract, not duplicate logistics operations UI.

## Required Parent Environment

```env
LOGISTICS_API_URL="https://<teknos-logistics-host>"
LOGISTICS_API_KEY="tlg_<server-only-api-key>"
LOGISTICS_WEBHOOK_SECRET="<server-only-merchant-webhook-secret>"
LOGISTICS_ENABLED="false"
```

Rollout rule: keep `LOGISTICS_ENABLED=false` until staging rates, mock booking, tracking, and webhook relay have passed.

## Server-only HTTP Client Example

Use this only in server routes/actions/jobs. Never import it into client components.

```ts
type CourierCode = 'JNE' | 'JNT' | 'SAP_EXPRESS' | 'MOCK'

interface LogisticsClientOptions {
  baseUrl: string
  apiKey: string
  fetcher?: typeof fetch
}

interface RateRequest {
  origin_code: string
  dest_code: string
  weight_grams: number
  couriers?: CourierCode[]
}

interface ShipmentRequest {
  external_order_id: string
  courier?: CourierCode
  service_code: string
  service_name?: string
  origin_code: string
  dest_code: string
  weight_grams: number
  rate_idr?: number
  recipient: {
    name: string
    phone: string
    address: string
  }
  goods_value_idr?: number
  is_cod?: boolean
}

export function createLogisticsClient(options: LogisticsClientOptions) {
  const fetcher = options.fetcher ?? fetch
  const baseUrl = options.baseUrl.replace(/\/$/, '')

  async function request<TResponse>(path: string, init: RequestInit): Promise<TResponse> {
    const response = await fetcher(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${options.apiKey}`,
        ...init.headers,
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`Teknos Logistics HTTP ${response.status}: ${body.slice(0, 300)}`)
    }

    return await response.json() as TResponse
  }

  return {
    getRates(input: RateRequest) {
      return request<{ rates: unknown[] }>('/v1/rates', {
        method: 'POST',
        body: JSON.stringify(input),
      })
    },

    createShipment(input: ShipmentRequest) {
      return request<{ shipment: { id: string; status: string; waybillId: string | null }; idempotent: boolean }>('/v1/shipments', {
        method: 'POST',
        body: JSON.stringify(input),
      })
    },

    getTracking(shipmentId: string) {
      return request<{ shipment: unknown; tracking: unknown[] }>(`/v1/shipments/${encodeURIComponent(shipmentId)}/tracking`, {
        method: 'GET',
      })
    },
  }
}
```

## Webhook Receiver Example

Future parent endpoint suggestion: `POST /api/webhooks/logistics`.

Receiver requirements:

- Read raw request body before JSON parsing.
- Verify `x-teknos-signature` with `LOGISTICS_WEBHOOK_SECRET`.
- Deduplicate by `x-teknos-event-id` before updating orders.
- Return `2xx` only after durable processing or confirmed duplicate.
- Do not trust unsigned payloads for order ownership, price, or privileged actions.

```ts
import { createHmac, timingSafeEqual } from 'node:crypto'

function verifyTeknosSignature(rawBody: string, signature: string, secret: string): boolean {
  if (!signature.startsWith('sha256=')) return false

  const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`
  const receivedBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)

  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer)
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const eventId = request.headers.get('x-teknos-event-id') ?? ''
  const signature = request.headers.get('x-teknos-signature') ?? ''
  const secret = process.env.LOGISTICS_WEBHOOK_SECRET ?? ''

  if (!eventId || !secret || !verifyTeknosSignature(rawBody, signature, secret)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = JSON.parse(rawBody) as {
    id: string
    type: string
    shipment: null | {
      externalOrderId: string
      status: string
      waybillId: string | null
    }
    tracking: unknown
  }

  // 1. Check webhook event store for eventId; return 204 if already processed.
  // 2. Load order by payload.shipment.externalOrderId and verify ownership/source.
  // 3. Update order shipment status using monotonic status mapping.
  // 4. Store eventId as processed in the same transaction.

  return new Response(null, { status: 204 })
}
```

## Staging Cutover Checklist

1. Deploy `teknos-logistics` with `LOGISTICS_PROVIDER=mock` first.
2. Generate a dedicated merchant API key for parent `teknos.id` staging.
3. Configure parent env values server-side only.
4. Run `npm run sprint6:readiness` in `teknos-logistics`.
5. Add rates integration behind `LOGISTICS_ENABLED=false` feature flag.
6. Validate `POST /v1/rates` from staging checkout context.
7. Validate mock `POST /v1/shipments` from admin-only staging flow.
8. Validate `GET /v1/shipments/:id/tracking` after mock booking.
9. Configure merchant webhook endpoint and secret.
10. Validate synthetic merchant relay and receiver signature verification.
11. Switch provider-specific JNE booking only after explicit operator approval.

## Rollback

- Keep existing parent `teknos.id` shipping flow available until production parity is proven.
- Disable parent feature flag to stop new calls to `teknos-logistics`.
- Keep webhook receiver idempotent so delayed retries do not corrupt order state.
- Do not remove legacy logistics env/code until production rollback window is complete.

# Sprint 6 Contract Runbook

Date: 2026-06-18
Status: Contract baseline implemented

## Goal

Sprint 6 prepares the `teknos.id` staging bridge from the `teknos-logistics` side only. The output is a stable API contract, webhook relay contract, env checklist, and smoke runbook that can be handed to a separate parent-repo integration task.

The machine-readable contract is exposed by `GET /openapi.json` and validated by `npm run contract:check`.

The parent handoff artifact is `docs/TEKNOS_ID_HANDOFF.md`.

## Hard Boundary

- `teknos-logistics` is the active editable project.
- Parent `teknos.id` is read-only reference material unless the user explicitly opens a separate parent-repo task.
- Do not modify, commit, or push parent `teknos.id` while executing Sprint 6 in this repo.
- Do not create real JNE AWB/resi without explicit operator approval.

## Merchant API Contracts

All merchant API requests must use server-only `LOGISTICS_API_KEY` through an authorization header. Do not expose it to browser code.

Authentication header:

```http
Authorization: Bearer <LOGISTICS_API_KEY>
```

### `POST /v1/rates`

Purpose: quote shipping options before checkout booking.

Required behavior:

- Validate origin, destination, weight, dimensions, and optional provider/service filters server-side.
- Return normalized rates with provider, service, ETA, price, currency, and metadata safe for UI display.
- Keep this call non-mutating; JNE tariff calls must not create a resi.

### `POST /v1/shipments`

Purpose: create or reuse a shipment by merchant order id.

Required behavior:

- Enforce API key auth and Zod validation.
- Preserve idempotency by merchant and external order id.
- Treat JNE booking as a real AWB/resi action; run only after explicit approval in staging/production.

### `GET /v1/shipments/:id/tracking`

Purpose: return normalized lifecycle and tracking history for a shipment.

Required behavior:

- Verify the caller owns the shipment through merchant API key context.
- Return current status, provider status, AWB if available, and ordered tracking events.
- Never leak internal DB errors or provider raw secrets.

### `POST /webhooks/jne`

Purpose: receive JNE shipment lifecycle callbacks.

Required behavior:

- Validate shared webhook token before processing.
- Normalize provider event key for idempotency.
- Apply monotonic lifecycle rules so stale provider events do not downgrade shipment state.
- Store raw payload only if safe and useful for audit/debugging.

## Outbound Merchant Relay Contract

`teknos-logistics` sends merchant webhook relay payloads to configured merchant endpoints.

Required headers:

- `x-teknos-event-id`: stable event id for idempotent receiver processing.
- `x-teknos-signature`: HMAC SHA-256 signature formatted as `sha256=<hex>`.
- `content-type`: `application/json`.

Receiver requirements for future `teknos.id` integration:

- Verify `x-teknos-signature` with the merchant webhook secret before processing.
- Deduplicate by `x-teknos-event-id`.
- Return `2xx` only after durable processing or safe dedupe.
- Do not trust shipment status, price, or ownership from unsigned requests.

## Environment Runbook

Required server-side values for `teknos-logistics`:

- `DATABASE_URL`
- `TEKNOS_INTERNAL_API_KEY` or generated merchant API key for smoke usage
- `LOGISTICS_PROVIDER`
- `JNE_*` values for tariff/booking when JNE is enabled
- `JNE_WEBHOOK_TOKEN`
- Merchant webhook endpoint URL and secret for relay testing

Required future parent `teknos.id` values:

- `LOGISTICS_API_URL`
- `LOGISTICS_API_KEY`
- `LOGISTICS_WEBHOOK_SECRET`
- Feature flag/config switch for staged rollout

Never commit real values to `.env.example`, docs, `CLAUDE.md`, or `AGENTS.md`.

## Parent Handoff

Use `docs/TEKNOS_ID_HANDOFF.md` as the staging integration package for the future parent-repo task. It includes:

- required parent env variables,
- server-only HTTP client example,
- HMAC webhook receiver example,
- staging cutover checklist,
- rollback notes.

## Smoke Commands

Use the narrowest validation first:

```bash
npm run contract:check
npm run lint
npm run typecheck
npm run smoke:api
npm run smoke:jne:rates -- --force-jne
npm run smoke:jne:webhook
npm run smoke:webhook:relay
```

Safety notes:

- `npm run contract:check` is read-only and validates the OpenAPI surface without DB/JNE calls.
- `npm run smoke:jne:rates -- --force-jne` is tariff-only and non-mutating.
- `npm run smoke:jne:webhook` is synthetic webhook replay and does not call JNE.
- `npm run smoke:webhook:relay` uses synthetic merchant relay validation.
- Do not run any command that creates JNE AWB/resi without approval.

## Definition of Done

- API contracts and relay contract are documented and stable enough for parent integration planning.
- `GET /openapi.json` exposes the current contract and `npm run contract:check` passes.
- `docs/TEKNOS_ID_HANDOFF.md` describes parent env, client, receiver, cutover, and rollback without editing parent code.
- Parent read-only boundary is preserved.
- Smoke command expectations are documented with mutating vs non-mutating safety notes.
- `docs/ROADMAP.md`, `CLAUDE.md`, and `AGENTS.md` reflect Sprint 6 status and boundary.
- Any later parent implementation starts as a separate explicit task outside this repo scope.

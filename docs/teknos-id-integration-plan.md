# teknos.id Integration Plan

`teknos.id` integration is intentionally not implemented in this bootstrap phase.

## Future HTTP Client

Later, `teknos.id` should call `teknos-logistics` through a small server-only HTTP client using:

- `LOGISTICS_API_URL`
- `LOGISTICS_API_KEY`

Expected calls:

- Checkout shipping step calls `POST /v1/rates`.
- Admin booking calls `POST /v1/shipments`.
- Tracking refresh calls `GET /v1/shipments/:id/tracking`.

## Safety Rules

- Do not remove Biteship/JNE existing code from `teknos.id` until this platform is stable.
- Do not change checkout flow during platform bootstrap.
- Keep all API keys server-only; never expose `LOGISTICS_API_KEY` to the browser.
- Webhook relay from `teknos-logistics` should eventually target `teknos.id` endpoint such as `/api/webhooks/logistics`.

## Migration Path

1. Run `teknos-logistics` in mock mode.
2. Create a merchant for `teknos.id` and generate API key.
3. Add read-only rates client in `teknos.id` behind feature flag.
4. Add shipment booking integration after admin QA.
5. Deprecate direct JNE/Biteship only after production parity and rollback path are confirmed.

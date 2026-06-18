# Teknos Logistics

Standalone logistics aggregator service for Teknos internal and future B2B merchants.

## MVP Scope

- Merchant API key auth with `Authorization: Bearer tlg_xxx`.
- Rates, shipment booking, tracking, and JNE webhook ingress endpoints.
- Mock provider for development and JNE provider skeleton adapted from `teknos.id` concepts.
- Shipment lifecycle updates from booking and webhook events.
- Merchant webhook relay records for resi/status notifications.

## Project Docs

- `docs/ROADMAP.md` - structured sprint roadmap and cutover policy.
- `docs/implementation-notes.md` - technical migration notes and JNE assumptions.
- `docs/teknos-id-integration-plan.md` - future integration plan for `teknos.id`.

## Commands

```bash
npm install
npm run build
npm run lint
npm run test
```

## Local DB

```bash
docker compose up -d db
npx prisma migrate dev
```

## Sprint 1 Local Operations

Run these only with a valid local/staging `DATABASE_URL` in ignored `.env.local`:

```bash
npm run seed:merchant -- --slug teknos --name "Teknos Internal"
npm run api-key:create -- --merchant-slug teknos --label local --write-env TEKNOS_INTERNAL_API_KEY
npm run merchant:list
```

The API key plaintext must not be committed or pasted into docs.

## Sprint 2 Smoke Validation

With DB tunnel active and `TEKNOS_INTERNAL_API_KEY` in ignored `.env.local`:

```bash
npm run smoke:api
```

Expected result: rates 200, first booking 201, duplicate booking 200 with `idempotent: true`, tracking 200.

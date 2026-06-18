# Teknos Logistics

Standalone logistics aggregator service for Teknos internal and future B2B merchants.

## MVP Scope

- Merchant API key auth with `Authorization: Bearer tlg_xxx`.
- Rates, shipment booking, tracking, and JNE webhook ingress endpoints.
- Mock provider for development and JNE provider skeleton adapted from `teknos.id` concepts.
- Shipment lifecycle updates from booking and webhook events.
- Merchant webhook relay records for resi/status notifications.

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

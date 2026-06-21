# Coolify Production Deploy - teknos-logistics

Date: 2026-06-21

This runbook lists the minimum code, environment variables, and database steps required to deploy `teknos-logistics` on Coolify with Nixpacks for the Teknos ID integration.

## Deploy Source

- Repository: `teknos-logistics`
- Build Pack: Nixpacks
- Base Directory: `/`
- Node: `24` via `NIXPACKS_NODE_VERSION`, compatible with Prisma 7 requirement `>=22.12.0`
- App port: `3000` for Coolify production
- Build command: leave default/autodetect, or set `npm run build` if Coolify asks.
- Start command: leave default/autodetect, or set `npm run start` if Coolify asks (`node dist/src/server.js`).
- Health endpoint: `/health`
- Readiness endpoint with DB check: `/ready`

In the Coolify create-application screen use:

```text
Branch: main, or the branch that contains the approved production commit
Build Pack: Nixpacks
Base Directory: /
Port: 3000
Is it a static site?: unchecked
```

Set the environment variable `PORT="3000"` so the Hono server listens on the same port Coolify exposes. Local development may still use `PORT="3001"` when running beside the parent `teknos.id` dev server.

No `nixpacks.toml` is required for the normal Coolify path. Nixpacks can autodetect this Node app from `package.json`; use environment variables for production configuration.

## Coolify Environment Variables

Use `.env.production.example` as the copy source. Fill real values only inside Coolify, never in git.

### Required Runtime

```env
NODE_ENV="production"
PORT="3000"
NIXPACKS_NODE_VERSION="24"
APP_URL="https://<teknos-logistics-domain>"
DATABASE_URL="postgresql://<user>:<password>@<host>:5432/<database>?schema=public"
ADMIN_AUTH_PROVIDER="static-token"
ADMIN_JWT_SECRET="<strong-random-secret>"
RATE_LIMIT_WINDOW_MS="60000"
RATE_LIMIT_PUBLIC_MAX="120"
RATE_LIMIT_ADMIN_MAX="60"
LOGISTICS_PROVIDER="jne"
JNE_MODE="production"
JNE_API_BASE_URL="https://apiv2.jne.co.id:10206/tracing/api"
JNE_USERNAME="<from-jne>"
JNE_API_KEY="<from-jne>"
JNE_CUST_NO="<from-jne>"
JNE_BRANCH_CODE="<from-jne>"
JNE_ORIGIN_CODE="MJK10000"
JNE_SHIPPER_NAME="<shipper-name>"
JNE_SHIPPER_ADDR1="<shipper-address>"
JNE_SHIPPER_CITY="<shipper-city>"
JNE_SHIPPER_PHONE="<shipper-phone>"
JNE_SHIPPER_ZIP="<shipper-postal-code>"
```

### Conditional Runtime

- `JNE_WEBHOOK_TOKEN`: set only if JNE will send direct webhook to `teknos-logistics`.
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET`: set only when `ADMIN_AUTH_PROVIDER="supabase"`.
- `SAP_*`: leave empty until SAP Express is enabled for production.

### Script Only

- `SUPABASE_SERVICE_ROLE_KEY`: only needed for bootstrap scripts; avoid keeping it in runtime production.
- `JNE_ORIGIN_PROVIDER_CODE`: not a runtime variable. It is only for local/setup scripts and should not be added to Coolify runtime.

## Database Deployment

Run migrations before public traffic or immediately after first deploy while the service is not yet connected from `teknos.id`:

```bash
npx prisma migrate deploy
```

Required migration set includes:

- `20260618021957_init`
- `20260618103000_add_admin_config_models`
- `20260618064000_add_webhook_event_key`
- `20260618072000_add_relay_attempt_unique`
- `20260619093000_add_admin_audit_logs`
- `20260620103000_add_destination_mappings`
- `20260620113000_add_admin_operators`
- `20260620143000_add_origin_mappings`
- `20260620152000_make_destination_mappings_importable`
- `20260621143000_add_provider_origin_catalog`

## Production Data Setup

After migrations, confirm these records exist in the production database:

- Merchant slug `teknos-id` is active.
- Merchant API key exists and is active. Copy the plaintext key once into `teknos.id` as `LOGISTICS_API_KEY`.
- Origin is active and default for Teknos ID.
- Origin mapping exists for courier `JNE` with provider code `MJK10000`.
- JNE destination mappings are imported for merchant `teknos-id`.
- JNE provider origin catalog is imported for origin lookup UI.
- Webhook endpoint points to `https://teknos.id/api/webhooks/logistics` and uses the same secret as `teknos.id` `LOGISTICS_WEBHOOK_SECRET`.

Recommended setup scripts, only after checking `DATABASE_URL` points to production:

```bash
npm run import:jne:origins:apply
npm run import:jne:destinations -- --merchant teknos-id --apply
```

Do not run shipment booking smoke against JNE production unless the operator approves real AWB creation.

## Smoke Checks

Non-mutating checks:

```bash
curl -fsS https://<teknos-logistics-domain>/health
curl -fsS https://<teknos-logistics-domain>/ready
```

Authenticated API check from a trusted shell:

```bash
curl -fsS \
  -H "Authorization: Bearer <merchant-api-key>" \
  https://<teknos-logistics-domain>/v1/couriers/capabilities
```

Rate resolve smoke is allowed because it checks tariff and destination resolution, not AWB booking. Use a real destination address and the active origin id from `teknos-logistics`.

## Parent teknos.id Handoff

After the logistics service is healthy, configure these in the parent `teknos.id` Coolify service:

```env
LOGISTICS_API_URL="https://<teknos-logistics-domain>"
LOGISTICS_API_KEY="<merchant-api-key>"
LOGISTICS_WEBHOOK_SECRET="<same-secret-as-logistics-webhook-endpoint>"
LOGISTICS_ORIGIN_ID="<origin-id-from-teknos-logistics-db>"
LOGISTICS_ENABLED="true"
```

Parent `teknos.id` must not contain `JNE_*`, `BITESHIP_*`, or `LOGISTICS_PROVIDER` runtime variables.

## Rollback

- If deployment fails before migration: redeploy previous commit in Coolify.
- If migration has run: do not manually edit migration history. Restore previous service version first, then inspect whether new tables are additive and can remain unused.
- Emergency parent cut-off: set parent `LOGISTICS_ENABLED="false"` to stop checkout/shipment calls while keeping the logistics service available for diagnosis.

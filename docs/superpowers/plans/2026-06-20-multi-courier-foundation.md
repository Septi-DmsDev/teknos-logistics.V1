# Sprint 10 Multi-Courier Foundation � Implementation Plan

Date: 2026-06-20
Spec: `docs/superpowers/specs/2026-06-20-multi-courier-foundation-design.md`

## Task 1: Capability Model

Files:
- `src/couriers/capabilities.ts`
- `src/couriers/types.ts`

Add safe provider capability metadata for MOCK/JNE/JNT/SAP_EXPRESS: rates, booking, tracking, webhook, implementation status, destination code format, notes.

## Task 2: JNT/SAP Skeleton Providers

Files:
- `src/couriers/jnt/*`
- `src/couriers/sap-express/*`
- `src/app.ts`

Add adapters and normalizers. Register both providers. Unimplemented external operations must return `501 COURIER_NOT_IMPLEMENTED`.

## Task 3: Capability Endpoint

Files:
- `src/routes/v1/couriers.ts`
- `src/app.ts`
- `src/contracts/openapi.ts`

Add authenticated `GET /v1/couriers/capabilities` and OpenAPI contract entry.

## Task 4: Readiness and Docs

Files:
- `scripts/sprint10-readiness.ts`
- `package.json`
- `CLAUDE.md`
- `docs/ROADMAP.md`
- `docs/implementation-notes.md`

Add static readiness checks and update operational docs.

## Validation

```bash
npm run lint
npm run typecheck
npm run build
npm run contract:check
npm run sprint10:readiness
gitleaks protect --staged --no-banner
```

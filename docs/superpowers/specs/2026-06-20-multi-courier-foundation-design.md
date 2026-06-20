# Sprint 10 Multi-Courier Foundation � Spec

Date: 2026-06-20
Status: Approved for implementation slice 1

## Goal

Prepare `teknos-logistics` to become a multi-courier aggregator beyond JNE/MOCK by adding JNT and SAP Express skeletons, provider capability metadata, status normalizers, and a read-only capability contract.

## Scope Slice 1

- Register courier providers for `JNT` and `SAP_EXPRESS`.
- Add provider capability matrix for `MOCK`, `JNE`, `JNT`, and `SAP_EXPRESS`.
- Add normalizer functions for common JNT/SAP status strings.
- Expose read-only `GET /v1/couriers/capabilities` for authenticated merchants.
- Keep JNT/SAP external calls disabled until real API contracts/credentials are confirmed.

## Non-Goals

- No real JNT/SAP booking.
- No real JNT/SAP rate API call.
- No credential UI or committed credentials.
- No parent `teknos.id` code changes.
- No JNE `generatecnote` execution.

## Contract Decision

Current `POST /v1/rates` remains `origin_code`, `dest_code`, `weight_grams`, `couriers`. Destination code abstraction is deferred to a later destination mapping sprint. For Sprint 10 slice 1, capability metadata documents each courier's current destination code expectation.

## Done Criteria

- `JNT` and `SAP_EXPRESS` are valid registered providers.
- Requesting unimplemented JNT/SAP external operations returns a clear `501` provider-not-implemented error, not `UNSUPPORTED_COURIER`.
- Capability endpoint returns safe metadata without secrets.
- OpenAPI and docs mention the capability endpoint.
- Validation passes: lint, typecheck, build, contract check, Sprint 10 readiness.

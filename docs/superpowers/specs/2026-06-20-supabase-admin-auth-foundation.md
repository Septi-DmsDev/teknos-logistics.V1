# Sprint 11A Supabase Admin Auth Foundation — Spec

Date: 2026-06-20
Status: Draft approved direction

## Goal
Replace the temporary raw `ADMIN_JWT_SECRET` token gate in `/admin-ui` with a production-ready Supabase Auth based admin login while keeping static-token auth as a short-term fallback during migration.

## Product Decision
`teknos-logistics` Admin Control Center must use normal operator login for production. Supabase Auth handles identity/session. The app enforces internal admin access with its own operator table and server-side role checks.

## Scope
- Add Supabase admin-auth environment placeholders.
- Introduce `ADMIN_AUTH_PROVIDER=static-token|supabase` feature switch.
- Design admin operator identity and RBAC model.
- Keep `/admin/*` protected server-side.
- Preserve auditability: future audit rows should include operator identity, email, and role.

## Non-Goals
- Do not remove `ADMIN_JWT_SECRET` yet.
- Do not expose Supabase service role key to client/admin UI.
- Do not change parent `teknos.id`.
- Do not create courier bookings, AWB, or real resi during auth work.

## Target Env
```env
ADMIN_AUTH_PROVIDER="static-token"
SUPABASE_URL=""
SUPABASE_ANON_KEY=""
SUPABASE_JWT_SECRET=""
SUPABASE_SERVICE_ROLE_KEY=""
```

Production target after implementation:
```env
ADMIN_AUTH_PROVIDER="supabase"
```

## Security Requirements
- Verify Supabase access token server-side before any `/admin/*` route reaches handlers.
- Check the authenticated Supabase user exists in internal operator table and is active.
- Never trust client-provided role/email.
- Never log raw bearer tokens.
- Store only server-safe Supabase secrets in env; `SUPABASE_SERVICE_ROLE_KEY` is server-only.
- Preserve static-token fallback only for controlled local/staging transition.

## Proposed Data Model
`AdminOperator`:
- `id`
- `supabaseUserId` unique
- `email`
- `role`: `SUPER_ADMIN | OPS_ADMIN | OPS_VIEWER | FINANCE`
- `isActive`
- `createdAt`
- `updatedAt`

## Acceptance Criteria
- `.env.example` documents Supabase admin-auth placeholders.
- `.env.local` contains empty placeholders for user to fill.
- Env parser accepts placeholders in static-token mode.
- Supabase mode fails fast if required server values are missing.
- Implementation plan exists before code migration begins.

# Sprint 11A Supabase Admin Auth Foundation — Implementation Plan

Date: 2026-06-20
Status: Draft

## Task 1 — Env and docs foundation
- Add `ADMIN_AUTH_PROVIDER=static-token|supabase` to env schema.
- Add Supabase placeholders to `.env.example` and ignored `.env.local`.
- Document migration direction in `CLAUDE.md`, `docs/ROADMAP.md`, and implementation notes.

## Task 2 — Operator schema
- Add `AdminOperator` Prisma model with Supabase user ID, email, role, active flag, timestamps.
- Add migration and repository methods for lookup by `supabaseUserId`.
- Keep migration additive.

## Task 3 — Supabase token verifier
- Add admin auth service that verifies Supabase JWT using `SUPABASE_JWT_SECRET` or JWKS-compatible path if selected later.
- Return normalized admin auth context: `provider`, `operatorId`, `email`, `role`.
- Keep static-token provider as fallback branch.

## Task 4 — Middleware and audit integration
- Update `/admin/*` middleware to use provider switch.
- Ensure every admin mutation remains server-side protected.
- Extend admin audit context to include operator identity when available.

## Task 5 — Login UI
- Replace raw token form with normal login screen.
- Use Supabase anon key only in browser if client-side Supabase login is selected.
- Store session in browser storage or cookie according to final implementation choice.
- Keep no token in URL and redact tokens from UI errors/logs.

## Task 6 — QA and rollout
- Add smoke for static-token fallback.
- Add smoke for Supabase mode with mocked/controlled token verification if real Supabase auth cannot be automated locally.
- Validate: `npm run lint`, `npm run typecheck`, `npm run build`, `npm run smoke:admin-ui`.
- Production rollout: set Supabase env, seed first `SUPER_ADMIN`, switch `ADMIN_AUTH_PROVIDER=supabase`.

## Open Decisions
- Use Supabase client-side email/password login vs server-side callback/session cookie.
- Whether to require MFA for `SUPER_ADMIN`.
- Whether `SUPABASE_SERVICE_ROLE_KEY` is needed for operator bootstrap scripts only or runtime admin user lookup.

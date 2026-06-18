# SECURITY.md â€” teknos-logistics

Security policy for human + AI contributors. Companion to `AGENTS.md` (checklist) and `CLAUDE.md` (rules). When this conflicts with a quick fix, **security wins** â€” stop and resolve.

## 1. Principles
- **Defense in depth:** validate + authorize at every layer.
- **Server-trust only:** never trust client-sent identity, role, price, or quantity. Compute money/stock server-side.
- **Least privilege:** narrowest scope/permission that works; read-only DB roles where possible.
- **Fail closed; no 100% claims.**

## 2. Secret Handling
- Secrets in **server env** only â€” never in git, code, docs, logs, or error responses.
- `.env`, `.env.*`, `*.pem`, `*.key`, `id_rsa`, `id_ed25519` are **never** read, printed, or committed. Only `.env.example` (placeholders) is tracked.
- Client-exposed values use the public env prefix; secrets never do. Rotate any suspected-exposed credential immediately (Â§7).

## 3. AI Coding Agent Rules
- Follow `AGENTS.md`; never bypass the Security Gate, even for "small" fixes.
- Do not: read secret files, hardcode credentials, deploy to production, access the production database, run destructive commands, or add dependencies without justification.
- Prefer minimal, reviewable diffs; run available validation before claiming done.

## 4. MCP / Plugin Permission Policy
**Allowed:** read/write project folder Â· run lint/typecheck/build/test Â· run gitleaks/semgrep/trivy Â· GitHub repo (read/PR) Â· staging URL Â· staging DB **read-only**.
**Blocked:** read production secrets Â· SSH prod / unrestricted shell Â· write/migrate production DB Â· auto-deploy / DNS / secret management Â· delete database/storage Â· unrestricted filesystem access.

## 5. Required Security Scan Commands
```bash
npm run security:secrets   # gitleaks â€” secret scan
npm run security:code      # semgrep --config auto â€” SAST
npm run security:fs        # trivy fs â€” deps/secret/misconfig
npm run security:all       # all of the above
```
> gitleaks, semgrep, trivy are external CLIs â€” install separately (see `docs/MCP_RECOMMENDATIONS.md`).

## 6. Pre-Deploy Checklist
- [ ] lint + typecheck clean Â· build passes
- [ ] `security:all` reviewed (no high/critical unresolved)
- [ ] No secret diffs (gitleaks); no `.env*` staged
- [ ] DB migration reviewed; applied to staging first, never blind on prod
- [ ] Critical flow smoke-tested

## 7. Incident Response â€” Secret Leak
1. **Rotate first** at the provider â€” rotation > cleanup.
2. **Contain:** invalidate sessions/tokens; check provider logs for abuse.
3. **Purge** from history (`git filter-repo`/BFG), coordinate force-push, update `.gitignore`.
4. **Verify** with `gitleaks detect` on full history.
5. **Record** a short dated note (what leaked, blast radius, rotation done) â€” never the secret value.

## 8. Payment / Webhook Checklist (keep if the project has payment/webhooks)
- [ ] Verify webhook signature/token before processing.
- [ ] Idempotent: terminal state never processed twice (check stored identity first).
- [ ] Validate amount + invoice/order identity server-side.
- [ ] Stock/payment/coupon updates in a transaction; prevent oversell/race; decrement stock after successful payment, not at order creation.
- [ ] Handle provider retries safely; log state transitions; never leak internal errors.

## 9. Database Safety Checklist
- [ ] DB access goes through the project's data layer only.
- [ ] Avoid N+1; index frequent lookups; multi-step writes in a transaction; consider concurrency.
- [ ] **Never** query/mutate the production database from an agent; staging read-only only.
- [ ] Migrations reviewed + applied to staging first; no destructive migration without explicit human approval.


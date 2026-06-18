# Security & Review Prompts â€” teknos-logistics

Copy-paste prompts for AI-assisted reviews. Each assumes the agent follows `AGENTS.md` + `SECURITY.md` and does NOT read secrets, deploy, or touch the production DB.

## 1. Security Review
> Review the changed files (`git diff`) as a DevSecOps engineer. For every API route, server action, and admin feature, check: authentication required; authorization/role enforced server-side; data ownership verified; input validated; injection prevented; XSS considered; CSRF for state-changing actions; rate limiting on public endpoints; no internal errors/PII leaked; no secret exposed to client. List findings by severity with file:line and a minimal fix.

## 2. Scalability Review
> Analyze the changed code for scalability: N+1 queries, missing indexes, unbounded result sets, long synchronous work in the request path, repeated external calls that could be batched/cached, memory growth. Suggest smallest-change/biggest-impact fixes; flag concurrency hazards.

## 3. Payment / Webhook Review
> Review payment/webhook/order code. Verify: signature/token checked before processing; idempotency (terminal state not processed twice); amount + identity validated server-side; stock decremented only after success inside a transaction; oversell/race prevented; retries safe; state transitions logged; no internal error leaked. Report gaps + minimal fixes.

## 4. Database / Index Review
> Review schema + queries. Check: data access via the project's data layer; indexes for frequent filters/sorts/joins; transactions for multi-step writes; no N+1; selects fetch only needed fields; concurrency handled. Propose index/transaction changes as a migration plan (do NOT run migrations on production).

## 5. Docker / Deployment Review
> Review Dockerfile + deploy config. Check: pinned runtime version; no secrets baked into the image; minimal final image; ignore-file excludes `.env*`/deps/build; healthcheck; prod migrations use a deploy (not dev) command. Run `trivy fs .` / `trivy image <img>` if available. List risks; do not deploy.

## 6. Dependency Review
> Audit dependencies. Run the audit command (`npm audit --audit-level=high` / `composer audit` / OSV-Scanner). For any new dependency, require: why needed, alternatives, security/maintenance signal, bundle impact. Recommend removing unused deps. No package added without justification.

## 7. UI / UX Regression
> For the changed UI, verify loading, empty, success, and error states; responsive layout; no server-only data leaks into client components; existing UX preserved unless required. Recommend/extend smoke tests; run against staging, not production with real payment.

## 8. MCP / Plugin Audit
> Audit active MCP servers against `SECURITY.md` Â§4. List each tool's permissions; confirm least-privilege: no production secrets, no prod DB, no auto-deploy, no unrestricted shell/filesystem. Flag anything exceeding the Allowed list; recommend tightening or removal.


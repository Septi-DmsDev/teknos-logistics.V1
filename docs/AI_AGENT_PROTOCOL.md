# AI Agent Protocol â€” teknos-logistics

Binds `AGENTS.md` (checklist), `CLAUDE.md` (rules), `SECURITY.md` (policy).

## 1. Development Workflow
1. **Understand** â€” restate the task; read relevant docs. Don't work from memory.
2. **Inspect** â€” `git status --short --branch`; read affected files; note existing patterns.
3. **Plan** â€” declare files, shared-file risk, constraints, security surface. Risky/new features: brainstorm â†’ spec â†’ plan first.
4. **Implement** â€” minimal, reviewable change following the project's architecture.
5. **Validate** â€” run available checks (npm run lint && npm run typecheck && npm run build && npm run security:all, security scans). Never claim success without reading output.
6. **Report** â€” Summary Â· Files changed Â· Validation run Â· Risks found Â· Not verified Â· Next steps.

## 2. Tool Usage Priority
| Priority | Tool | Use for |
|---|---|---|
| 1 | Context7 MCP | up-to-date library/framework/API docs before version-dependent code |
| 2 | GitHub MCP | issues, PRs, Actions, repo workflow |
| 3 | Playwright MCP | UI smoke testing when a UI flow changes |
| 4 | Semgrep | SAST on security-sensitive code |
| 5 | Gitleaks CLI | secret scan before commits touching config/env/docs |
| 6 | Trivy CLI | Dockerfile / deps / filesystem / misconfig |
| 7 | OpenAPI MCP | only if an API contract exists (read/test, no mutating calls) |
| 8 | DB MCP | **staging read-only only** â€” never production/write/migration |

> Tool unavailable â†’ record as a **missing dependency** + manual install, continue with a safe fallback. Don't stop.

## 3. Feature Completion Checklist
- [ ] build passes Â· lint/typecheck clean (where available)
- [ ] security scan run where the CLI is available
- [ ] critical flow tested (manual or automated)
- [ ] relevant docs updated in the same change (docs-as-code)
- [ ] risks + unverified items documented

## 4. Forbidden Behavior
- No production deploy; no reading/printing/committing secret files; no production database access.
- No destructive commands (`rm -rf`, `DROP`/`TRUNCATE`, prod migration, storage deletion).
- No new dependency without justification (why / alternatives / risk / maintenance signal).
- No large business-logic change without understanding the existing flow first.


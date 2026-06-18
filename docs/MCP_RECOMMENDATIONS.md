# MCP / Plugin Recommendations â€” teknos-logistics

Recommended tooling for safe AI-assisted development. For each: function Â· benefit Â· risk Â· suggested permission Â· when. CLIs need separate install (`uv` for Python MCP servers; `winget`/`brew`/`pip` for CLIs).

## P0 â€” Essential
- **Context7 MCP** â€” current library/API docs. Avoids stale-training mistakes. Read-only. Before version-dependent code. `npx -y @upstash/context7-mcp` (or HTTP `https://mcp.context7.com/mcp`).
- **GitHub MCP** â€” issues/PRs/Actions. Repo read + PR scope (no admin/secret). Token via env var. Remote: `https://api.githubcopilot.com/mcp/`.
- **Playwright MCP** â€” browser smoke tests. Staging URL only. `npx -y @playwright/mcp@latest`.
- **Semgrep** â€” SAST for auth/payment/webhook/input. Read-only. `uvx semgrep-mcp` (MCP) or `semgrep scan --config auto` (CLI).
- **Gitleaks CLI** â€” secret scanning. Pre-commit + CI. `gitleaks detect --source . --verbose`.
- **Trivy CLI** â€” vuln/secret/misconfig for deps + Dockerfile. `trivy fs .`.

## P1 â€” High value
- **Fetch MCP** â€” fetch URL â†’ text for public-doc research. `uvx mcp-server-fetch`. (Built-in WebFetch may already cover this.)
- **OpenAPI MCP** â€” only if an API spec exists; read/test, no mutating calls.
- **DB MCP (staging read-only)** â€” query staging for debugging; never prod/write/migration.
- **Renovate / Dependabot** â€” automated dependency-update PRs (enabled in the GitHub repo, e.g. `.github/dependabot.yml`).
- **Socket.dev / OSV-Scanner** â€” supply-chain + known-vuln scanning before adding/upgrading deps.

## P2 â€” Observability / maturity
- **Sentry / GlitchTip** â€” error + performance monitoring (scrub PII).
- **Grafana / Prometheus / Loki** â€” metrics + logs + alerts when scale justifies.
- **Sourcegraph / code search** â€” cross-repo impact analysis.
- **OSSF Scorecard** â€” repo security posture over time (GitHub Action).


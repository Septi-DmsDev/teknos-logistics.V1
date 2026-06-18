# AGENTS.md ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â teknos-logistics

Execution checklist untuk AI agents. **`CLAUDE.md` = aturan & referensi; file ini = checklist eksekusi; `SECURITY.md` = kebijakan security.**

---

## ÃƒÂ°Ã…Â¸Ã…Â¡Ã‚Â¨ Mandatory Pre-Task Checklist ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â NO EXCEPTIONS

### Step 1: Load Project Context
```bash
git status --short --branch
git log --oneline -5
```
- [ ] Baca `CLAUDE.md` penuh ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â catat stack, arsitektur, aturan, dan forbidden actions
- [ ] Baca `AGENTS.md` ini ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â cek coordination note, who owns what, shared-file risk
- [ ] Jika task menyentuh schema/migration: baca migrasi terbaru
- [ ] Jika task menyentuh payment/checkout: baca spec di `docs/superpowers/specs/`
- [ ] Jika task menyentuh auth: review auth sections di `CLAUDE.md`
- [ ] Jika task menyentuh webhook: review idempotency rules

### Step 2: Declare Intent
Sebelum coding, nyatakan secara eksplisit:
1. **Files yang akan disentuh** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â list lengkap
2. **Shared-file risk** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â apakah ada file yang sedang dikerjakan agent lain?
3. **Constraints dari `CLAUDE.md`** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â rule apa yang berlaku untuk task ini?
4. **Security concerns** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â apakah task ini menyentuh auth, input, secrets, DB writes, upload?

### Step 3: Security Gate

Untuk setiap task yang menyentuh area di bawah, jawab SEMUA pertanyaan sebelum coding:

| Area | Mandatory Check |
|---|---|
| **Auth / RBAC** | Endpoint dilindungi? Role check server-side? Tidak percaya client? |
| **Input Validation** | Semua input divalidasi Zod sebelum ke DB/service? |
| **Secret Handling** | Tidak ada env var bocor ke client via `NEXT_PUBLIC_`? |
| **DB Access** | Semua Prisma/ORM calls lewat `server/repositories/` saja? |
| **Webhook** | Handler idempoten? Token/signature diverifikasi sebelum proses? |
| **File Upload** | File type + size divalidasi server-side? Path traversal dicegah? |
| **Error Responses** | Tidak ada stack trace/internal path/PII di client-facing error? |
| **Mutation Safety** | Tidak ada DB mutation dari GET handlers? |
| **XSS Prevention** | Tidak ada `dangerouslySetInnerHTML` tanpa sanitasi? |
| **CSRF** | State-changing action dilindungi (bukan GET)? |
| **Rate Limiting** | Public/abuse-prone endpoints dibatasi? |
| **Data Ownership** | Caller diverifikasi MEMILIKI record (bukan sekadar authenticated)? |

> ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â **HARD STOP**: Jika ada security check yang tidak yakin, selesaikan SEBELUM menulis kode. Jangan lanjut dengan asumsi "fix it later" untuk security.

### Step 4: Post-Implementation Validation
```bash
# Selalu jalankan sebelum klaim task complete:
npm run lint && npm run typecheck && npm run build && npm run security:all
```
Jika command tidak bisa dijalankan, sampaikan ke user apa yang perlu divalidasi.

### Step 5: Docs-as-Code ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Definition of Done
Task belum "selesai" sampai docs mencerminkan realita. Update dalam **commit yang sama** dengan code change.

| Trigger | File yang di-update |
|---|---|
| Sprint selesai | `CLAUDE.md` Ãƒâ€šÃ‚Â§ Status Sprint |
| Env variable baru | `CLAUDE.md` Ãƒâ€šÃ‚Â§ Environment Variables |
| Keputusan arsitektur baru | `CLAUDE.md` Ãƒâ€šÃ‚Â§ Keputusan Arsitektur |
| Fitur baru deploy | `CLAUDE.md` Ãƒâ€šÃ‚Â§ Fitur yang Sudah Dibangun |
| Migration schema | Kedua file + nama migration + tanggal |
| Rule baru dilarang | `CLAUDE.md` Ãƒâ€šÃ‚Â§ Yang TIDAK Boleh Dilakukan |

### Step 6: Commit (Conventional Commits)
Format: `<type>(scope): summary` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â `feat | fix | docs | chore | refactor | test | perf`.
Satu commit = satu perubahan logis, scope sempit. Jangan pernah commit secrets/tokens/credentials.

### Security Tooling (jalankan sebelum commit/PR relevan)
```bash
semgrep --config auto <path>                 # auth/payment/webhook/upload/input/permission
gitleaks protect --staged --no-banner        # sebelum commit config/env/docs/credentials
trivy fs --scanners vuln,secret,misconfig .  # Dockerfile/image/dependencies
```

---

## Pembagian Peran Agent

### Claude Code (Utama)
- Fitur kompleks ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â multi-file, arsitektur baru
- Perubahan schema / migration Prisma
- Auth, payment, webhook, server actions
- Debug yang butuh konteks mendalam
- QA execution (`/qa-execute`)

### Codex (Paralel ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â scope terbatas)
- Task independen dari Claude (cari task tanpa dependency di plan)
- UI components yang tidak menyentuh server
- Docs update, refactor terisolasi
- Test writing

### File yang TIDAK BOLEH dikerjakan paralel
```
prisma/schema.prisma
server/repositories/*.ts
middleware.ts
app/api/payment/** | app/api/order/**
```
ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Jika overlap: **koordinasi dulu**, jangan overwrite.

---

## Workflow Skills ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Kapan Pakai Apa

Gunakan skills ini untuk memaksimalkan kualitas dan konsistensi kerja:

| Situasi | Skill yang dipakai |
|---|---|
| Ada ide fitur baru / masalah yang belum jelas | `/brainstorm` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ideation terstruktur |
| Butuh dokumen spec formal sebelum coding | `/spec-writer` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â buat design doc |
| Butuh implementation plan yang executable | `/plan-writer` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â buat task breakdown |
| QA sebelum commit / deploy / ada bug report | `/qa-execute` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â eksekusi 7-tier QA |
| Setup project baru / onboarding repo | `/init-project` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â scaffold protokol |

> **Pipeline ideal untuk fitur signifikan:** `/brainstorm` ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ `/spec-writer` ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ `/plan-writer` ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ [user approve] ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ implementasi ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ `/qa-execute`

---

## ECC Specialized Agents ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Kapan Dispatch

ECC agents sudah terinstall di `~/.claude/agents/`. Dispatch ke agent terspesialisasi alih-alih menangani semuanya di main session.

### Agent Dispatch Table

| Task Type | Agent |
|---|---|
| Perencanaan arsitektur fitur / multi-file | `code-architect` |
| System design, scalability decisions | `architect` |
| **TypeScript / JavaScript code review** | `typescript-reviewer` ÃƒÂ¢Ã¢â‚¬Â Ã‚Â pakai ini setelah ubah .ts/.tsx |
| **React / JSX component review** | `react-reviewer` ÃƒÂ¢Ã¢â‚¬Â Ã‚Â pakai ini setelah ubah komponen |
| **PostgreSQL schema, query, migration review** | `database-reviewer` ÃƒÂ¢Ã¢â‚¬Â Ã‚Â pakai ini setelah ubah schema/query |
| **Security (auth / payment / webhook / input)** | `security-reviewer` ÃƒÂ¢Ã¢â‚¬Â Ã‚Â pakai ini untuk surface sensitif |
| TDD enforcement ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â tulis tests dulu | `tdd-guide` |
| E2E browser flow testing (Playwright) | `e2e-runner` |
| Build / TypeScript compilation errors | `build-error-resolver` |
| React build failures | `react-build-resolver` |
| Performance bottlenecks, bundle size | `performance-optimizer` |
| Dead code, unused imports, cleanup | `refactor-cleaner` |
| General code review setelah task selesai | `code-reviewer` |

### ECC Skill Reference ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Pattern Libraries

Sebelum menggunakan skill ECC, **baca SKILL.md-nya terlebih dahulu** dengan `view_file` pada path di bawah:

| Kapan | Path SKILL.md |
|---|---|
| Menulis Prisma queries / schema / migration | `~/.claude/skills/ecc/prisma-patterns/SKILL.md` |
| React component patterns + hooks | `~/.claude/skills/ecc/react-patterns/SKILL.md` |
| TDD workflow step-by-step | `~/.claude/skills/ecc/tdd-workflow/SKILL.md` |
| Security review checklist | `~/.claude/skills/ecc/security-review/SKILL.md` |
| Security scanning | `~/.claude/skills/ecc/security-scan/SKILL.md` |
| Database migration safety | `~/.claude/skills/ecc/database-migrations/SKILL.md` |
| Post-implementation verification | `~/.claude/skills/ecc/verification-loop/SKILL.md` |

> **Cara pakai:** Baca SKILL.md di path tersebut, lalu ikuti prosedurnya. Jangan berasumsi isi skill dari namanya saja.

### Aturan Dispatch
- Dispatch agent terspesialisasi **sebelum** klaim task selesai untuk area sensitif (auth/payment/schema/webhook).
- Setelah setiap coding task, dispatch `code-reviewer` atau reviewer stack-spesifik.
- Agents berjalan terisolasi ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â berikan file list + task context yang tepat, bukan session history.
- Untuk skill ECC: selalu `view_file` SKILL.md-nya dulu sebelum mengeksekusi workflow.

---

## DevSecOps ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Role & Reporting

**Role:** senior full-stack engineer + DevSecOps reviewer. Optimasi untuk perubahan yang **minimal, reviewable, testable**; prefer open-source / low-ops solutions.

**Dependency Policy:** Jangan tambah package kecuali perlu. Jika menambah, nyatakan: **kenapa perlu Ãƒâ€šÃ‚Â· alternatif yang dipertimbangkan Ãƒâ€šÃ‚Â· risiko security/maintenance Ãƒâ€šÃ‚Â· sinyal popularitas/maintenance** (downloads, last release, maintainers).

**Format Respons Akhir (setiap task):**
Akhiri dengan: **Summary Ãƒâ€šÃ‚Â· Files changed Ãƒâ€šÃ‚Â· Validation commands run Ãƒâ€šÃ‚Â· Security/scalability risks found Ãƒâ€šÃ‚Â· Risks not fully verified Ãƒâ€šÃ‚Â· Recommended next steps.** Jangan pernah klaim project 100% secure.

---

## Current Coordination Note

> Update bagian ini setiap ada perubahan signifikan: sprint owner baru, branch merge, env/tunnel/DB berubah, migration penting, aturan deploy baru, integrasi external service, atau boundary yang ditetapkan user.
>
> Format: singkat, bertanggal, operasional. Replace catatan lama yang sudah tidak relevan.

- **Updated:** 2026-06-18 - Codex execution protocol strengthened for standalone `teknos-logistics` delivery.

### Codex Power Protocol (2026-06-18)

- **Hard boundary:** edit, commit, and push only inside `C:\NEXT\teknos.id\teknos-logistics`; parent `C:\NEXT\teknos.id` is read-only reference unless user opens a separate parent-repo task.
- **Start checklist:** run `git status --short --branch`, read `CLAUDE.md`, `AGENTS.md`, `docs/ROADMAP.md`, and the sprint runbook/spec before code or docs changes.
- **Skill routing:** use `database-migrations`/`prisma-patterns` for schema, `api-design`/`backend-patterns` for endpoint contracts, `coding-standards` for maintainability, `github-ops` for remote operations, and Context7/Exa only when current external facts are needed.
- **Validation ladder:** docs-only changes need `git diff --check` plus secret scan where available; code changes add `npm run lint`, `npm run typecheck`, targeted smoke, and `npm run build` when production behavior changes.
- **Security stop:** no real JNE AWB/resi, `generatecnote`, production booking, secret printing, parent-repo mutation, or broad refactor without explicit approval and documented intent.
- **Commit discipline:** one narrow Conventional Commit per logical change; push only to `Septi-DmsDev/teknos-logistics.V1` for this project.

### Sprint 6 contract note (2026-06-18)
- Sprint 6 is contract/runbook preparation inside `teknos-logistics`, not parent `teknos.id` implementation.
- Canonical runbook: `docs/SPRINT_6_CONTRACT_RUNBOOK.md`.
- Contract endpoint: `GET /openapi.json`; validation: `npm run contract:check`.
- Future parent integration must start as a separate explicit task and should consume the documented contracts rather than changing this boundary.

### Sprint 3 JNE adapter note (2026-06-18)
- JNE tariff-only smoke passed with `npm run smoke:jne:rates -- --force-jne`; this calls `/pricedev` only and must not create a real resi.
- Do not run JNE `generatecnote` or `POST /v1/shipments` with courier `JNE` unless the user explicitly approves real AWB creation first.
- API-level smoke needs Supabase tunnel `localhost:5433`; direct adapter tariff smoke does not need DB/auth.

### Sprint 4 webhook note (2026-06-18)
- Migration `20260618064000_add_webhook_event_key` was applied to Supabase on 2026-06-18; webhook replay idempotency is live in the DB.
- `npm run smoke:jne:webhook` passed on 2026-06-18 with synthetic shipment replay: first update delivered, second update duplicate, one tracking row, one event row.
- `npm run smoke:jne:webhook` uses a synthetic JNE shipment only; it does not call JNE or create a real resi.

### Sprint 5 relay note (2026-06-18)
- `npm run webhooks:relay` processes due merchant webhook relay attempts; payloads are signed with `x-teknos-signature` and include `x-teknos-event-id`.
- `npm run smoke:webhook:relay` passed with a local synthetic receiver: one request, valid signature, attempt `SUCCESS` with HTTP `204`.
- Unique relay index `WebhookRelayAttempt_eventId_endpointId_key` was applied through `localhost:5433` via Prisma client fallback because Prisma CLI migration status is unreliable against the mixed parent/nested migration-history DB.

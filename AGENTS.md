# AGENTS.md ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â teknos-logistics

Execution checklist untuk AI agents. **`CLAUDE.md` = aturan & referensi; file ini = checklist eksekusi; `SECURITY.md` = kebijakan security.**

---

## ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¨ Mandatory Pre-Task Checklist ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â NO EXCEPTIONS

### Step 1: Load Project Context
```bash
git status --short --branch
git log --oneline -5
```
- [ ] Baca `CLAUDE.md` penuh ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â catat stack, arsitektur, aturan, dan forbidden actions
- [ ] Baca `AGENTS.md` ini ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â cek coordination note, who owns what, shared-file risk
- [ ] Jika task menyentuh schema/migration: baca migrasi terbaru
- [ ] Jika task menyentuh payment/checkout: baca spec di `docs/superpowers/specs/`
- [ ] Jika task menyentuh auth: review auth sections di `CLAUDE.md`
- [ ] Jika task menyentuh webhook: review idempotency rules

### Step 2: Declare Intent
Sebelum coding, nyatakan secara eksplisit:
1. **Files yang akan disentuh** ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â list lengkap
2. **Shared-file risk** ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â apakah ada file yang sedang dikerjakan agent lain?
3. **Constraints dari `CLAUDE.md`** ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â rule apa yang berlaku untuk task ini?
4. **Security concerns** ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â apakah task ini menyentuh auth, input, secrets, DB writes, upload?

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

> ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â **HARD STOP**: Jika ada security check yang tidak yakin, selesaikan SEBELUM menulis kode. Jangan lanjut dengan asumsi "fix it later" untuk security.

### Step 4: Post-Implementation Validation
```bash
# Selalu jalankan sebelum klaim task complete:
npm run lint && npm run typecheck && npm run build && npm run security:all
```
Jika command tidak bisa dijalankan, sampaikan ke user apa yang perlu divalidasi.

### Step 5: Docs-as-Code ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â Definition of Done
Task belum "selesai" sampai docs mencerminkan realita. Update dalam **commit yang sama** dengan code change.

| Trigger | File yang di-update |
|---|---|
| Sprint selesai | `CLAUDE.md` ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ Status Sprint |
| Env variable baru | `CLAUDE.md` ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ Environment Variables |
| Keputusan arsitektur baru | `CLAUDE.md` ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ Keputusan Arsitektur |
| Fitur baru deploy | `CLAUDE.md` ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ Fitur yang Sudah Dibangun |
| Migration schema | Kedua file + nama migration + tanggal |
| Rule baru dilarang | `CLAUDE.md` ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ Yang TIDAK Boleh Dilakukan |

### Step 6: Commit (Conventional Commits)
Format: `<type>(scope): summary` ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â `feat | fix | docs | chore | refactor | test | perf`.
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
- Fitur kompleks ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â multi-file, arsitektur baru
- Perubahan schema / migration Prisma
- Auth, payment, webhook, server actions
- Debug yang butuh konteks mendalam
- QA execution (`/qa-execute`)

### Codex (Paralel ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â scope terbatas)
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
ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ Jika overlap: **koordinasi dulu**, jangan overwrite.

---

## Workflow Skills ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â Kapan Pakai Apa

Gunakan skills ini untuk memaksimalkan kualitas dan konsistensi kerja:

| Situasi | Skill yang dipakai |
|---|---|
| Ada ide fitur baru / masalah yang belum jelas | `/brainstorm` ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ideation terstruktur |
| Butuh dokumen spec formal sebelum coding | `/spec-writer` ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â buat design doc |
| Butuh implementation plan yang executable | `/plan-writer` ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â buat task breakdown |
| QA sebelum commit / deploy / ada bug report | `/qa-execute` ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â eksekusi 7-tier QA |
| Setup project baru / onboarding repo | `/init-project` ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â scaffold protokol |

> **Pipeline ideal untuk fitur signifikan:** `/brainstorm` ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ `/spec-writer` ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ `/plan-writer` ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ [user approve] ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ implementasi ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ `/qa-execute`

---

## ECC Specialized Agents ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â Kapan Dispatch

ECC agents sudah terinstall di `~/.claude/agents/`. Dispatch ke agent terspesialisasi alih-alih menangani semuanya di main session.

### Agent Dispatch Table

| Task Type | Agent |
|---|---|
| Perencanaan arsitektur fitur / multi-file | `code-architect` |
| System design, scalability decisions | `architect` |
| **TypeScript / JavaScript code review** | `typescript-reviewer` ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â pakai ini setelah ubah .ts/.tsx |
| **React / JSX component review** | `react-reviewer` ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â pakai ini setelah ubah komponen |
| **PostgreSQL schema, query, migration review** | `database-reviewer` ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â pakai ini setelah ubah schema/query |
| **Security (auth / payment / webhook / input)** | `security-reviewer` ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â pakai ini untuk surface sensitif |
| TDD enforcement ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â tulis tests dulu | `tdd-guide` |
| E2E browser flow testing (Playwright) | `e2e-runner` |
| Build / TypeScript compilation errors | `build-error-resolver` |
| React build failures | `react-build-resolver` |
| Performance bottlenecks, bundle size | `performance-optimizer` |
| Dead code, unused imports, cleanup | `refactor-cleaner` |
| General code review setelah task selesai | `code-reviewer` |

### ECC Skill Reference ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â Pattern Libraries

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
- Agents berjalan terisolasi ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â berikan file list + task context yang tepat, bukan session history.
- Untuk skill ECC: selalu `view_file` SKILL.md-nya dulu sebelum mengeksekusi workflow.

---

## DevSecOps ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â Role & Reporting

**Role:** senior full-stack engineer + DevSecOps reviewer. Optimasi untuk perubahan yang **minimal, reviewable, testable**; prefer open-source / low-ops solutions.

**Dependency Policy:** Jangan tambah package kecuali perlu. Jika menambah, nyatakan: **kenapa perlu ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· alternatif yang dipertimbangkan ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· risiko security/maintenance ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· sinyal popularitas/maintenance** (downloads, last release, maintainers).

**Format Respons Akhir (setiap task):**
Akhiri dengan: **Summary ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· Files changed ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· Validation commands run ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· Security/scalability risks found ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· Risks not fully verified ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· Recommended next steps.** Jangan pernah klaim project 100% secure.

---

## Current Coordination Note

- 2026-06-21: Coolify production deploy prep added. Production path uses Coolify Nixpacks autodetect with `NIXPACKS_NODE_VERSION=24`, Base Directory `/`, and Port `3000`; no `nixpacks.toml` is required. Use `.env.production.example` for runtime env placeholders and `docs/COOLIFY_PRODUCTION_DEPLOY.md` for migration/import/smoke order. Dockerfile remains available as a fallback image path; `.dockerignore` keeps JNE XLS/XLSX support files but excludes PDFs/caches/secrets.

- 2026-06-21: Provider origin catalog lookup added for Admin UI origin mapping. Migration `20260621143000_add_provider_origin_catalog`, endpoint `GET /admin/provider-origins`, `npm run import:jne:origins` dry-run, and `npm run import:jne:origins:apply` DB upsert are now part of the setup flow. Apply migration before using lookup against DB.

- 2026-06-20: Sprint 13 JNE import tooling is ready offline. `import:jne:destinations` dry-run parsed 82,959 rows / 7,353 tariff codes; DB apply requires migrations `20260620143000` and `20260620152000` deployed first. Do not run `--apply` while tunnel is down.

- 2026-06-20: Sprint 12 OriginMapping offline implementation added: schema/migration `20260620143000_add_origin_mappings`, provider origin resolver, admin origin mapping endpoint, `origin:mappings:upsert`, and `sprint12:readiness`. DB deploy/runtime smoke pending server/tunnel recovery.

- 2026-06-20: Sprint 11B SAP Express offline implementation is active in `feature/bootstrap-logistics-platform`: SAP client/adapter, `/webhooks/sap-express`, `smoke:sap:adapter`, and `sprint11b:readiness`. Server/tunnel downtime blocks runtime DB/Supabase/SAP QA; do not run real SAP booking without explicit approval.

> Update bagian ini setiap ada perubahan signifikan: sprint owner baru, branch merge, env/tunnel/DB berubah, migration penting, aturan deploy baru, integrasi external service, atau boundary yang ditetapkan user.
>
> Format: singkat, bertanggal, operasional. Replace catatan lama yang sudah tidak relevan.

- **Updated:** 2026-06-20 - Sprint 9 Admin Control Center completed in `teknos-logistics`: `/admin-ui`, dashboard, merchant/store/origin/courier config UI, read-only operations pages, `smoke:admin-ui`, and `sprint9:readiness`. Parent `teknos.id` remains read-only; no JNE booking/resi/generatecnote action is allowed from the UI.

### Codex Power Protocol (2026-06-18)

- **Hard boundary:** edit, commit, and push only inside `C:\NEXT\teknos.id\teknos-logistics`; parent `C:\NEXT\teknos.id` is read-only reference unless user opens a separate parent-repo task.
- **Start checklist:** run `git status --short --branch`, read `CLAUDE.md`, `AGENTS.md`, `docs/ROADMAP.md`, `docs/SPRINT_9_ADMIN_UI_RUNBOOK.md`, and the active sprint spec/plan before code or docs changes.
- **Skill routing:** use `database-migrations`/`prisma-patterns` for schema, `api-design`/`backend-patterns` for endpoint contracts, `coding-standards` for maintainability, `github-ops` for remote operations, and Context7/Exa only when current external facts are needed.
- **Validation ladder:** docs-only changes need `git diff --check` plus secret scan where available; code changes add `npm run lint`, `npm run typecheck`, targeted smoke, and `npm run build` when production behavior changes.
- **Security stop:** no real JNE AWB/resi, `generatecnote`, production booking, secret printing, parent-repo mutation, or broad refactor without explicit approval and documented intent.
- **Commit discipline:** one narrow Conventional Commit per logical change; push only to `Septi-DmsDev/teknos-logistics.V1` for this project.

### Sprint 6 contract note (2026-06-18)
- Sprint 6 is contract/runbook preparation inside `teknos-logistics`, not parent `teknos.id` implementation.
- Product direction: Biteship-like platform; `teknos.id` owns commerce and `teknos-logistics` owns logistics operations/configuration.
- Canonical runbook: `docs/SPRINT_6_CONTRACT_RUNBOOK.md`.
- Parent handoff artifact: `docs/TEKNOS_ID_HANDOFF.md`.
- Contract endpoint: `GET /openapi.json`; validation: `npm run contract:check`.
- Readiness gate: `npm run sprint6:readiness` before opening parent-repo implementation work.
- Future parent integration must start as a separate explicit task and should consume the documented contracts rather than changing this boundary.

### Sprint 7 admin config note (2026-06-19)
- Tasks 1-7 are complete: schema migration, admin auth/schemas, repositories, services, `/admin/*` routes, `npm run smoke:admin-config`, and operational docs.
- Migration `20260618103000_add_admin_config_models` was applied to Supabase through `localhost:5433 -> 10.0.8.12:5432`.
- Full validation passed on 2026-06-19: `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run smoke:admin-config`. The smoke creates synthetic admin config rows only and does not call JNE or create AWB/resi.
- Continue to keep parent `teknos.id` read-only; Sprint 8 should focus on reliability/security hardening inside `teknos-logistics`.

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

# AGENTS.md â€” teknos-logistics

Execution checklist untuk AI agents. **`CLAUDE.md` = aturan & referensi; file ini = checklist eksekusi; `SECURITY.md` = kebijakan security.**

---

## ðŸš¨ Mandatory Pre-Task Checklist â€” NO EXCEPTIONS

### Step 1: Load Project Context
```bash
git status --short --branch
git log --oneline -5
```
- [ ] Baca `CLAUDE.md` penuh â€” catat stack, arsitektur, aturan, dan forbidden actions
- [ ] Baca `AGENTS.md` ini â€” cek coordination note, who owns what, shared-file risk
- [ ] Jika task menyentuh schema/migration: baca migrasi terbaru
- [ ] Jika task menyentuh payment/checkout: baca spec di `docs/superpowers/specs/`
- [ ] Jika task menyentuh auth: review auth sections di `CLAUDE.md`
- [ ] Jika task menyentuh webhook: review idempotency rules

### Step 2: Declare Intent
Sebelum coding, nyatakan secara eksplisit:
1. **Files yang akan disentuh** â€” list lengkap
2. **Shared-file risk** â€” apakah ada file yang sedang dikerjakan agent lain?
3. **Constraints dari `CLAUDE.md`** â€” rule apa yang berlaku untuk task ini?
4. **Security concerns** â€” apakah task ini menyentuh auth, input, secrets, DB writes, upload?

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

> âš ï¸ **HARD STOP**: Jika ada security check yang tidak yakin, selesaikan SEBELUM menulis kode. Jangan lanjut dengan asumsi "fix it later" untuk security.

### Step 4: Post-Implementation Validation
```bash
# Selalu jalankan sebelum klaim task complete:
npm run lint && npm run typecheck && npm run build && npm run security:all
```
Jika command tidak bisa dijalankan, sampaikan ke user apa yang perlu divalidasi.

### Step 5: Docs-as-Code â€” Definition of Done
Task belum "selesai" sampai docs mencerminkan realita. Update dalam **commit yang sama** dengan code change.

| Trigger | File yang di-update |
|---|---|
| Sprint selesai | `CLAUDE.md` Â§ Status Sprint |
| Env variable baru | `CLAUDE.md` Â§ Environment Variables |
| Keputusan arsitektur baru | `CLAUDE.md` Â§ Keputusan Arsitektur |
| Fitur baru deploy | `CLAUDE.md` Â§ Fitur yang Sudah Dibangun |
| Migration schema | Kedua file + nama migration + tanggal |
| Rule baru dilarang | `CLAUDE.md` Â§ Yang TIDAK Boleh Dilakukan |

### Step 6: Commit (Conventional Commits)
Format: `<type>(scope): summary` â€” `feat | fix | docs | chore | refactor | test | perf`.
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
- Fitur kompleks â€” multi-file, arsitektur baru
- Perubahan schema / migration Prisma
- Auth, payment, webhook, server actions
- Debug yang butuh konteks mendalam
- QA execution (`/qa-execute`)

### Codex (Paralel â€” scope terbatas)
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
â†’ Jika overlap: **koordinasi dulu**, jangan overwrite.

---

## Workflow Skills â€” Kapan Pakai Apa

Gunakan skills ini untuk memaksimalkan kualitas dan konsistensi kerja:

| Situasi | Skill yang dipakai |
|---|---|
| Ada ide fitur baru / masalah yang belum jelas | `/brainstorm` â€” ideation terstruktur |
| Butuh dokumen spec formal sebelum coding | `/spec-writer` â€” buat design doc |
| Butuh implementation plan yang executable | `/plan-writer` â€” buat task breakdown |
| QA sebelum commit / deploy / ada bug report | `/qa-execute` â€” eksekusi 7-tier QA |
| Setup project baru / onboarding repo | `/init-project` â€” scaffold protokol |

> **Pipeline ideal untuk fitur signifikan:** `/brainstorm` â†’ `/spec-writer` â†’ `/plan-writer` â†’ [user approve] â†’ implementasi â†’ `/qa-execute`

---

## ECC Specialized Agents â€” Kapan Dispatch

ECC agents sudah terinstall di `~/.claude/agents/`. Dispatch ke agent terspesialisasi alih-alih menangani semuanya di main session.

### Agent Dispatch Table

| Task Type | Agent |
|---|---|
| Perencanaan arsitektur fitur / multi-file | `code-architect` |
| System design, scalability decisions | `architect` |
| **TypeScript / JavaScript code review** | `typescript-reviewer` â† pakai ini setelah ubah .ts/.tsx |
| **React / JSX component review** | `react-reviewer` â† pakai ini setelah ubah komponen |
| **PostgreSQL schema, query, migration review** | `database-reviewer` â† pakai ini setelah ubah schema/query |
| **Security (auth / payment / webhook / input)** | `security-reviewer` â† pakai ini untuk surface sensitif |
| TDD enforcement â€” tulis tests dulu | `tdd-guide` |
| E2E browser flow testing (Playwright) | `e2e-runner` |
| Build / TypeScript compilation errors | `build-error-resolver` |
| React build failures | `react-build-resolver` |
| Performance bottlenecks, bundle size | `performance-optimizer` |
| Dead code, unused imports, cleanup | `refactor-cleaner` |
| General code review setelah task selesai | `code-reviewer` |

### ECC Skill Reference â€” Pattern Libraries

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
- Agents berjalan terisolasi â€” berikan file list + task context yang tepat, bukan session history.
- Untuk skill ECC: selalu `view_file` SKILL.md-nya dulu sebelum mengeksekusi workflow.

---

## DevSecOps â€” Role & Reporting

**Role:** senior full-stack engineer + DevSecOps reviewer. Optimasi untuk perubahan yang **minimal, reviewable, testable**; prefer open-source / low-ops solutions.

**Dependency Policy:** Jangan tambah package kecuali perlu. Jika menambah, nyatakan: **kenapa perlu Â· alternatif yang dipertimbangkan Â· risiko security/maintenance Â· sinyal popularitas/maintenance** (downloads, last release, maintainers).

**Format Respons Akhir (setiap task):**
Akhiri dengan: **Summary Â· Files changed Â· Validation commands run Â· Security/scalability risks found Â· Risks not fully verified Â· Recommended next steps.** Jangan pernah klaim project 100% secure.

---

## Current Coordination Note

> Update bagian ini setiap ada perubahan signifikan: sprint owner baru, branch merge, env/tunnel/DB berubah, migration penting, aturan deploy baru, integrasi external service, atau boundary yang ditetapkan user.
>
> Format: singkat, bertanggal, operasional. Replace catatan lama yang sudah tidak relevan.

- **Updated:** {{CURRENT_DATE}} â€” project initialized with agent protocol scaffold.


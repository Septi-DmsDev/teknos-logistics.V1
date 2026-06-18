# teknos-logistics

> Ringkasan 1 kalimat tentang project ini. Stack: Node.js TypeScript Hono API + Prisma PostgreSQL + Docker. Status: Development.

**Spec lengkap:** `docs/superpowers/specs/`
**Roadmap:** `docs/ROADMAP.md`
**Sprint plans:** `docs/superpowers/plans/`

---

## âš™ï¸ Alur Kerja Wajib (Development Discipline)

Berlaku untuk SETIAP tugas â€” patuhi sebelum, selama, dan sesudah eksekusi.

### 1. Pipeline Wajib â€” 4 Fase Tanpa Shortcut

```
FASE 1        FASE 2           FASE 3              FASE 4
IDEASI    â†’  PLANNING     â†’   EKSEKUSI        â†’   QA & DEPLOY
/brainstorm  /spec-writer     coding terkoordinasi  /qa-execute
             /plan-writer     [user approve dulu]
```

- **Fase 1 (Ideasi):** Fitur baru / ambigu â†’ `/brainstorm` wajib. Output = keputusan pendekatan yang disepakati.
- **Fase 2 (Planning):** `/spec-writer` â†’ simpan di `docs/superpowers/specs/`. `/plan-writer` â†’ simpan di `docs/superpowers/plans/`. User **harus approve plan** sebelum coding dimulai.
- **Fase 3 (Eksekusi):** Ikuti plan task per task. Deklarasikan file yang disentuh. Tidak ada dua agent di file yang sama. Commit scope sempit per task.
- **Fase 4 (QA):** `/qa-execute` sebelum setiap deploy. Tidak ada deploy tanpa QA Report = READY.

### 2. Konteks dulu â€” baca dokumentasi sebelum eksekusi
- Baca `CLAUDE.md` + `AGENTS.md` + spec/plan yang relevan sebelum menyentuh kode.
- Verifikasi fakta repo: `git status --short --branch`, `git log --oneline -10`.
- Jangan improvisasi di luar plan â€” jika butuh perubahan scope, update plan dulu.

### 2. Dokumentasi selalu sinkron (docs-as-code) â€” WAJIB
Setiap perubahan kode/arsitektur/schema/env/deploy **harus disertai update dokumentasi dalam commit yang sama**. Tugas belum "selesai" sampai dokumen mencerminkan kondisi nyata. Singkat, **bertanggal**, operasional; ganti catatan usang.

| Trigger | File yang di-update |
|---|---|
| Sprint selesai | `CLAUDE.md` Â§ Status Sprint |
| Env variable baru | `CLAUDE.md` Â§ Environment Variables |
| Keputusan arsitektur | `CLAUDE.md` Â§ Keputusan Arsitektur |
| Fitur baru deploy | `CLAUDE.md` Â§ Fitur yang Sudah Dibangun |
| Migration schema | Kedua file + nama migration + tanggal |
| Rule baru dilarang | `CLAUDE.md` Â§ Yang TIDAK Boleh Dilakukan |

### 3. Security-first â€” setiap perubahan berpotensi berisiko
Permukaan sensitif: **API key auth, courier webhooks, request validation, env/secret handling, Prisma schema/migrations, outbound merchant webhook relay**.
- Spec dulu untuk permukaan sensitif â€” jangan hotfix buta.
- **Selalu** validasi & otorisasi **server-side** â€” jangan percaya nilai dari client (harga, role, stock, ID).
- Jalankan tooling sebelum commit relevan:
  ```bash
  semgrep --config auto <path>                 # auth/payment/webhook/upload/input
  gitleaks protect --staged --no-banner        # config/env/docs/credentials
  trivy fs --scanners vuln,secret,misconfig .  # Dockerfile/image/dependency
  ```
- **Jangan pernah** commit/hardcode secret, token, credentials â€” termasuk di docs & `.env.example`.

### 4. Bukti sebelum klaim
Jangan klaim build/lint/test/migration/QA/deploy berhasil tanpa menjalankan perintahnya dan membaca outputnya. Pisahkan `terkonfirmasi` vs `asumsi` vs `langkah berikutnya`.

### 5. Konvensi commit (Conventional Commits)
Format: `<tipe>(scope): ringkasan`. Tipe: `feat | fix | docs | chore | refactor | test | perf`.
Satu commit = satu perubahan logis, scope sempit.

### 6. 5 Aturan Tim â€” Non-Negotiable

| # | Aturan | Konsekuensi jika dilanggar |
|---|---|---|
| 1 | Tidak ada coding tanpa plan approved di `docs/superpowers/plans/` | Revert dan buat plan dulu |
| 2 | Tidak ada deploy tanpa `/qa-execute` green (READY) | Deploy ditolak |
| 3 | Tidak ada dua agent di file yang sama secara bersamaan | Koordinasi dulu via git status |
| 4 | Docs selalu sinkron dalam commit yang sama dengan code | Commit tidak diterima tanpa doc update |
| 5 | Secret terdeteksi = HARD STOP, rotate semua credential dulu | Jangan commit apapun sebelum selesai |

> **Pembagian:** `CLAUDE.md` = aturan & referensi; `AGENTS.md` = checklist eksekusi.

### Catatan Agent (DevSecOps)
- Ikuti `AGENTS.md` + `SECURITY.md` + `docs/AI_AGENT_PROTOCOL.md`.
- **Jangan** baca/tampilkan/commit file secret (`.env*`, `*.pem`, `*.key`, `id_rsa`, `id_ed25519`).
- Gunakan MCP/tool bila tersedia: **Context7** (dok library terbaru), **Playwright** (QA UI), **GitHub** (PR/CI), **Semgrep/Gitleaks/Trivy** (security scan).
- Jalankan `npm run lint && npm run typecheck && npm run build && npm run security:all` sebelum klaim selesai. Laporan akhir ringkas & jujur â€” jangan klaim 100% aman.

---

## Stack

| Area | Tech |
|---|---|
| Framework | Node.js TypeScript Hono API + Prisma PostgreSQL + Docker |
| Package Manager | npm |
| Database / ORM | > isi sesuai project |
| Auth | > isi sesuai project |
| Storage | > isi sesuai project |
| Deployment | > isi sesuai project |

---

## Struktur Folder â€” Aturan Wajib

```
src/
â”œâ”€â”€ app/           # Routes (Next.js App Router)
â”œâ”€â”€ components/    # UI only â€” TIDAK boleh query DB langsung
â”œâ”€â”€ features/      # Domain logic per fitur
â”œâ”€â”€ server/
â”‚   â”œâ”€â”€ actions/       # Server Actions (entry dari UI)
â”‚   â”œâ”€â”€ services/      # Business logic
â”‚   â””â”€â”€ repositories/  # SATU-SATUNYA tempat ORM/DB dipanggil
â””â”€â”€ lib/
    â”œâ”€â”€ validators/    # Zod schemas
    â””â”€â”€ utils/
```

> **Aturan wajib:** Jangan call DB/ORM dari luar `server/repositories/`. Selalu lewat `server/repositories/`.

---

## Route Groups

| Group | URL Pattern | Auth |
|---|---|---|
| > isi sesuai project | | |

---

## Status Sprint

| Sprint | Topik | Status |
|---|---|---|
| Sprint 00 | Platform readiness | Done - bootstrap + `/init-project` guardrails |
| Sprint 01 | Database and seed MVP | In Progress - migration `20260618021957_init` applied; seed/API key next |

---

## Fitur yang Sudah Dibangun

> Daftar fitur yang sudah live, format: `- **Nama Fitur âœ… (YYYY-MM-DD):** ringkasan 1 kalimat.`

---

## Dev Commands

```bash
# Dev server
npm run dev

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Build
npm run build
```

---

## Environment Variables

```
# Isi dengan semua env vars yang digunakan
# Format: VAR_NAME    Deskripsi singkat
```

> **Aturan:** Variabel dengan prefix `NEXT_PUBLIC_` = aman untuk client. Tanpa prefix = server-only secret. Jangan salah assign.

---

## Keputusan Arsitektur Penting

### Harga & Kalkulasi
> Selalu hitung server-side â€” jangan percaya angka dari client.

### Data Flow
> Definisikan di sini: dari mana data mengalir, siapa yang boleh menulis ke mana.

---

## Yang TIDAK Boleh Dilakukan

### Arsitektur & Data Flow
- Jangan call DB/ORM dari luar `server/repositories/`
- Jangan hitung nilai penting (harga, diskon, stok, role) di client
- > tambah larangan spesifik project

### Security â€” DILARANG KERAS
- Jangan expose secret ke client (prefix `NEXT_PUBLIC_` hanya untuk data publik)
- Jangan commit `.env*` ke repository
- Jangan return error message internal ke client (stack trace, query detail)
- Jangan skip validasi input di server actions / route handlers â€” selalu Zod
- Jangan trust nilai dari client untuk kalkulasi sensitif
- Jangan gunakan `dangerouslySetInnerHTML` tanpa sanitasi
- Jangan lakukan DB mutation dari GET handler

### Workflow & Docs
- Jangan mulai coding tanpa membaca `CLAUDE.md` dan `AGENTS.md`
- Jangan anggap migration/deploy/QA "lulus" tanpa menjalankan command-nya

---

## Checklist Go-Live

- [ ] Semua env vars sudah di-set di production
- [ ] Webhook URLs sudah didaftarkan ke provider yang sesuai
- [ ] Full flow test: end-to-end dari UI sampai DB
- [ ] Security scan bersih (semgrep, gitleaks, trivy)
- [ ] Monitoring & alerting aktif


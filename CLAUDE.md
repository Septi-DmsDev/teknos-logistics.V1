# teknos-logistics

> Ringkasan 1 kalimat tentang project ini. Stack: Node.js TypeScript Hono API + Prisma PostgreSQL + Docker. Status: Development.

**Spec lengkap:** `docs/superpowers/specs/`
**Roadmap:** `docs/ROADMAP.md`
**Sprint plans:** `docs/superpowers/plans/`

## Project Operating Doctrine Ã¢â‚¬â€ 2026-06-18

- `teknos-logistics` adalah project terpisah dari parent `teknos.id`, dengan repo, database, deploy, dan lifecycle sendiri.
- Arah produk resmi: `teknos-logistics` menjadi platform logistik mirip Biteship untuk Teknos, bukan sekadar adapter JNE.
- Prinsip ownership: `teknos.id` mengelola commerce; `teknos-logistics` mengelola operasional logistik.
- Konfigurasi courier, toko/cabang/origin, mapping service, rekap resi, tracking history, webhook logs, retry/dead-letter, dan laporan logistik berada di `teknos-logistics`.
- Web utama hanya menerima kontrak sederhana: API URL/key, feature flag, rates, shipment summary, tracking status, dan webhook update.
- Batas kerja default: edit hanya file di `C:\NEXT\teknos.id\teknos-logistics`; parent `C:\NEXT\teknos.id` hanya boleh dibaca sebagai referensi.
- Jangan modify, commit, atau push parent `teknos.id` dari konteks project ini kecuali user membuka task parent-repo terpisah secara eksplisit.
- Gunakan Bahasa Indonesia untuk komunikasi operasional; tetap gunakan nama file, command, env var, endpoint, dan tipe data sesuai literal aslinya.
- Gunakan skill/MCP secara selektif: `database-migrations`/`prisma-patterns` untuk schema, `api-design`/`backend-patterns` untuk endpoint, `github-ops` untuk push/PR, Context7 untuk dokumen library, Exa/web hanya untuk fakta eksternal yang perlu verifikasi.
- Real JNE AWB/resi adalah aksi produksi: jangan jalankan `generatecnote`, booking JNE nyata, atau flow yang dapat membuat resi tanpa approval eksplisit dan pelaporan ke user terlebih dahulu.

### Definition of Ready

- Scope sprint tertulis di `docs/ROADMAP.md`, spec/plan/runbook terkait, atau catatan dokumen lain di repo ini.
- File yang akan disentuh sudah dideklarasikan dan tidak melanggar boundary parent read-only.
- Env/credential yang dibutuhkan tersedia lokal/production tanpa dicetak ke chat atau disimpan di tracked file.
- Risiko security untuk API key, webhook, DB write, secret, dan external courier sudah diidentifikasi sebelum coding.

### Definition of Done

- Code/docs berubah dalam scope sempit, reviewable, dan konsisten dengan repository/service boundary.
- Dokumentasi operasional diperbarui pada commit yang sama untuk perubahan sprint, env, schema, deploy, atau integrasi eksternal.
- Validasi yang relevan dijalankan dan hasilnya disebutkan; minimal docs-only memakai `git diff --check` dan secret scan sebelum push.
- Commit memakai Conventional Commit dan push hanya ke remote `Septi-DmsDev/teknos-logistics.V1` untuk project ini.

---

## ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã‚Â¡ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã‚Â¯Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â Alur Kerja Wajib (Development Discipline)

Berlaku untuk SETIAP tugas ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â patuhi sebelum, selama, dan sesudah eksekusi.

### 1. Pipeline Wajib ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â 4 Fase Tanpa Shortcut

```
FASE 1        FASE 2           FASE 3              FASE 4
IDEASI    ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢  PLANNING     ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢   EKSEKUSI        ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢   QA & DEPLOY
/brainstorm  /spec-writer     coding terkoordinasi  /qa-execute
             /plan-writer     [user approve dulu]
```

- **Fase 1 (Ideasi):** Fitur baru / ambigu ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ `/brainstorm` wajib. Output = keputusan pendekatan yang disepakati.
- **Fase 2 (Planning):** `/spec-writer` ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ simpan di `docs/superpowers/specs/`. `/plan-writer` ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ simpan di `docs/superpowers/plans/`. User **harus approve plan** sebelum coding dimulai.
- **Fase 3 (Eksekusi):** Ikuti plan task per task. Deklarasikan file yang disentuh. Tidak ada dua agent di file yang sama. Commit scope sempit per task.
- **Fase 4 (QA):** `/qa-execute` sebelum setiap deploy. Tidak ada deploy tanpa QA Report = READY.

### 2. Konteks dulu ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â baca dokumentasi sebelum eksekusi
- Baca `CLAUDE.md` + `AGENTS.md` + spec/plan yang relevan sebelum menyentuh kode.
- Verifikasi fakta repo: `git status --short --branch`, `git log --oneline -10`.
- Jangan improvisasi di luar plan ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â jika butuh perubahan scope, update plan dulu.

### 2. Dokumentasi selalu sinkron (docs-as-code) ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â WAJIB
Setiap perubahan kode/arsitektur/schema/env/deploy **harus disertai update dokumentasi dalam commit yang sama**. Tugas belum "selesai" sampai dokumen mencerminkan kondisi nyata. Singkat, **bertanggal**, operasional; ganti catatan usang.

| Trigger | File yang di-update |
|---|---|
| Sprint selesai | `CLAUDE.md` ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ Status Sprint |
| Env variable baru | `CLAUDE.md` ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ Environment Variables |
| Keputusan arsitektur | `CLAUDE.md` ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ Keputusan Arsitektur |
| Fitur baru deploy | `CLAUDE.md` ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ Fitur yang Sudah Dibangun |
| Migration schema | Kedua file + nama migration + tanggal |
| Rule baru dilarang | `CLAUDE.md` ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ Yang TIDAK Boleh Dilakukan |

### 3. Security-first ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â setiap perubahan berpotensi berisiko
Permukaan sensitif: **API key auth, courier webhooks, request validation, env/secret handling, Prisma schema/migrations, outbound merchant webhook relay**.
- Spec dulu untuk permukaan sensitif ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â jangan hotfix buta.
- **Selalu** validasi & otorisasi **server-side** ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â jangan percaya nilai dari client (harga, role, stock, ID).
- Jalankan tooling sebelum commit relevan:
  ```bash
  semgrep --config auto <path>                 # auth/payment/webhook/upload/input
  gitleaks protect --staged --no-banner        # config/env/docs/credentials
  trivy fs --scanners vuln,secret,misconfig .  # Dockerfile/image/dependency
  ```
- **Jangan pernah** commit/hardcode secret, token, credentials ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â termasuk di docs & `.env.example`.

### 4. Bukti sebelum klaim
Jangan klaim build/lint/test/migration/QA/deploy berhasil tanpa menjalankan perintahnya dan membaca outputnya. Pisahkan `terkonfirmasi` vs `asumsi` vs `langkah berikutnya`.

### 5. Konvensi commit (Conventional Commits)
Format: `<tipe>(scope): ringkasan`. Tipe: `feat | fix | docs | chore | refactor | test | perf`.
Satu commit = satu perubahan logis, scope sempit.

### 6. 5 Aturan Tim ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Non-Negotiable

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
- Jalankan `npm run lint && npm run typecheck && npm run build && npm run security:all` sebelum klaim selesai. Laporan akhir ringkas & jujur ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â jangan klaim 100% aman.

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

## Struktur Folder ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Aturan Wajib

```
src/
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ app/           # Routes (Next.js App Router)
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ components/    # UI only ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â TIDAK boleh query DB langsung
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ features/      # Domain logic per fitur
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ server/
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡   ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ actions/       # Server Actions (entry dari UI)
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡   ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ services/      # Business logic
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡   ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ repositories/  # SATU-SATUNYA tempat ORM/DB dipanggil
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ lib/
    ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ validators/    # Zod schemas
    ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ utils/
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
| Sprint 01 | Database and seed MVP | Done - migration `20260618021957_init` applied, merchant `teknos` seeded, local API key generated, mock rates/booking validated |
| Sprint 02 | Core merchant API | Done - explicit DTO responses, idempotent booking by `merchantId + externalOrderId`, smoke rates/booking/tracking validated |
| Sprint 03 | JNE production adapter | Done - tariff-only JNE smoke passed on 2026-06-18; real AWB/resi creation requires explicit user approval |
| Sprint 04 | Webhook ingress lifecycle | Done - migration `20260618064000_add_webhook_event_key` applied, timing-safe token check, normalized idempotency, and synthetic replay smoke passed |
| Sprint 05 | Merchant webhook relay | Done - HMAC relay worker, retry/backoff, dead-letter state, and synthetic relay smoke passed |
| Sprint 06 | `teknos.id` staging integration | In Progress - OpenAPI contract endpoint and `contract:check` handoff validation added inside `teknos-logistics`; parent `teknos.id` remains read-only |
| Sprint 07 | Logistics admin config MVP | Done - Tasks 1-7 completed, migration `20260618103000_add_admin_config_models` applied, full validation passed, and admin smoke passed on 2026-06-19 |
| Sprint 08 | Reliability and security hardening | Done - health/readiness, route rate limiting, persistent admin audit logs, audit visibility, cleanup utility, and runbook/readiness gate completed |
| Sprint 09 | Admin Control Center minimal | Done - `/admin-ui` dashboard, merchant/store/origin/courier config UI, read-only operations pages, `smoke:admin-ui`, and `sprint9:readiness` completed |
| Sprint 10 | Multi-courier foundation | In Progress - JNT/SAP skeleton providers, capability matrix, normalizers, and `/v1/couriers/capabilities` slice started |

---

## Fitur yang Sudah Dibangun

> Daftar fitur yang sudah live, format: `- **Nama Fitur ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ (YYYY-MM-DD):** ringkasan 1 kalimat.`

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
DATABASE_URL              Server-side Postgres connection string. Use tunnel localhost:5433 for local migration/dev.
TEKNOS_INTERNAL_API_KEY   Local-only merchant API key for manual testing; stored in ignored .env.local, never commit.
LOGISTICS_PROVIDER        Provider selector: mock or jne.
JNE_*                     Server-only JNE credentials/configuration. Tariff requires base URL/user/key/origin; booking additionally requires shipper/cust/branch values.
JNE_WEBHOOK_TOKEN         Shared token for courier webhook ingress validation; required by POST /webhooks/jne.
RATE_LIMIT_WINDOW_MS      In-memory rate limit window in milliseconds; default 60000.
RATE_LIMIT_PUBLIC_MAX     Max requests per window for `/v1/*` and `/webhooks/*`; default 120; set 0 only for controlled local testing.
RATE_LIMIT_ADMIN_MAX      Max requests per window for `/admin/*`; default 60; set 0 only for controlled local testing.
```

> **Aturan:** Variabel dengan prefix `NEXT_PUBLIC_` = aman untuk client. Tanpa prefix = server-only secret. Jangan salah assign.

---

## Keputusan Arsitektur Penting

### Harga & Kalkulasi
> Selalu hitung server-side ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â jangan percaya angka dari client.

### Data Flow
Merchant API requests enter Hono routes, are authenticated by API key hash lookup, validated with Zod DTOs, then call services/repositories. Courier adapters own external-provider calls; JNE tariff/tracking are non-mutating, while `generatecnote` creates a real resi and requires operator approval before manual validation.

### Commerce vs Logistics Ownership
`teknos.id` should not own logistics operations modules such as branch/origin courier config, AWB/resi recap, raw tracking history, courier webhook logs, relay retry state, or courier reporting. It should keep only the shipment summary needed by order/customer UX and delegate logistics operations to `teknos-logistics`.

### Integration Boundary
Sprint 6 is a contract-first bridge. `teknos-logistics` owns public API contracts, merchant relay signing, smoke commands, and runbooks; parent `teknos.id` implementation is a separate future task and must not be changed from this repo context.

### Sprint 6 Contract Surface
`GET /openapi.json` exposes the merchant API and courier webhook contract for parent handoff. `npm run contract:check` validates the contract surface without touching DB state, calling JNE, or creating AWB/resi.

### Sprint 6 Parent Handoff
`docs/TEKNOS_ID_HANDOFF.md` is the copy-ready integration package for a future parent `teknos.id` task. It documents server-only env, HTTP client usage, HMAC webhook receiver behavior, staging cutover, and rollback while preserving parent read-only boundary.

`npm run sprint6:readiness` is the read-only readiness gate for contract/docs/boundary checks before any parent-repo implementation begins.

### Sprint 7 Admin Config Foundation
Spec: `docs/superpowers/specs/2026-06-18-logistics-admin-config-mvp-design.md`. Plan: `docs/superpowers/plans/2026-06-18-logistics-admin-config-mvp.md`. Tasks 1-7 are complete: additive schema/migration `20260618103000_add_admin_config_models`, admin auth/schemas, repository/service layers, `/admin/*` routes, `npm run smoke:admin-config`, and operational docs. Migration was applied through `localhost:5433 -> 10.0.8.12:5432`; `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run smoke:admin-config` passed on 2026-06-19.

### Sprint 8 Reliability and Security Hardening
Next sprint should harden the admin/config platform before UI expansion: route-level rate limiting, admin mutation audit logs, health/readiness endpoints, security scan commands, deploy/runbook checks, and documented failure/retry behavior. Keep parent `teknos.id` read-only unless the user opens a separate parent integration task.

---

## Yang TIDAK Boleh Dilakukan

### Arsitektur & Data Flow
- Jangan call DB/ORM dari luar `server/repositories/`
- Jangan hitung nilai penting (harga, diskon, stok, role) di client
- Jangan edit parent `teknos.id` saat mengerjakan `teknos-logistics`; baca sebagai referensi saja

### Security ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â DILARANG KERAS
- Jangan expose secret ke client (prefix `NEXT_PUBLIC_` hanya untuk data publik)
- Jangan commit `.env*` ke repository
- Jangan return error message internal ke client (stack trace, query detail)
- Jangan skip validasi input di server actions / route handlers ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â selalu Zod
- Jangan trust nilai dari client untuk kalkulasi sensitif
- Jangan gunakan `dangerouslySetInnerHTML` tanpa sanitasi
- Jangan lakukan DB mutation dari GET handler
- Jangan menjalankan JNE `generatecnote` / membuat resi nyata dari Codex tanpa approval eksplisit user

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

### Sprint 9 Admin Control Center

`/admin-ui` is the minimal internal operator UI served by Hono. It uses browser `sessionStorage` for the operator-entered admin token, calls existing `/admin/*` APIs, and intentionally has no JNE booking, `generatecnote`, or real AWB/resi creation action. Run `npm run smoke:admin-ui` and `npm run sprint9:readiness` before deploy validation.

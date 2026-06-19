# teknos-logistics

> Ringkasan 1 kalimat tentang project ini. Stack: Node.js TypeScript Hono API + Prisma PostgreSQL + Docker. Status: Development.

**Spec lengkap:** `docs/superpowers/specs/`
**Roadmap:** `docs/ROADMAP.md`
**Sprint plans:** `docs/superpowers/plans/`

## Project Operating Doctrine â€” 2026-06-18

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

## ÃƒÂ¢Ã…Â¡Ã¢â€žÂ¢ÃƒÂ¯Ã‚Â¸Ã‚Â Alur Kerja Wajib (Development Discipline)

Berlaku untuk SETIAP tugas ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â patuhi sebelum, selama, dan sesudah eksekusi.

### 1. Pipeline Wajib ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 4 Fase Tanpa Shortcut

```
FASE 1        FASE 2           FASE 3              FASE 4
IDEASI    ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢  PLANNING     ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢   EKSEKUSI        ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢   QA & DEPLOY
/brainstorm  /spec-writer     coding terkoordinasi  /qa-execute
             /plan-writer     [user approve dulu]
```

- **Fase 1 (Ideasi):** Fitur baru / ambigu ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ `/brainstorm` wajib. Output = keputusan pendekatan yang disepakati.
- **Fase 2 (Planning):** `/spec-writer` ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ simpan di `docs/superpowers/specs/`. `/plan-writer` ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ simpan di `docs/superpowers/plans/`. User **harus approve plan** sebelum coding dimulai.
- **Fase 3 (Eksekusi):** Ikuti plan task per task. Deklarasikan file yang disentuh. Tidak ada dua agent di file yang sama. Commit scope sempit per task.
- **Fase 4 (QA):** `/qa-execute` sebelum setiap deploy. Tidak ada deploy tanpa QA Report = READY.

### 2. Konteks dulu ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â baca dokumentasi sebelum eksekusi
- Baca `CLAUDE.md` + `AGENTS.md` + spec/plan yang relevan sebelum menyentuh kode.
- Verifikasi fakta repo: `git status --short --branch`, `git log --oneline -10`.
- Jangan improvisasi di luar plan ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â jika butuh perubahan scope, update plan dulu.

### 2. Dokumentasi selalu sinkron (docs-as-code) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â WAJIB
Setiap perubahan kode/arsitektur/schema/env/deploy **harus disertai update dokumentasi dalam commit yang sama**. Tugas belum "selesai" sampai dokumen mencerminkan kondisi nyata. Singkat, **bertanggal**, operasional; ganti catatan usang.

| Trigger | File yang di-update |
|---|---|
| Sprint selesai | `CLAUDE.md` Ãƒâ€šÃ‚Â§ Status Sprint |
| Env variable baru | `CLAUDE.md` Ãƒâ€šÃ‚Â§ Environment Variables |
| Keputusan arsitektur | `CLAUDE.md` Ãƒâ€šÃ‚Â§ Keputusan Arsitektur |
| Fitur baru deploy | `CLAUDE.md` Ãƒâ€šÃ‚Â§ Fitur yang Sudah Dibangun |
| Migration schema | Kedua file + nama migration + tanggal |
| Rule baru dilarang | `CLAUDE.md` Ãƒâ€šÃ‚Â§ Yang TIDAK Boleh Dilakukan |

### 3. Security-first ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â setiap perubahan berpotensi berisiko
Permukaan sensitif: **API key auth, courier webhooks, request validation, env/secret handling, Prisma schema/migrations, outbound merchant webhook relay**.
- Spec dulu untuk permukaan sensitif ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â jangan hotfix buta.
- **Selalu** validasi & otorisasi **server-side** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â jangan percaya nilai dari client (harga, role, stock, ID).
- Jalankan tooling sebelum commit relevan:
  ```bash
  semgrep --config auto <path>                 # auth/payment/webhook/upload/input
  gitleaks protect --staged --no-banner        # config/env/docs/credentials
  trivy fs --scanners vuln,secret,misconfig .  # Dockerfile/image/dependency
  ```
- **Jangan pernah** commit/hardcode secret, token, credentials ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â termasuk di docs & `.env.example`.

### 4. Bukti sebelum klaim
Jangan klaim build/lint/test/migration/QA/deploy berhasil tanpa menjalankan perintahnya dan membaca outputnya. Pisahkan `terkonfirmasi` vs `asumsi` vs `langkah berikutnya`.

### 5. Konvensi commit (Conventional Commits)
Format: `<tipe>(scope): ringkasan`. Tipe: `feat | fix | docs | chore | refactor | test | perf`.
Satu commit = satu perubahan logis, scope sempit.

### 6. 5 Aturan Tim ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Non-Negotiable

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
- Jalankan `npm run lint && npm run typecheck && npm run build && npm run security:all` sebelum klaim selesai. Laporan akhir ringkas & jujur ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â jangan klaim 100% aman.

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

## Struktur Folder ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Aturan Wajib

```
src/
ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ app/           # Routes (Next.js App Router)
ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ components/    # UI only ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â TIDAK boleh query DB langsung
ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ features/      # Domain logic per fitur
ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ server/
ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ actions/       # Server Actions (entry dari UI)
ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ services/      # Business logic
ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬ÂÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ repositories/  # SATU-SATUNYA tempat ORM/DB dipanggil
ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬ÂÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ lib/
    ÃƒÂ¢Ã¢â‚¬ÂÃ…â€œÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ validators/    # Zod schemas
    ÃƒÂ¢Ã¢â‚¬ÂÃ¢â‚¬ÂÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ utils/
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
| Sprint 07 | Logistics admin config MVP | In Progress - Tasks 1-6 implemented through schema, admin auth/schemas, repositories, services, routes, and `smoke:admin-config`; DB smoke blocked by local Postgres auth `28P01` |

---

## Fitur yang Sudah Dibangun

> Daftar fitur yang sudah live, format: `- **Nama Fitur ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ (YYYY-MM-DD):** ringkasan 1 kalimat.`

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
```

> **Aturan:** Variabel dengan prefix `NEXT_PUBLIC_` = aman untuk client. Tanpa prefix = server-only secret. Jangan salah assign.

---

## Keputusan Arsitektur Penting

### Harga & Kalkulasi
> Selalu hitung server-side ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â jangan percaya angka dari client.

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
Draft spec: `docs/superpowers/specs/2026-06-18-logistics-admin-config-mvp-design.md`. Draft plan: `docs/superpowers/plans/2026-06-18-logistics-admin-config-mvp.md`. Tasks 1-6 add additive schema/migration `20260618103000_add_admin_config_models`, admin auth/schemas, repository/service layers, `/admin/*` routes, and `npm run smoke:admin-config`. Production migration and admin DB smoke have not been run because the current local tunnel reaches Postgres but auth fails with `28P01`.

---

## Yang TIDAK Boleh Dilakukan

### Arsitektur & Data Flow
- Jangan call DB/ORM dari luar `server/repositories/`
- Jangan hitung nilai penting (harga, diskon, stok, role) di client
- Jangan edit parent `teknos.id` saat mengerjakan `teknos-logistics`; baca sebagai referensi saja

### Security ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â DILARANG KERAS
- Jangan expose secret ke client (prefix `NEXT_PUBLIC_` hanya untuk data publik)
- Jangan commit `.env*` ke repository
- Jangan return error message internal ke client (stack trace, query detail)
- Jangan skip validasi input di server actions / route handlers ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â selalu Zod
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

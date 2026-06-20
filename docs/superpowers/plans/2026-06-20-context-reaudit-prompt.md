# Prompt Re-Audit Konteks — Sebelum Melanjutkan Sesi Apapun

Date: 2026-06-20
Tujuan: Memastikan agent (Claude Code atau Codex) bekerja dari kondisi repo
yang AKTUAL, bukan dari ingatan sesi lama yang bisa stale.

Gunakan prompt ini di AWAL sesi baru, atau kapanpun kamu tidak yakin
apakah state yang kamu ingat masih valid.

---

## Kapan Harus Jalankan Re-Audit Ini

- Sesi baru dimulai (belum tahu apa yang berubah sejak sesi terakhir)
- Lebih dari beberapa jam tidak menyentuh repo
- Agent lain (Codex atau Claude Code lain) baru saja melakukan perubahan
- Sebelum membuat commit, push, atau PR
- Setelah error "file tidak ditemukan" atau "import gagal" yang tidak terduga
- Sebelum mulai Fase 3 (implementasi kode) dari audit integrasi

---

## PERINTAH RE-AUDIT — Jalankan Semua, Baca Semua Output

### Step 0 — Identifikasi repo dan branch aktif

```bash
# Teknos-logistics
cd C:\NEXT\teknos.id\teknos-logistics
git status --short --branch
git log --oneline -5
git stash list

# Teknos.id (repo utama)
cd C:\NEXT\teknos.id
git status --short --branch
git log --oneline -5
```

Catat:
- Branch aktif masing-masing repo
- Apakah ada dirty file (untracked/modified)
- Commit terakhir — apakah sama dengan yang diingat dari sesi sebelumnya?
- Apakah ada stash yang belum di-pop?

---

### Step 1 — Verifikasi build masih bersih

```bash
# Teknos-logistics
cd C:\NEXT\teknos.id\teknos-logistics
npm run typecheck 2>&1 | tail -20
npm run lint 2>&1 | tail -20
npm run test 2>&1 | tail -30

# Teknos.id
cd C:\NEXT\teknos.id
npx tsc --noEmit 2>&1 | tail -20
npm run lint 2>&1 | tail -20
```

Jika ada error yang sebelumnya tidak ada → STOP, investigasi dulu sebelum lanjut.
Jangan asumsikan error ini ada sebelumnya.

---

### Step 2 — Verifikasi file-file kunci masih ada dan tidak berubah

```bash
# Cek file yang di-generate atau di-scaffold oleh sprint sebelumnya
ls C:\NEXT\teknos.id\teknos-logistics\src\couriers\sap-express\
ls C:\NEXT\teknos.id\teknos-logistics\src\services\
ls C:\NEXT\teknos.id\teknos-logistics\src\repositories\
ls C:\NEXT\teknos.id\teknos-logistics\prisma\migrations\

# Cek file yang mungkin belum dibuat (sprint masih pending)
ls C:\NEXT\teknos.id\teknos-logistics\docs\TEKNOS_ID_HANDOFF.md 2>&1
ls C:\NEXT\teknos.id\teknos-logistics\docs\SPRINT_6_CONTRACT_RUNBOOK.md 2>&1
ls C:\NEXT\teknos.id\src\lib\logistics-api\ 2>&1
ls C:\NEXT\teknos.id\src\app\api\webhooks\logistics\ 2>&1
```

Catat mana yang ADA dan mana yang BELUM ADA.

---

### Step 3 — Cek sprint readiness terbaru

```bash
cd C:\NEXT\teknos.id\teknos-logistics
npx tsx scripts/sprint6-readiness.ts 2>&1
npx tsx scripts/sprint11b-readiness.ts 2>&1
```

Jika ada script readiness yang belum di-run atau belum ada:
- Catat sebagai "belum dikerjakan"
- Jangan asumsikan sprint sudah selesai

---

### Step 4 — Baca ROADMAP dan CLAUDE.md terbaru

```bash
cat C:\NEXT\teknos.id\teknos-logistics\docs\ROADMAP.md
cat C:\NEXT\teknos.id\teknos-logistics\CLAUDE.md
```

Bandingkan dengan yang kamu ingat dari sesi sebelumnya:
- Apakah sprint status sudah diupdate?
- Apakah ada sprint baru yang ditambahkan?
- Apakah ada keputusan arsitektur baru?

---

### Step 5 — Verifikasi schema Prisma dan migration

```bash
cd C:\NEXT\teknos.id\teknos-logistics
# Cek apakah ada model baru yang ditambahkan Codex
grep "^model " prisma/schema.prisma
# Cek migration terbaru
ls prisma/migrations/ | sort | tail -5
```

Bandingkan list model dengan yang ada di session sebelumnya:
- Jika `OriginMapping` sudah ada → Sprint 12 sudah dikerjakan
- Jika belum ada → Sprint 12 masih pending

---

### Step 6 — Cek apakah ada file yang overlap dengan agent lain

```bash
cd C:\NEXT\teknos.id\teknos-logistics
# File yang mungkin dikerjakan Codex secara paralel
git diff --name-only HEAD~3..HEAD 2>/dev/null | head -30

# Cek apakah ada perubahan di file yang kamu juga akan sentuh
git log --oneline --all -10
```

Jika ada perubahan di file yang juga ada di scope pekerjaanmu → koordinasi dulu.

---

### Step 7 — Rekap gap inventory terbaru

Baca file-file ini untuk konfirmasi status gap:
```
docs/implementation-notes.md          → gap yang sudah didokumentasikan
docs/superpowers/plans/2026-06-20-codex-session-brief.md  → status sprint
docs/superpowers/plans/2026-06-20-claude-code-integration-audit.md  → gap integrasi
```

Setelah membaca, jawab pertanyaan-pertanyaan ini:

1. **OriginMapping gap** — apakah sudah ada model `OriginMapping` di `prisma/schema.prisma`?
   - YA → Sprint 12 selesai, `resolveOriginCode()` sudah ada di repository
   - TIDAK → Sprint 12 masih pending, `/v1/rates/resolve` untuk kurir nyata masih broken

2. **DestinationMapping data** — apakah tabel `DestinationMapping` sudah ada data?
   ```bash
   # Jalankan smoke test (butuh DATABASE_URL aktif)
   npx tsx scripts/smoke-rates-resolve.ts 2>&1 | head -20
   ```
   - Jika error `DESTINATION_MAPPING_NOT_FOUND` → Sprint 13 masih pending
   - Jika return rates → Sprint 13 selesai

3. **SAP Express** — apakah `src/couriers/sap-express/sap-express.adapter.ts` masih skeleton?
   ```bash
   head -30 C:\NEXT\teknos.id\teknos-logistics\src\couriers\sap-express\sap-express.adapter.ts
   ```
   - Jika masih return 501 → Sprint 11B masih pending
   - Jika sudah implement → Sprint 11B selesai

4. **teknos.id webhook receiver** — apakah sudah ada?
   ```bash
   ls C:\NEXT\teknos.id\src\app\api\webhooks\logistics\ 2>&1
   ```
   - Ada → Fase 3 sudah sebagian dikerjakan
   - Tidak ada → Fase 3 belum dimulai

---

### Step 8 — Susun state aktual dan tentukan langkah selanjutnya

Berdasarkan semua hasil di atas, tulis ringkasan ini (WAJIB sebelum mulai coding):

```
STATE AKTUAL (re-audit [tanggal]):
- teknos-logistics branch: [branch]
- teknos-logistics commit terbaru: [sha] [message]
- teknos.id branch: [branch]
- teknos.id commit terbaru: [sha] [message]

BUILD STATUS:
- teknos-logistics typecheck: [PASS/FAIL]
- teknos-logistics test: [PASS/FAIL]
- teknos.id typecheck: [PASS/FAIL]

SPRINT STATUS:
- Sprint 11B (SAP Express): [SELESAI/IN PROGRESS/BELUM]
- Sprint 12 (OriginMapping): [SELESAI/IN PROGRESS/BELUM]
- Sprint 13 (Dest data import): [SELESAI/IN PROGRESS/BELUM]
- Sprint 6 readiness: [PASS/FAIL/BELUM DIJALANKAN]
- Fase 3 teknos.id (integrasi): [SELESAI/IN PROGRESS/BELUM]

GAP YANG MASIH TERBUKA:
- [GAP-N]: [status — masih terbuka / sudah di-fix]
- ...

LANGKAH SELANJUTNYA YANG TEPAT:
- [aksi spesifik, bukan daftar generik]
```

Jika tidak yakin dengan salah satu jawaban → baca kodenya, jangan tebak.

---

## Aturan Re-Audit

- Re-audit adalah baca-only — jangan buat perubahan selama Step 0-7
- Jika ada build error baru → perbaiki dulu sebelum lanjut ke task apapun
- Jika ada dirty file yang bukan dari kamu → jangan commit, tanyakan ke user
- Jika sprint yang kamu ingat "sudah selesai" ternyata belum ada di kode → update
  asumsimu, mulai dari sprint itu
- Re-audit ini wajib diulang setiap kali ada jeda lebih dari satu jam atau
  setelah context window di-compress

---

## Checklist Cepat (< 5 menit)

Jika tidak punya banyak waktu, minimal jalankan ini:

```bash
cd C:\NEXT\teknos.id\teknos-logistics && git status --short --branch && git log --oneline -3
cd C:\NEXT\teknos.id && git status --short --branch && git log --oneline -3
grep "^model " C:\NEXT\teknos.id\teknos-logistics\prisma\schema.prisma
ls C:\NEXT\teknos.id\teknos-logistics\src\couriers\sap-express\
```

Jika semua output sesuai ekspektasi → lanjutkan dari langkah terakhir.
Jika ada yang berbeda → jalankan re-audit penuh (Step 0-8).

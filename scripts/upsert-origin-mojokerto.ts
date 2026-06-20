/**
 * One-time script: daftarkan Origin Mojokerto untuk merchant `teknos`.
 *
 * Jalankan dari folder teknos-logistics/:
 *   npx tsx scripts/upsert-origin-mojokerto.ts
 *
 * Script ini idempotent — aman dijalankan berulang.
 * Output: origin_id yang harus disimpan sebagai LOGISTICS_ORIGIN_ID di teknos.id
 */
import { loadLocalEnv } from './env.js'

loadLocalEnv()

const { createPrismaClient } = await import('../src/db/client.js')
const prisma = createPrismaClient()

const MERCHANT_SLUG = 'teknos'
const ORIGIN_CODE   = 'origin_mojokerto_main'

try {
  // 1. Cari merchant teknos
  const merchant = await prisma.merchant.findUnique({ where: { slug: MERCHANT_SLUG } })
  if (!merchant) {
    console.error(`Merchant "${MERCHANT_SLUG}" tidak ditemukan.`)
    console.error('Jalankan dulu: npx tsx scripts/seed-merchant.ts')
    process.exit(1)
  }

  // 2. Upsert origin (idempotent via merchantId + code unique constraint)
  const existing = await prisma.origin.findUnique({
    where: { merchantId_code: { merchantId: merchant.id, code: ORIGIN_CODE } },
  })

  let origin
  if (existing) {
    origin = await prisma.origin.update({
      where: { id: existing.id },
      data: {
        name:       'Gudang Utama Teknos',
        address:    'Kemlagi, Mojokerto',
        city:       'Mojokerto',
        province:   'Jawa Timur',
        postalCode: '61353',
        phone:      process.env.SHIPPER_PHONE ?? '',
        isDefault:  true,
        isActive:   true,
      },
    })
    console.log('Origin sudah ada — diupdate.')
  } else {
    origin = await prisma.origin.create({
      data: {
        merchantId: merchant.id,
        code:       ORIGIN_CODE,
        name:       'Gudang Utama Teknos',
        address:    'Kemlagi, Mojokerto',
        city:       'Mojokerto',
        province:   'Jawa Timur',
        postalCode: '61353',
        phone:      process.env.SHIPPER_PHONE ?? '',
        isDefault:  true,
        isActive:   true,
      },
    })
    console.log('Origin baru dibuat.')
  }

  console.log('\n=== HASIL ===')
  console.log(JSON.stringify({ ok: true, origin }, null, 2))
  console.log('\n=== SIMPAN ENV INI DI teknos.id ===')
  console.log(`LOGISTICS_ORIGIN_ID=${origin.id}`)
} finally {
  await prisma.$disconnect()
}

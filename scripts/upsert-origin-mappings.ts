/**
 * Idempotent origin mapping seed for Teknos Mojokerto origin.
 *
 * Jalankan setelah migration `20260620143000_add_origin_mappings` terdeploy:
 *   npx tsx scripts/upsert-origin-mappings.ts
 *
 * SAP Express dibuat inactive jika `SAP_ORIGIN_PROVIDER_CODE` belum diisi valid,
 * agar placeholder tidak dipakai untuk rate nyata.
 */
import { loadLocalEnv } from './env.js'

loadLocalEnv()

const { createPrismaClient } = await import('../src/db/client.js')
const prisma = createPrismaClient()

const MERCHANT_SLUG = process.env.ORIGIN_MAPPING_MERCHANT_SLUG ?? 'teknos'
const ORIGIN_CODE = process.env.ORIGIN_MAPPING_ORIGIN_CODE ?? 'origin_mojokerto_main'
const JNE_PROVIDER_CODE = process.env.JNE_ORIGIN_PROVIDER_CODE ?? 'MJK10008'
const SAP_PROVIDER_CODE = process.env.SAP_ORIGIN_PROVIDER_CODE ?? 'TBD_FROM_SAP_IT'

try {
  const merchant = await prisma.merchant.findUnique({ where: { slug: MERCHANT_SLUG } })
  if (!merchant) throw new Error(`Merchant not found: ${MERCHANT_SLUG}`)

  const origin = await prisma.origin.findUnique({ where: { merchantId_code: { merchantId: merchant.id, code: ORIGIN_CODE } } })
  if (!origin) throw new Error(`Origin not found: ${ORIGIN_CODE}. Run scripts/upsert-origin-mojokerto.ts first.`)

  const mappings = [
    { courier: 'JNE' as const, providerCode: JNE_PROVIDER_CODE, label: 'JNE Mojokerto', isActive: true },
    {
      courier: 'SAP_EXPRESS' as const,
      providerCode: SAP_PROVIDER_CODE,
      label: 'SAP Express Mojokerto',
      isActive: SAP_PROVIDER_CODE !== 'TBD_FROM_SAP_IT',
    },
  ]

  const results = []
  for (const mapping of mappings) {
    results.push(await prisma.originMapping.upsert({
      where: { originId_courier: { originId: origin.id, courier: mapping.courier } },
      create: {
        merchantId: merchant.id,
        originId: origin.id,
        courier: mapping.courier,
        providerCode: mapping.providerCode,
        label: mapping.label,
        isActive: mapping.isActive,
      },
      update: {
        merchantId: merchant.id,
        providerCode: mapping.providerCode,
        label: mapping.label,
        isActive: mapping.isActive,
      },
    }))
  }

  console.log(JSON.stringify({ ok: true, merchantId: merchant.id, originId: origin.id, mappings: results }, null, 2))
} finally {
  await prisma.$disconnect()
}

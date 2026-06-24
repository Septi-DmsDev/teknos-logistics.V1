import { loadLocalEnv, parseArgs } from './env.js'

loadLocalEnv()

const args = parseArgs(process.argv.slice(2))
const apply = args.apply === true
const merchantSlug = String(args.merchantSlug ?? args['merchant-slug'] ?? process.env.SEED_MERCHANT_SLUG ?? 'teknos')
const merchantName = String(args.merchantName ?? args['merchant-name'] ?? process.env.SEED_MERCHANT_NAME ?? 'Teknos Internal')

const sandboxShipments = [
  {
    externalOrderId: 'TLG-SBX-202606221018',
    waybillId: 'DEV00845560419',
    serviceCode: 'UDRREG',
    serviceName: 'SATRIA REG',
    originCode: 'JI1606',
    destCode: 'JI1617',
    weightGrams: 1000,
    rateIdr: 10500,
    recipientName: 'SAPX Sandbox Receiver',
    recipientPhone: '081234567890',
    recipientAddress: 'Alamat test sandbox SAPX, Jetis Mojokerto',
    bookedAt: new Date('2026-06-22T10:18:38.775Z'),
  },
  {
    externalOrderId: 'TLG-COD-202606221023',
    waybillId: 'DEV00845560420',
    serviceCode: 'UDRREG',
    serviceName: 'SATRIA REG',
    originCode: 'JI1606',
    destCode: 'JI1617',
    weightGrams: 1000,
    rateIdr: 10500,
    recipientName: 'SAPX Sandbox COD Receiver',
    recipientPhone: '081234567891',
    recipientAddress: 'Alamat test COD sandbox SAPX, Jetis Mojokerto',
    bookedAt: new Date('2026-06-22T10:23:04.229Z'),
  },
] as const

const { createPrismaClient } = await import('../src/db/client.js')
const prisma = createPrismaClient()

try {
  const existingMerchant = await prisma.merchant.findUnique({
    where: { slug: merchantSlug },
    select: { id: true, slug: true, name: true, isActive: true },
  })

  if (!apply) {
    console.log(JSON.stringify({
      ok: true,
      dryRun: true,
      message: 'No database writes performed. Re-run with --apply to upsert SAPX sandbox shipments.',
      merchant: existingMerchant ?? { slug: merchantSlug, name: merchantName, willCreateOnApply: true },
      shipments: sandboxShipments.map((shipment) => ({
        externalOrderId: shipment.externalOrderId,
        waybillId: shipment.waybillId,
        courier: 'SAP_EXPRESS',
        status: 'BOOKED',
        serviceCode: shipment.serviceCode,
        originCode: shipment.originCode,
        destCode: shipment.destCode,
      })),
    }, null, 2))
    process.exit(0)
  }

  const result = await prisma.$transaction(async (tx) => {
    const merchant = existingMerchant ?? await tx.merchant.upsert({
      where: { slug: merchantSlug },
      update: { name: merchantName, isActive: true },
      create: { slug: merchantSlug, name: merchantName, isActive: true },
      select: { id: true, slug: true, name: true, isActive: true },
    })

    const shipments = []
    for (const shipment of sandboxShipments) {
      const row = await tx.shipment.upsert({
        where: {
          merchantId_externalOrderId: {
            merchantId: merchant.id,
            externalOrderId: shipment.externalOrderId,
          },
        },
        update: {
          courier: 'SAP_EXPRESS',
          courierOrderId: shipment.externalOrderId,
          waybillId: shipment.waybillId,
          status: 'BOOKED',
          serviceCode: shipment.serviceCode,
          serviceName: shipment.serviceName,
          originCode: shipment.originCode,
          destCode: shipment.destCode,
          weightGrams: shipment.weightGrams,
          rateIdr: shipment.rateIdr,
          recipientName: shipment.recipientName,
          recipientPhone: shipment.recipientPhone,
          recipientAddress: shipment.recipientAddress,
          bookedAt: shipment.bookedAt,
          deliveredAt: null,
        },
        create: {
          merchantId: merchant.id,
          externalOrderId: shipment.externalOrderId,
          courier: 'SAP_EXPRESS',
          courierOrderId: shipment.externalOrderId,
          waybillId: shipment.waybillId,
          status: 'BOOKED',
          serviceCode: shipment.serviceCode,
          serviceName: shipment.serviceName,
          originCode: shipment.originCode,
          destCode: shipment.destCode,
          weightGrams: shipment.weightGrams,
          rateIdr: shipment.rateIdr,
          recipientName: shipment.recipientName,
          recipientPhone: shipment.recipientPhone,
          recipientAddress: shipment.recipientAddress,
          bookedAt: shipment.bookedAt,
        },
        select: {
          id: true,
          merchantId: true,
          externalOrderId: true,
          courier: true,
          status: true,
          waybillId: true,
          serviceCode: true,
          originCode: true,
          destCode: true,
          bookedAt: true,
        },
      })

      await tx.shipmentTracking.upsert({
        where: {
          shipmentId_status_occurredAt_description: {
            shipmentId: row.id,
            status: 'BOOKED',
            occurredAt: shipment.bookedAt,
            description: 'SAPX sandbox seed: resi dibuat',
          },
        },
        update: {},
        create: {
          shipmentId: row.id,
          status: 'BOOKED',
          description: 'SAPX sandbox seed: resi dibuat',
          occurredAt: shipment.bookedAt,
          rawPayload: {
            seed: 'seed-sapx-sandbox-shipments',
            awb_no: shipment.waybillId,
            reference_no: shipment.externalOrderId,
          },
        },
      })

      shipments.push(row)
    }

    return { merchant, shipments }
  })

  console.log(JSON.stringify({ ok: true, dryRun: false, ...result }, null, 2))
} finally {
  await prisma.$disconnect()
}

import type { Prisma, PrismaClient } from '@prisma/client'
import type { CourierCode, CourierRate } from '../couriers/types.js'

export class RateCacheRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async get(params: { courier: CourierCode; originCode: string; destCode: string; weightGrams: number }): Promise<CourierRate[] | null> {
    const row = await this.prisma.rateCache.findUnique({
      where: { courier_originCode_destCode_weightGrams: params },
    })
    if (!row || row.expiresAt <= new Date()) return null
    return (row.rates as unknown as CourierRate[]).map((rate) => ({ ...rate, cached: true }))
  }

  async set(params: { courier: CourierCode; originCode: string; destCode: string; weightGrams: number; rates: CourierRate[]; ttlMs: number }): Promise<void> {
    await this.prisma.rateCache.upsert({
      where: {
        courier_originCode_destCode_weightGrams: {
          courier: params.courier,
          originCode: params.originCode,
          destCode: params.destCode,
          weightGrams: params.weightGrams,
        },
      },
      update: { rates: toJson(params.rates), expiresAt: new Date(Date.now() + params.ttlMs) },
      create: {
        courier: params.courier,
        originCode: params.originCode,
        destCode: params.destCode,
        weightGrams: params.weightGrams,
        rates: toJson(params.rates),
        expiresAt: new Date(Date.now() + params.ttlMs),
      },
    })
  }
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

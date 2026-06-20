import type { CourierCode, Prisma, PrismaClient } from '@prisma/client'

export interface DestinationLookupInput {
  postalCode?: string
  city?: string
  province?: string
  district?: string
  subdistrict?: string
}

export interface DestinationMappingListParams {
  merchantId?: string
  courier?: CourierCode
  isActive?: boolean
  limit?: number
  offset?: number
}

export interface DestinationMappingCreateInput extends DestinationLookupInput {
  merchant_id: string
  courier: CourierCode
  country?: string
  provider_code: string
  label?: string
  is_active?: boolean
}

export interface DestinationMappingUpdateInput extends Partial<DestinationLookupInput> {
  country?: string
  provider_code?: string
  label?: string | null
  is_active?: boolean
}

export type DestinationMappingRecord = Prisma.DestinationMappingGetPayload<{ select: typeof destinationMappingSelect }>
export type OriginMappingRecord = Prisma.OriginMappingGetPayload<{ select: typeof originMappingSelect }>
export type OriginResolutionRecord = Prisma.OriginGetPayload<{ select: typeof originResolutionSelect }>

export class DestinationMappingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findActiveOriginForMerchant(merchantId: string, originId: string): Promise<OriginResolutionRecord | null> {
    return this.prisma.origin.findFirst({
      where: { id: originId, merchantId, isActive: true },
      select: originResolutionSelect,
    })
  }


  async listOriginMappings(merchantId: string, originId: string): Promise<OriginMappingRecord[]> {
    return this.prisma.originMapping.findMany({
      where: { merchantId, originId },
      select: originMappingSelect,
      orderBy: [{ courier: 'asc' }, { updatedAt: 'desc' }],
    })
  }

  async upsertOriginMapping(input: {
    merchant_id: string
    origin_id: string
    courier: CourierCode
    provider_code: string
    label?: string
    is_active?: boolean
  }): Promise<OriginMappingRecord> {
    return this.prisma.originMapping.upsert({
      where: { originId_courier: { originId: input.origin_id, courier: input.courier } },
      create: {
        merchantId: input.merchant_id,
        originId: input.origin_id,
        courier: input.courier,
        providerCode: input.provider_code,
        label: input.label,
        isActive: input.is_active ?? true,
      },
      update: {
        merchantId: input.merchant_id,
        providerCode: input.provider_code,
        label: input.label,
        isActive: input.is_active ?? true,
      },
      select: originMappingSelect,
    })
  }

  async resolveOriginCode(merchantId: string, originId: string, courier: CourierCode): Promise<string | null> {
    const mapping = await this.prisma.originMapping.findFirst({
      where: { merchantId, originId, courier, isActive: true },
      select: { providerCode: true },
    })
    return mapping?.providerCode ?? null
  }

  async list(params: DestinationMappingListParams = {}): Promise<DestinationMappingRecord[]> {
    const limit = params.limit ?? 50
    const offset = params.offset ?? 0
    return this.prisma.destinationMapping.findMany({
      where: { merchantId: params.merchantId, courier: params.courier, isActive: params.isActive },
      select: destinationMappingSelect,
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      take: limit,
      skip: offset,
    })
  }

  async create(input: DestinationMappingCreateInput): Promise<DestinationMappingRecord> {
    return this.prisma.destinationMapping.create({
      data: {
        merchantId: input.merchant_id,
        courier: input.courier,
        country: input.country ?? 'ID',
        province: input.province,
        city: input.city,
        district: input.district,
        subdistrict: input.subdistrict,
        postalCode: input.postalCode,
        providerCode: input.provider_code,
        label: input.label,
        isActive: input.is_active ?? true,
      },
      select: destinationMappingSelect,
    })
  }

  async update(id: string, input: DestinationMappingUpdateInput): Promise<DestinationMappingRecord> {
    return this.prisma.destinationMapping.update({
      where: { id },
      data: {
        country: input.country,
        province: input.province,
        city: input.city,
        district: input.district,
        subdistrict: input.subdistrict,
        postalCode: input.postalCode,
        providerCode: input.provider_code,
        label: input.label,
        isActive: input.is_active,
      },
      select: destinationMappingSelect,
    })
  }

  async resolve(merchantId: string, courier: CourierCode, destination: DestinationLookupInput): Promise<DestinationMappingRecord | null> {
    const filters: Prisma.DestinationMappingWhereInput[] = []
    if (destination.postalCode) filters.push({ postalCode: destination.postalCode })
    if (destination.city) filters.push({ city: { equals: destination.city, mode: 'insensitive' } })
    if (destination.subdistrict) filters.push({ subdistrict: { equals: destination.subdistrict, mode: 'insensitive' } })

    const candidates = await this.prisma.destinationMapping.findMany({
      where: {
        merchantId,
        courier,
        isActive: true,
        OR: filters,
      },
      select: destinationMappingSelect,
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      take: 25,
    })

    return candidates.sort((left, right) => score(right, destination) - score(left, destination))[0] ?? null
  }
}

function score(mapping: DestinationMappingRecord, destination: DestinationLookupInput): number {
  let value = 0
  if (mapping.postalCode && destination.postalCode && mapping.postalCode === destination.postalCode) value += 100
  if (same(mapping.subdistrict, destination.subdistrict)) value += 30
  if (same(mapping.district, destination.district)) value += 20
  if (same(mapping.city, destination.city)) value += 10
  if (same(mapping.province, destination.province)) value += 5
  return value
}

function same(left?: string | null, right?: string): boolean {
  return Boolean(left && right && left.trim().toLowerCase() === right.trim().toLowerCase())
}

const destinationMappingSelect = {
  id: true,
  merchantId: true,
  courier: true,
  country: true,
  province: true,
  city: true,
  district: true,
  subdistrict: true,
  postalCode: true,
  providerCode: true,
  label: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const

const originMappingSelect = {
  id: true,
  merchantId: true,
  originId: true,
  courier: true,
  providerCode: true,
  label: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const
const originResolutionSelect = {
  id: true,
  merchantId: true,
  storeId: true,
  code: true,
  name: true,
  isDefault: true,
  isActive: true,
} as const

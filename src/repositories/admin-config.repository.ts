import type {
  CourierCode,
  CourierServiceStatus,
  Prisma,
  PrismaClient,
} from '@prisma/client'
import type {
  AdminCourierServiceCreateInput,
  AdminCourierServiceUpdateInput,
  AdminMerchantCourierServiceUpsertInput,
  AdminOriginCreateInput,
  AdminOriginUpdateInput,
  AdminStoreCreateInput,
  AdminStoreUpdateInput,
} from '../schemas/admin.js'

export type AdminStoreRecord = Prisma.StoreGetPayload<{ select: typeof storeSelect }>
export type AdminOriginRecord = Prisma.OriginGetPayload<{ select: typeof originSelect }>
export type AdminCourierServiceRecord = Prisma.CourierServiceGetPayload<{ select: typeof courierServiceSelect }>
export type AdminMerchantCourierServiceRecord = Prisma.MerchantCourierServiceGetPayload<{
  select: typeof merchantCourierServiceSelect
}>

export interface PaginationParams {
  limit?: number
  offset?: number
}

export interface AdminStoreListParams extends PaginationParams {
  merchantId?: string
  isActive?: boolean
}

export interface AdminOriginListParams extends PaginationParams {
  merchantId?: string
  storeId?: string
  isActive?: boolean
}

export interface AdminCourierServiceListParams extends PaginationParams {
  courier?: CourierCode
  status?: CourierServiceStatus
}

export interface AdminMerchantCourierServiceListParams extends PaginationParams {
  merchantId?: string
  originId?: string | null
  status?: CourierServiceStatus
}

export class AdminConfigRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listStores(params: AdminStoreListParams = {}): Promise<AdminStoreRecord[]> {
    const { limit, offset } = normalizePagination(params)
    return this.prisma.store.findMany({
      where: {
        merchantId: params.merchantId,
        isActive: params.isActive,
      },
      select: storeSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: limit,
      skip: offset,
    })
  }

  async findStoreById(id: string): Promise<AdminStoreRecord | null> {
    return this.prisma.store.findUnique({ where: { id }, select: storeSelect })
  }

  async createStore(input: AdminStoreCreateInput): Promise<AdminStoreRecord> {
    return this.prisma.store.create({
      data: {
        merchantId: input.merchant_id,
        slug: input.slug,
        name: input.name,
        isActive: input.is_active,
      },
      select: storeSelect,
    })
  }

  async updateStore(id: string, input: AdminStoreUpdateInput): Promise<AdminStoreRecord> {
    return this.prisma.store.update({
      where: { id },
      data: {
        slug: input.slug,
        name: input.name,
        isActive: input.is_active,
      },
      select: storeSelect,
    })
  }

  async listOrigins(params: AdminOriginListParams = {}): Promise<AdminOriginRecord[]> {
    const { limit, offset } = normalizePagination(params)
    return this.prisma.origin.findMany({
      where: {
        merchantId: params.merchantId,
        storeId: params.storeId,
        isActive: params.isActive,
      },
      select: originSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: limit,
      skip: offset,
    })
  }

  async findOriginById(id: string): Promise<AdminOriginRecord | null> {
    return this.prisma.origin.findUnique({ where: { id }, select: originSelect })
  }

  async createOrigin(input: AdminOriginCreateInput): Promise<AdminOriginRecord> {
    return this.prisma.$transaction(async (tx) => {
      if (input.is_default) {
        await tx.origin.updateMany({ where: { merchantId: input.merchant_id, isDefault: true }, data: { isDefault: false } })
      }
      return tx.origin.create({
        data: {
          merchantId: input.merchant_id,
          storeId: input.store_id,
          code: input.code,
          name: input.name,
          address: input.address,
          city: input.city,
          province: input.province,
          postalCode: input.postal_code,
          phone: input.phone,
          isDefault: input.is_default,
          isActive: input.is_active,
        },
        select: originSelect,
      })
    })
  }

  async updateOrigin(id: string, input: AdminOriginUpdateInput): Promise<AdminOriginRecord> {
    return this.prisma.$transaction(async (tx) => {
      if (input.is_default) {
        const current = await tx.origin.findUniqueOrThrow({ where: { id }, select: { merchantId: true } })
        await tx.origin.updateMany({ where: { merchantId: current.merchantId, isDefault: true, id: { not: id } }, data: { isDefault: false } })
      }
      return tx.origin.update({
        where: { id },
        data: {
          storeId: input.store_id,
          code: input.code,
          name: input.name,
          address: input.address,
          city: input.city,
          province: input.province,
          postalCode: input.postal_code,
          phone: input.phone,
          isDefault: input.is_default,
          isActive: input.is_active,
        },
        select: originSelect,
      })
    })
  }

  async listCourierServices(params: AdminCourierServiceListParams = {}): Promise<AdminCourierServiceRecord[]> {
    const { limit, offset } = normalizePagination(params)
    return this.prisma.courierService.findMany({
      where: {
        courier: params.courier,
        status: params.status,
      },
      select: courierServiceSelect,
      orderBy: [{ courier: 'asc' }, { serviceCode: 'asc' }],
      take: limit,
      skip: offset,
    })
  }

  async findCourierServiceById(id: string): Promise<AdminCourierServiceRecord | null> {
    return this.prisma.courierService.findUnique({ where: { id }, select: courierServiceSelect })
  }

  async upsertCourierService(input: AdminCourierServiceCreateInput): Promise<AdminCourierServiceRecord> {
    return this.prisma.courierService.upsert({
      where: { courier_serviceCode: { courier: input.courier, serviceCode: input.service_code } },
      create: {
        courier: input.courier,
        serviceCode: input.service_code,
        serviceName: input.service_name,
        status: input.status,
        metadata: toJsonInput(input.metadata),
      },
      update: {
        serviceName: input.service_name,
        status: input.status,
        metadata: toJsonInput(input.metadata),
      },
      select: courierServiceSelect,
    })
  }

  async updateCourierService(id: string, input: AdminCourierServiceUpdateInput): Promise<AdminCourierServiceRecord> {
    return this.prisma.courierService.update({
      where: { id },
      data: {
        courier: input.courier,
        serviceCode: input.service_code,
        serviceName: input.service_name,
        status: input.status,
        metadata: toJsonInput(input.metadata),
      },
      select: courierServiceSelect,
    })
  }

  async listMerchantCourierServices(params: AdminMerchantCourierServiceListParams = {}): Promise<AdminMerchantCourierServiceRecord[]> {
    const { limit, offset } = normalizePagination(params)
    return this.prisma.merchantCourierService.findMany({
      where: {
        merchantId: params.merchantId,
        originId: params.originId,
        status: params.status,
      },
      select: merchantCourierServiceSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: limit,
      skip: offset,
    })
  }

  async upsertMerchantCourierService(input: AdminMerchantCourierServiceUpsertInput): Promise<AdminMerchantCourierServiceRecord> {
    const existing = await this.prisma.merchantCourierService.findFirst({
      where: {
        merchantId: input.merchant_id,
        courierServiceId: input.courier_service_id,
        originId: input.origin_id ?? null,
      },
      select: { id: true },
    })

    if (existing) {
      return this.prisma.merchantCourierService.update({
        where: { id: existing.id },
        data: { status: input.status },
        select: merchantCourierServiceSelect,
      })
    }

    return this.prisma.merchantCourierService.create({
      data: {
        merchantId: input.merchant_id,
        courierServiceId: input.courier_service_id,
        originId: input.origin_id,
        status: input.status,
      },
      select: merchantCourierServiceSelect,
    })
  }

  async deleteMerchantCourierService(id: string): Promise<AdminMerchantCourierServiceRecord> {
    return this.prisma.merchantCourierService.delete({ where: { id }, select: merchantCourierServiceSelect })
  }
}

function toJsonInput(value: Record<string, unknown> | undefined): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined
  return value as Prisma.InputJsonObject
}

function normalizePagination(params: PaginationParams): Required<PaginationParams> {
  return {
    limit: params.limit ?? 50,
    offset: params.offset ?? 0,
  }
}

const storeSelect = {
  id: true,
  merchantId: true,
  slug: true,
  name: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  merchant: { select: { id: true, slug: true, name: true, isActive: true } },
} as const

const originSelect = {
  id: true,
  merchantId: true,
  storeId: true,
  code: true,
  name: true,
  address: true,
  city: true,
  province: true,
  postalCode: true,
  phone: true,
  isDefault: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  merchant: { select: { id: true, slug: true, name: true, isActive: true } },
  store: { select: { id: true, slug: true, name: true, isActive: true } },
} as const

const courierServiceSelect = {
  id: true,
  courier: true,
  serviceCode: true,
  serviceName: true,
  status: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
} as const

const merchantCourierServiceSelect = {
  id: true,
  merchantId: true,
  courierServiceId: true,
  originId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  merchant: { select: { id: true, slug: true, name: true, isActive: true } },
  origin: { select: { id: true, code: true, name: true, isDefault: true, isActive: true } },
  courierService: { select: courierServiceSelect },
} as const


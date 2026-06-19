import type {
  AdminCourierServiceRecord,
  AdminConfigRepository,
  AdminCourierServiceListParams,
  AdminMerchantCourierServiceListParams,
  AdminMerchantCourierServiceRecord,
  AdminOriginListParams,
  AdminOriginRecord,
  AdminStoreListParams,
  AdminStoreRecord,
} from '../repositories/admin-config.repository.js'
import type {
  AdminCourierServiceCreateInput,
  AdminCourierServiceUpdateInput,
  AdminMerchantCourierServiceUpsertInput,
  AdminOriginCreateInput,
  AdminOriginUpdateInput,
  AdminStoreCreateInput,
  AdminStoreUpdateInput,
} from '../schemas/admin.js'

interface MerchantSummaryDto {
  id: string
  slug: string
  name: string
  isActive: boolean
}

interface StoreSummaryDto {
  id: string
  slug: string
  name: string
  isActive: boolean
}

interface OriginSummaryDto {
  id: string
  code: string
  name: string
  isDefault: boolean
  isActive: boolean
}

export interface AdminStoreDto {
  id: string
  merchantId: string
  slug: string
  name: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  merchant: MerchantSummaryDto
}

export interface AdminOriginDto {
  id: string
  merchantId: string
  storeId: string | null
  code: string
  name: string
  address: string | null
  city: string | null
  province: string | null
  postalCode: string | null
  phone: string | null
  isDefault: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
  merchant: MerchantSummaryDto
  store: StoreSummaryDto | null
}

export interface AdminCourierServiceDto {
  id: string
  courier: string
  serviceCode: string
  serviceName: string
  status: string
  metadata: unknown
  createdAt: string
  updatedAt: string
}

export interface AdminMerchantCourierServiceDto {
  id: string
  merchantId: string
  courierServiceId: string
  originId: string | null
  status: string
  createdAt: string
  updatedAt: string
  merchant: MerchantSummaryDto
  origin: OriginSummaryDto | null
  courierService: AdminCourierServiceDto
}

export class AdminConfigService {
  constructor(private readonly configs: AdminConfigRepository) {}

  async listStores(params: AdminStoreListParams = {}): Promise<AdminStoreDto[]> {
    const stores = await this.configs.listStores(params)
    return stores.map(toStoreDto)
  }

  async createStore(input: AdminStoreCreateInput): Promise<AdminStoreDto> {
    return toStoreDto(await this.configs.createStore(input))
  }

  async updateStore(id: string, input: AdminStoreUpdateInput): Promise<AdminStoreDto> {
    return toStoreDto(await this.configs.updateStore(id, input))
  }

  async listOrigins(params: AdminOriginListParams = {}): Promise<AdminOriginDto[]> {
    const origins = await this.configs.listOrigins(params)
    return origins.map(toOriginDto)
  }

  async createOrigin(input: AdminOriginCreateInput): Promise<AdminOriginDto> {
    return toOriginDto(await this.configs.createOrigin(input))
  }

  async updateOrigin(id: string, input: AdminOriginUpdateInput): Promise<AdminOriginDto> {
    return toOriginDto(await this.configs.updateOrigin(id, input))
  }

  async listCourierServices(params: AdminCourierServiceListParams = {}): Promise<AdminCourierServiceDto[]> {
    const services = await this.configs.listCourierServices(params)
    return services.map(toCourierServiceDto)
  }

  async upsertCourierService(input: AdminCourierServiceCreateInput): Promise<AdminCourierServiceDto> {
    return toCourierServiceDto(await this.configs.upsertCourierService(input))
  }

  async updateCourierService(id: string, input: AdminCourierServiceUpdateInput): Promise<AdminCourierServiceDto> {
    return toCourierServiceDto(await this.configs.updateCourierService(id, input))
  }

  async listMerchantCourierServices(params: AdminMerchantCourierServiceListParams = {}): Promise<AdminMerchantCourierServiceDto[]> {
    const services = await this.configs.listMerchantCourierServices(params)
    return services.map(toMerchantCourierServiceDto)
  }

  async upsertMerchantCourierService(input: AdminMerchantCourierServiceUpsertInput): Promise<AdminMerchantCourierServiceDto> {
    return toMerchantCourierServiceDto(await this.configs.upsertMerchantCourierService(input))
  }

  async deleteMerchantCourierService(id: string): Promise<AdminMerchantCourierServiceDto> {
    return toMerchantCourierServiceDto(await this.configs.deleteMerchantCourierService(id))
  }
}

function toStoreDto(store: AdminStoreRecord): AdminStoreDto {
  return {
    id: store.id,
    merchantId: store.merchantId,
    slug: store.slug,
    name: store.name,
    isActive: store.isActive,
    createdAt: store.createdAt.toISOString(),
    updatedAt: store.updatedAt.toISOString(),
    merchant: toMerchantSummaryDto(store.merchant),
  }
}

function toOriginDto(origin: AdminOriginRecord): AdminOriginDto {
  return {
    id: origin.id,
    merchantId: origin.merchantId,
    storeId: origin.storeId,
    code: origin.code,
    name: origin.name,
    address: origin.address,
    city: origin.city,
    province: origin.province,
    postalCode: origin.postalCode,
    phone: origin.phone,
    isDefault: origin.isDefault,
    isActive: origin.isActive,
    createdAt: origin.createdAt.toISOString(),
    updatedAt: origin.updatedAt.toISOString(),
    merchant: toMerchantSummaryDto(origin.merchant),
    store: origin.store ? toStoreSummaryDto(origin.store) : null,
  }
}

function toCourierServiceDto(service: AdminCourierServiceRecord): AdminCourierServiceDto {
  return {
    id: service.id,
    courier: service.courier,
    serviceCode: service.serviceCode,
    serviceName: service.serviceName,
    status: service.status,
    metadata: service.metadata,
    createdAt: service.createdAt.toISOString(),
    updatedAt: service.updatedAt.toISOString(),
  }
}

function toMerchantCourierServiceDto(service: AdminMerchantCourierServiceRecord): AdminMerchantCourierServiceDto {
  return {
    id: service.id,
    merchantId: service.merchantId,
    courierServiceId: service.courierServiceId,
    originId: service.originId,
    status: service.status,
    createdAt: service.createdAt.toISOString(),
    updatedAt: service.updatedAt.toISOString(),
    merchant: toMerchantSummaryDto(service.merchant),
    origin: service.origin ? toOriginSummaryDto(service.origin) : null,
    courierService: toCourierServiceDto(service.courierService),
  }
}

function toMerchantSummaryDto(merchant: MerchantSummaryDto): MerchantSummaryDto {
  return {
    id: merchant.id,
    slug: merchant.slug,
    name: merchant.name,
    isActive: merchant.isActive,
  }
}

function toStoreSummaryDto(store: StoreSummaryDto): StoreSummaryDto {
  return {
    id: store.id,
    slug: store.slug,
    name: store.name,
    isActive: store.isActive,
  }
}

function toOriginSummaryDto(origin: OriginSummaryDto): OriginSummaryDto {
  return {
    id: origin.id,
    code: origin.code,
    name: origin.name,
    isDefault: origin.isDefault,
    isActive: origin.isActive,
  }
}
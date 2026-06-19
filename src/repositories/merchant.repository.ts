import type { Prisma, PrismaClient } from '@prisma/client'
import type {
  AdminApiKeyCreateInput,
  AdminApiKeyUpdateInput,
  AdminMerchantCreateInput,
  AdminMerchantUpdateInput,
} from '../schemas/admin.js'

export interface MerchantApiKeyRecord {
  id: string
  merchantId: string
  keyHash: string
  merchant: { isActive: boolean }
}

export interface PaginationParams {
  limit?: number
  offset?: number
}

export interface AdminMerchantListParams extends PaginationParams {
  search?: string
  isActive?: boolean
}

export interface AdminApiKeyListParams extends PaginationParams {
  merchantId?: string
  isActive?: boolean
}

export interface AdminApiKeyCreateParams extends AdminApiKeyCreateInput {
  keyHash: string
  keyPrefix: string
}

export type AdminMerchantRecord = Prisma.MerchantGetPayload<{ select: typeof adminMerchantSelect }>
export type AdminApiKeyRecord = Prisma.ApiKeyGetPayload<{ select: typeof adminApiKeySelect }>

export class MerchantRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findActiveApiKeyByPrefix(keyPrefix: string): Promise<MerchantApiKeyRecord | null> {
    return this.prisma.apiKey.findFirst({
      where: {
        keyPrefix,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: {
        id: true,
        merchantId: true,
        keyHash: true,
        merchant: { select: { isActive: true } },
      },
    })
  }

  async markApiKeyUsed(id: string): Promise<void> {
    await this.prisma.apiKey.update({ where: { id }, data: { lastUsedAt: new Date() } })
  }

  async listAdminMerchants(params: AdminMerchantListParams = {}): Promise<AdminMerchantRecord[]> {
    const { limit, offset } = normalizePagination(params)
    return this.prisma.merchant.findMany({
      where: {
        isActive: params.isActive,
        OR: params.search
          ? [
              { slug: { contains: params.search, mode: 'insensitive' } },
              { name: { contains: params.search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      select: adminMerchantSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: limit,
      skip: offset,
    })
  }

  async findAdminMerchantById(id: string): Promise<AdminMerchantRecord | null> {
    return this.prisma.merchant.findUnique({ where: { id }, select: adminMerchantSelect })
  }

  async createAdminMerchant(input: AdminMerchantCreateInput): Promise<AdminMerchantRecord> {
    return this.prisma.merchant.create({
      data: {
        slug: input.slug,
        name: input.name,
        isActive: input.is_active,
      },
      select: adminMerchantSelect,
    })
  }

  async updateAdminMerchant(id: string, input: AdminMerchantUpdateInput): Promise<AdminMerchantRecord> {
    return this.prisma.merchant.update({
      where: { id },
      data: {
        slug: input.slug,
        name: input.name,
        isActive: input.is_active,
      },
      select: adminMerchantSelect,
    })
  }

  async listAdminApiKeys(params: AdminApiKeyListParams = {}): Promise<AdminApiKeyRecord[]> {
    const { limit, offset } = normalizePagination(params)
    return this.prisma.apiKey.findMany({
      where: {
        merchantId: params.merchantId,
        isActive: params.isActive,
      },
      select: adminApiKeySelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: limit,
      skip: offset,
    })
  }

  async createAdminApiKey(input: AdminApiKeyCreateParams): Promise<AdminApiKeyRecord> {
    return this.prisma.apiKey.create({
      data: {
        merchantId: input.merchant_id,
        keyHash: input.keyHash,
        keyPrefix: input.keyPrefix,
        label: input.label,
        expiresAt: input.expires_at ? new Date(input.expires_at) : undefined,
      },
      select: adminApiKeySelect,
    })
  }

  async updateAdminApiKey(id: string, input: AdminApiKeyUpdateInput): Promise<AdminApiKeyRecord> {
    return this.prisma.apiKey.update({
      where: { id },
      data: {
        label: input.label,
        expiresAt: input.expires_at === undefined ? undefined : input.expires_at ? new Date(input.expires_at) : null,
        isActive: input.is_active,
      },
      select: adminApiKeySelect,
    })
  }
}

function normalizePagination(params: PaginationParams): Required<PaginationParams> {
  return {
    limit: params.limit ?? 50,
    offset: params.offset ?? 0,
  }
}

const adminMerchantSelect = {
  id: true,
  slug: true,
  name: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      apiKeys: true,
      shipments: true,
      endpoints: true,
      stores: true,
      origins: true,
      courierServices: true,
    },
  },
} as const

const adminApiKeySelect = {
  id: true,
  merchantId: true,
  keyPrefix: true,
  label: true,
  lastUsedAt: true,
  expiresAt: true,
  isActive: true,
  createdAt: true,
  merchant: { select: { id: true, slug: true, name: true, isActive: true } },
} as const

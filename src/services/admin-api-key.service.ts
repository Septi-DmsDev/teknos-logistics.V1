import type { AdminApiKeyRecord, AdminApiKeyListParams, MerchantRepository } from '../repositories/merchant.repository.js'
import type { AdminApiKeyCreateInput, AdminApiKeyUpdateInput } from '../schemas/admin.js'
import { createApiKey } from '../utils/crypto.js'

interface MerchantSummaryDto {
  id: string
  slug: string
  name: string
  isActive: boolean
}

export interface AdminApiKeyDto {
  id: string
  merchantId: string
  keyPrefix: string
  label: string | null
  lastUsedAt: string | null
  expiresAt: string | null
  isActive: boolean
  createdAt: string
  merchant: MerchantSummaryDto
}

export interface AdminApiKeyCreateResponse {
  apiKey: AdminApiKeyDto
  plaintext: string
}

export class AdminApiKeyService {
  constructor(private readonly merchants: MerchantRepository) {}

  async listApiKeys(params: AdminApiKeyListParams = {}): Promise<AdminApiKeyDto[]> {
    const apiKeys = await this.merchants.listAdminApiKeys(params)
    return apiKeys.map(toApiKeyDto)
  }

  async createApiKey(input: AdminApiKeyCreateInput): Promise<AdminApiKeyCreateResponse> {
    const generated = createApiKey('live')
    const apiKey = await this.merchants.createAdminApiKey({
      ...input,
      keyHash: generated.keyHash,
      keyPrefix: generated.keyPrefix,
    })
    return { apiKey: toApiKeyDto(apiKey), plaintext: generated.plaintext }
  }

  async updateApiKey(id: string, input: AdminApiKeyUpdateInput): Promise<AdminApiKeyDto> {
    return toApiKeyDto(await this.merchants.updateAdminApiKey(id, input))
  }
}

function toApiKeyDto(apiKey: AdminApiKeyRecord): AdminApiKeyDto {
  return {
    id: apiKey.id,
    merchantId: apiKey.merchantId,
    keyPrefix: apiKey.keyPrefix,
    label: apiKey.label,
    lastUsedAt: apiKey.lastUsedAt?.toISOString() ?? null,
    expiresAt: apiKey.expiresAt?.toISOString() ?? null,
    isActive: apiKey.isActive,
    createdAt: apiKey.createdAt.toISOString(),
    merchant: {
      id: apiKey.merchant.id,
      slug: apiKey.merchant.slug,
      name: apiKey.merchant.name,
      isActive: apiKey.merchant.isActive,
    },
  }
}
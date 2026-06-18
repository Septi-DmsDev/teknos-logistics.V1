import type { PrismaClient } from '@prisma/client'

export interface MerchantApiKeyRecord {
  id: string
  merchantId: string
  keyHash: string
  merchant: { isActive: boolean }
}

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
}

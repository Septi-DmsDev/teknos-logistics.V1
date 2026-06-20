import type { AdminOperatorRole, PrismaClient } from '@prisma/client'

export interface AdminOperatorRecord {
  id: string
  supabaseUserId: string
  email: string
  role: AdminOperatorRole
  isActive: boolean
}

export class AdminOperatorRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findActiveBySupabaseUserId(supabaseUserId: string): Promise<AdminOperatorRecord | null> {
    return this.prisma.adminOperator.findFirst({
      where: { supabaseUserId, isActive: true },
      select: {
        id: true,
        supabaseUserId: true,
        email: true,
        role: true,
        isActive: true,
      },
    })
  }
}

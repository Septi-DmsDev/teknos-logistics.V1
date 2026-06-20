import type { AdminOperatorRole, Prisma, PrismaClient } from '@prisma/client'
import type { AdminAuditLogListQuery } from '../schemas/admin.js'

export interface CreateAdminAuditLogInput {
  method: string
  path: string
  status: number
  durationMs: number
  requestId?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  operatorId?: string | null
  actorEmail?: string | null
  actorRole?: AdminOperatorRole | null
  authProvider?: string | null
}

export type AdminAuditLogRecord = Awaited<ReturnType<AdminAuditRepository['list']>>[number]

export class AdminAuditRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateAdminAuditLogInput): Promise<void> {
    await this.prisma.adminAuditLog.create({
      data: {
        method: input.method,
        path: input.path,
        status: input.status,
        durationMs: input.durationMs,
        requestId: input.requestId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        operatorId: input.operatorId,
        actorEmail: input.actorEmail,
        actorRole: input.actorRole,
        authProvider: input.authProvider,
      },
      select: { id: true },
    })
  }

  async list(query: AdminAuditLogListQuery) {
    return this.prisma.adminAuditLog.findMany({
      where: buildAuditWhere(query),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit,
      skip: query.offset,
      select: {
        id: true,
        method: true,
        path: true,
        status: true,
        durationMs: true,
        requestId: true,
        ipAddress: true,
        userAgent: true,
        operatorId: true,
        actorEmail: true,
        actorRole: true,
        authProvider: true,
        createdAt: true,
      },
    })
  }

  async deleteOlderThan(cutoff: Date): Promise<number> {
    const result = await this.prisma.adminAuditLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    })
    return result.count
  }
}

function buildAuditWhere(query: AdminAuditLogListQuery): Prisma.AdminAuditLogWhereInput {
  return {
    method: query.method,
    path: query.path ? { contains: query.path } : undefined,
    status: buildStatusFilter(query.status_min, query.status_max),
  }
}

function buildStatusFilter(min: number | undefined, max: number | undefined): Prisma.IntFilter | undefined {
  if (min === undefined && max === undefined) return undefined
  return { gte: min, lte: max }
}

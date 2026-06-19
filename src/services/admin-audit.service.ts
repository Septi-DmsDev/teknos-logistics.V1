import type { AdminAuditLogListQuery } from '../schemas/admin.js'
import type { AdminAuditRepository, AdminAuditLogRecord } from '../repositories/admin-audit.repository.js'

export interface AdminAuditLogDto {
  id: string
  method: string
  path: string
  status: number
  durationMs: number
  requestId: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

export class AdminAuditService {
  constructor(private readonly audits: AdminAuditRepository) {}

  async listAuditLogs(query: AdminAuditLogListQuery): Promise<AdminAuditLogDto[]> {
    const logs = await this.audits.list(query)
    return logs.map(toAuditLogDto)
  }
}

function toAuditLogDto(log: AdminAuditLogRecord): AdminAuditLogDto {
  return {
    id: log.id,
    method: log.method,
    path: log.path,
    status: log.status,
    durationMs: log.durationMs,
    requestId: log.requestId,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    createdAt: log.createdAt.toISOString(),
  }
}

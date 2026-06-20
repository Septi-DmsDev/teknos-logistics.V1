import { existsSync, readFileSync } from 'node:fs'

const checks = [
  checkFileIncludes('prisma/schema.prisma', ['model OriginMapping', '@@unique([originId, courier])', '@@index([merchantId, courier, isActive])', 'originMappings']),
  checkFileIncludes('prisma/migrations/20260620143000_add_origin_mappings/migration.sql', ['CREATE TABLE "OriginMapping"', 'OriginMapping_originId_courier_key', 'OriginMapping_merchantId_courier_isActive_idx']),
  checkFileIncludes('src/repositories/destination-mapping.repository.ts', ['resolveOriginCode', 'upsertOriginMapping', 'listOriginMappings', 'originMappingSelect']),
  checkFileIncludes('src/services/destination-resolution.service.ts', ['ORIGIN_MAPPING_NOT_FOUND', 'resolveOriginCode', 'origin_code: item.originCode']),
  checkFileIncludes('src/schemas/admin.ts', ['adminOriginMappingUpsertSchema', 'provider_code', 'AdminOriginMappingUpsertInput']),
  checkFileIncludes('src/routes/admin/destination-mappings.ts', ['/admin/merchants/:merchantId/origins/:originId/mappings', 'upsertOriginMapping', 'toOriginMappingDto']),
  checkFileIncludes('scripts/upsert-origin-mappings.ts', ['JNE_ORIGIN_PROVIDER_CODE', 'SAP_ORIGIN_PROVIDER_CODE', 'TBD_FROM_SAP_IT', 'isActive: SAP_PROVIDER_CODE']),
]

const ok = checks.every((check) => check.ok)
console.log(JSON.stringify({ ok, checks }, null, 2))
if (!ok) process.exit(1)

function checkFileIncludes(file: string, patterns: string[]) {
  if (!existsSync(file)) return { name: file, ok: false, details: ['missing'] }
  const text = readFileSync(file, 'utf8')
  const missing = patterns.filter((pattern) => !text.includes(pattern))
  return { name: file, ok: missing.length === 0, details: missing.length ? missing.map((pattern) => `missing:${pattern}`) : [`patterns=${patterns.length}`] }
}

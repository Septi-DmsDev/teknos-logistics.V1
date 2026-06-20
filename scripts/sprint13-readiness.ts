import { existsSync, readFileSync } from 'node:fs'

const checks = [
  checkFileIncludes('prisma/schema.prisma', ['sourceKey    String?', '@@unique([merchantId, courier, sourceKey])', '@@index([merchantId, courier, providerCode])']),
  checkFileIncludes('prisma/migrations/20260620152000_make_destination_mappings_importable/migration.sql', ['ADD COLUMN "sourceKey"', 'DROP INDEX IF EXISTS "DestinationMapping_merchantId_courier_providerCode_key"', 'DestinationMapping_merchantId_courier_sourceKey_key']),
  checkFileIncludes('scripts/import-jne-destinations.ts', ['readJneDestinationRows', 'sourceKey', 'merchantId_courier_sourceKey', '--apply', 'Expand-Archive']),
  checkFileIncludes('package.json', ['import:jne:destinations', 'sprint13:readiness']),
  checkFileIncludes('docs/implementation-notes.md', ['Sprint 13 JNE Destination Import Tooling']),
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

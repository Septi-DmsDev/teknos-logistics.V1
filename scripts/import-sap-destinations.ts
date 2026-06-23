import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { Prisma } from '@prisma/client'

interface SapDestinationRow {
  branchCode: string
  branchName: string
  districtCode: string
  districtName: string
  cityCode: string
  cityName: string
  provinsiCode: string
  provinsiName: string
  areaCod: boolean
  isActive: boolean
  /** normalized district name without the "(CITY)" suffix */
  district: string
  /** unique key for upsert */
  sourceKey: string
}

const DEFAULT_XLSX = 'docs/Docs API Expedisi/SAP/suport file/COVERAGE AREA SAPX 22-06-2026.xlsx'
const args = new Set(process.argv.slice(2))
const apply = args.has('--apply')
const limit = readNumberArg('--limit')
const batchSize = readNumberArg('--batch-size') ?? 500
const file = readStringArg('--file') ?? DEFAULT_XLSX
const merchantSlug = readStringArg('--merchant') ?? process.env.SAP_DESTINATION_IMPORT_MERCHANT_SLUG ?? 'teknos'

const rows = readSapDestinationRows(file)
const activeRows = rows.filter((r) => r.isActive)
const selectedRows = typeof limit === 'number' ? activeRows.slice(0, limit) : activeRows
const uniqueDistrictCodes = new Set(selectedRows.map((row) => row.districtCode))
const sample = selectedRows.slice(0, 5)

if (!apply) {
  console.log(JSON.stringify({
    ok: true,
    mode: 'dry-run',
    file,
    totalRows: rows.length,
    activeRows: activeRows.length,
    selected: selectedRows.length,
    uniqueDistrictCodes: uniqueDistrictCodes.size,
    sample,
  }, null, 2))
  process.exit(0)
}

const { loadLocalEnv } = await import('./env.js')
loadLocalEnv()
const { createPrismaClient } = await import('../src/db/client.js')
const prisma = createPrismaClient()

try {
  const merchant = await prisma.merchant.findUnique({ where: { slug: merchantSlug } })
  if (!merchant) throw new Error(`Merchant not found: ${merchantSlug}`)

  let imported = 0
  for (let index = 0; index < selectedRows.length; index += batchSize) {
    const chunk = selectedRows.slice(index, index + batchSize)
    await upsertDestinationBatch(merchant.id, chunk)
    imported += chunk.length
    console.log(JSON.stringify({ imported, total: selectedRows.length }))
  }

  console.log(JSON.stringify({
    ok: true,
    mode: 'apply',
    merchantId: merchant.id,
    imported,
    uniqueDistrictCodes: uniqueDistrictCodes.size,
  }, null, 2))
} finally {
  await prisma.$disconnect()
}

async function upsertDestinationBatch(merchantId: string, rows: SapDestinationRow[]): Promise<void> {
  const values = rows.map((row) => Prisma.sql`(
    ${randomUUID()},
    ${merchantId},
    CAST(${'SAP_EXPRESS'} AS "CourierCode"),
    ${'ID'},
    ${row.provinsiName},
    ${row.cityName},
    ${row.district || null},
    ${null},
    ${null},
    ${row.districtCode},
    ${row.sourceKey},
    ${row.districtName.slice(0, 120)},
    ${true},
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )`)

  await prisma.$executeRaw`
    INSERT INTO "DestinationMapping" (
      "id",
      "merchantId",
      "courier",
      "country",
      "province",
      "city",
      "district",
      "subdistrict",
      "postalCode",
      "providerCode",
      "sourceKey",
      "label",
      "isActive",
      "createdAt",
      "updatedAt"
    ) VALUES ${Prisma.join(values)}
    ON CONFLICT ("merchantId", "courier", "sourceKey") DO UPDATE SET
      "province" = EXCLUDED."province",
      "city" = EXCLUDED."city",
      "district" = EXCLUDED."district",
      "subdistrict" = EXCLUDED."subdistrict",
      "postalCode" = EXCLUDED."postalCode",
      "providerCode" = EXCLUDED."providerCode",
      "label" = EXCLUDED."label",
      "isActive" = EXCLUDED."isActive",
      "updatedAt" = CURRENT_TIMESTAMP
  `
}

export function readSapDestinationRows(xlsxPath: string): SapDestinationRow[] {
  const absolutePath = resolve(xlsxPath)
  if (!existsSync(absolutePath)) throw new Error(`XLSX file not found: ${xlsxPath}`)

  const tempDir = mkdtempSync(join(tmpdir(), 'sap-destinations-'))
  try {
    extractXlsx(absolutePath, tempDir)
    const sheetXml = readFileSync(join(tempDir, 'xl/worksheets/sheet1.xml'), 'utf8')
    const allRows = parseInlineRows(sheetXml)

    // Row 1 = title, Row 2 = date info, Row 3 = header — data starts at row index 3
    const dataRows = allRows.slice(3)

    const deduped = new Map<string, SapDestinationRow>()
    for (const row of dataRows) {
      const dest = toDestinationRow(row)
      if (!dest) continue
      deduped.set(dest.sourceKey, dest)
    }
    return [...deduped.values()]
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}

function extractXlsx(xlsxPath: string, tempDir: string): void {
  if (process.platform === 'win32') {
    const zipPath = join(tempDir, `${basename(xlsxPath)}.zip`)
    execFileSync('powershell', [
      '-NoProfile', '-Command',
      `Copy-Item -LiteralPath '${escapePowerShell(xlsxPath)}' -Destination '${escapePowerShell(zipPath)}'; Expand-Archive -LiteralPath '${escapePowerShell(zipPath)}' -DestinationPath '${escapePowerShell(tempDir)}' -Force`,
    ], { stdio: 'pipe' })
    return
  }
  execFileSync('unzip', ['-q', xlsxPath, '-d', tempDir], { stdio: 'pipe' })
}

function parseInlineRows(sheetXml: string): string[][] {
  return [...sheetXml.matchAll(/<row[^>]*>(.*?)<\/row>/gs)].map((rowMatch) => {
    const cells: string[] = []
    for (const cellMatch of rowMatch[1].matchAll(/<c[^>]*r="([A-Z]+)\d+"[^>]*>(.*?)<\/c>/gs)) {
      const col = cellMatch[1] ?? ''
      const idx = [...col].reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0) - 1
      const inner = cellMatch[2] ?? ''
      // SAP xlsx uses inlineStr format: <is><t>value</t></is>
      const inlineMatch = /<is>.*?<t[^>]*>(.*?)<\/t>.*?<\/is>/s.exec(inner)
      cells[idx] = inlineMatch ? decodeXml(inlineMatch[1]) : ''
    }
    return cells.map((v) => v ?? '')
  })
}

function toDestinationRow(row: string[]): SapDestinationRow | null {
  const branchCode = row[1]?.trim() ?? ''
  const branchName = row[2]?.trim() ?? ''
  const districtCode = row[3]?.trim() ?? ''
  const districtName = row[4]?.trim() ?? ''
  const cityCode = row[6]?.trim() ?? ''
  const cityName = row[7]?.trim() ?? ''
  const provinsiCode = row[8]?.trim() ?? ''
  const provinsiName = row[9]?.trim() ?? ''
  const areaCodRaw = (row[10]?.trim() ?? '').toUpperCase()
  const statusRaw = (row[11]?.trim() ?? '').toUpperCase()

  if (!districtCode || !cityName || !provinsiName) return null

  const areaCod = areaCodRaw === 'YES'
  const isActive = statusRaw === 'AKTIF'

  // District Name format: "GROGOL PETAMBURAN (JAKARTA BARAT)" → "GROGOL PETAMBURAN"
  const district = districtName.replace(/\s*\([^)]+\)\s*$/, '').trim()

  const sourceKey = normalizeKey(['sap', districtCode, provinsiName, cityName].join('|'))

  return {
    branchCode,
    branchName,
    districtCode,
    districtName,
    cityCode,
    cityName,
    provinsiCode,
    provinsiName,
    areaCod,
    isActive,
    district,
    sourceKey,
  }
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function decodeXml(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

function escapePowerShell(value: string): string {
  return value.replace(/'/g, "''")
}

function readStringArg(name: string): string | undefined {
  const prefix = `${name}=`
  const match = process.argv.slice(2).find((arg) => arg.startsWith(prefix))
  return match?.slice(prefix.length)
}

function readNumberArg(name: string): number | undefined {
  const raw = readStringArg(name)
  if (!raw) return undefined
  const value = Number(raw)
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`)
  return value
}

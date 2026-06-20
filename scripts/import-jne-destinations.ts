import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'

interface JneDestinationRow {
  country: string
  province: string
  city: string
  district: string
  subdistrict: string
  postalCode: string
  providerCode: string
  sourceKey: string
}

const DEFAULT_XLSX = 'docs/Docs API Expedisi/JNE/Live doc/suport file/list_dest.xlsx'
const args = new Set(process.argv.slice(2))
const apply = args.has('--apply')
const limit = readNumberArg('--limit')
const file = readStringArg('--file') ?? DEFAULT_XLSX
const merchantSlug = readStringArg('--merchant') ?? process.env.JNE_DESTINATION_IMPORT_MERCHANT_SLUG ?? 'teknos'

const rows = readJneDestinationRows(file)
const selectedRows = typeof limit === 'number' ? rows.slice(0, limit) : rows
const uniqueProviderCodes = new Set(selectedRows.map((row) => row.providerCode))
const sample = selectedRows.slice(0, 5)

if (!apply) {
  console.log(JSON.stringify({ ok: true, mode: 'dry-run', file, rows: selectedRows.length, uniqueProviderCodes: uniqueProviderCodes.size, sample }, null, 2))
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
  for (const row of selectedRows) {
    await prisma.destinationMapping.upsert({
      where: { merchantId_courier_sourceKey: { merchantId: merchant.id, courier: 'JNE', sourceKey: row.sourceKey } },
      create: {
        merchantId: merchant.id,
        courier: 'JNE',
        country: row.country,
        province: row.province,
        city: row.city,
        district: row.district,
        subdistrict: row.subdistrict,
        postalCode: row.postalCode,
        providerCode: row.providerCode,
        sourceKey: row.sourceKey,
        label: `${row.city} - ${row.district} - ${row.subdistrict}`.slice(0, 120),
        isActive: true,
      },
      update: {
        country: row.country,
        province: row.province,
        city: row.city,
        district: row.district,
        subdistrict: row.subdistrict,
        postalCode: row.postalCode,
        providerCode: row.providerCode,
        label: `${row.city} - ${row.district} - ${row.subdistrict}`.slice(0, 120),
        isActive: true,
      },
    })
    imported += 1
    if (imported % 1000 === 0) console.log(JSON.stringify({ imported, total: selectedRows.length }))
  }

  console.log(JSON.stringify({ ok: true, mode: 'apply', merchantId: merchant.id, imported, uniqueProviderCodes: uniqueProviderCodes.size }, null, 2))
} finally {
  await prisma.$disconnect()
}

export function readJneDestinationRows(xlsxPath: string): JneDestinationRow[] {
  const absolutePath = resolve(xlsxPath)
  if (!existsSync(absolutePath)) throw new Error(`XLSX file not found: ${xlsxPath}`)

  const tempDir = mkdtempSync(join(tmpdir(), 'jne-destinations-'))
  try {
    extractXlsx(absolutePath, tempDir)
    const sharedStrings = readSharedStrings(join(tempDir, 'xl/sharedStrings.xml'))
    const sheetXml = readFileSync(join(tempDir, 'xl/worksheets/sheet1.xml'), 'utf8')
    const rows = parseRows(sheetXml, sharedStrings)
    const header = rows.shift()
    assertHeader(header)

    const deduped = new Map<string, JneDestinationRow>()
    for (const row of rows) {
      const destination = toDestinationRow(row)
      if (!destination) continue
      deduped.set(destination.sourceKey, destination)
    }
    return [...deduped.values()]
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}

function extractXlsx(xlsxPath: string, tempDir: string): void {
  if (process.platform === 'win32') {
    const zipPath = join(tempDir, `${basename(xlsxPath)}.zip`)
    execFileSync('powershell', ['-NoProfile', '-Command', `Copy-Item -LiteralPath '${escapePowerShell(xlsxPath)}' -Destination '${escapePowerShell(zipPath)}'; Expand-Archive -LiteralPath '${escapePowerShell(zipPath)}' -DestinationPath '${escapePowerShell(tempDir)}' -Force`], { stdio: 'pipe' })
    return
  }
  execFileSync('unzip', ['-q', xlsxPath, '-d', tempDir], { stdio: 'pipe' })
}

function readSharedStrings(path: string): string[] {
  const xml = readFileSync(path, 'utf8')
  return [...xml.matchAll(/<si>(.*?)<\/si>/gs)].map((match) => [...match[1].matchAll(/<t[^>]*>(.*?)<\/t>/gs)].map((part) => decodeXml(part[1])).join(''))
}

function parseRows(sheetXml: string, sharedStrings: string[]): string[][] {
  return [...sheetXml.matchAll(/<row[^>]*r="\d+"[^>]*>(.*?)<\/row>/gs)].map((rowMatch) => {
    const values: string[] = []
    for (const cell of rowMatch[1].matchAll(/<c[^>]*r="([A-Z]+)\d+"(?:[^>]*t="([^"]+)")?[^>]*>.*?<v>(.*?)<\/v>.*?<\/c>/gs)) {
      const index = columnIndex(cell[1])
      const rawValue = cell[3]
      values[index] = cell[2] === 's' ? (sharedStrings[Number(rawValue)] ?? '') : decodeXml(rawValue)
    }
    return values.map((value) => value ?? '')
  })
}

function assertHeader(header: string[] | undefined): void {
  const expected = ['COUNTRY_NAME', 'PROVINCE_NAME', 'CITY_NAME', 'DISTRICT_NAME', 'SUBDISTRICT_NAME', 'ZIP_CODE', 'TARIFF_CODE']
  if (!header || expected.some((value, index) => header[index] !== value)) {
    throw new Error(`Unexpected JNE destination header: ${JSON.stringify(header)}`)
  }
}

function toDestinationRow(row: string[]): JneDestinationRow | null {
  const [countryName, province, city, district, subdistrict, postalCode, providerCode] = row.map((value) => value.trim())
  if (!providerCode || !postalCode || !city) return null
  const country = countryName === 'INDONESIA' ? 'ID' : countryName.slice(0, 2).toUpperCase()
  const sourceKey = normalizeKey(['jne', providerCode, postalCode, province, city, district, subdistrict].join('|'))
  return { country, province, city, district, subdistrict, postalCode, providerCode, sourceKey }
}

function columnIndex(column: string): number {
  let index = 0
  for (const char of column) index = index * 26 + char.charCodeAt(0) - 64
  return index - 1
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

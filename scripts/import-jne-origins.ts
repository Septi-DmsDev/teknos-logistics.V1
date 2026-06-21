import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface JneOriginRow {
  providerCode: string
  label: string
  sourceKey: string
}

const DEFAULT_XLS = 'docs/Docs API Expedisi/JNE/Live doc/suport file/list_origin.xls'
const args = new Set(process.argv.slice(2))
const apply = args.has('--apply')
const limit = readNumberArg('--limit')
const file = readStringArg('--file') ?? DEFAULT_XLS

const rows = readJneOriginRows(file)
const selectedRows = typeof limit === 'number' ? rows.slice(0, limit) : rows
const sample = selectedRows.slice(0, 8)

if (!apply) {
  console.log(JSON.stringify({ ok: true, mode: 'dry-run', file, rows: selectedRows.length, sample }, null, 2))
  process.exit(0)
}

const { loadLocalEnv } = await import('./env.js')
loadLocalEnv()
const { createPrismaClient } = await import('../src/db/client.js')
const prisma = createPrismaClient()

try {
  let imported = 0
  for (const row of selectedRows) {
    await prisma.providerOriginCatalog.upsert({
      where: { courier_sourceKey: { courier: 'JNE', sourceKey: row.sourceKey } },
      create: {
        courier: 'JNE',
        country: 'ID',
        providerCode: row.providerCode,
        label: row.label,
        sourceKey: row.sourceKey,
        isActive: true,
      },
      update: {
        providerCode: row.providerCode,
        label: row.label,
        isActive: true,
      },
    })
    imported += 1
  }

  console.log(JSON.stringify({ ok: true, mode: 'apply', imported }, null, 2))
} finally {
  await prisma.$disconnect()
}

export function readJneOriginRows(xlsPath: string): JneOriginRow[] {
  const absolutePath = resolve(xlsPath)
  if (!existsSync(absolutePath)) throw new Error(`JNE origin XLS file not found: ${xlsPath}`)

  const html = readFileSync(absolutePath, 'utf8')
  const deduped = new Map<string, JneOriginRow>()

  for (const rowMatch of html.matchAll(/<tr[^>]*>(.*?)<\/tr>/gis)) {
    const cells = [...rowMatch[1].matchAll(/<td[^>]*>(.*?)<\/td>/gis)].map((match) => cleanCell(match[1]))
    const providerCode = cells[0]?.trim() ?? ''
    const label = cells[1]?.trim() ?? ''
    if (!providerCode || !label || providerCode.toLowerCase() === 'origin code') continue

    const sourceKey = normalizeKey(['jne', 'origin', providerCode, label].join('|'))
    deduped.set(sourceKey, { providerCode, label, sourceKey })
  }

  return [...deduped.values()]
}

function cleanCell(value: string): string {
  return decodeHtml(value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function decodeHtml(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
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

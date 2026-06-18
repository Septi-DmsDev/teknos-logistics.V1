import { existsSync, readFileSync } from 'node:fs'
import 'dotenv/config'
import { defineConfig } from 'prisma/config'

loadEnvFile('.env.local')
loadEnvFile('.env')

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/teknos_logistics?schema=public',
  },
})

function loadEnvFile(file: string): void {
  if (!existsSync(file)) return

  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const match = /^(?<key>[A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?<value>.*)$/.exec(trimmed)
    if (!match?.groups) continue

    const key = match.groups.key
    const rawValue = match.groups.value
    if (!key || rawValue === undefined || process.env[key]) continue

    let value = rawValue.trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}

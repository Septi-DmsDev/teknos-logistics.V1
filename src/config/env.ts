import { existsSync, readFileSync } from 'node:fs'
import { z } from 'zod'

const optionalSecret = z.string().optional().default('')

export const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  APP_URL: z.string().url().default('http://localhost:3001'),
  ADMIN_JWT_SECRET: optionalSecret,
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_PUBLIC_MAX: z.coerce.number().int().nonnegative().default(120),
  RATE_LIMIT_ADMIN_MAX: z.coerce.number().int().nonnegative().default(60),
  LOGISTICS_PROVIDER: z.enum(['mock', 'jne']).default('mock'),
  JNE_MODE: z.enum(['sandbox', 'production']).default('sandbox'),
  JNE_API_BASE_URL: optionalSecret,
  JNE_USERNAME: optionalSecret,
  JNE_API_KEY: optionalSecret,
  JNE_CUST_NO: optionalSecret,
  JNE_BRANCH_CODE: optionalSecret,
  JNE_ORIGIN_CODE: optionalSecret,
  JNE_SHIPPER_NAME: optionalSecret,
  JNE_SHIPPER_ADDR1: optionalSecret,
  JNE_SHIPPER_CITY: optionalSecret,
  JNE_SHIPPER_PHONE: optionalSecret,
  JNE_SHIPPER_ZIP: optionalSecret,
  JNE_WEBHOOK_TOKEN: optionalSecret,
})

export type Env = z.infer<typeof envSchema>

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.parse(source)
  if (parsed.NODE_ENV === 'production' && parsed.ADMIN_JWT_SECRET.trim().length === 0) {
    throw new Error('ADMIN_JWT_SECRET is required in production')
  }
  return parsed
}

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

loadEnvFile('.env.local')
loadEnvFile('.env')

export const env = loadEnv()

import { existsSync, readFileSync } from 'node:fs'
import { z } from 'zod'

const optionalSecret = z.string().optional().default('')
const optionalUrl = z.union([z.string().url(), z.literal('')]).optional().default('')

export const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  APP_URL: z.string().url().default('http://localhost:3001'),
  ADMIN_AUTH_PROVIDER: z.enum(['static-token', 'supabase']).default('static-token'),
  ADMIN_JWT_SECRET: optionalSecret,
  SUPABASE_URL: optionalUrl,
  SUPABASE_ANON_KEY: optionalSecret,
  SUPABASE_JWT_SECRET: optionalSecret,
  SUPABASE_SERVICE_ROLE_KEY: optionalSecret,
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
  JNE_COD_ELIGIBLE_SERVICES: z.string().default('REG,JTR'),
  JNE_COD_FEE_PERCENT: z.coerce.number().min(0).max(100).default(3),
  JNE_COD_MIN_FEE_IDR: z.coerce.number().int().nonnegative().default(0),
  SAP_API_BASE_URL: optionalUrl,
  SAP_TRACKING_BASE_URL: optionalUrl,
  SAP_API_KEY: optionalSecret,
  SAP_CUSTOMER_CODE: optionalSecret,
  SAP_CUSTOMER_CODE_NON_COD: optionalSecret,
  SAP_CUSTOMER_CODE_COD: optionalSecret,
  SAP_ORIGIN_DISTRICT_CODE: optionalSecret,
  SAP_PICKUP_PLACE: z.string().optional().default('1'),
  SAP_SHIPMENT_TYPE_CODE: z.string().optional().default('SHTPC'),
  SAP_SHIPMENT_CONTENT_CODE: z.string().optional().default('SHTPC'),
  SAP_SHIPPER_NAME: optionalSecret,
  SAP_SHIPPER_ADDRESS: optionalSecret,
  SAP_SHIPPER_PHONE: optionalSecret,
  SAP_SHIPPER_CONTACT: optionalSecret,
  SAP_WEBHOOK_TOKEN: optionalSecret,
  SAP_COD_FEE_PERCENT: z.coerce.number().min(0).max(100).default(2),
  SAP_COD_MIN_FEE_IDR: z.coerce.number().int().nonnegative().default(0),
})

export type Env = z.infer<typeof envSchema>

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.parse(source)
  if (parsed.NODE_ENV === 'production' && parsed.ADMIN_JWT_SECRET.trim().length === 0) {
    throw new Error('ADMIN_JWT_SECRET is required in production')
  }
  if (parsed.ADMIN_AUTH_PROVIDER === 'supabase') {
    if (!parsed.SUPABASE_URL || !parsed.SUPABASE_JWT_SECRET) {
      throw new Error('SUPABASE_URL and SUPABASE_JWT_SECRET are required when ADMIN_AUTH_PROVIDER=supabase')
    }
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

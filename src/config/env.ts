import { z } from 'zod'

const optionalSecret = z.string().optional().default('')

export const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  APP_URL: z.string().url().default('http://localhost:3001'),
  ADMIN_JWT_SECRET: optionalSecret,
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
  return envSchema.parse(source)
}

export const env = loadEnv()

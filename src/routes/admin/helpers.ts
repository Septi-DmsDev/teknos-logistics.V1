import type { Context } from 'hono'
import { z } from 'zod'

export async function parseJson<T>(c: Context, schema: z.ZodType<T>): Promise<T> {
  return schema.parse(await c.req.json())
}

export function parseQuery<T>(c: Context, schema: z.ZodType<T>): T {
  return schema.parse(Object.fromEntries(new URL(c.req.url).searchParams.entries()))
}

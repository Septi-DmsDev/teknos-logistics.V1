import { z } from 'zod'
import type { CourierCode } from '../couriers/types.js'

export const courierCodeSchema = z.enum(['JNE', 'JNT', 'SAP_EXPRESS', 'MOCK'])

export const rateRequestSchema = z.object({
  origin_code: z.string().trim().min(3).max(32),
  dest_code: z.string().trim().min(3).max(32),
  weight_grams: z.number().int().min(1).max(100_000),
  is_cod: z.boolean().optional(),
  couriers: z.array(courierCodeSchema).min(1).optional(),
})

export const destinationInputSchema = z.object({
  postal_code: z.string().trim().min(3).max(16).optional(),
  province: z.string().trim().min(1).max(120).optional(),
  city: z.string().trim().min(1).max(120).optional(),
  district: z.string().trim().min(1).max(120).optional(),
  subdistrict: z.string().trim().min(1).max(120).optional(),
  address: z.string().trim().min(5).max(500).optional(),
}).refine((value) => Boolean(value.postal_code || value.city || value.subdistrict), {
  message: 'Destination requires at least postal_code, city, or subdistrict',
})

export const rateResolveRequestSchema = z.object({
  origin_id: z.string().trim().min(1).max(64),
  destination: destinationInputSchema,
  weight_grams: z.number().int().min(1).max(100_000),
  is_cod: z.boolean().optional(),
  couriers: z.array(courierCodeSchema).min(1).optional(),
})

export const shipmentRequestSchema = z.object({
  external_order_id: z.string().trim().min(1).max(64),
  courier: courierCodeSchema.default('MOCK'),
  service_code: z.string().trim().min(1).max(32),
  service_name: z.string().trim().max(80).optional(),
  origin_code: z.string().trim().min(3).max(32),
  dest_code: z.string().trim().min(3).max(32),
  weight_grams: z.number().int().min(1).max(100_000),
  rate_idr: z.number().int().min(0).optional(),
  recipient: z.object({
    name: z.string().trim().min(1).max(120),
    phone: z.string().trim().min(6).max(32),
    address: z.string().trim().min(5).max(500),
  }),
  goods_value_idr: z.number().int().min(0).optional(),
  is_cod: z.boolean().optional(),
})

export type RateRequest = z.infer<typeof rateRequestSchema> & { couriers?: CourierCode[] }
export type RateResolveRequest = z.infer<typeof rateResolveRequestSchema> & { couriers?: CourierCode[] }
export type ShipmentRequest = z.infer<typeof shipmentRequestSchema> & { courier: CourierCode }

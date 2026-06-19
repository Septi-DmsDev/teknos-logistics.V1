import { z } from 'zod'
import { courierCodeSchema } from './api.js'

const idSchema = z.string().trim().min(1).max(64)
const slugSchema = z.string().trim().min(2).max(64).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
const optionalTextSchema = z.string().trim().min(1).max(255).optional()
const dateStringSchema = z.string().trim().datetime({ offset: true })
const activeStatusSchema = z.enum(['ACTIVE', 'INACTIVE'])
const shipmentStatusSchema = z.enum([
  'DRAFT',
  'BOOKED',
  'PICKED_UP',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'RETURNED',
  'FAILED',
  'CANCELLED',
])
const webhookRelayStatusSchema = z.enum(['PENDING', 'SUCCESS', 'FAILED'])

export const adminPaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export const adminMerchantListQuerySchema = adminPaginationSchema.extend({
  search: z.string().trim().min(1).max(100).optional(),
  is_active: z.coerce.boolean().optional(),
})

export const adminMerchantCreateSchema = z.object({
  slug: slugSchema,
  name: z.string().trim().min(1).max(120),
  is_active: z.boolean().default(true),
})

export const adminMerchantUpdateSchema = adminMerchantCreateSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one merchant field is required',
})

export const adminStoreCreateSchema = z.object({
  merchant_id: idSchema,
  slug: slugSchema,
  name: z.string().trim().min(1).max(120),
  is_active: z.boolean().default(true),
})

export const adminStoreUpdateSchema = adminStoreCreateSchema
  .omit({ merchant_id: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one store field is required' })

export const adminOriginCreateSchema = z.object({
  merchant_id: idSchema,
  store_id: idSchema.optional(),
  code: z.string().trim().min(2).max(32),
  name: z.string().trim().min(1).max(120),
  address: z.string().trim().min(1).max(500).optional(),
  city: optionalTextSchema,
  province: optionalTextSchema,
  postal_code: z.string().trim().min(3).max(16).optional(),
  phone: z.string().trim().min(6).max(32).optional(),
  is_default: z.boolean().default(false),
  is_active: z.boolean().default(true),
})

export const adminOriginUpdateSchema = adminOriginCreateSchema
  .omit({ merchant_id: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one origin field is required' })

export const adminCourierServiceCreateSchema = z.object({
  courier: courierCodeSchema,
  service_code: z.string().trim().min(1).max(32),
  service_name: z.string().trim().min(1).max(120),
  status: activeStatusSchema.default('ACTIVE'),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const adminCourierServiceUpdateSchema = adminCourierServiceCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one courier service field is required' })

export const adminMerchantCourierServiceUpsertSchema = z.object({
  merchant_id: idSchema,
  courier_service_id: idSchema,
  origin_id: idSchema.optional(),
  status: activeStatusSchema.default('ACTIVE'),
})

export const adminApiKeyCreateSchema = z.object({
  merchant_id: idSchema,
  label: z.string().trim().min(1).max(120).optional(),
  expires_at: dateStringSchema.optional(),
})

export const adminApiKeyUpdateSchema = z
  .object({
    label: z.string().trim().min(1).max(120).optional(),
    expires_at: dateStringSchema.nullable().optional(),
    is_active: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one API key field is required' })

export const adminWebhookEndpointCreateSchema = z.object({
  merchant_id: idSchema,
  url: z.string().trim().url().refine((value) => value.startsWith('https://'), {
    message: 'Webhook URL must use HTTPS',
  }),
  secret: z.string().min(16).max(256),
  is_active: z.boolean().default(true),
})

export const adminWebhookEndpointUpdateSchema = adminWebhookEndpointCreateSchema
  .omit({ merchant_id: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one webhook endpoint field is required' })

export const adminShipmentListQuerySchema = adminPaginationSchema.extend({
  merchant_id: idSchema.optional(),
  status: shipmentStatusSchema.optional(),
  courier: courierCodeSchema.optional(),
  external_order_id: z.string().trim().min(1).max(64).optional(),
  waybill_id: z.string().trim().min(1).max(64).optional(),
})

export const adminWebhookRelayListQuerySchema = adminPaginationSchema.extend({
  merchant_id: idSchema.optional(),
  endpoint_id: idSchema.optional(),
  event_id: idSchema.optional(),
  status: webhookRelayStatusSchema.optional(),
})

export const adminAuditLogListQuerySchema = adminPaginationSchema.extend({
  method: z.enum(['POST', 'PUT', 'PATCH', 'DELETE']).optional(),
  path: z.string().trim().min(1).max(255).optional(),
  status_min: z.coerce.number().int().min(100).max(599).optional(),
  status_max: z.coerce.number().int().min(100).max(599).optional(),
})

export type AdminMerchantCreateInput = z.infer<typeof adminMerchantCreateSchema>
export type AdminMerchantUpdateInput = z.infer<typeof adminMerchantUpdateSchema>
export type AdminStoreCreateInput = z.infer<typeof adminStoreCreateSchema>
export type AdminStoreUpdateInput = z.infer<typeof adminStoreUpdateSchema>
export type AdminOriginCreateInput = z.infer<typeof adminOriginCreateSchema>
export type AdminOriginUpdateInput = z.infer<typeof adminOriginUpdateSchema>
export type AdminCourierServiceCreateInput = z.infer<typeof adminCourierServiceCreateSchema>
export type AdminCourierServiceUpdateInput = z.infer<typeof adminCourierServiceUpdateSchema>
export type AdminMerchantCourierServiceUpsertInput = z.infer<typeof adminMerchantCourierServiceUpsertSchema>
export type AdminApiKeyCreateInput = z.infer<typeof adminApiKeyCreateSchema>
export type AdminApiKeyUpdateInput = z.infer<typeof adminApiKeyUpdateSchema>
export type AdminWebhookEndpointCreateInput = z.infer<typeof adminWebhookEndpointCreateSchema>
export type AdminWebhookEndpointUpdateInput = z.infer<typeof adminWebhookEndpointUpdateSchema>
export type AdminShipmentListQuery = z.infer<typeof adminShipmentListQuerySchema>
export type AdminWebhookRelayListQuery = z.infer<typeof adminWebhookRelayListQuerySchema>
export type AdminAuditLogListQuery = z.infer<typeof adminAuditLogListQuerySchema>

import type { Hono } from 'hono'
import type { DestinationMappingRepository, DestinationMappingRecord, OriginMappingRecord, ProviderOriginCatalogRecord } from '../../repositories/destination-mapping.repository.js'
import { adminDestinationMappingCreateSchema, adminDestinationMappingListQuerySchema, adminDestinationMappingUpdateSchema, adminOriginMappingUpsertSchema, adminProviderOriginCatalogSearchQuerySchema } from '../../schemas/admin.js'
import { parseJson, parseQuery } from './helpers.js'

export function mountAdminDestinationMappingRoutes(app: Hono, mappingsRepository: DestinationMappingRepository): void {
  app.get('/admin/provider-origins', async (c) => {
    const query = parseQuery(c, adminProviderOriginCatalogSearchQuerySchema)
    const origins = await mappingsRepository.searchProviderOrigins({
      courier: query.courier,
      search: query.search,
      isActive: query.is_active,
      limit: query.limit,
      offset: query.offset,
    })
    return c.json({ origins: origins.map(toProviderOriginDto) })
  })

  app.get('/admin/merchants/:merchantId/destination-mappings', async (c) => {
    const query = parseQuery(c, adminDestinationMappingListQuerySchema)
    const merchantId = c.req.param('merchantId')
    const [result, total] = await Promise.all([
      mappingsRepository.list({
        merchantId,
        courier: query.courier,
        isActive: query.is_active,
        limit: query.limit,
        offset: query.offset,
      }),
      mappingsRepository.count({
        merchantId,
        courier: query.courier,
        isActive: query.is_active,
      }),
    ])
    return c.json({ mappings: result.map(toDto), total })
  })

  app.post('/admin/merchants/:merchantId/destination-mappings', async (c) => {
    const body = await c.req.json()
    const input = adminDestinationMappingCreateSchema.parse({ ...body, merchant_id: c.req.param('merchantId') })
    const mapping = await mappingsRepository.create({
      merchant_id: input.merchant_id,
      courier: input.courier,
      country: input.country,
      province: input.province,
      city: input.city,
      district: input.district,
      subdistrict: input.subdistrict,
      postalCode: input.postal_code,
      provider_code: input.provider_code,
      label: input.label,
      is_active: input.is_active,
    })
    return c.json({ mapping: toDto(mapping) }, 201)
  })


  app.get('/admin/merchants/:merchantId/origins/:originId/mappings', async (c) => {
    const mappings = await mappingsRepository.listOriginMappings(c.req.param('merchantId'), c.req.param('originId'))
    return c.json({ mappings: mappings.map(toOriginMappingDto) })
  })

  app.post('/admin/merchants/:merchantId/origins/:originId/mappings', async (c) => {
    const body = await c.req.json()
    const input = adminOriginMappingUpsertSchema.parse({ ...body, merchant_id: c.req.param('merchantId'), origin_id: c.req.param('originId') })
    const mapping = await mappingsRepository.upsertOriginMapping({
      merchant_id: input.merchant_id,
      origin_id: input.origin_id,
      courier: input.courier,
      provider_code: input.provider_code,
      label: input.label,
      is_active: input.is_active,
    })
    return c.json({ mapping: toOriginMappingDto(mapping) }, 201)
  })

  app.patch('/admin/destination-mappings/:mappingId', async (c) => {
    const input = await parseJson(c, adminDestinationMappingUpdateSchema)
    const mapping = await mappingsRepository.update(c.req.param('mappingId'), {
      country: input.country,
      province: input.province,
      city: input.city,
      district: input.district,
      subdistrict: input.subdistrict,
      postalCode: input.postal_code,
      provider_code: input.provider_code,
      label: input.label,
      is_active: input.is_active,
    })
    return c.json({ mapping: toDto(mapping) })
  })
}

function toDto(mapping: DestinationMappingRecord) {
  return {
    id: mapping.id,
    merchantId: mapping.merchantId,
    courier: mapping.courier,
    country: mapping.country,
    province: mapping.province,
    city: mapping.city,
    district: mapping.district,
    subdistrict: mapping.subdistrict,
    postalCode: mapping.postalCode,
    providerCode: mapping.providerCode,
    label: mapping.label,
    isActive: mapping.isActive,
    createdAt: mapping.createdAt.toISOString(),
    updatedAt: mapping.updatedAt.toISOString(),
  }
}

function toOriginMappingDto(mapping: OriginMappingRecord) {
  return {
    id: mapping.id,
    merchantId: mapping.merchantId,
    originId: mapping.originId,
    courier: mapping.courier,
    providerCode: mapping.providerCode,
    label: mapping.label,
    isActive: mapping.isActive,
    createdAt: mapping.createdAt.toISOString(),
    updatedAt: mapping.updatedAt.toISOString(),
  }
}

function toProviderOriginDto(origin: ProviderOriginCatalogRecord) {
  return {
    id: origin.id,
    courier: origin.courier,
    country: origin.country,
    province: origin.province,
    city: origin.city,
    district: origin.district,
    subdistrict: origin.subdistrict,
    postalCode: origin.postalCode,
    providerCode: origin.providerCode,
    branchCode: origin.branchCode,
    label: origin.label,
    sourceKey: origin.sourceKey,
    isActive: origin.isActive,
    createdAt: origin.createdAt.toISOString(),
    updatedAt: origin.updatedAt.toISOString(),
  }
}

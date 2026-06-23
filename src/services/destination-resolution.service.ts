import type { CourierCode } from '../couriers/types.js'
import type { RateRequest, RateResolveRequest } from '../schemas/api.js'
import type { DestinationMappingRecord, DestinationMappingRepository, DestinationLookupInput, OriginResolutionRecord } from '../repositories/destination-mapping.repository.js'
import type { RateService } from './rate.service.js'
import { HttpError } from '../utils/http-error.js'

export interface CourierResolveError {
  courier: CourierCode
  code: string
  message: string
}

export interface RateResolveResponse {
  origin: {
    id: string
    code: string
    name: string
  }
  destination: {
    input: RateResolveRequest['destination']
    mappings: Array<{
      courier: CourierCode
      providerCode: string
      mappingId: string | null
    }>
  }
  rates: Awaited<ReturnType<RateService['getRates']>>
  errors?: CourierResolveError[]
}

export class DestinationResolutionService {
  constructor(
    private readonly mappings: DestinationMappingRepository,
    private readonly rates: RateService
  ) { }

  async resolveRates(merchantId: string, input: RateResolveRequest): Promise<RateResolveResponse> {
    const origin = await this.mappings.findActiveOriginForMerchant(merchantId, input.origin_id)
    if (!origin) throw new HttpError(404, 'Origin not found or inactive', 'ORIGIN_NOT_FOUND')

    const couriers = (input.couriers?.length ? input.couriers : ['MOCK']) as CourierCode[]

    const settled = await Promise.allSettled(couriers.map(async (courier) => {
      const dest = await this.resolveDestination(merchantId, courier, input.destination)
      const originCode = await this.resolveOriginCode(merchantId, origin.id, origin.code, courier)
      const rates = await this.rates.getRates({
        origin_code: originCode,
        dest_code: dest.providerCode,
        weight_grams: input.weight_grams,
        is_cod: input.is_cod,
        goods_value_idr: input.goods_value_idr,
        couriers: [courier],
      } satisfies RateRequest)
      return { courier, dest, rates }
    }))

    const successMappings: RateResolveResponse['destination']['mappings'] = []
    const successRates: RateResolveResponse['rates'] = []
    const errors: CourierResolveError[] = []

    for (const [index, result] of settled.entries()) {
      const courier = (couriers[index] ?? 'MOCK') as CourierCode
      if (result.status === 'fulfilled') {
        const { dest, rates } = result.value
        successMappings.push({ courier, providerCode: dest.providerCode, mappingId: dest.mapping?.id ?? null })
        successRates.push(...rates)
      } else {
        const reason: unknown = result.reason
        const code = reason instanceof HttpError ? reason.code : 'COURIER_ERROR'
        const message = reason instanceof Error ? reason.message : `${courier} rate resolution failed`
        errors.push({ courier, code, message })
      }
    }

    if (successRates.length === 0) {
      const first = errors[0]
      const isAllNotFound = errors.every((e) => e.code === 'DESTINATION_MAPPING_NOT_FOUND' || e.code === 'ORIGIN_MAPPING_NOT_FOUND')
      throw new HttpError(
        isAllNotFound ? 422 : 502,
        first?.message ?? 'All couriers failed to resolve rates',
        first?.code ?? 'ALL_COURIERS_FAILED'
      )
    }

    return {
      origin: toOriginDto(origin),
      destination: {
        input: input.destination,
        mappings: successMappings,
      },
      rates: successRates.sort((left, right) => left.priceIdr - right.priceIdr || left.courier.localeCompare(right.courier)),
      ...(errors.length > 0 && { errors }),
    }
  }

  private async resolveOriginCode(merchantId: string, originId: string, fallbackOriginCode: string, courier: CourierCode): Promise<string> {
    if (courier === 'MOCK') return fallbackOriginCode

    const providerCode = await this.mappings.resolveOriginCode(merchantId, originId, courier)
    if (!providerCode) throw new HttpError(422, `Origin mapping not found for ${courier}`, 'ORIGIN_MAPPING_NOT_FOUND')
    return providerCode
  }

  private async resolveDestination(merchantId: string, courier: CourierCode, destination: RateResolveRequest['destination']): Promise<{
    courier: CourierCode
    providerCode: string
    mapping: DestinationMappingRecord | null
  }> {
    if (courier === 'MOCK') {
      return { courier, providerCode: destination.postal_code ?? destination.city ?? destination.subdistrict ?? 'MOCK_DEST', mapping: null }
    }

    const lookup: DestinationLookupInput = {
      postalCode: destination.postal_code,
      province: destination.province,
      city: destination.city,
      district: destination.district,
      subdistrict: destination.subdistrict,
    }
    const mapping = await this.mappings.resolve(merchantId, courier, lookup)
    if (!mapping) throw new HttpError(422, `Destination mapping not found for ${courier}`, 'DESTINATION_MAPPING_NOT_FOUND')
    return { courier, providerCode: mapping.providerCode, mapping }
  }
}

function toOriginDto(origin: OriginResolutionRecord): RateResolveResponse['origin'] {
  return { id: origin.id, code: origin.code, name: origin.name }
}

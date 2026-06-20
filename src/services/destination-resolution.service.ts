import type { CourierCode } from '../couriers/types.js'
import type { RateRequest, RateResolveRequest } from '../schemas/api.js'
import type { DestinationMappingRecord, DestinationMappingRepository, DestinationLookupInput, OriginResolutionRecord } from '../repositories/destination-mapping.repository.js'
import type { RateService } from './rate.service.js'
import { HttpError } from '../utils/http-error.js'

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
}

export class DestinationResolutionService {
  constructor(
    private readonly mappings: DestinationMappingRepository,
    private readonly rates: RateService
  ) {}

  async resolveRates(merchantId: string, input: RateResolveRequest): Promise<RateResolveResponse> {
    const origin = await this.mappings.findActiveOriginForMerchant(merchantId, input.origin_id)
    if (!origin) throw new HttpError(404, 'Origin not found or inactive', 'ORIGIN_NOT_FOUND')

    const couriers = (input.couriers?.length ? input.couriers : ['MOCK']) as CourierCode[]
    const resolved = await Promise.all(couriers.map((courier) => this.resolveDestination(merchantId, courier, input.destination)))
    const rateGroups = await Promise.all(resolved.map((item) => this.rates.getRates({
      origin_code: origin.code,
      dest_code: item.providerCode,
      weight_grams: input.weight_grams,
      couriers: [item.courier],
    } satisfies RateRequest)))

    return {
      origin: toOriginDto(origin),
      destination: {
        input: input.destination,
        mappings: resolved.map((item) => ({ courier: item.courier, providerCode: item.providerCode, mappingId: item.mapping?.id ?? null })),
      },
      rates: rateGroups.flat().sort((left, right) => left.priceIdr - right.priceIdr || left.courier.localeCompare(right.courier)),
    }
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

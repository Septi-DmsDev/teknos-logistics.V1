import type { CourierCode, CourierRate } from '../couriers/types.js'
import type { ProviderRegistry } from '../couriers/registry.js'
import type { RateCacheRepository } from '../repositories/rate-cache.repository.js'
import type { RateRequest } from '../schemas/api.js'

export class RateService {
  constructor(
    private readonly registry: ProviderRegistry,
    private readonly cache: RateCacheRepository,
    private readonly ttlMs = 60_000
  ) { }

  async getRates(input: RateRequest): Promise<CourierRate[]> {
    const couriers = (input.couriers?.length ? input.couriers : ['MOCK']) as CourierCode[]
    const groups = await Promise.all(couriers.map((courier) => this.getCourierRates(courier, input)))
    return groups.flat().sort((left, right) => left.priceIdr - right.priceIdr || left.courier.localeCompare(right.courier))
  }

  private async getCourierRates(courier: CourierCode, input: RateRequest): Promise<CourierRate[]> {
    const cached = !input.is_cod
      ? await this.cache.get({ courier, originCode: input.origin_code, destCode: input.dest_code, weightGrams: input.weight_grams })
      : null
    if (cached) return cached

    const provider = this.registry.get(courier)
    const rates = await provider.getRates({ originCode: input.origin_code, destCode: input.dest_code, weightGrams: input.weight_grams, isCod: input.is_cod, goodsValueIdr: input.goods_value_idr })
    if (!input.is_cod) {
      await this.cache.set({ courier, originCode: input.origin_code, destCode: input.dest_code, weightGrams: input.weight_grams, rates, ttlMs: this.ttlMs })
    }
    return rates
  }
}

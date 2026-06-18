import type { CourierCode, LogisticsProvider } from './types.js'
import { HttpError } from '../utils/http-error.js'

export class ProviderRegistry {
  private readonly providers = new Map<CourierCode, LogisticsProvider>()

  constructor(providers: LogisticsProvider[]) {
    for (const provider of providers) {
      if (this.providers.has(provider.courier)) throw new Error(`Duplicate provider: ${provider.courier}`)
      this.providers.set(provider.courier, provider)
    }
  }

  get(courier: CourierCode): LogisticsProvider {
    const provider = this.providers.get(courier)
    if (!provider) throw new HttpError(400, `Unsupported courier: ${courier}`, 'UNSUPPORTED_COURIER')
    return provider
  }

  selected(couriers?: CourierCode[]): LogisticsProvider[] {
    if (!couriers || couriers.length === 0) return [...this.providers.values()]
    return couriers.map((courier) => this.get(courier))
  }
}

import { loadEnv } from '../src/config/env.js'
import { JneAdapter } from '../src/couriers/jne/jne.adapter.js'
import { loadLocalEnv, parseArgs } from './env.js'

loadLocalEnv()
const args = parseArgs(process.argv.slice(2))

if (process.env.LOGISTICS_PROVIDER !== 'jne' && args['force-jne'] !== true) {
  throw new Error('Set LOGISTICS_PROVIDER=jne in .env.local or run npm run smoke:jne:rates -- --force-jne')
}

const originalProvider = process.env.LOGISTICS_PROVIDER
process.env.LOGISTICS_PROVIDER = 'jne'

try {
  const originCode = process.env.JNE_ORIGIN_CODE?.trim()
  const destCode = process.env.JNE_SMOKE_DEST_CODE?.trim()
  if (!originCode) throw new Error('JNE_ORIGIN_CODE missing in .env.local')
  if (!destCode) throw new Error('JNE_SMOKE_DEST_CODE missing in .env.local for non-mutating tariff smoke')

  const adapter = new JneAdapter(loadEnv())
  const rates = await adapter.getRates({ originCode, destCode, weightGrams: 1000 })
  if (rates.length === 0) {
    throw new Error('JNE tariff smoke returned zero rates')
  }

  console.log(JSON.stringify({
    ok: true,
    operation: 'tariff-only',
    ratesCount: rates.length,
    firstService: rates[0]?.serviceCode ?? null,
  }, null, 2))
} finally {
  process.env.LOGISTICS_PROVIDER = originalProvider
}

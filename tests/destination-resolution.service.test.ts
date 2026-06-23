import assert from 'node:assert/strict'
import test from 'node:test'

import { DestinationResolutionService } from '../src/services/destination-resolution.service.js'
import { HttpError } from '../src/utils/http-error.js'

// Minimal stubs
const origin = { id: 'origin-1', code: 'ORIGIN_CODE', name: 'Gudang Utama', merchantId: 'merchant-1' }

const destMappingJne = { id: 'dm-jne', providerCode: 'CGK10000', courier: 'JNE', province: null, city: null, district: null, subdistrict: null, postalCode: null, sourceKey: null, label: null, isActive: true, merchantId: 'merchant-1', country: 'ID', createdAt: new Date(), updatedAt: new Date() }

function makeMappingRepo({
  jne = destMappingJne as typeof destMappingJne | null,
  sap = null as typeof destMappingJne | null,
  originCode = 'MJK10000',
  sapOriginCode = 'JI1608' as string | null,
} = {}) {
  return {
    findActiveOriginForMerchant: async () => origin,
    resolve: async (_merchantId: string, courier: string) => {
      if (courier === 'JNE') return jne
      if (courier === 'SAP_EXPRESS') return sap ? { ...sap, courier: 'SAP_EXPRESS' } : null
      return null
    },
    resolveOriginCode: async (_merchantId: string, _originId: string, courier: string) => {
      if (courier === 'JNE') return originCode
      if (courier === 'SAP_EXPRESS') return sapOriginCode
      return null
    },
  } as never
}

function makeRateService(ratesByOriginCode: Record<string, Array<{ courier: string; serviceCode: string; serviceName: string; priceIdr: number; etd: string; cached: boolean }>> = {}) {
  return {
    getRates: async (input: { origin_code: string; couriers?: string[] }) => {
      return ratesByOriginCode[input.origin_code] ?? []
    },
  } as never
}

const baseInput = {
  origin_id: 'origin-1',
  destination: { city: 'JAKARTA', province: 'DKI JAKARTA' },
  weight_grams: 1000,
  couriers: ['JNE', 'SAP_EXPRESS'] as never,
}

test('returns rates from both couriers when both succeed', async () => {
  const jneRates = [{ courier: 'JNE', serviceCode: 'REG', serviceName: 'REG', priceIdr: 20000, etd: '2-3 hari', cached: false }]
  const sapRates = [{ courier: 'SAP_EXPRESS', serviceCode: 'UDRREG', serviceName: 'SATRIA REG', priceIdr: 18000, etd: '3-5 hari', cached: false }]

  const service = new DestinationResolutionService(
    makeMappingRepo({ sap: destMappingJne }),
    makeRateService({ MJK10000: jneRates, JI1608: sapRates })
  )

  const result = await service.resolveRates('merchant-1', baseInput)
  assert.equal(result.rates.length, 2)
  assert.equal(result.rates[0]!.priceIdr, 18000, 'SAP cheaper rate first')
  assert.equal(result.rates[1]!.priceIdr, 20000)
  assert.equal(result.errors, undefined, 'no errors when both succeed')
  assert.equal(result.destination.mappings.length, 2)
})

test('returns JNE rates and SAP error when SAP destination mapping not found', async () => {
  const jneRates = [{ courier: 'JNE', serviceCode: 'REG', serviceName: 'REG', priceIdr: 20000, etd: '2-3 hari', cached: false }]

  const service = new DestinationResolutionService(
    makeMappingRepo({ sap: null }), // SAP mapping missing
    makeRateService({ MJK10000: jneRates })
  )

  const result = await service.resolveRates('merchant-1', baseInput)
  assert.equal(result.rates.length, 1)
  assert.equal(result.rates[0]!.courier, 'JNE')
  assert.ok(Array.isArray(result.errors), 'errors array present')
  assert.equal(result.errors!.length, 1)
  assert.equal(result.errors![0]!.courier, 'SAP_EXPRESS')
  assert.equal(result.errors![0]!.code, 'DESTINATION_MAPPING_NOT_FOUND')
  assert.equal(result.destination.mappings.length, 1, 'only JNE mapping in response')
})

test('returns SAP rates and JNE error when JNE origin mapping not found', async () => {
  const sapRates = [{ courier: 'SAP_EXPRESS', serviceCode: 'UDRREG', serviceName: 'SATRIA REG', priceIdr: 18000, etd: '3-5 hari', cached: false }]

  const service = new DestinationResolutionService(
    makeMappingRepo({ jne: destMappingJne, sap: destMappingJne, originCode: '' as never, sapOriginCode: 'JI1608' }),
    makeRateService({ JI1608: sapRates })
  )

  // JNE origin code resolves to empty string — simulate by patching repo
  const repo = {
    findActiveOriginForMerchant: async () => origin,
    resolve: async (_m: string, courier: string) => courier === 'JNE' ? destMappingJne : { ...destMappingJne, courier: 'SAP_EXPRESS' },
    resolveOriginCode: async (_m: string, _o: string, courier: string) => {
      if (courier === 'JNE') return null // missing JNE origin mapping
      if (courier === 'SAP_EXPRESS') return 'JI1608'
      return null
    },
  } as never

  const result = await new DestinationResolutionService(repo, makeRateService({ JI1608: sapRates }))
    .resolveRates('merchant-1', baseInput)

  assert.equal(result.rates.length, 1)
  assert.equal(result.rates[0]!.courier, 'SAP_EXPRESS')
  assert.equal(result.errors!.length, 1)
  assert.equal(result.errors![0]!.courier, 'JNE')
  assert.equal(result.errors![0]!.code, 'ORIGIN_MAPPING_NOT_FOUND')
})

test('throws 422 when all couriers fail due to missing destination mapping', async () => {
  const service = new DestinationResolutionService(
    makeMappingRepo({ jne: null, sap: null }),
    makeRateService()
  )

  await assert.rejects(
    () => service.resolveRates('merchant-1', baseInput),
    (err) => {
      assert.ok(err instanceof HttpError)
      assert.equal(err.status, 422)
      return true
    }
  )
})

test('throws 502 when all couriers fail due to upstream API error', async () => {
  const repo = {
    findActiveOriginForMerchant: async () => origin,
    resolve: async (_m: string, courier: string) => ({ ...destMappingJne, courier }),
    resolveOriginCode: async (_m: string, _o: string, courier: string) => courier === 'JNE' ? 'MJK10000' : 'JI1608',
  } as never

  const rateService = {
    getRates: async () => { throw new Error('Upstream API timeout') },
  } as never

  await assert.rejects(
    () => new DestinationResolutionService(repo, rateService).resolveRates('merchant-1', baseInput),
    (err) => {
      assert.ok(err instanceof HttpError)
      assert.equal(err.status, 502)
      return true
    }
  )
})

test('throws 404 when origin not found', async () => {
  const repo = {
    findActiveOriginForMerchant: async () => null,
  } as never

  await assert.rejects(
    () => new DestinationResolutionService(repo, makeRateService()).resolveRates('merchant-1', baseInput),
    (err) => {
      assert.ok(err instanceof HttpError)
      assert.equal(err.status, 404)
      assert.equal(err.code, 'ORIGIN_NOT_FOUND')
      return true
    }
  )
})

test('falls back to MOCK provider code when courier is MOCK', async () => {
  const mockRates = [{ courier: 'MOCK', serviceCode: 'MOCK', serviceName: 'Mock', priceIdr: 10000, etd: '1 hari', cached: false }]
  const mockInput = { ...baseInput, couriers: ['MOCK'] as never }

  const service = new DestinationResolutionService(
    makeMappingRepo(),
    makeRateService({ ORIGIN_CODE: mockRates })
  )

  const result = await service.resolveRates('merchant-1', mockInput)
  assert.equal(result.rates.length, 1)
  assert.equal(result.errors, undefined)
})

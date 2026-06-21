import assert from 'node:assert/strict'
import test from 'node:test'

import { DestinationMappingRepository } from '../src/repositories/destination-mapping.repository.js'

const wrongRecentCandidate = {
  id: 'wrong',
  merchantId: 'merchant-1',
  courier: 'JNE',
  country: 'ID',
  province: 'DKI JAKARTA',
  city: 'JAKARTA PUSAT',
  district: 'GAMBIR',
  subdistrict: 'OTHER AREA',
  postalCode: '10150',
  providerCode: 'CGK10308',
  label: null,
  isActive: true,
  createdAt: new Date('2026-06-21T00:00:00Z'),
  updatedAt: new Date('2026-06-21T00:00:00Z'),
}

const exactMatch = {
  ...wrongRecentCandidate,
  id: 'exact',
  subdistrict: 'CIDENG',
  providerCode: 'CGK10302',
}

test('resolve prefers full-address exact match before broad postal candidates', async () => {
  const prisma = {
    destinationMapping: {
      findFirst: async () => exactMatch,
      findMany: async () => [wrongRecentCandidate],
    },
  }
  const repository = new DestinationMappingRepository(prisma as never)

  const resolved = await repository.resolve('merchant-1', 'JNE', {
    postalCode: '10150',
    province: 'DKI Jakarta',
    city: 'Jakarta Pusat',
    district: 'Gambir',
    subdistrict: 'Cideng',
  })

  assert.equal(resolved?.providerCode, 'CGK10302')
})

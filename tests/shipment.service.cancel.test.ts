import test from 'node:test'
import assert from 'node:assert/strict'
import type { CancelShipmentResult } from '../src/couriers/types.js'
import type { ShipmentRecord, ShipmentWithTracking } from '../src/repositories/shipment.repository.js'
import { ShipmentService } from '../src/services/shipment.service.js'
import { HttpError } from '../src/utils/http-error.js'

// Minimal stub matching ShipmentRecord
function makeShipment(overrides: Partial<ShipmentRecord> = {}): ShipmentRecord {
  return {
    id: 'ship-001',
    merchantId: 'merchant-001',
    externalOrderId: 'order-001',
    courier: 'SAP_EXPRESS',
    status: 'BOOKED',
    waybillId: 'JSA111',
    serviceCode: 'REG',
    serviceName: 'Regular',
    originCode: 'JI01',
    destCode: 'JK01',
    weightGrams: 500,
    rateIdr: 15000,
    bookedAt: new Date(),
    deliveredAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeShipmentWithTracking(overrides: Partial<ShipmentRecord> = {}): ShipmentWithTracking {
  return { ...makeShipment(overrides), tracking: [] } as unknown as ShipmentWithTracking
}

function makeRegistry(cancelResult: CancelShipmentResult | 'no-method') {
  const provider = cancelResult === 'no-method'
    ? { courier: 'JNE' as const, capabilities: undefined, getRates: async () => [], bookShipment: async () => ({ courier: 'JNE' as const, courierOrderId: '', waybillId: '', status: 'BOOKED' as const }), trackShipment: async () => [], normalizeWebhook: () => null }
    : { ...{ courier: 'SAP_EXPRESS' as const, capabilities: undefined, getRates: async () => [], bookShipment: async () => ({ courier: 'SAP_EXPRESS' as const, courierOrderId: '', waybillId: '', status: 'BOOKED' as const }), trackShipment: async () => [], normalizeWebhook: () => null }, cancelShipment: async () => cancelResult }

  return {
    get: () => provider,
    selected: () => [provider],
  }
}

test('cancelShipment throws 404 when shipment not found', async () => {
  const shipments = { findByMerchantAndId: async () => null, markCancelled: async () => makeShipment() } as never
  const service = new ShipmentService(makeRegistry('no-method') as never, shipments, {} as never)

  await assert.rejects(
    () => service.cancelShipment('merchant-001', 'ship-999'),
    (err: unknown) => { assert.ok(err instanceof HttpError); assert.equal((err as HttpError).status, 404); return true }
  )
})

test('cancelShipment throws 409 when shipment status is PICKED_UP', async () => {
  const shipment = makeShipmentWithTracking({ status: 'PICKED_UP' })
  const shipments = { findByMerchantAndId: async () => shipment, markCancelled: async () => makeShipment() } as never
  const service = new ShipmentService(makeRegistry('no-method') as never, shipments, {} as never)

  await assert.rejects(
    () => service.cancelShipment('merchant-001', 'ship-001'),
    (err: unknown) => { assert.ok(err instanceof HttpError); assert.equal((err as HttpError).status, 409); return true }
  )
})

test('cancelShipment calls markCancelled and returns CANCELLED for SAP', async () => {
  const shipment = makeShipmentWithTracking({ courier: 'SAP_EXPRESS', waybillId: 'JSA111' })
  let markCalledWith = ''
  const shipments = {
    findByMerchantAndId: async () => shipment,
    markCancelled: async (id: string) => { markCalledWith = id; return makeShipment({ status: 'CANCELLED' }) },
  } as never
  const cancelResult: CancelShipmentResult = { status: 'CANCELLED', waybillId: 'JSA111', message: 'ok' }
  const service = new ShipmentService(makeRegistry(cancelResult) as never, shipments, {} as never)

  const result = await service.cancelShipment('merchant-001', 'ship-001')

  assert.equal(result.status, 'CANCELLED')
  assert.equal(markCalledWith, 'ship-001')
})

test('cancelShipment does NOT call markCancelled and returns MANUAL_REQUIRED for JNE', async () => {
  const shipment = makeShipmentWithTracking({ courier: 'JNE', waybillId: '4073272600000045' })
  let markCalled = false
  const shipments = {
    findByMerchantAndId: async () => shipment,
    markCancelled: async () => { markCalled = true; return makeShipment() },
  } as never
  const jneProvider = {
    courier: 'JNE' as const,
    capabilities: undefined,
    getRates: async () => [] as never,
    bookShipment: async () => ({ courier: 'JNE' as const, courierOrderId: '', waybillId: '', status: 'BOOKED' as const }),
    trackShipment: async () => [] as never,
    normalizeWebhook: () => null,
    cancelShipment: async (): Promise<CancelShipmentResult> => ({
      status: 'MANUAL_REQUIRED',
      waybillId: '4073272600000045',
      message: 'Hubungi JNE pusat',
    }),
  }
  const registry = { get: () => jneProvider, selected: () => [jneProvider] }
  const service = new ShipmentService(registry as never, shipments, {} as never)

  const result = await service.cancelShipment('merchant-001', 'ship-001')

  assert.equal(result.status, 'MANUAL_REQUIRED')
  assert.equal(markCalled, false, 'markCancelled must NOT be called for MANUAL_REQUIRED')
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { mapSapExpressStatus } from '../../src/couriers/sap-express/sap-express.normalizer.js'

test('SAP Express maps delivered status', () => {
  assert.equal(mapSapExpressStatus('POD - DELIVERED'), 'DELIVERED')
})

test('SAP Express maps transit statuses', () => {
  assert.equal(mapSapExpressStatus('MANIFEST OUTGOING'), 'IN_TRANSIT')
  assert.equal(mapSapExpressStatus('OUTGOING SMU'), 'IN_TRANSIT')
  assert.equal(mapSapExpressStatus('INCOMING'), 'IN_TRANSIT')
})

test('SAP Express maps out for delivery status with trimming', () => {
  assert.equal(mapSapExpressStatus('DELIVERY '), 'OUT_FOR_DELIVERY')
})

test('SAP Express maps returned statuses', () => {
  assert.equal(mapSapExpressStatus('OUTGOING RETURN'), 'RETURNED')
  assert.equal(mapSapExpressStatus('INCOMING RETURN'), 'RETURNED')
  assert.equal(mapSapExpressStatus('DELIVERY RETURN'), 'RETURNED')
  assert.equal(mapSapExpressStatus('SHIPMENT RETURN TO CLIENT'), 'RETURNED')
})

test('SAP Express maps failed status', () => {
  assert.equal(mapSapExpressStatus('POD - UNDELIVERED'), 'FAILED')
})

test('SAP Express maps booked and picked up statuses', () => {
  assert.equal(mapSapExpressStatus('ENTRI (SEDANG DI PICKUP)'), 'BOOKED')
  assert.equal(mapSapExpressStatus('ENTRI VERIFIED'), 'BOOKED')
  assert.equal(mapSapExpressStatus('PICKED UP'), 'PICKED_UP')
})

test('SAP Express maps cancel statuses', () => {
  assert.equal(mapSapExpressStatus('VOID'), 'CANCELLED')
  assert.equal(mapSapExpressStatus('VOID_PICKUP'), 'CANCELLED')
})

test('SAP Express defaults unknown and empty statuses to in transit', () => {
  assert.equal(mapSapExpressStatus('UNKNOWN STATUS'), 'IN_TRANSIT')
  assert.equal(mapSapExpressStatus(''), 'IN_TRANSIT')
  assert.equal(mapSapExpressStatus(undefined), 'IN_TRANSIT')
})

import type { ShipmentStatus } from '../types.js'

export function mapSapExpressStatus(input: string | undefined): ShipmentStatus {
  const normalized = (input ?? '').trim().toUpperCase()
  if (['DELIVERED', 'POD', 'RECEIVED', 'SUCCESS'].includes(normalized)) return 'DELIVERED'
  if (['PICKED_UP', 'PICKUP', 'MANIFEST'].includes(normalized)) return 'PICKED_UP'
  if (['OUT_FOR_DELIVERY', 'DELIVERY', 'COURIER'].includes(normalized)) return 'OUT_FOR_DELIVERY'
  if (['RETURNED', 'RETURN', 'RETUR'].includes(normalized)) return 'RETURNED'
  if (['FAILED', 'UNDELIVERED', 'HOLD'].includes(normalized)) return 'FAILED'
  if (['BOOKED', 'CREATED', 'ENTRY'].includes(normalized)) return 'BOOKED'
  return 'IN_TRANSIT'
}

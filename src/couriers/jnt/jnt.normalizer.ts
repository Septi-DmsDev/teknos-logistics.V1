import type { ShipmentStatus } from '../types.js'

export function mapJntStatus(input: string | undefined): ShipmentStatus {
  const normalized = (input ?? '').trim().toUpperCase()
  if (['DELIVERED', 'POD', 'SIGNED', 'RECEIVED'].includes(normalized)) return 'DELIVERED'
  if (['PICKED_UP', 'PICKUP', 'PICKED'].includes(normalized)) return 'PICKED_UP'
  if (['DELIVERING', 'OUT_FOR_DELIVERY', 'WITH_COURIER'].includes(normalized)) return 'OUT_FOR_DELIVERY'
  if (['RETURNED', 'RETURN', 'RTS'].includes(normalized)) return 'RETURNED'
  if (['FAILED', 'UNDELIVERED', 'PROBLEM'].includes(normalized)) return 'FAILED'
  if (['CREATED', 'ORDER_CREATED', 'MANIFESTED'].includes(normalized)) return 'BOOKED'
  return 'IN_TRANSIT'
}

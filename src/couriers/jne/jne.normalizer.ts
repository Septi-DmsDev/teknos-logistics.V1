import type { ShipmentStatus } from '../types.js'

export function mapJneStatus(input: string | undefined): ShipmentStatus {
  const normalized = (input ?? '').trim().toUpperCase()
  if (['DELIVERED', 'D', 'POD', 'RECEIVED'].includes(normalized)) return 'DELIVERED'
  if (['PICKED_UP', 'PICKUP', 'PU'].includes(normalized)) return 'PICKED_UP'
  if (['OUT_FOR_DELIVERY', 'WITH COURIER', 'ANTAR'].includes(normalized)) return 'OUT_FOR_DELIVERY'
  if (['RETURNED', 'RETUR', 'RETURN'].includes(normalized)) return 'RETURNED'
  if (['FAILED', 'UNDELIVERED', 'BAD ADDRESS'].includes(normalized)) return 'FAILED'
  if (['BOOKED', 'MANIFESTED'].includes(normalized)) return 'BOOKED'
  return 'IN_TRANSIT'
}

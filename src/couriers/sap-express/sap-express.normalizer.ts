import type { ShipmentStatus } from '../types.js'

// rowstate_name values confirmed from SAP Express API v2.5.0 + sandbox test 2026-06-20
const SAP_STATUS_MAP: Record<string, ShipmentStatus> = {
  'ENTRI (SEDANG DI PICKUP)':    'BOOKED',
  'ENTRI (PENDING PICKUP)':      'BOOKED',
  'ENTRI (SEDANG PICKUP ULANG)': 'BOOKED',
  'ENTRI VERIFIED':              'BOOKED',
  'PICKED UP':                   'PICKED_UP',
  'VOID':                        'CANCELLED',
  'VOID_PICKUP':                 'CANCELLED',
  'MANIFEST OUTGOING':           'IN_TRANSIT',
  'OUTGOING SMU':                'IN_TRANSIT',
  'INCOMING':                    'IN_TRANSIT',
  'DELIVERY':                    'OUT_FOR_DELIVERY',
  'POD - DELIVERED':             'DELIVERED',
  'POD - UNDELIVERED':           'FAILED',
  'OUTGOING RETURN':             'RETURNED',
  'INCOMING RETURN':             'RETURNED',
  'DELIVERY RETURN':             'RETURNED',
  'SHIPMENT RETURN TO CLIENT':   'RETURNED',
}

export function mapSapExpressStatus(input: string | undefined): ShipmentStatus {
  if (!input) return 'IN_TRANSIT'
  return SAP_STATUS_MAP[input.trim()] ?? 'IN_TRANSIT'
}

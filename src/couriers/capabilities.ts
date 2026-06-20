import type { CourierCode } from './types.js'

export type CourierImplementationStatus = 'ACTIVE' | 'SKELETON' | 'PLANNED'

export interface CourierCapability {
  courier: CourierCode
  displayName: string
  implementationStatus: CourierImplementationStatus
  supportsRates: boolean
  supportsBooking: boolean
  supportsTracking: boolean
  supportsWebhook: boolean
  destinationCodeFormat: string
  notes: string[]
}

export const courierCapabilities: Record<CourierCode, CourierCapability> = {
  MOCK: {
    courier: 'MOCK',
    displayName: 'Mock Courier',
    implementationStatus: 'ACTIVE',
    supportsRates: true,
    supportsBooking: true,
    supportsTracking: true,
    supportsWebhook: true,
    destinationCodeFormat: 'Internal mock code; any non-empty origin_code/dest_code accepted by schema.',
    notes: ['Development and smoke testing only.', 'Does not call external courier APIs.'],
  },
  JNE: {
    courier: 'JNE',
    displayName: 'JNE',
    implementationStatus: 'ACTIVE',
    supportsRates: true,
    supportsBooking: true,
    supportsTracking: true,
    supportsWebhook: true,
    destinationCodeFormat: 'JNE destination/origin code, for example MJK10021 or CGK10302.',
    notes: ['Tariff and tracking are safe read flows.', 'Booking/generatecnote creates a real AWB/resi and requires explicit operator approval.'],
  },
  JNT: {
    courier: 'JNT',
    displayName: 'J&T Express',
    implementationStatus: 'SKELETON',
    supportsRates: false,
    supportsBooking: false,
    supportsTracking: false,
    supportsWebhook: true,
    destinationCodeFormat: 'Pending provider contract; keep merchant payload as origin_code/dest_code until mapping is confirmed.',
    notes: ['Adapter is registered but external API calls intentionally return 501 until credentials and API contract are confirmed.'],
  },
  SAP_EXPRESS: {
    courier: 'SAP_EXPRESS',
    displayName: 'SAP Express',
    implementationStatus: 'SKELETON',
    supportsRates: false,
    supportsBooking: false,
    supportsTracking: false,
    supportsWebhook: true,
    destinationCodeFormat: 'Pending provider contract; keep merchant payload as origin_code/dest_code until mapping is confirmed.',
    notes: ['Adapter is registered but external API calls intentionally return 501 until credentials and API contract are confirmed.'],
  },
}

export function listCourierCapabilities(): CourierCapability[] {
  return Object.values(courierCapabilities)
}

export function getCourierCapability(courier: CourierCode): CourierCapability {
  return courierCapabilities[courier]
}

export type CourierCode = 'JNE' | 'JNT' | 'SAP_EXPRESS' | 'MOCK'

export type ShipmentStatus =
  | 'DRAFT'
  | 'BOOKED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'RETURNED'
  | 'FAILED'
  | 'CANCELLED'

export interface RateParams {
  originCode: string
  destCode: string
  weightGrams: number
  isCod?: boolean
  goodsValueIdr?: number
}

export interface CourierRate {
  courier: CourierCode
  serviceCode: string
  serviceName: string
  priceIdr: number
  etd: string
  cached: boolean
  availableForCod?: boolean
  codFee?: number
}

export interface BookShipmentParams {
  externalOrderId: string
  serviceCode: string
  originCode: string
  destCode: string
  weightGrams: number
  recipientName: string
  recipientPhone: string
  recipientAddress: string
  goodsValueIdr?: number
  isCod?: boolean
}

export interface BookShipmentResult {
  courier: CourierCode
  courierOrderId: string
  waybillId: string
  status: ShipmentStatus
}

export interface CancelShipmentResult {
  status: 'CANCELLED' | 'MANUAL_REQUIRED'
  waybillId: string
  message: string
}

export interface NormalizedTrackingEvent {
  status: ShipmentStatus
  description: string
  occurredAt: string
  waybillId?: string
  externalOrderId?: string
}

export interface LogisticsProvider {
  readonly courier: CourierCode
  readonly capabilities?: import('./capabilities.js').CourierCapability
  getRates(params: RateParams): Promise<CourierRate[]>
  bookShipment(params: BookShipmentParams): Promise<BookShipmentResult>
  trackShipment(waybillId: string): Promise<NormalizedTrackingEvent[]>
  normalizeWebhook(rawPayload: unknown): NormalizedTrackingEvent | null
  cancelShipment?(waybillId: string, reason?: string): Promise<CancelShipmentResult>
}

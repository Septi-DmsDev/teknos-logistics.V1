// SAP Express API v2.5.0 — types confirmed via sandbox testing 2026-06-20

export interface SapDistrictItem {
  city_code: string
  district_code: string
  district_name: string
  zone_code: string
  provinsi_code: string
  city_name: string
  tlc_branch_code: string
  provinsi_name: string
}

export interface SapDistrictResponse {
  status: 'success' | 'fail' | boolean
  msg: string
  data: SapDistrictItem[]
}

export interface SapRateService {
  service_type_code: string
  service_type_name: string
  cost: number | string         // API can return string in some accounts/routes
  total_cost: number            // USE THIS for priceIdr — confirmed number in sandbox
  sla: string
  minimum_kilo: number | string // API can return string (e.g. "5")
  kilo_divider: number | string // API can return string (e.g. "4000")
  insurance_cost: number
  insurance_admin_cost: number
  packing_cost: number | string
  volumetric_kg: number | string
  weight: number
  final_weight: number | string
  discount: string
  surcharge: number
  markup_percentage: string
}

export interface SapRateData {
  origin: string
  destination: string
  coverage_cod: boolean
  services: SapRateService[]
}

export interface SapRateResponse {
  status: 'success' | 'fail' | boolean
  msg: string
  data: SapRateData | SapRateService[]
}

export interface SapBookingData {
  awb_no: string
  reference_no: string
  origin_branch_code: string
  destination_branch_code: string
  tlc_branch_code: string
  label: string
}

export interface SapBookingResponse {
  status: 'success' | 'fail' | boolean
  msg: string
  data: SapBookingData | []
}

export interface SapTrackEvent {
  awb_no: string
  reference_no: string
  service_type_code: string
  origin: string
  destination: string
  shipping_cost: string
  rowstate: string
  rowstate_name: string           // may have trailing space e.g. "DELIVERY " — use .trim()
  rowstate_web: string
  pod_status_code: string | null
  pod_status_name: string | null
  description: string
  create_date: string
  current_branch_name: string
  origin_code: string
  destination_code: string
  // shipper/receiver info (v2.x+)
  shipper_name?: string
  receiver_name?: string
  // weight/dimension fields
  kilo?: number | string
  kilo_actual?: number | string
  koli?: number | string
  volumetric?: number | string
  // user/input tracking
  user_input?: string
  // pickup proof — array of URLs
  photo_pickup?: string[]
  signature_pickup?: string[]
  pickup_reason_code?: string
  pickup_reason_name?: string
  pickup_reason_detail_code?: string
  pickup_reason_detail_name?: string
  // pod proof — array of URLs
  photo_pod?: string[]
  signature_pod?: string[]
  pod_reason_detail_code?: string
  pod_reason_detail_name?: string
  // confirmation media (v2.4.5+)
  proof_confirmation?: string[]
  video_confirmation?: string[]
  proof_cx_confirmation?: string[]
  // insurance
  insurance_cost?: string
  insurance_admin_cost?: string
  // return tracking
  awb_return_no?: string | null
  // branch navigation
  next_branch?: string
  previous_branch?: string
  // lead time (v2.5.0+)
  lead_time_order: number
  lead_time_status: string
  lead_time_limit: string
}

export interface SapTrackResponse {
  status: 'success' | 'fail' | boolean
  msg: string
  data: SapTrackEvent[]
}

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
  cost: number
  total_cost: number
  sla: string
  minimum_kilo: number
  kilo_divider: number
  insurance_cost: number
  insurance_admin_cost: number
  packing_cost: number | string
  volumetric_kg: number
  weight: number
  final_weight: number
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
  rowstate_name: string
  rowstate_web: string
  pod_status_code: string | null
  pod_status_name: string | null
  description: string
  create_date: string
  current_branch_name: string
  origin_code: string
  destination_code: string
  lead_time_order: number
  lead_time_status: string
  lead_time_limit: string
}

export interface SapTrackResponse {
  status: 'success' | 'fail' | boolean
  msg: string
  data: SapTrackEvent[]
}

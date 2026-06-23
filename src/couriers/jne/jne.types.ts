export interface JneTariffItem {
  service_code?: string
  service?: string
  service_display?: string
  service_name?: string
  code?: string
  etd?: string
  etd_from?: string
  etd_thru?: string
  times?: string | null
  estimate?: string
  duration?: string
  price?: string | number
  tariff?: string | number
  amount?: string | number
}

export interface JneGenerateCnoteDetail {
  status?: string
  cnote_no?: string
  waybill_id?: string
  awb?: string
  reason?: string
}

export interface JneTrackHistoryItem {
  code?: string
  status?: string
  pod_status?: string
  desc?: string
  description?: string
  note?: string
  date?: string
  created_at?: string
  updated_at?: string
}

export interface JneTrackCnote {
  last_status?: string
  pod_status?: string
}

export type JneTariffResponse = Record<string, unknown> & {
  price?: JneTariffItem[]
  prices?: JneTariffItem[]
  data?: JneTariffItem[]
}

export type JneGenerateCnoteResponse = Record<string, unknown> & {
  detail?: JneGenerateCnoteDetail[]
  data?: JneGenerateCnoteDetail[]
}

export type JneTrackResponse = Record<string, unknown> & {
  cnote?: JneTrackCnote
  history?: JneTrackHistoryItem[]
  data?: JneTrackHistoryItem[]
  error?: string
  status?: boolean | string
}

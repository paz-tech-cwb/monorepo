export interface CasaDePazAnalyticsRange {
  from: string
  to: string
}

export interface CasaDePazAnalyticsTotals {
  houses: number
  adults: number
  kids: number
  guests: number
  conversions: number
  conversion_rate: number
}

export interface CasaDePazSeriesPoint {
  period: string
  houses: number
  adults: number
  kids: number
  guests: number
  conversions: number
}

export interface CasaDePazBySector {
  label: string
  sector_id: number | null
  houses: number
  adults: number
  kids: number
  guests: number
  conversions: number
}

export interface CasaDePazByDay {
  label: string
  houses: number
  adults: number
  guests: number
  conversions: number
}

export interface CasaDePazByTime {
  label: string
  houses: number
  adults: number
  guests: number
  conversions: number
}

export interface CasaDePazAnalyticsSummary {
  range: CasaDePazAnalyticsRange
  totals: CasaDePazAnalyticsTotals
  series: CasaDePazSeriesPoint[]
  by_sector: CasaDePazBySector[]
  by_day: CasaDePazByDay[]
  by_time: CasaDePazByTime[]
}

export interface CasaDePazAnalyticsSummaryQuery {
  /** "YYYY-MM-DD" — omit to default to 6 months back (start of month). */
  from?: string
  /** "YYYY-MM-DD" — omit to default to today. */
  to?: string
}

// Raw submission shape returned by the generic forms endpoint
// (GET /api/forms/casa-de-paz-reports), used for the drill-down table —
// mirrors backend/src/casa-de-paz-reports/entities/casa-de-paz-report.entity.ts
export interface CasaDePazReportSubmission {
  id: string
  date: string
  facilitator: string
  sector_id: number
  adults: number
  kids: number
  guests: number
  conversions: number
  meeting_day: string | null
  meeting_time: string | null
  created_at: string
  updated_at: string
}

export interface CasaDePazAnalyticsRange {
  from: string
  to: string
}

export interface CasaDePazAnalyticsTotals {
  houses: number
  adults: number
  kids: number
  guests: number
  /** adults + kids + guests — every person reached across all visits. */
  lives: number
  conversions: number
  conversion_rate: number
}

export interface CasaDePazAnalyticsGrowth {
  /** Percent change vs. the immediately preceding period of equal length.
   * `null` when there's no previous-period data to compare against. */
  houses: number | null
  lives: number | null
  guests: number | null
  conversions: number | null
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

export interface CasaDePazAnalyticsComparison {
  /** "YYYY-MM" of the most recent month with data used for growth comparisons. */
  period: string
}

export interface CasaDePazAnalyticsSummary {
  range: CasaDePazAnalyticsRange
  totals: CasaDePazAnalyticsTotals
  growth: CasaDePazAnalyticsGrowth
  /** `null` when there's no prior month with data to compare against. */
  comparison: CasaDePazAnalyticsComparison | null
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

export interface UpdateCasaDePazReportRequest {
  date?: string
  facilitator?: string
  sector_id?: number
  adults?: number
  kids?: number
  guests?: number
  conversions?: number
  meeting_day?: string
  meeting_time?: string
}

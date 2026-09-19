import { api } from "../client"
import type {
  CasaDePazAnalyticsSummary,
  CasaDePazAnalyticsSummaryQuery,
  CasaDePazReportSubmission,
} from "../types"

function toQueryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value))
    }
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ""
}

export const casaDePazAnalyticsApi = {
  getSummary: (query: CasaDePazAnalyticsSummaryQuery) =>
    api.get<CasaDePazAnalyticsSummary>(
      `/casa-de-paz-analytics/summary${toQueryString(query)}`
    ),

  // Raw submissions — the generic forms endpoint has no server-side date
  // filtering for this form, so the full list is fetched once and the
  // year/months window is applied client-side (see casa-de-paz-table.tsx).
  getSubmissions: () =>
    api.get<CasaDePazReportSubmission[]>("/forms/casa-de-paz-reports"),
}

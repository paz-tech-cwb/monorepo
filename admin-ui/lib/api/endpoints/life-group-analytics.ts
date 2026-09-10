import { api } from "../client"
import type {
  LifeGroupAttendanceQuery,
  LifeGroupAttendanceResponse,
  LifeGroupDistributionQuery,
  LifeGroupDistributionResponse,
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

export const lifeGroupAnalyticsApi = {
  getAttendance: (query: LifeGroupAttendanceQuery = {}) =>
    api.get<LifeGroupAttendanceResponse>(
      `/life-group-analytics/attendance${toQueryString(query)}`
    ),

  getDistribution: (query: LifeGroupDistributionQuery = {}) =>
    api.get<LifeGroupDistributionResponse>(
      `/life-group-analytics/distribution${toQueryString(query)}`
    ),
}

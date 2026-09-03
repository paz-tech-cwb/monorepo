import { api } from "../client"
import type {
  DashboardStats,
  AccessTrendData,
  MemberGrowthData,
  LifeGroupDistribution,
} from "../types"

export const dashboardApi = {
  getStats: () => api.get<DashboardStats>("/admin/dashboard/stats"),

  getAccessTrends: () =>
    api.get<AccessTrendData[]>("/admin/dashboard/access-trends"),

  getMemberGrowth: () =>
    api.get<MemberGrowthData[]>("/admin/dashboard/member-growth"),

  getLifeGroupDistribution: () =>
    api.get<LifeGroupDistribution[]>("/admin/dashboard/life-groups-distribution"),
}

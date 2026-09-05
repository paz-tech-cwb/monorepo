export interface DashboardStats {
  total_members: number
  active_members: number
  total_life_groups: number
  events_this_month: number
  new_members_this_month: number
  contributions_this_month: number
}

export interface AccessTrendData {
  date: string
  access_count: number
}

export interface MemberGrowthData {
  month: string
  new_members: number
  total_members: number
}

export interface LifeGroupDistribution {
  name: string
  member_count: number
}


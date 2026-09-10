export interface LifeGroupAttendancePoint {
  period: string
  meetings_count: number
  present_count: number
  members_count: number
  attendance_rate: number
}

export interface LifeGroupAttendanceResponse {
  granularity: "month" | "meeting"
  year: number
  month?: number
  rows: LifeGroupAttendancePoint[]
}

export interface LifeGroupAttendanceQuery {
  year?: number
  month?: number
  life_group_id?: number
  granularity?: "month" | "meeting"
}

export interface LifeGroupDistributionBucket {
  label: string
  count: number
}

export interface LifeGroupDistributionResponse {
  by_day: LifeGroupDistributionBucket[]
  by_hour: LifeGroupDistributionBucket[]
  by_neighborhood: LifeGroupDistributionBucket[]
  by_city: LifeGroupDistributionBucket[]
}

export interface LifeGroupDistributionQuery {
  life_group_id?: number
}

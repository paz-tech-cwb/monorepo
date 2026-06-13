export type MembershipMode = "teams" | "direct"

export interface MinistryMember {
  id: number
  name: string
  role?: string
}

export interface LeaderRef {
  id: number
  name: string
}

export interface MinistryTeam {
  id: number
  name: string
  ministry_id: number
  leader: LeaderRef | null
  co_leader: LeaderRef | null
  members: MinistryMember[]
  created_at: string
  updated_at: string
}

export interface Ministry {
  id: number
  name: string
  description: string | null
  membership_mode: MembershipMode
  leader: LeaderRef | null
  co_leader: LeaderRef | null
  members: MinistryMember[]
  teams: MinistryTeam[]
  created_at: string
  updated_at: string
}

export interface CreateMinistryRequest {
  name: string
  description?: string
  membership_mode?: MembershipMode
  leader_id?: number
  co_leader_id?: number
}

export interface CreateMinistryTeamRequest {
  name: string
  ministry_id: number
  leader_id?: number
  co_leader_id?: number
}

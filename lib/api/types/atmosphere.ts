export interface AtmosphereMember {
  id: number
  name: string
  role?: string
}

export interface AtmosphereTeam {
  id: number
  name: string
  ministry_id: number
  leader: { id: number; name: string } | null
  members: AtmosphereMember[]
  created_at: string
  updated_at: string
}

export interface AtmosphereMinistry {
  id: number
  name: string
  leader: { id: number; name: string } | null
  members: AtmosphereMember[]
  teams: AtmosphereTeam[]
  created_at: string
  updated_at: string
}

export interface CreateAtmosphereMinistryRequest {
  name: string
  leader_id?: number
}

export interface CreateAtmosphereTeamRequest {
  name: string
  ministry_id: number
  leader_id?: number
}

export type ConversionType = "primeira_vez" | "reconciliacao"

export type HowMetChurch =
  | "convite_amigo"
  | "convite_parente"
  | "redes_sociais"
  | "passou_frente"
  | "outro"

export type Sex = "feminino" | "masculino"

export type CivilStatus = "solteiro" | "casado" | "divorciado" | "viuvo"

export type ChurchAttendance =
  | "primeira_vez"
  | "segunda_vez"
  | "terceira_vez"
  | "mais_uma_vez"

export type LifeGroupExperience = "sim" | "nao" | "ja_foi_convidado"

export interface Conversion {
  id: number
  full_name: string
  cellphone: string
  type: ConversionType
  how_met_church: HowMetChurch
  how_met_church_other?: string
  sex: Sex
  age: number
  civil_status: CivilStatus
  street?: string
  neighborhood?: string
  city?: string
  church_attendance_history: ChurchAttendance
  life_group_experience: LifeGroupExperience
  life_group_leader_name?: string
  who_invited?: string
  observations?: string
  created_at: string
  updated_at: string
}

export interface CreateConversionRequest {
  full_name: string
  cellphone: string
  type: ConversionType
  how_met_church: HowMetChurch
  how_met_church_other?: string
  sex: Sex
  age: number
  civil_status: CivilStatus
  street?: string
  neighborhood?: string
  city?: string
  church_attendance_history: ChurchAttendance
  life_group_experience: LifeGroupExperience
  life_group_leader_name?: string
  who_invited?: string
  observations?: string
}

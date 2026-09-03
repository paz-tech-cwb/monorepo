export interface ChurchAddress {
  street: string
  number: string
  complement?: string | null
  reference?: string | null
  neighborhood: string
  city: string
  state: string
  zip_code: string
  country: string
}

export interface ChurchContact {
  phone: string
  email: string
  website: string
}

export interface ChurchScheduleSlot {
  morning?: string
  evening?: string
}

export interface ChurchSchedule {
  sunday: ChurchScheduleSlot
  wednesday: ChurchScheduleSlot
  friday: ChurchScheduleSlot
  saturday: ChurchScheduleSlot
}

export interface ChurchSocialMedia {
  facebook?: string
  instagram?: string
  youtube?: string
  twitter?: string
}

export interface Church {
  id: number
  name: string
  description?: string | null
  address: ChurchAddress
  contact: ChurchContact
  schedule: ChurchSchedule
  social_media: ChurchSocialMedia
  updated_at: string
}

export interface UpdateChurchRequest {
  name?: string
  description?: string | null
  address?: Partial<ChurchAddress>
  contact?: Partial<ChurchContact>
  schedule?: Partial<ChurchSchedule>
  social_media?: Partial<ChurchSocialMedia>
}

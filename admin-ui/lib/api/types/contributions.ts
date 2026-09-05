export interface Contribution {
  id: number
  bank_name: string
  branch_number: string
  account_number: string
  pix_key: string | null
}

export interface CreateContributionRequest {
  bank_name: string
  branch_number: string
  account_number: string
  pix_key: string
}

export interface UpdateContributionRequest {
  bank_name?: string
  branch_number?: string
  account_number?: string
  pix_key?: string
}

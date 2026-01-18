export interface Contribution {
  id: number
  bankName: string
  branchNumber: string
  accountNumber: string
  pixKey: string
}

export interface CreateContributionRequest {
  bankName: string
  branchNumber: string
  accountNumber: string
  pixKey: string
}

export interface UpdateContributionRequest {
  bankName?: string
  branchNumber?: string
  accountNumber?: string
  pixKey?: string
}

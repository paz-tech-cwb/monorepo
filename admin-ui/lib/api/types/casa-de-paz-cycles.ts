export interface CasaDePazCycle {
  id: string
  name: string
  /** "YYYY-MM-DD" — always normalized to the first day of the month. */
  month: string
  status: "open" | "closed"
}

export interface CreateCasaDePazCycleRequest {
  /** "YYYY-MM" — normalized to the first day of the month by the backend. */
  month: string
  name?: string
}

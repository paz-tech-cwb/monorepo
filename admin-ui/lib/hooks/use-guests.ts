"use client"

import { useQuery } from "@tanstack/react-query"
import { guestsApi } from "@/lib/api/endpoints/guests"

const QUERY_KEY = ["guests"]

export function useGuests() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => guestsApi.getAll(),
  })
}

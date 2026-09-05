import { useQuery } from "@tanstack/react-query"
import { formulariosApi } from "@/lib/api/endpoints/formularios"

export function useFormUserLookup(filters: { email?: string; phone?: string }) {
  return useQuery({
    queryKey: ["form-user-lookup", filters],
    queryFn: () => formulariosApi.lookupUser(filters),
    enabled: Boolean(filters.email || filters.phone),
    staleTime: 30_000,
  })
}

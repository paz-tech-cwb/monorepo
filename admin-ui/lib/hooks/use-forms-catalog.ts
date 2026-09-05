import { useQuery } from "@tanstack/react-query"
import { formulariosApi } from "@/lib/api/endpoints/formularios"

export function useFormsCatalog() {
  return useQuery({
    queryKey: ["forms-catalog"],
    queryFn: () => formulariosApi.catalog(),
    staleTime: 5 * 60_000,
  })
}

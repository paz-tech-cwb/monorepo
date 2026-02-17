import { api } from "@/lib/api/client"
import type { Church, UpdateChurchRequest } from "@/lib/api/types"

export const churchApi = {
  get: () => api.get<Church>("/church"),
  update: (data: UpdateChurchRequest) => api.put<Church>("/church", data),
}

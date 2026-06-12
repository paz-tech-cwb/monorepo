import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { atmosphereApi } from "@/lib/api/endpoints/atmosphere"
import type { CreateAtmosphereMinistryRequest, CreateAtmosphereTeamRequest } from "@/lib/api/types"

export function useAtmosphereMinistries() {
  return useQuery({ queryKey: ["atmosphere-ministries"], queryFn: () => atmosphereApi.getMinistries() })
}

export function useAtmosphereTeams(ministryId?: number) {
  return useQuery({
    queryKey: ["atmosphere-teams", ministryId],
    queryFn: () => atmosphereApi.getTeams(ministryId),
  })
}

export function useCreateAtmosphereMinistry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateAtmosphereMinistryRequest) => atmosphereApi.createMinistry(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["atmosphere-ministries"] }),
  })
}

export function useUpdateAtmosphereMinistry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Partial<CreateAtmosphereMinistryRequest>) =>
      atmosphereApi.updateMinistry(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["atmosphere-ministries"] }),
  })
}

export function useDeleteAtmosphereMinistry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => atmosphereApi.deleteMinistry(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["atmosphere-ministries"] }),
  })
}

export function useCreateAtmosphereTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateAtmosphereTeamRequest) => atmosphereApi.createTeam(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["atmosphere-teams"] }),
  })
}

export function useUpdateAtmosphereTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Partial<CreateAtmosphereTeamRequest>) =>
      atmosphereApi.updateTeam(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["atmosphere-teams"] }),
  })
}

export function useDeleteAtmosphereTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => atmosphereApi.deleteTeam(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["atmosphere-teams"] }),
  })
}

export function useAddMinistryMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ministryId, userId }: { ministryId: number; userId: number }) =>
      atmosphereApi.addMinistryMember(ministryId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["atmosphere-ministries"] }),
  })
}

export function useRemoveMinistryMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ministryId, userId }: { ministryId: number; userId: number }) =>
      atmosphereApi.removeMinistryMember(ministryId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["atmosphere-ministries"] }),
  })
}

export function useAddTeamMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ teamId, userId }: { teamId: number; userId: number }) =>
      atmosphereApi.addTeamMember(teamId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["atmosphere-teams"] }),
  })
}

export function useRemoveTeamMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ teamId, userId }: { teamId: number; userId: number }) =>
      atmosphereApi.removeTeamMember(teamId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["atmosphere-teams"] }),
  })
}

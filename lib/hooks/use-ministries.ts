import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ministriesApi } from "@/lib/api/endpoints/ministries"
import type { CreateMinistryRequest, CreateMinistryTeamRequest } from "@/lib/api/types"

export function useMinistries() {
  return useQuery({ queryKey: ["ministries"], queryFn: () => ministriesApi.getMinistries() })
}

export function useMinistry(id: number) {
  return useQuery({ queryKey: ["ministries", id], queryFn: () => ministriesApi.getMinistry(id), enabled: !!id })
}

export function useMinistryTeams(ministryId?: number) {
  return useQuery({
    queryKey: ["ministry-teams", ministryId],
    queryFn: () => ministriesApi.getTeams(ministryId),
  })
}

export function useCreateMinistry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateMinistryRequest) => ministriesApi.createMinistry(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ministries"] }),
  })
}

export function useUpdateMinistry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Partial<CreateMinistryRequest>) =>
      ministriesApi.updateMinistry(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ministries"] }),
  })
}

export function useDeleteMinistry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => ministriesApi.deleteMinistry(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ministries"] }),
  })
}

export function useCreateMinistryTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateMinistryTeamRequest) => ministriesApi.createTeam(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ministries"] }),
  })
}

export function useUpdateMinistryTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Partial<CreateMinistryTeamRequest>) =>
      ministriesApi.updateTeam(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ministries"] }),
  })
}

export function useDeleteMinistryTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => ministriesApi.deleteTeam(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ministries"] }),
  })
}

export function useAddMinistryMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ministryId, userId }: { ministryId: number; userId: number }) =>
      ministriesApi.addMinistryMember(ministryId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ministries"] }),
  })
}

export function useRemoveMinistryMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ministryId, userId }: { ministryId: number; userId: number }) =>
      ministriesApi.removeMinistryMember(ministryId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ministries"] }),
  })
}

export function useAddMinistryTeamMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ teamId, userId }: { teamId: number; userId: number }) =>
      ministriesApi.addTeamMember(teamId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ministries"] }),
  })
}

export function useRemoveMinistryTeamMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ teamId, userId }: { teamId: number; userId: number }) =>
      ministriesApi.removeTeamMember(teamId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ministries"] }),
  })
}

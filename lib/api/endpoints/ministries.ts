import { api } from "@/lib/api/client"
import type {
  Ministry, MinistryTeam,
  CreateMinistryRequest, CreateMinistryTeamRequest,
} from "@/lib/api/types"

export const ministriesApi = {
  getMinistries: () => api.get<Ministry[]>("/ministries"),
  getMinistry: (id: number) => api.get<Ministry>(`/ministries/${id}`),
  createMinistry: (data: CreateMinistryRequest) => api.post<Ministry>("/ministries", data),
  updateMinistry: (id: number, data: Partial<CreateMinistryRequest>) =>
    api.put<Ministry>(`/ministries/${id}`, data),
  deleteMinistry: (id: number) => api.delete<void>(`/ministries/${id}`),

  getTeams: (ministryId?: number) =>
    ministryId
      ? api.get<MinistryTeam[]>(`/ministries/teams/all?ministry_id=${ministryId}`)
      : api.get<MinistryTeam[]>("/ministries/teams/all"),
  createTeam: (data: CreateMinistryTeamRequest) =>
    api.post<MinistryTeam>("/ministries/teams", data),
  updateTeam: (id: number, data: Partial<CreateMinistryTeamRequest>) =>
    api.put<MinistryTeam>(`/ministries/teams/${id}`, data),
  deleteTeam: (id: number) => api.delete<void>(`/ministries/teams/${id}`),

  addMinistryMember: (ministryId: number, userId: number) =>
    api.post<Ministry>(`/ministries/${ministryId}/members/${userId}`, {}),
  removeMinistryMember: (ministryId: number, userId: number) =>
    api.delete<void>(`/ministries/${ministryId}/members/${userId}`),
  addTeamMember: (teamId: number, userId: number) =>
    api.post<MinistryTeam>(`/ministries/teams/${teamId}/members/${userId}`, {}),
  removeTeamMember: (teamId: number, userId: number) =>
    api.delete<void>(`/ministries/teams/${teamId}/members/${userId}`),
}

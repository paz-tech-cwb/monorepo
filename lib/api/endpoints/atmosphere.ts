import { api } from "@/lib/api/client"
import type {
  AtmosphereMinistry, AtmosphereTeam,
  CreateAtmosphereMinistryRequest, CreateAtmosphereTeamRequest,
} from "@/lib/api/types"

export const atmosphereApi = {
  getMinistries: () => api.get<AtmosphereMinistry[]>("/atmosphere/ministries"),
  createMinistry: (data: CreateAtmosphereMinistryRequest) =>
    api.post<AtmosphereMinistry>("/atmosphere/ministries", data),
  updateMinistry: (id: number, data: Partial<CreateAtmosphereMinistryRequest>) =>
    api.put<AtmosphereMinistry>(`/atmosphere/ministries/${id}`, data),
  deleteMinistry: (id: number) => api.delete<void>(`/atmosphere/ministries/${id}`),

  getTeams: (ministryId?: number) =>
    ministryId
      ? api.get<AtmosphereTeam[]>(`/atmosphere/teams?ministry_id=${ministryId}`)
      : api.get<AtmosphereTeam[]>("/atmosphere/teams"),
  createTeam: (data: CreateAtmosphereTeamRequest) =>
    api.post<AtmosphereTeam>("/atmosphere/teams", data),
  updateTeam: (id: number, data: Partial<CreateAtmosphereTeamRequest>) =>
    api.put<AtmosphereTeam>(`/atmosphere/teams/${id}`, data),
  deleteTeam: (id: number) => api.delete<void>(`/atmosphere/teams/${id}`),

  addMinistryMember: (ministryId: number, userId: number) =>
    api.post<AtmosphereMinistry>(`/atmosphere/ministries/${ministryId}/members/${userId}`, {}),
  removeMinistryMember: (ministryId: number, userId: number) =>
    api.delete<void>(`/atmosphere/ministries/${ministryId}/members/${userId}`),
  addTeamMember: (teamId: number, userId: number) =>
    api.post<AtmosphereTeam>(`/atmosphere/teams/${teamId}/members/${userId}`, {}),
  removeTeamMember: (teamId: number, userId: number) =>
    api.delete<void>(`/atmosphere/teams/${teamId}/members/${userId}`),
}

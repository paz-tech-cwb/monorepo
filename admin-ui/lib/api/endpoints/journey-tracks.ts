import { api } from "../client"
import type {
  ApproveJourneyStepRequest,
  CreateJourneyTrackRequest,
  CreateJourneyTrackStepRequest,
  JourneyTrack,
  MemberJourneyTrackProgress,
  ReorderJourneyTrackStepsRequest,
  UpdateJourneyTrackRequest,
  UpdateJourneyTrackStepRequest,
} from "../types/journey-tracks"

export const journeyTracksApi = {
  getAll: () => api.get<JourneyTrack[]>("/journey-tracks/admin"),

  create: (data: CreateJourneyTrackRequest) => api.post<JourneyTrack>("/journey-tracks/admin", data),

  update: (id: number, data: UpdateJourneyTrackRequest) =>
    api.put<JourneyTrack>(`/journey-tracks/admin/${id}`, data),

  delete: (id: number) => api.delete<void>(`/journey-tracks/admin/${id}`),

  createStep: (trackId: number, data: CreateJourneyTrackStepRequest) =>
    api.post<JourneyTrack>(`/journey-tracks/admin/${trackId}/steps`, data),

  updateStep: (trackId: number, stepId: number, data: UpdateJourneyTrackStepRequest) =>
    api.put<JourneyTrack>(`/journey-tracks/admin/${trackId}/steps/${stepId}`, data),

  deleteStep: (trackId: number, stepId: number) =>
    api.delete<void>(`/journey-tracks/admin/${trackId}/steps/${stepId}`),

  reorderSteps: (trackId: number, data: ReorderJourneyTrackStepsRequest) =>
    api.put<JourneyTrack>(`/journey-tracks/admin/${trackId}/steps/reorder`, data),
}

export const journeyProgressApi = {
  getMine: () => api.get<MemberJourneyTrackProgress[]>("/journey-tracks/me"),

  getForMember: (memberId: number) =>
    api.get<MemberJourneyTrackProgress[]>(`/journey-tracks/member/${memberId}`),

  approveStep: (memberId: number, stepId: number, data?: ApproveJourneyStepRequest) =>
    api.post<void>(`/journey-tracks/member/${memberId}/steps/${stepId}/approve`, data ?? {}),

  revokeApproval: (memberId: number, stepId: number) =>
    api.delete<void>(`/journey-tracks/member/${memberId}/steps/${stepId}/approve`),
}

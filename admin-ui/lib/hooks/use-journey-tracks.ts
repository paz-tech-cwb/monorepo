"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { journeyProgressApi, journeyTracksApi } from "@/lib/api/endpoints/journey-tracks"
import type {
  ApproveJourneyStepRequest,
  CreateJourneyTrackRequest,
  CreateJourneyTrackStepRequest,
  ReorderJourneyTrackStepsRequest,
  UpdateJourneyTrackRequest,
  UpdateJourneyTrackStepRequest,
} from "@/lib/api/types/journey-tracks"
import { trackEvent } from "@/lib/firebase/analytics"

const TRACKS_KEY = ["journey-tracks"]
const MY_JOURNEY_KEY = ["journey-tracks", "me"]
const MEMBER_JOURNEY_KEY = ["journey-tracks", "member"]

export function useJourneyTracks() {
  return useQuery({
    queryKey: TRACKS_KEY,
    queryFn: () => journeyTracksApi.getAll(),
  })
}

export function useCreateJourneyTrack() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateJourneyTrackRequest) => journeyTracksApi.create(data),
    onSuccess: (track) => {
      queryClient.invalidateQueries({ queryKey: TRACKS_KEY })
      trackEvent("journey_track_created", { track_id: track.id })
    },
  })
}

export function useUpdateJourneyTrack() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateJourneyTrackRequest }) =>
      journeyTracksApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: TRACKS_KEY })
      trackEvent("journey_track_updated", { track_id: variables.id })
    },
  })
}

export function useDeleteJourneyTrack() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => journeyTracksApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: TRACKS_KEY })
      trackEvent("journey_track_deleted", { track_id: id })
    },
  })
}

export function useCreateJourneyTrackStep(trackId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateJourneyTrackStepRequest) => journeyTracksApi.createStep(trackId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRACKS_KEY })
      trackEvent("journey_track_step_created", { track_id: trackId })
    },
  })
}

export function useUpdateJourneyTrackStep(trackId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ stepId, data }: { stepId: number; data: UpdateJourneyTrackStepRequest }) =>
      journeyTracksApi.updateStep(trackId, stepId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: TRACKS_KEY })
      trackEvent("journey_track_step_updated", { track_id: trackId, step_id: variables.stepId })
    },
  })
}

export function useDeleteJourneyTrackStep(trackId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (stepId: number) => journeyTracksApi.deleteStep(trackId, stepId),
    onSuccess: (_, stepId) => {
      queryClient.invalidateQueries({ queryKey: TRACKS_KEY })
      trackEvent("journey_track_step_deleted", { track_id: trackId, step_id: stepId })
    },
  })
}

export function useReorderJourneyTrackSteps(trackId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (stepIds: number[]) =>
      journeyTracksApi.reorderSteps(trackId, { step_ids: stepIds } satisfies ReorderJourneyTrackStepsRequest),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRACKS_KEY })
      trackEvent("journey_track_steps_reordered", { track_id: trackId })
    },
  })
}

export function useMyJourneyTracks() {
  return useQuery({
    queryKey: MY_JOURNEY_KEY,
    queryFn: () => journeyProgressApi.getMine(),
  })
}

export function useMemberJourneyTracks(memberId: number | null) {
  return useQuery({
    queryKey: [...MEMBER_JOURNEY_KEY, memberId],
    queryFn: () => journeyProgressApi.getForMember(memberId!),
    enabled: memberId !== null,
  })
}

export function useApproveJourneyStep() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      memberId,
      stepId,
      data,
    }: {
      memberId: number
      stepId: number
      data?: ApproveJourneyStepRequest
    }) => journeyProgressApi.approveStep(memberId, stepId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...MEMBER_JOURNEY_KEY, variables.memberId] })
      trackEvent("journey_track_step_approved", {
        member_id: variables.memberId,
        step_id: variables.stepId,
      })
    },
  })
}

export function useRevokeJourneyStepApproval() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ memberId, stepId }: { memberId: number; stepId: number }) =>
      journeyProgressApi.revokeApproval(memberId, stepId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...MEMBER_JOURNEY_KEY, variables.memberId] })
      trackEvent("journey_track_step_approval_revoked", {
        member_id: variables.memberId,
        step_id: variables.stepId,
      })
    },
  })
}

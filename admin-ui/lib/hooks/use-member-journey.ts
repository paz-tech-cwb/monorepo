"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { memberJourneyApi } from "@/lib/api/endpoints/member-journey"
import type { JourneyFeedParams, UpdateMemberStageRequest } from "@/lib/api/types"
import { trackEvent } from "@/lib/firebase/analytics"

const FEED_KEY   = ["member-journey", "feed"]
const STATS_KEY  = ["member-journey", "stats"]
const FILTERS_KEY = ["member-journey", "filters"]

export function useMemberJourneyFeed(params?: JourneyFeedParams) {
  return useQuery({
    queryKey: [...FEED_KEY, params],
    queryFn: () => memberJourneyApi.getFeed(params),
  })
}

export function useMemberJourneyStats() {
  return useQuery({
    queryKey: STATS_KEY,
    queryFn: () => memberJourneyApi.getStats(),
  })
}

export function useMemberJourneyFilterOptions() {
  return useQuery({
    queryKey: FILTERS_KEY,
    queryFn: () => memberJourneyApi.getFilterOptions(),
  })
}

export function useMemberJourney(memberId: number | null) {
  return useQuery({
    queryKey: ["member-journey", memberId],
    queryFn: () => memberJourneyApi.getMemberJourney(memberId!),
    enabled: memberId !== null,
  })
}

export function useUpdateMemberStage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ memberId, data }: { memberId: number; data: UpdateMemberStageRequest }) =>
      memberJourneyApi.updateStage(memberId, data),
    onSuccess: (journey) => {
      queryClient.invalidateQueries({ queryKey: FEED_KEY })
      queryClient.invalidateQueries({ queryKey: STATS_KEY })
      queryClient.invalidateQueries({ queryKey: ["member-journey", journey.member_id] })
      trackEvent("member_stage_updated", {
        member_id: journey.member_id,
        stage_id: journey.current_stage_id,
      })
    },
  })
}

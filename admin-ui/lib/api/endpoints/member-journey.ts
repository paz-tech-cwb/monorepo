import { api } from "@/lib/api/client"
import type {
  MemberJourney,
  JourneyFeed,
  JourneyStats,
  JourneyFilterOptions,
  UpdateMemberStageRequest,
  JourneyFeedParams,
} from "@/lib/api/types/member-journey"

function buildFeedUrl(params?: JourneyFeedParams): string {
  if (!params) return "/member-journey/feed"
  const qs = new URLSearchParams()
  if (params.stage_id !== undefined) qs.set("stage_id", String(params.stage_id))
  if (params.life_group_id !== undefined) qs.set("life_group_id", String(params.life_group_id))
  if (params.ministry_id !== undefined) qs.set("ministry_id", String(params.ministry_id))
  if (params.sector_id !== undefined) qs.set("sector_id", String(params.sector_id))
  if (params.area_id !== undefined) qs.set("area_id", String(params.area_id))
  if (params.role)                  qs.set("role", params.role)
  if (params.from)                  qs.set("from", params.from)
  if (params.to)                    qs.set("to", params.to)
  if (params.page !== undefined)    qs.set("page", String(params.page))
  if (params.per_page !== undefined) qs.set("per_page", String(params.per_page))
  const str = qs.toString()
  return str ? `/member-journey/feed?${str}` : "/member-journey/feed"
}

export const memberJourneyApi = {
  getFeed:          (params?: JourneyFeedParams) => api.get<JourneyFeed>(buildFeedUrl(params)),
  getStats:         () => api.get<JourneyStats[]>("/member-journey/stats"),
  getFilterOptions: () => api.get<JourneyFilterOptions>("/member-journey/filters"),
  getMemberJourney: (memberId: number) => api.get<MemberJourney>(`/member-journey/${memberId}`),
  updateStage:      (memberId: number, data: UpdateMemberStageRequest) =>
                      api.patch<MemberJourney>(`/member-journey/${memberId}/stage`, data),
}

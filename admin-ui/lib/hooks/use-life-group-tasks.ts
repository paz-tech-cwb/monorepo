"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  lifeGroupTaskTemplatesApi,
  lifeGroupTasksApi,
} from "@/lib/api/endpoints/life-group-tasks"
import type {
  CreateLifeGroupTaskTemplateRequest,
  UpdateLifeGroupTaskTemplateRequest,
  LifeGroupTaskOverrideEntry,
  LifeGroupTaskMemberEntry,
} from "@/lib/api/types/life-group-tasks"
import { trackEvent } from "@/lib/firebase/analytics"

const TEMPLATES_KEY = ["life-group-task-templates"]
const groupKey = (lifeGroupId: number) => ["life-group-tasks", lifeGroupId]

// ---------------------------------------------------------------------------
// Templates (admin-only)
// ---------------------------------------------------------------------------

export function useLifeGroupTaskTemplates(enabled = true) {
  return useQuery({
    queryKey: TEMPLATES_KEY,
    queryFn: () => lifeGroupTaskTemplatesApi.getAll(),
    enabled,
  })
}

export function useCreateLifeGroupTaskTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateLifeGroupTaskTemplateRequest) =>
      lifeGroupTaskTemplatesApi.create(data),
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY })
      trackEvent("life_group_task_template_created", { template_id: template.id })
    },
  })
}

export function useUpdateLifeGroupTaskTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateLifeGroupTaskTemplateRequest }) =>
      lifeGroupTaskTemplatesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY })
      queryClient.invalidateQueries({ queryKey: ["life-group-tasks"] })
      trackEvent("life_group_task_template_updated", { template_id: variables.id })
    },
  })
}

export function useDeleteLifeGroupTaskTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => lifeGroupTaskTemplatesApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY })
      trackEvent("life_group_task_template_deleted", { template_id: id })
    },
  })
}

export function useReorderLifeGroupTaskTemplates() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (templateIds: number[]) => lifeGroupTaskTemplatesApi.reorder(templateIds),
    onSuccess: (templates) => {
      queryClient.setQueryData(TEMPLATES_KEY, templates)
      queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY })
      trackEvent("life_group_task_templates_reordered", {})
    },
  })
}

// ---------------------------------------------------------------------------
// Per life group
// ---------------------------------------------------------------------------

export function useLifeGroupTaskOverrides(lifeGroupId: number | null) {
  return useQuery({
    queryKey: [...groupKey(lifeGroupId ?? 0), "overrides"],
    queryFn: () => lifeGroupTasksApi.getOverrides(lifeGroupId!),
    enabled: lifeGroupId !== null,
  })
}

export function usePutLifeGroupTaskOverrides(lifeGroupId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (overrides: LifeGroupTaskOverrideEntry[]) =>
      lifeGroupTasksApi.putOverrides(lifeGroupId, { overrides }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKey(lifeGroupId) })
      trackEvent("life_group_task_overrides_saved", { life_group_id: lifeGroupId })
    },
  })
}

export function useLifeGroupTaskMembers(lifeGroupId: number | null) {
  return useQuery({
    queryKey: [...groupKey(lifeGroupId ?? 0), "members"],
    queryFn: () => lifeGroupTasksApi.getMembers(lifeGroupId!),
    enabled: lifeGroupId !== null,
  })
}

export function usePutLifeGroupTaskMembers(lifeGroupId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (members: LifeGroupTaskMemberEntry[]) =>
      lifeGroupTasksApi.putMembers(lifeGroupId, { members }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKey(lifeGroupId) })
      trackEvent("life_group_task_members_saved", { life_group_id: lifeGroupId })
    },
  })
}

export function useLifeGroupTaskSettings(lifeGroupId: number | null) {
  return useQuery({
    queryKey: [...groupKey(lifeGroupId ?? 0), "settings"],
    queryFn: () => lifeGroupTasksApi.getSettings(lifeGroupId!),
    enabled: lifeGroupId !== null,
  })
}

export function usePutLifeGroupTaskSettings(lifeGroupId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (minPresentMeetings: number) =>
      lifeGroupTasksApi.putSettings(lifeGroupId, { min_present_meetings: minPresentMeetings }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKey(lifeGroupId) })
      trackEvent("life_group_task_settings_saved", { life_group_id: lifeGroupId })
    },
  })
}

export function useLifeGroupTaskSkips(lifeGroupId: number | null) {
  return useQuery({
    queryKey: [...groupKey(lifeGroupId ?? 0), "skips"],
    queryFn: () => lifeGroupTasksApi.getSkips(lifeGroupId!),
    enabled: lifeGroupId !== null,
  })
}

export function useAddLifeGroupTaskSkip(lifeGroupId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (meetingDate: string) => lifeGroupTasksApi.addSkip(lifeGroupId, meetingDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKey(lifeGroupId) })
      trackEvent("life_group_task_date_skipped", { life_group_id: lifeGroupId })
    },
  })
}

export function useRemoveLifeGroupTaskSkip(lifeGroupId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (meetingDate: string) => lifeGroupTasksApi.removeSkip(lifeGroupId, meetingDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKey(lifeGroupId) })
      trackEvent("life_group_task_date_unskipped", { life_group_id: lifeGroupId })
    },
  })
}

export function useLifeGroupTaskMeeting(lifeGroupId: number | null, date: string) {
  return useQuery({
    queryKey: [...groupKey(lifeGroupId ?? 0), "meeting", date],
    queryFn: () => lifeGroupTasksApi.getMeeting(lifeGroupId!, date),
    enabled: lifeGroupId !== null && !!date,
  })
}

export function useGenerateLifeGroupTasks(lifeGroupId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (meetingDate: string) =>
      lifeGroupTasksApi.generate(lifeGroupId, { meeting_date: meetingDate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKey(lifeGroupId) })
      trackEvent("life_group_tasks_generated", { life_group_id: lifeGroupId })
    },
  })
}

export function useRerollLifeGroupTask(lifeGroupId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (assignmentId: string) => lifeGroupTasksApi.reroll(lifeGroupId, assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKey(lifeGroupId) })
      trackEvent("life_group_task_rerolled", { life_group_id: lifeGroupId })
    },
  })
}

export function useReassignLifeGroupTask(lifeGroupId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ assignmentId, userId }: { assignmentId: string; userId: number }) =>
      lifeGroupTasksApi.reassign(lifeGroupId, assignmentId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKey(lifeGroupId) })
      trackEvent("life_group_task_reassigned", { life_group_id: lifeGroupId })
    },
  })
}

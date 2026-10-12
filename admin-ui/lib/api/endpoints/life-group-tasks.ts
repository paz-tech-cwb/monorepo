import { api } from "../client"
import type {
  LifeGroupTaskTemplate,
  CreateLifeGroupTaskTemplateRequest,
  UpdateLifeGroupTaskTemplateRequest,
  LifeGroupTaskMeeting,
  LifeGroupTaskAssignment,
  GenerateLifeGroupTasksRequest,
  GenerateLifeGroupTasksResponse,
  LifeGroupTaskOverride,
  UpsertLifeGroupTaskOverridesRequest,
  LifeGroupTaskMember,
  UpsertLifeGroupTaskMembersRequest,
  LifeGroupTaskSettings,
  LifeGroupTaskSkip,
} from "../types/life-group-tasks"

export const lifeGroupTaskTemplatesApi = {
  getAll: (): Promise<LifeGroupTaskTemplate[]> =>
    api.get<LifeGroupTaskTemplate[]>("/life-group-task-templates"),

  create: (data: CreateLifeGroupTaskTemplateRequest): Promise<LifeGroupTaskTemplate> =>
    api.post<LifeGroupTaskTemplate>("/life-group-task-templates", data),

  update: (id: number, data: UpdateLifeGroupTaskTemplateRequest): Promise<LifeGroupTaskTemplate> =>
    api.patch<LifeGroupTaskTemplate>(`/life-group-task-templates/${id}`, data),

  delete: (id: number): Promise<void> =>
    api.delete<void>(`/life-group-task-templates/${id}`),

  reorder: (templateIds: number[]): Promise<LifeGroupTaskTemplate[]> =>
    api.put<LifeGroupTaskTemplate[]>("/life-group-task-templates/reorder", {
      template_ids: templateIds,
    }),
}

export const lifeGroupTasksApi = {
  getOverrides: (lifeGroupId: number): Promise<LifeGroupTaskOverride[]> =>
    api.get<LifeGroupTaskOverride[]>(`/life-groups/${lifeGroupId}/task-overrides`),

  putOverrides: (
    lifeGroupId: number,
    data: UpsertLifeGroupTaskOverridesRequest
  ): Promise<LifeGroupTaskOverride[]> =>
    api.put<LifeGroupTaskOverride[]>(`/life-groups/${lifeGroupId}/task-overrides`, data),

  getMembers: (lifeGroupId: number): Promise<LifeGroupTaskMember[]> =>
    api.get<LifeGroupTaskMember[]>(`/life-groups/${lifeGroupId}/task-members`),

  putMembers: (
    lifeGroupId: number,
    data: UpsertLifeGroupTaskMembersRequest
  ): Promise<LifeGroupTaskMember[]> =>
    api.put<LifeGroupTaskMember[]>(`/life-groups/${lifeGroupId}/task-members`, data),

  getSettings: (lifeGroupId: number): Promise<LifeGroupTaskSettings> =>
    api.get<LifeGroupTaskSettings>(`/life-groups/${lifeGroupId}/task-settings`),

  putSettings: (lifeGroupId: number, data: LifeGroupTaskSettings): Promise<LifeGroupTaskSettings> =>
    api.put<LifeGroupTaskSettings>(`/life-groups/${lifeGroupId}/task-settings`, data),

  getSkips: (lifeGroupId: number): Promise<LifeGroupTaskSkip[]> =>
    api.get<LifeGroupTaskSkip[]>(`/life-groups/${lifeGroupId}/task-skips`),

  addSkip: (lifeGroupId: number, meetingDate: string): Promise<LifeGroupTaskSkip> =>
    api.post<LifeGroupTaskSkip>(`/life-groups/${lifeGroupId}/task-skips`, {
      meeting_date: meetingDate,
    }),

  removeSkip: (lifeGroupId: number, meetingDate: string): Promise<void> =>
    api.delete<void>(`/life-groups/${lifeGroupId}/task-skips/${meetingDate}`),

  getMeeting: (lifeGroupId: number, date: string): Promise<LifeGroupTaskMeeting> =>
    api.get<LifeGroupTaskMeeting>(
      `/life-groups/${lifeGroupId}/tasks?date=${encodeURIComponent(date)}`
    ),

  generate: (
    lifeGroupId: number,
    data: GenerateLifeGroupTasksRequest
  ): Promise<GenerateLifeGroupTasksResponse> =>
    api.post<GenerateLifeGroupTasksResponse>(`/life-groups/${lifeGroupId}/tasks/generate`, data),

  reroll: (lifeGroupId: number, assignmentId: string): Promise<LifeGroupTaskAssignment> =>
    api.post<LifeGroupTaskAssignment>(`/life-groups/${lifeGroupId}/tasks/reroll`, {
      assignment_id: assignmentId,
    }),

  reassign: (
    lifeGroupId: number,
    assignmentId: string,
    userId: number
  ): Promise<LifeGroupTaskAssignment> =>
    api.patch<LifeGroupTaskAssignment>(`/life-groups/${lifeGroupId}/tasks/${assignmentId}`, {
      user_id: userId,
    }),
}

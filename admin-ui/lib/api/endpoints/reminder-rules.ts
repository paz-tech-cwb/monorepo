// admin-ui/lib/api/endpoints/reminder-rules.ts
import { api } from '../client'
import type { ReminderRule, UpdateReminderRuleRequest } from '../types'

export const reminderRulesApi = {
  getAll: () => api.get<ReminderRule[]>('/reminder-rules'),

  update: (id: number, data: UpdateReminderRuleRequest) =>
    api.patch<ReminderRule>(`/reminder-rules/${id}`, data),
}

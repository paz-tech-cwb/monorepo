'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { reminderRulesApi } from '@/lib/api/endpoints/reminder-rules'
import type { UpdateReminderRuleRequest } from '@/lib/api/types'
import { trackEvent } from '@/lib/firebase/analytics'

const QUERY_KEY = ['reminder-rules']

export function useReminderRules() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => reminderRulesApi.getAll(),
  })
}

export function useUpdateReminderRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateReminderRuleRequest }) =>
      reminderRulesApi.update(id, data),
    onSuccess: (rule) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent('reminder_rule_updated', { reminder_type: rule.type })
    },
    onError: () => {
      console.error('Failed to update reminder rule')
    },
  })
}

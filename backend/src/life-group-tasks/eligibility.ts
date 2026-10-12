import { DEFAULT_MIN_PRESENT_MEETINGS } from './entities/life-group-task-group-setting.entity';

export type EligibilitySource =
  | 'manual' // explicit member setting (true or false) always wins
  | 'leader' // leader / co-leader are established members
  | 'auto' // reached the required present-meeting count
  | 'pending'; // new member still below the required count

export interface EligibilityInput {
  // Explicit life_group_task_member_settings.eligible, or null/undefined when
  // there is no row for this (group, user).
  explicitEligible?: boolean | null;
  isLeaderOrCoLeader: boolean;
  // Count of present=true attendance entries for this user in this group.
  presentCount: number;
  minPresentMeetings?: number;
}

export interface EligibilityResult {
  eligible: boolean;
  source: EligibilitySource;
}

export function resolveEligibility(input: EligibilityInput): EligibilityResult {
  if (input.explicitEligible !== null && input.explicitEligible !== undefined) {
    return { eligible: input.explicitEligible, source: 'manual' };
  }
  if (input.isLeaderOrCoLeader) {
    return { eligible: true, source: 'leader' };
  }
  const min = input.minPresentMeetings ?? DEFAULT_MIN_PRESENT_MEETINGS;
  if (input.presentCount >= min) {
    return { eligible: true, source: 'auto' };
  }
  return { eligible: false, source: 'pending' };
}

import type { ReminderRule } from '../entities/reminder-rule.entity';
import type { ReminderRuleType } from '../types/reminder-config';

export interface ReminderEvaluator {
  readonly type: ReminderRuleType;
  /** Decide whether to fire for `now` and, if so, resolve targets + dispatch. */
  run(rule: ReminderRule, now: Date): Promise<void>;
}

export const REMINDER_EVALUATORS = Symbol('REMINDER_EVALUATORS');

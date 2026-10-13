import { Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ReminderDispatchLog } from './entities/reminder-dispatch-log.entity';
import type { ReminderRuleType } from './types/reminder-config';

const logger = new Logger('ReminderDispatchClaim');

/**
 * Claim-first dedupe for multi-instance safety: insert the ReminderDispatchLog
 * row BEFORE sending. Returns false when another run already holds the key
 * (unique violation 23505); any other error is rethrown. Same contract as
 * life-group-tasks/dispatch-claim.ts, parameterized by rule type.
 */
export async function claimReminderKey(
  em: EntityManager,
  ruleType: ReminderRuleType,
  dedupeKey: string,
): Promise<boolean> {
  try {
    await em.insert(ReminderDispatchLog, { ruleType, dedupeKey });
    return true;
  } catch (err: unknown) {
    if ((err as { code?: string }).code === '23505') return false;
    throw err;
  }
}

/** Best-effort release after a failed send so the next tick retries. */
export async function releaseReminderKey(
  em: EntityManager,
  ruleType: ReminderRuleType,
  dedupeKey: string,
): Promise<void> {
  try {
    await em.delete(ReminderDispatchLog, { ruleType, dedupeKey });
  } catch {
    logger.warn(`Could not release dispatch claim ${dedupeKey}`);
  }
}

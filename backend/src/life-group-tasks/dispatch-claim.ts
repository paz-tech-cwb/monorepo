import { Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ReminderDispatchLog } from '../reminders/entities/reminder-dispatch-log.entity';

const logger = new Logger('LifeGroupTaskDispatchClaim');

/**
 * Claim-first dedupe for multi-instance safety: insert the ReminderDispatchLog
 * row BEFORE sending. Returns false when another run already holds the key
 * (unique violation 23505); any other error is rethrown.
 */
export async function claimDispatchKey(
  em: EntityManager,
  dedupeKey: string,
): Promise<boolean> {
  try {
    await em.insert(ReminderDispatchLog, {
      ruleType: 'life_group_tasks',
      dedupeKey,
    });
    return true;
  } catch (err: unknown) {
    if ((err as { code?: string }).code === '23505') return false;
    throw err;
  }
}

/** Best-effort release after a failed send so the next tick retries. */
export async function releaseDispatchKey(
  em: EntityManager,
  dedupeKey: string,
): Promise<void> {
  try {
    await em.delete(ReminderDispatchLog, {
      ruleType: 'life_group_tasks',
      dedupeKey,
    });
  } catch {
    logger.warn(`Could not release dispatch claim ${dedupeKey}`);
  }
}

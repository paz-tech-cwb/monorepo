// Pure assignment engine: no DB, no clock, no global RNG. The service resolves
// eligibility, history and exclusions and passes them in.

export type Rng = () => number;

export interface EngineTask {
  templateId: number;
  // Users who must not receive this specific template (per-template exclusion).
  excludedUserIds: number[];
}

export interface AssignmentEngineInput {
  // Tasks still to assign, in sort_order.
  tasks: EngineTask[];
  // Already-resolved eligible user ids (leader/co-leader included by caller).
  pool: number[];
  // Historical assignment counts (skipped dates already excluded by caller).
  totalCounts: Record<number, number>;
  templateCounts: Record<number, Record<number, number>>; // userId -> templateId -> n
  // Users who already hold a task for this meeting (e.g. partial generation).
  alreadyAssignedUserIds: number[];
  rng?: Rng;
}

export interface EngineAssignment {
  templateId: number;
  userId: number;
}

export interface AssignmentEngineResult {
  assignments: EngineAssignment[];
  unassignableTemplateIds: number[];
}

// Deterministic RNG for tests (mulberry32).
export function createSeededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function minBy<T>(items: T[], score: (item: T) => number): T[] {
  let best = Infinity;
  let out: T[] = [];
  for (const item of items) {
    const s = score(item);
    if (s < best) {
      best = s;
      out = [item];
    } else if (s === best) {
      out.push(item);
    }
  }
  return out;
}

export function assignTasks(
  input: AssignmentEngineInput,
): AssignmentEngineResult {
  const rng = input.rng ?? Math.random;
  const pool = [...new Set(input.pool)].sort((a, b) => a - b);

  // How many tasks each user holds in this meeting so far. Preferring the
  // lowest count gives "one task each" while members remain, and starts a new
  // round (repeats) only once everyone in the candidate set has one.
  const meetingCounts = new Map<number, number>();
  for (const id of input.alreadyAssignedUserIds) {
    meetingCounts.set(id, (meetingCounts.get(id) ?? 0) + 1);
  }

  const assignments: EngineAssignment[] = [];
  const unassignableTemplateIds: number[] = [];

  for (const task of input.tasks) {
    const excluded = new Set(task.excludedUserIds);
    const base = pool.filter((id) => !excluded.has(id));
    if (base.length === 0) {
      unassignableTemplateIds.push(task.templateId);
      continue;
    }

    const leastThisMeeting = minBy(base, (id) => meetingCounts.get(id) ?? 0);
    const leastOverall = minBy(
      leastThisMeeting,
      (id) => input.totalCounts[id] ?? 0,
    );
    const candidates = minBy(
      leastOverall,
      (id) => input.templateCounts[id]?.[task.templateId] ?? 0,
    );

    const idx = Math.min(
      Math.floor(rng() * candidates.length),
      candidates.length - 1,
    );
    const userId = candidates[idx];
    assignments.push({ templateId: task.templateId, userId });
    meetingCounts.set(userId, (meetingCounts.get(userId) ?? 0) + 1);
  }

  return { assignments, unassignableTemplateIds };
}

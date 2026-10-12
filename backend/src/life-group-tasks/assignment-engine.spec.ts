import {
  AssignmentEngineInput,
  assignTasks,
  createSeededRng,
} from './assignment-engine';

const task = (templateId: number, excludedUserIds: number[] = []) => ({
  templateId,
  excludedUserIds,
});

const base = (over: Partial<AssignmentEngineInput>): AssignmentEngineInput => ({
  tasks: [task(1), task(2)],
  pool: [1, 2, 3, 4],
  totalCounts: {},
  templateCounts: {},
  alreadyAssignedUserIds: [],
  rng: createSeededRng(42),
  ...over,
});

describe('assignTasks', () => {
  it('is deterministic with a seeded RNG', () => {
    const a = assignTasks(base({ rng: createSeededRng(7) }));
    const b = assignTasks(base({ rng: createSeededRng(7) }));
    expect(a).toEqual(b);
  });

  it('gives each task to a different member when members >= tasks', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const { assignments } = assignTasks(
        base({
          tasks: [task(1), task(2), task(3)],
          rng: createSeededRng(seed),
        }),
      );
      expect(new Set(assignments.map((a) => a.userId)).size).toBe(3);
    }
  });

  it('prefers members with the fewest historical assignments', () => {
    const { assignments } = assignTasks(
      base({
        tasks: [task(1), task(2)],
        pool: [1, 2, 3, 4],
        totalCounts: { 1: 5, 2: 5, 3: 0, 4: 0 },
      }),
    );
    expect(assignments.map((a) => a.userId).sort()).toEqual([3, 4]);
  });

  it('prefers members who never did this template among the least-assigned', () => {
    const { assignments } = assignTasks(
      base({
        tasks: [task(1)],
        pool: [1, 2],
        totalCounts: { 1: 2, 2: 2 },
        templateCounts: { 1: { 1: 2 }, 2: { 2: 2 } },
      }),
    );
    expect(assignments).toEqual([{ templateId: 1, userId: 2 }]);
  });

  it('distributes fairly over many meetings', () => {
    const pool = [1, 2, 3, 4, 5];
    const totalCounts: Record<number, number> = {};
    const templateCounts: Record<number, Record<number, number>> = {};
    const rng = createSeededRng(99);
    for (let week = 0; week < 50; week++) {
      const { assignments } = assignTasks({
        tasks: [task(1), task(2), task(3)],
        pool,
        totalCounts,
        templateCounts,
        alreadyAssignedUserIds: [],
        rng,
      });
      for (const a of assignments) {
        totalCounts[a.userId] = (totalCounts[a.userId] ?? 0) + 1;
        templateCounts[a.userId] ??= {};
        templateCounts[a.userId][a.templateId] =
          (templateCounts[a.userId][a.templateId] ?? 0) + 1;
      }
    }
    const counts = pool.map((id) => totalCounts[id]);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    const total = counts.reduce((x, y) => x + y, 0);
    expect(total).toBe(150);
  });

  it('allows repeats in a new round when members < tasks', () => {
    const { assignments, unassignableTemplateIds } = assignTasks(
      base({ tasks: [task(1), task(2), task(3)], pool: [1, 2] }),
    );
    expect(unassignableTemplateIds).toEqual([]);
    const counts = assignments.reduce<Record<number, number>>((m, a) => {
      m[a.userId] = (m[a.userId] ?? 0) + 1;
      return m;
    }, {});
    expect(Object.values(counts).sort()).toEqual([1, 2]);
  });

  it('single member takes every task', () => {
    const { assignments } = assignTasks(base({ pool: [9] }));
    expect(assignments.map((a) => a.userId)).toEqual([9, 9]);
  });

  it('returns all tasks unassignable when the pool is empty', () => {
    const result = assignTasks(base({ pool: [] }));
    expect(result.assignments).toEqual([]);
    expect(result.unassignableTemplateIds).toEqual([1, 2]);
  });

  it('per-template exclusion only blocks that template', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const { assignments } = assignTasks(
        base({
          tasks: [task(1, [1]), task(2)],
          pool: [1, 2],
          rng: createSeededRng(seed),
        }),
      );
      expect(assignments.find((a) => a.templateId === 1)?.userId).toBe(2);
      expect(assignments.find((a) => a.templateId === 2)?.userId).toBe(1);
    }
  });

  it('leaves a task unassigned when all eligible members are excluded from it', () => {
    const result = assignTasks(
      base({ tasks: [task(1, [1, 2]), task(2)], pool: [1, 2] }),
    );
    expect(result.unassignableTemplateIds).toEqual([1]);
    expect(result.assignments.map((a) => a.templateId)).toEqual([2]);
  });

  it('skips members who already hold a task this meeting while others remain', () => {
    const { assignments } = assignTasks(
      base({
        tasks: [task(3)],
        pool: [1, 2, 3],
        alreadyAssignedUserIds: [1, 2],
      }),
    );
    expect(assignments).toEqual([{ templateId: 3, userId: 3 }]);
  });

  it('never assigns someone outside the pool (ineligible members)', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const { assignments } = assignTasks(
        base({
          pool: [2, 3],
          totalCounts: { 2: 100, 3: 100, 1: 0 },
          rng: createSeededRng(seed),
        }),
      );
      expect(assignments.every((a) => a.userId !== 1)).toBe(true);
    }
  });
});

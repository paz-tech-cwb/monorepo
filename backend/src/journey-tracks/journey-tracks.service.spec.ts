import { BadRequestException } from '@nestjs/common';
import { JourneyTracksService } from './journey-tracks.service';
import { JourneyTrack } from './entities/journey-track.entity';
import { JourneyTrackStep } from './entities/journey-track-step.entity';

type EntityRef = new (...args: unknown[]) => unknown;

function buildManagerMock(overrides: Record<string, unknown> = {}) {
  const manager = {
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    save: jest
      .fn()
      .mockImplementation((entityOrValue: unknown, maybeValue?: unknown) =>
        Promise.resolve(maybeValue ?? entityOrValue),
      ),
    create: jest
      .fn()
      .mockImplementation((_entity: unknown, value: unknown) => value),
    remove: jest
      .fn()
      .mockImplementation((_entity: unknown, value: unknown) =>
        Promise.resolve(value),
      ),
    transaction: undefined as unknown,
    ...overrides,
  };
  manager.transaction = jest
    .fn()
    .mockImplementation((cb: (m: typeof manager) => unknown) => cb(manager));
  return manager;
}

describe('JourneyTracksService - createStep/updateStep type/course_id consistency', () => {
  it('rejects creating a course_completion step without a course_id', async () => {
    const manager = buildManagerMock({
      findOne: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === JourneyTrack) return { id: 1 } as JourneyTrack;
        return null;
      }),
    });
    const service = new JourneyTracksService(manager as never);

    await expect(
      service.createStep(1, {
        type: 'course_completion',
        title: 'Completar curso X',
      } as never),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects creating a non-course_completion step that carries a course_id', async () => {
    const manager = buildManagerMock({
      findOne: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === JourneyTrack) return { id: 1 } as JourneyTrack;
        return null;
      }),
    });
    const service = new JourneyTracksService(manager as never);

    await expect(
      service.createStep(1, {
        type: 'manual_approval',
        title: 'Aprovação manual',
        course_id: '11111111-1111-1111-1111-111111111111',
      } as never),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects updating a step into course_completion without a course_id', async () => {
    const existingStep = {
      id: 10,
      trackId: 1,
      type: 'manual_approval',
      courseId: null,
      title: 'Old title',
    } as JourneyTrackStep;

    const manager = buildManagerMock({
      findOne: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === JourneyTrackStep) return existingStep;
        return null;
      }),
    });
    const service = new JourneyTracksService(manager as never);

    await expect(
      service.updateStep(1, 10, { type: 'course_completion' } as never),
    ).rejects.toThrow(BadRequestException);
  });

  it('allows creating a valid course_completion step with a course_id', async () => {
    const manager = buildManagerMock({
      findOne: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === JourneyTrack) return { id: 1 } as JourneyTrack;
        return null;
      }),
    });
    const service = new JourneyTracksService(manager as never);

    const result = await service.createStep(1, {
      type: 'course_completion',
      title: 'Completar curso X',
      course_id: '11111111-1111-1111-1111-111111111111',
    } as never);

    expect(result.type).toBe('course_completion');
    expect(result.course_id).toBe('11111111-1111-1111-1111-111111111111');
  });
});

describe('JourneyTracksService - reorderSteps', () => {
  it('rewrites sort_order for the given step_ids scoped to the track', async () => {
    const steps = [
      { id: 1, trackId: 1, sortOrder: 0 },
      { id: 2, trackId: 1, sortOrder: 1 },
      { id: 3, trackId: 1, sortOrder: 2 },
    ] as JourneyTrackStep[];

    const manager = buildManagerMock({
      findOne: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === JourneyTrack) return { id: 1 } as JourneyTrack;
        return null;
      }),
      find: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === JourneyTrackStep) return steps;
        return [];
      }),
    });
    const service = new JourneyTracksService(manager as never);

    await service.reorderSteps(1, { step_ids: [3, 1, 2] } as never);

    const step3 = steps.find((s) => s.id === 3)!;
    const step1 = steps.find((s) => s.id === 1)!;
    const step2 = steps.find((s) => s.id === 2)!;
    expect(step3.sortOrder).toBe(0);
    expect(step1.sortOrder).toBe(1);
    expect(step2.sortOrder).toBe(2);
  });

  it('rejects step_ids that belong to a different track', async () => {
    // Only steps 1 and 2 actually belong to track 1 — step 99 does not, so
    // the find() scoped by trackId returns fewer rows than requested ids.
    const stepsInTrack = [
      { id: 1, trackId: 1, sortOrder: 0 },
      { id: 2, trackId: 1, sortOrder: 1 },
    ] as JourneyTrackStep[];

    const manager = buildManagerMock({
      findOne: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === JourneyTrack) return { id: 1 } as JourneyTrack;
        return null;
      }),
      find: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === JourneyTrackStep) return stepsInTrack;
        return [];
      }),
    });
    const service = new JourneyTracksService(manager as never);

    await expect(
      service.reorderSteps(1, { step_ids: [1, 2, 99] } as never),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('JourneyTracksService - removeTrack', () => {
  it('removes the track and relies on the DB FK cascade to remove its steps', async () => {
    const track = { id: 1 } as JourneyTrack;
    const manager = buildManagerMock({
      findOne: jest.fn().mockImplementation((entity: EntityRef) => {
        if (entity === JourneyTrack) return track;
        return null;
      }),
    });
    const service = new JourneyTracksService(manager as never);

    await service.removeTrack(1);

    // The service must not manually delete steps one-by-one — deletion of
    // journey_track_steps is handled entirely by the ON DELETE CASCADE FK
    // (see CreateJourneyTracks migration), so `remove` is called exactly
    // once, for the track itself.
    expect(manager.remove).toHaveBeenCalledTimes(1);
    expect(manager.remove).toHaveBeenCalledWith(JourneyTrack, track);
  });
});

import { MemberJourneyService } from './member-journey.service';
import { User } from '../users/entities/user.entity';
import { MemberJourneyStage } from './entities/member-journey-stage.entity';

describe('MemberJourneyService', () => {
  const service = new MemberJourneyService({} as never);
  const user = {
    id: 1,
    name: 'Maria Silva',
    email: 'maria@example.com',
    lifeGroups: [],
  } as User;

  function stage(stageId: number, completed = true): MemberJourneyStage {
    return {
      stageId,
      completed,
      completedAt: completed ? new Date('2026-01-01T00:00:00.000Z') : null,
      note: null,
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    } as MemberJourneyStage;
  }

  it('calculates completion percentage from required steps regardless of order', () => {
    const response = service.buildMemberJourneyResponse(user, [
      stage(8),
      stage(1),
      stage(5),
    ]);

    expect(response.progress).toMatchObject({
      completion_percentage: 33,
      completed_required_steps: 3,
      total_required_steps: 9,
      is_complete: false,
    });
    expect(response.current_stage_id).toBe(2);
  });

  it('does not require optional life group leader track for overall completion', () => {
    const response = service.buildMemberJourneyResponse(
      user,
      Array.from({ length: 9 }, (_, index) => stage(index + 1)),
    );

    expect(response.progress).toMatchObject({
      completion_percentage: 100,
      completed_required_steps: 9,
      total_required_steps: 9,
      completed_optional_steps: 0,
      total_optional_steps: 1,
      is_complete: true,
    });
    expect(response.current_stage_id).toBe(9);
  });

  it('tracks optional completion separately', () => {
    const response = service.buildMemberJourneyResponse(user, [stage(10)]);

    expect(response.progress).toMatchObject({
      completion_percentage: 0,
      completed_required_steps: 0,
      completed_optional_steps: 1,
      total_optional_steps: 1,
      is_complete: false,
    });
  });

  describe('completeStageIfNotCompleted', () => {
    function buildManager(existingStage: Partial<MemberJourneyStage> | null) {
      const save = jest
        .fn()
        .mockImplementation(
          (_entity: unknown, value: Partial<MemberJourneyStage>) => value,
        );
      const manager = {
        findOne: jest.fn().mockResolvedValue(existingStage),
        create: jest
          .fn()
          .mockImplementation(
            (_entity: unknown, value: Partial<MemberJourneyStage>) => value,
          ),
        save,
      };
      return { manager, save };
    }

    it('is a no-op on an already-completed stage', async () => {
      const { manager, save } = buildManager({
        stageId: 3,
        completed: true,
        completedAt: new Date('2026-01-01T00:00:00.000Z'),
        note: 'already done',
      });
      const service = new MemberJourneyService(manager as never);

      await service.completeStageIfNotCompleted(1, 3, 'new note');

      expect(save).not.toHaveBeenCalled();
    });

    it('marks an incomplete stage as completed', async () => {
      const { manager, save } = buildManager(null);
      const service = new MemberJourneyService(manager as never);

      await service.completeStageIfNotCompleted(1, 3, 'done via course');

      expect(save).toHaveBeenCalledTimes(1);
      const calls = save.mock.calls as unknown[][];
      const savedStage = calls[0][1] as Partial<MemberJourneyStage>;
      expect(savedStage.completed).toBe(true);
      expect(savedStage.completedAt).toBeInstanceOf(Date);
      expect(savedStage.note).toBe('done via course');
    });

    it('rejects an invalid stage id', async () => {
      const { manager } = buildManager(null);
      const service = new MemberJourneyService(manager as never);

      await expect(
        service.completeStageIfNotCompleted(1, 999, null),
      ).rejects.toThrow('Invalid stage_id: 999');
    });
  });
});

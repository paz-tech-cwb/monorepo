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
});

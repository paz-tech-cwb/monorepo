import 'reflect-metadata';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { LifeGroupTaskTemplatesController } from './life-group-task-templates.controller';
import { LifeGroupTasksController } from './life-group-tasks.controller';
import { MyLifeGroupTasksController } from './my-life-group-tasks.controller';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { RolesGuard } from '../common/guards/roles.guard';
import { ScopeGuard } from '../forms-core/guards/scope.guard';

function guardNames(target: object): string[] {
  const guards = (Reflect.getMetadata(GUARDS_METADATA, target) ??
    []) as unknown[];
  return guards.map((g) => (typeof g === 'function' ? g.name : String(g)));
}

describe('life group task controllers: access metadata', () => {
  it('template CRUD is admin-only (admin slug, not pastor or leadership roles)', () => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      LifeGroupTaskTemplatesController,
    ) as string[];
    expect(roles).toEqual(['admin']);
    const names = guardNames(LifeGroupTaskTemplatesController);
    expect(names).toContain(RolesGuard.name);
  });

  it('group-scoped endpoints use ScopeGuard and no role restriction', () => {
    expect(guardNames(LifeGroupTasksController)).toContain(ScopeGuard.name);
    expect(
      Reflect.getMetadata(ROLES_KEY, LifeGroupTasksController),
    ).toBeUndefined();
  });

  it('member endpoints only require authentication (no ScopeGuard/Roles)', () => {
    const names = guardNames(MyLifeGroupTasksController);
    expect(names).toHaveLength(1);
    expect(names).not.toContain(ScopeGuard.name);
  });
});

import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../users/entities/user.entity';
import { LifeGroup } from '../../life-groups/entities/life-group.entity';
import { ScopeResolverService } from './scope-resolver.service';

describe('ScopeResolverService', () => {
  let service: ScopeResolverService;
  let userRepo: any;
  let lifeRepo: any;

  beforeEach(async () => {
    userRepo = { findOne: jest.fn() };
    lifeRepo = { find: jest.fn().mockResolvedValue([]) };
    const m = await Test.createTestingModule({
      providers: [
        ScopeResolverService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(LifeGroup), useValue: lifeRepo },
      ],
    }).compile();
    service = m.get(ScopeResolverService);
  });

  it('returns unrestricted for admin', async () => {
    userRepo.findOne.mockResolvedValue({ id: 1, role: { slug: 'admin' } });
    const scope = await service.resolve(1);
    expect(scope.unrestricted).toBe(true);
  });

  it('returns life-only scope for life_group_leader', async () => {
    userRepo.findOne.mockResolvedValue({
      id: 2,
      role: { slug: 'life_group_leader' },
      leadingLifeGroup: { id: 5 },
    });
    const scope = await service.resolve(2);
    expect(scope).toMatchObject({ unrestricted: false, lifeGroupIds: [5] });
  });
});

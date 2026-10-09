import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { LifeGroupsService } from './life-groups.service';
import { LifeGroup } from './entities/life-group.entity';
import { User } from '../users/entities/user.entity';

function makeQueryBuilder(result: LifeGroup[]) {
  const qb: Record<string, jest.Mock> = {
    leftJoinAndSelect: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    take: jest.fn(),
    getMany: jest.fn().mockResolvedValue(result),
  };
  qb.leftJoinAndSelect.mockReturnValue(qb);
  qb.where.mockReturnValue(qb);
  qb.orderBy.mockReturnValue(qb);
  qb.take.mockReturnValue(qb);
  return qb;
}

describe('LifeGroupsService', () => {
  let service: LifeGroupsService;
  let mockEntityManager: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  const viewer = { id: 999, role: { slug: 'member' } } as unknown as User;

  const groupAlpha = {
    id: 1,
    name: 'Alpha Group',
    leader: { id: 1, name: 'Leader One', phoneNumber: null } as User,
    coLeader: null,
    sector: null,
    location: null,
    latitude: null,
    longitude: null,
    city: null,
    neighborhood: null,
    state: null,
    kidsCount: 0,
    meetingDay: null,
    meetingTime: null,
    users: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as LifeGroup;

  const groupBeta = {
    id: 2,
    name: 'Beta Group',
    leader: { id: 2, name: 'Carlos Silva', phoneNumber: null } as User,
    coLeader: { id: 3, name: 'Fernanda Souza', phoneNumber: null } as User,
    sector: null,
    location: null,
    latitude: null,
    longitude: null,
    city: null,
    neighborhood: null,
    state: null,
    kidsCount: 0,
    meetingDay: null,
    meetingTime: null,
    users: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as LifeGroup;

  beforeEach(async () => {
    mockEntityManager = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LifeGroupsService,
        { provide: getEntityManagerToken(), useValue: mockEntityManager },
      ],
    }).compile();

    service = module.get<LifeGroupsService>(LifeGroupsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('returns all groups when no search term is provided', async () => {
      mockEntityManager.find.mockResolvedValue([groupAlpha, groupBeta]);

      const result = await service.findAll(viewer);

      expect(mockEntityManager.find).toHaveBeenCalledWith(LifeGroup, {
        relations: ['leader', 'coLeader', 'sector', 'users'],
        order: { name: 'ASC' },
      });
      expect(result).toHaveLength(2);
      expect(mockEntityManager.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('matches case-insensitively on group name', async () => {
      const qb = makeQueryBuilder([groupAlpha]);
      mockEntityManager.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(viewer, 'ALPHA');

      expect(qb.where).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(lg.name) LIKE :term'),
        { term: '%alpha%' },
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('caps search results at 30 rows, mirroring the search() endpoint', async () => {
      const qb = makeQueryBuilder([groupAlpha]);
      mockEntityManager.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(viewer, 'Alpha');

      expect(qb.take).toHaveBeenCalledWith(30);
    });

    it('matches on leader name', async () => {
      const qb = makeQueryBuilder([groupBeta]);
      mockEntityManager.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(viewer, 'Carlos');

      expect(qb.where).toHaveBeenCalledWith(expect.any(String), {
        term: '%carlos%',
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(2);
    });

    it('matches on co-leader name', async () => {
      const qb = makeQueryBuilder([groupBeta]);
      mockEntityManager.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(viewer, 'Fernanda');

      expect(qb.where).toHaveBeenCalledWith(expect.any(String), {
        term: '%fernanda%',
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(2);
    });

    it('omits members for a non-member viewer regardless of search usage (privacy regression guard)', async () => {
      const groupWithMembers = {
        ...groupAlpha,
        users: [{ id: 42, name: 'Someone Else', email: 'a@b.com' }],
      } as unknown as LifeGroup;

      mockEntityManager.find.mockResolvedValue([groupWithMembers]);
      const resultNoSearch = await service.findAll(viewer);
      expect(resultNoSearch[0].members).toBeNull();

      const qb = makeQueryBuilder([groupWithMembers]);
      mockEntityManager.createQueryBuilder.mockReturnValue(qb);
      const resultWithSearch = await service.findAll(viewer, 'Alpha');
      expect(resultWithSearch[0].members).toBeNull();
    });
  });

  describe('search (untouched ?q= endpoint)', () => {
    it('still returns only {id, name} and uses its own query shape', async () => {
      const qb = makeQueryBuilder([groupAlpha]);
      mockEntityManager.createQueryBuilder.mockReturnValue(qb);

      const result = await service.search('Alpha');

      expect(qb.where).toHaveBeenCalledWith('LOWER(lg.name) LIKE :term', {
        term: '%alpha%',
      });
      expect(qb.take).toHaveBeenCalledWith(30);
      expect(qb.leftJoinAndSelect).not.toHaveBeenCalled();
      expect(result).toEqual([{ id: 1, name: 'Alpha Group' }]);
    });
  });
});

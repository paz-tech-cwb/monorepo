import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { LifeGroupsService } from './life-groups.service';
import { LifeGroup } from './entities/life-group.entity';
import { User } from '../users/entities/user.entity';

function makeQueryBuilder(result: LifeGroup[], rawRows: unknown[] = []) {
  const qb: Record<string, jest.Mock> = {
    leftJoinAndSelect: jest.fn(),
    leftJoin: jest.fn(),
    innerJoin: jest.fn(),
    select: jest.fn(),
    addSelect: jest.fn(),
    where: jest.fn(),
    orWhere: jest.fn(),
    orderBy: jest.fn(),
    take: jest.fn(),
    getMany: jest.fn().mockResolvedValue(result),
    getRawMany: jest.fn().mockResolvedValue(rawRows),
  };
  for (const k of [
    'leftJoinAndSelect',
    'leftJoin',
    'innerJoin',
    'select',
    'addSelect',
    'where',
    'orWhere',
    'orderBy',
    'take',
  ]) {
    qb[k].mockReturnValue(qb);
  }
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

  describe('findMine (supervisor visibility)', () => {
    const me = { id: 50, role: { slug: 'area_leader' } } as unknown as User;
    const group = (id: number, extra: Record<string, unknown> = {}) =>
      ({
        ...groupAlpha,
        id,
        name: `G${id}`,
        leader: { id: 1, name: 'L', phoneNumber: null },
        coLeader: null,
        users: [{ id: 7, name: 'Roster', email: 'r@x.com' }],
        sector: { id: 10 },
        ...extra,
      }) as unknown as LifeGroup;

    it('queries leader, co-leader, sector/area supervision and roster in one query', async () => {
      const qb = makeQueryBuilder([]);
      mockEntityManager.createQueryBuilder.mockReturnValue(qb);
      await service.findMine(me);
      expect(mockEntityManager.createQueryBuilder).toHaveBeenCalledTimes(1);
      const clauses = [
        ...(qb.where.mock.calls as string[][]).map((c) => c[0]),
        ...(qb.orWhere.mock.calls as string[][]).map((c) => c[0]),
      ].join(' | ');
      for (const needle of [
        'leader.id',
        'coLeader.id',
        'sectorLeader.id',
        'sectorCoLeader.id',
        'areaLeader.id',
        'areaCoLeader.id',
        'user_life_groups',
      ]) {
        expect(clauses).toContain(needle);
      }
    });

    it('marks a group in a sector the viewer leads as supervisor, with the roster visible', async () => {
      const qb = makeQueryBuilder([
        group(1, { sector: { id: 10, leader: { id: 50 } } }),
      ]);
      mockEntityManager.createQueryBuilder.mockReturnValue(qb);
      const [r] = await service.findMine(me);
      expect(r.relationship).toBe('supervisor');
      expect(r.is_supervised).toBe(true);
      expect(r.members).toEqual([{ id: 7, name: 'Roster', email: 'r@x.com' }]);
    });

    it.each([
      ['sector co-leader', { sector: { id: 10, coLeader: { id: 50 } } }],
      [
        'area leader',
        { sector: { id: 10, area: { id: 3, leader: { id: 50 } } } },
      ],
      [
        'area co-leader',
        { sector: { id: 10, area: { id: 3, coLeader: { id: 50 } } } },
      ],
    ])('supervisor via %s', async (_label, extra) => {
      const qb = makeQueryBuilder([group(1, extra)]);
      mockEntityManager.createQueryBuilder.mockReturnValue(qb);
      const [r] = await service.findMine(me);
      expect(r.relationship).toBe('supervisor');
      expect(r.is_supervised).toBe(true);
    });

    it('precedence: leader beats co_leader beats supervisor beats member', async () => {
      const supervisedSector = { id: 10, leader: { id: 50 } };
      const qb = makeQueryBuilder([
        group(1, {
          leader: { id: 50, name: 'Me' },
          sector: supervisedSector,
        }),
        group(2, {
          coLeader: { id: 50, name: 'Me' },
          sector: supervisedSector,
        }),
        group(3, { sector: supervisedSector }),
        group(4, {
          users: [{ id: 50, name: 'Me', email: 'm@x.com' }],
          sector: { id: 11 },
        }),
      ]);
      mockEntityManager.createQueryBuilder.mockReturnValue(qb);
      const result = await service.findMine(me);
      expect(result.map((r) => r.relationship)).toEqual([
        'leader',
        'co_leader',
        'supervisor',
        'member',
      ]);
      // is_supervised stays true when a stronger relationship wins
      expect(result.map((r) => r.is_supervised)).toEqual([
        true,
        true,
        true,
        false,
      ]);
    });

    it('a plain member is not widened: relationship member, not supervised, roster hidden for others only', async () => {
      const plain = { id: 60, role: { slug: 'member' } } as unknown as User;
      const qb = makeQueryBuilder([
        group(4, {
          users: [{ id: 60, name: 'Me', email: 'm@x.com' }],
          sector: { id: 11, leader: { id: 1 } },
        }),
      ]);
      mockEntityManager.createQueryBuilder.mockReturnValue(qb);
      const [r] = await service.findMine(plain);
      expect(r.relationship).toBe('member');
      expect(r.is_supervised).toBe(false);
      expect(r.member_count).toBe(1);
    });

    it('keeps the existing response fields (only relationship/is_supervised are new)', async () => {
      const qb = makeQueryBuilder([group(1)]);
      mockEntityManager.createQueryBuilder.mockReturnValue(qb);
      const [r] = await service.findMine(me);
      mockEntityManager.find.mockResolvedValue([group(1)]);
      const [legacy] = await service.findAll(me);
      expect(Object.keys(r).filter((k) => !(k in legacy))).toEqual([
        'relationship',
        'is_supervised',
      ]);
      expect(Object.keys(legacy).every((k) => k in r)).toBe(true);
    });
  });

  describe('findOne (supervisor roster)', () => {
    const me = { id: 50, role: { slug: 'member' } } as unknown as User;
    const withRoster = {
      ...groupAlpha,
      id: 9,
      users: [{ id: 7, name: 'Roster', email: 'r@x.com' }],
    } as unknown as LifeGroup;

    it('shows the roster to a viewer who supervises the group (even without a leader slug)', async () => {
      mockEntityManager.findOne.mockResolvedValue(withRoster);
      mockEntityManager.createQueryBuilder.mockReturnValue(
        makeQueryBuilder([], [{ id: '9' }]),
      );
      const r = await service.findOne(9, me);
      expect(r.members).toEqual([{ id: 7, name: 'Roster', email: 'r@x.com' }]);
    });

    it('still hides the roster from an unrelated viewer', async () => {
      mockEntityManager.findOne.mockResolvedValue(withRoster);
      mockEntityManager.createQueryBuilder.mockReturnValue(
        makeQueryBuilder([], []),
      );
      const r = await service.findOne(9, me);
      expect(r.members).toBeNull();
    });
  });

  describe('create', () => {
    it('persists image_url and round-trips it in the response', async () => {
      mockEntityManager.create.mockReturnValue({ id: 10 });
      mockEntityManager.save.mockResolvedValue({ id: 10 });
      mockEntityManager.findOne.mockResolvedValue({
        ...groupAlpha,
        id: 10,
        imageUrl: 'https://example.com/photo.jpg',
      });

      const result = await service.create({
        name: 'Alpha Group',
        image_url: 'https://example.com/photo.jpg',
      } as never);

      expect(mockEntityManager.create).toHaveBeenCalledWith(
        LifeGroup,
        expect.objectContaining({ imageUrl: 'https://example.com/photo.jpg' }),
      );
      expect(result.image_url).toBe('https://example.com/photo.jpg');
    });

    it('stays null when image_url is omitted', async () => {
      mockEntityManager.create.mockReturnValue({ id: 11 });
      mockEntityManager.save.mockResolvedValue({ id: 11 });
      mockEntityManager.findOne.mockResolvedValue({
        ...groupAlpha,
        id: 11,
        imageUrl: null,
      });

      const result = await service.create({ name: 'Alpha Group' } as never);

      expect(mockEntityManager.create).toHaveBeenCalledWith(
        LifeGroup,
        expect.objectContaining({ imageUrl: null }),
      );
      expect(result.image_url).toBeNull();
    });
  });

  describe('update', () => {
    it('updates image_url and round-trips it in the response', async () => {
      const existing = {
        ...groupAlpha,
        imageUrl: null,
      } as unknown as LifeGroup;
      mockEntityManager.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce({
          ...existing,
          imageUrl: 'https://example.com/new.jpg',
        });
      mockEntityManager.save.mockResolvedValue(existing);

      const result = await service.update(1, {
        image_url: 'https://example.com/new.jpg',
      } as never);

      expect(result.image_url).toBe('https://example.com/new.jpg');
    });

    it('leaves image_url untouched when not provided in the update payload', async () => {
      const existing = {
        ...groupAlpha,
        imageUrl: 'https://example.com/keep.jpg',
      } as unknown as LifeGroup;
      mockEntityManager.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(existing);
      mockEntityManager.save.mockResolvedValue(existing);

      await service.update(1, { name: 'Renamed' } as never);

      expect(mockEntityManager.save).toHaveBeenCalledWith(
        LifeGroup,
        expect.objectContaining({ imageUrl: 'https://example.com/keep.jpg' }),
      );
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

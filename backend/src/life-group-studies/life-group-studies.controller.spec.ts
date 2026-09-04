import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { LifeGroupStudiesController } from './life-group-studies.controller';
import { LifeGroupStudiesService } from './life-group-studies.service';
import { User } from '../users/entities/user.entity';

describe('LifeGroupStudiesController', () => {
  let controller: LifeGroupStudiesController;

  const mockService = {
    create: jest.fn(),
    findAllPaginated: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    listPublishers: jest.fn(),
    grantPublisher: jest.fn(),
    revokePublisher: jest.fn(),
  };

  const memberUser = { id: 5, role: { slug: 'member' } } as unknown as User;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LifeGroupStudiesController],
      providers: [{ provide: LifeGroupStudiesService, useValue: mockService }],
    }).compile();

    controller = module.get<LifeGroupStudiesController>(
      LifeGroupStudiesController,
    );
  });

  it('registers AuthGuard(jwt) at the controller level', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      LifeGroupStudiesController,
    ) as unknown[];
    expect(guards).toBeDefined();
    expect(guards).toHaveLength(1);
  });

  it('create() rejects a publish-forbidden user by surfacing the service error', async () => {
    mockService.create.mockRejectedValue(
      new ForbiddenException(
        'You are not allowed to publish Estudo do Life content.',
      ),
    );

    await expect(
      controller.create({ title: 't', author: 'a', bodyMarkdown: 'b' } as any, {
        user: memberUser,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(mockService.create).toHaveBeenCalledWith(
      { title: 't', author: 'a', bodyMarkdown: 'b' },
      memberUser,
    );
  });

  it('create() succeeds and serializes to snake_case for a publish-allowed user', async () => {
    const leaderUser = {
      id: 1,
      role: { slug: 'life_group_leader' },
    } as unknown as User;
    mockService.create.mockResolvedValue({
      id: 'uuid-1',
      imageUrl: null,
      title: 't',
      author: 'a',
      bodyMarkdown: 'b',
      publishedById: 1,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    });

    const result = await controller.create(
      { title: 't', author: 'a', bodyMarkdown: 'b' } as any,
      { user: leaderUser },
    );

    expect(result.title).toBe('t');
    expect(mockService.create).toHaveBeenCalledWith(
      { title: 't', author: 'a', bodyMarkdown: 'b' },
      leaderUser,
    );
  });

  it('listPublishers()/grantPublisher()/revokePublisher() require the admin role', () => {
    /* eslint-disable @typescript-eslint/unbound-method */
    const listRoles = Reflect.getMetadata(
      'roles',
      LifeGroupStudiesController.prototype.listPublishers,
    ) as string[];
    const grantRoles = Reflect.getMetadata(
      'roles',
      LifeGroupStudiesController.prototype.grantPublisher,
    ) as string[];
    const revokeRoles = Reflect.getMetadata(
      'roles',
      LifeGroupStudiesController.prototype.revokePublisher,
    ) as string[];
    /* eslint-enable @typescript-eslint/unbound-method */
    expect(listRoles).toEqual(['admin']);
    expect(grantRoles).toEqual(['admin']);
    expect(revokeRoles).toEqual(['admin']);
  });
});

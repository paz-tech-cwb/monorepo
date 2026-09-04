import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { LifeGroupStudiesService } from './life-group-studies.service';
import { LifeGroupStudyAccessService } from './life-group-study-access.service';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import { LifeGroupStudy } from './entities/life-group-study.entity';
import { UpdateLifeGroupStudyDto } from './dto/update-life-group-study.dto';
import { LifeGroupStudyPublisher } from './entities/life-group-study-publisher.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';

describe('LifeGroupStudiesService', () => {
  const adminRole = { id: 1, slug: 'admin' } as Role;
  const memberRole = { id: 2, slug: 'member' } as Role;

  const makeUser = (overrides: Partial<User> = {}): User =>
    ({
      id: 1,
      role: memberRole,
      ...overrides,
    }) as User;

  const makeStudy = (overrides: Partial<LifeGroupStudy> = {}): LifeGroupStudy =>
    ({
      id: 'study-1',
      imageUrl: null,
      title: 'Original title',
      author: 'Original author',
      bodyMarkdown: 'body',
      publishedById: 1,
      ...overrides,
    }) as LifeGroupStudy;

  function createService(
    entityManagerOverrides: Partial<EntityManager> = {},
    accessOverrides: Partial<LifeGroupStudyAccessService> = {},
  ) {
    const entityManagerMock = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn((_entity: unknown, value: unknown) => value),
      save: jest.fn((...args: unknown[]) =>
        Promise.resolve(args.length > 1 ? args[1] : args[0]),
      ),
      remove: jest.fn((_entity: unknown, value: unknown) =>
        Promise.resolve(value),
      ),
      ...entityManagerOverrides,
    };

    const accessService = {
      canPublish: jest.fn().mockResolvedValue(true),
      canView: jest.fn().mockResolvedValue(true),
      resolveNotificationRecipients: jest.fn().mockResolvedValue([]),
      ...accessOverrides,
    } as unknown as LifeGroupStudyAccessService;

    const dispatchService = {
      dispatch: jest.fn().mockResolvedValue(undefined),
    } as unknown as NotificationDispatchService;

    const service = new LifeGroupStudiesService(
      entityManagerMock as unknown as EntityManager,
      accessService,
      dispatchService,
    );

    return {
      service,
      entityManager: entityManagerMock,
      accessService,
      dispatchService,
    };
  }

  describe('update', () => {
    it('allows the owner to update the study', async () => {
      const owner = makeUser({ id: 1, role: memberRole });
      const study = makeStudy({ publishedById: 1 });
      const { service, entityManager } = createService({
        findOne: jest.fn().mockResolvedValue(study),
      });

      const result = await service.update(
        'study-1',
        { title: 'Updated title' } as UpdateLifeGroupStudyDto,
        owner,
      );

      expect(result.title).toBe('Updated title');
      expect(entityManager.save).toHaveBeenCalled();
    });

    it('allows an admin to update a study they do not own', async () => {
      const admin = makeUser({ id: 99, role: adminRole });
      const study = makeStudy({ publishedById: 1 });
      const { service, entityManager } = createService({
        findOne: jest.fn().mockResolvedValue(study),
      });

      const result = await service.update(
        'study-1',
        { title: 'Admin update' } as UpdateLifeGroupStudyDto,
        admin,
      );

      expect(result.title).toBe('Admin update');
      expect(entityManager.save).toHaveBeenCalled();
    });

    it('rejects a non-owner, non-admin user', async () => {
      const otherUser = makeUser({ id: 2, role: memberRole });
      const study = makeStudy({ publishedById: 1 });
      const { service } = createService({
        findOne: jest.fn().mockResolvedValue(study),
      });

      await expect(
        service.update(
          'study-1',
          { title: 'Nope' } as UpdateLifeGroupStudyDto,
          otherUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('allows the owner to delete the study', async () => {
      const owner = makeUser({ id: 1, role: memberRole });
      const study = makeStudy({ publishedById: 1 });
      const { service, entityManager } = createService({
        findOne: jest.fn().mockResolvedValue(study),
      });

      await service.remove('study-1', owner);

      expect(entityManager.remove).toHaveBeenCalledWith(LifeGroupStudy, study);
    });

    it('allows an admin to delete a study they do not own', async () => {
      const admin = makeUser({ id: 99, role: adminRole });
      const study = makeStudy({ publishedById: 1 });
      const { service, entityManager } = createService({
        findOne: jest.fn().mockResolvedValue(study),
      });

      await service.remove('study-1', admin);

      expect(entityManager.remove).toHaveBeenCalledWith(LifeGroupStudy, study);
    });

    it('rejects a non-owner, non-admin user', async () => {
      const otherUser = makeUser({ id: 2, role: memberRole });
      const study = makeStudy({ publishedById: 1 });
      const { service } = createService({
        findOne: jest.fn().mockResolvedValue(study),
      });

      await expect(service.remove('study-1', otherUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('create', () => {
    it('resolves with the saved study even when leadership notification dispatch fails', async () => {
      const author = makeUser({ id: 1, role: adminRole });
      const leader = makeUser({ id: 2, role: adminRole });
      const { service, entityManager, dispatchService } = createService(
        {},
        {
          resolveNotificationRecipients: jest.fn().mockResolvedValue([leader]),
        },
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const dispatchMock = dispatchService.dispatch as jest.Mock;
      dispatchMock.mockRejectedValue(new Error('dispatch boom'));
      const loggerInstance = (
        service as unknown as { logger: { error: (message: string) => void } }
      ).logger;
      const loggerErrorSpy = jest
        .spyOn(loggerInstance, 'error')
        .mockImplementation(() => undefined);

      const result = await service.create(
        {
          title: 'New study',
          author: 'Author',
          bodyMarkdown: 'body',
        } as never,
        author,
      );

      expect(result).toMatchObject({ title: 'New study', publishedById: 1 });
      expect(entityManager.save).toHaveBeenCalled();
      expect(dispatchMock).toHaveBeenCalled();
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to notify leadership'),
      );
    });
  });

  describe('grantPublisher', () => {
    it('rejects granting to a nonexistent user', async () => {
      const findOne = jest.fn().mockImplementation((entity) => {
        if (entity === User) return Promise.resolve(null);
        if (entity === LifeGroupStudyPublisher) {
          throw new Error(
            'should not check for an existing grant before confirming the user exists',
          );
        }
        return Promise.resolve(null);
      });
      const { service } = createService({ findOne });

      await expect(service.grantPublisher(404, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('grants publisher access to an existing user', async () => {
      const targetUser = makeUser({ id: 5 });
      const findOne = jest.fn().mockImplementation((entity) => {
        if (entity === User) return Promise.resolve(targetUser);
        if (entity === LifeGroupStudyPublisher) return Promise.resolve(null);
        return Promise.resolve(null);
      });
      const { service, entityManager } = createService({ findOne });

      const result = await service.grantPublisher(5, 1);

      expect(entityManager.save).toHaveBeenCalled();
      expect(result).toMatchObject({ userId: 5, grantedById: 1 });
    });
  });

  describe('revokePublisher', () => {
    it('revokes an existing grant', async () => {
      const grant = { id: 'grant-1', userId: 5 } as LifeGroupStudyPublisher;
      const findOne = jest.fn().mockResolvedValue(grant);
      const { service, entityManager } = createService({ findOne });

      await service.revokePublisher(5);

      expect(entityManager.remove).toHaveBeenCalledWith(
        LifeGroupStudyPublisher,
        grant,
      );
    });

    it('throws NotFoundException when the grant does not exist', async () => {
      const findOne = jest.fn().mockResolvedValue(null);
      const { service } = createService({ findOne });

      await expect(service.revokePublisher(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

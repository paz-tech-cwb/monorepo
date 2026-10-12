import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { LifeGroupStudiesService } from './life-group-studies.service';
import { LifeGroupStudyAccessService } from './life-group-study-access.service';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import { LifeGroupStudy } from './entities/life-group-study.entity';
import { UpdateLifeGroupStudyDto } from './dto/update-life-group-study.dto';
import { LifeGroupStudyPublisher } from './entities/life-group-study-publisher.entity';
import { User } from '../users/entities/user.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { Role } from '../roles/entities/role.entity';

const dto2 = () => ({ title: 'T', author: 'A', bodyMarkdown: 'b' }) as never;

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

  const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

  describe('create', () => {
    it('resolves with the saved study even when audience notification dispatch fails', async () => {
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

      await flushPromises();

      expect(result).toMatchObject({ title: 'New study', publishedById: 1 });
      expect(entityManager.save).toHaveBeenCalled();
      expect(dispatchMock).toHaveBeenCalled();
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to notify audience'),
      );
    });
  });

  describe('publish notification', () => {
    const dto = { title: 'T', author: 'A', bodyMarkdown: 'b' } as never;

    it('pushes the study deep link to the resolved audience, excluding the publisher', async () => {
      const publisher = makeUser({ id: 1, role: adminRole });
      const recipients = [makeUser({ id: 2 }), makeUser({ id: 3 })];
      const { service, entityManager, accessService, dispatchService } =
        createService(
          {},
          {
            resolveNotificationRecipients: jest
              .fn()
              .mockResolvedValue(recipients),
          },
        );

      await service.create(dto, publisher);
      await flushPromises();

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(accessService.resolveNotificationRecipients).toHaveBeenCalledWith(
        1,
      );
      const createCalls = (entityManager.create as jest.Mock).mock
        .calls as unknown[][];
      const created = createCalls.find((c) => c[0] === Notification)?.[1];
      expect(created).toMatchObject({
        category: 'life_group_study',
        channels: ['push'],
        deepLink: expect.stringMatching(/^paz:\/\/estudo-do-life\//) as string,
        segment: { type: 'filtered', filters: { user_ids: [2, 3] } },
      });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(dispatchService.dispatch).toHaveBeenCalledTimes(1);
      const dispatchCalls = (dispatchService.dispatch as jest.Mock).mock
        .calls as unknown[][];
      expect(dispatchCalls[0][1]).toBe(recipients);
    });

    it('does not block the create response on a slow dispatch', async () => {
      const publisher = makeUser({ id: 1, role: adminRole });
      const { service, dispatchService } = createService(
        {},
        {
          resolveNotificationRecipients: jest
            .fn()
            .mockResolvedValue([makeUser({ id: 2 })]),
        },
      );
      (dispatchService.dispatch as jest.Mock).mockReturnValue(
        new Promise(() => undefined),
      );

      const result = await service.create(dto, publisher);

      expect(result).toMatchObject({ publishedById: 1 });
    });

    it('does not persist or dispatch a notification when there are no recipients', async () => {
      const publisher = makeUser({ id: 1, role: adminRole });
      const { service, entityManager, dispatchService } = createService(
        {},
        { resolveNotificationRecipients: jest.fn().mockResolvedValue([]) },
      );

      await service.create(dto, publisher);
      await flushPromises();

      const createCalls = (entityManager.create as jest.Mock).mock
        .calls as unknown[][];
      expect(createCalls.some((c) => c[0] === Notification)).toBe(false);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(dispatchService.dispatch).not.toHaveBeenCalled();
    });

    it('does not notify again on update (push happens once, at publish)', async () => {
      const owner = makeUser({ id: 1, role: memberRole });
      const { service, dispatchService, accessService } = createService({
        findOne: jest.fn().mockResolvedValue(makeStudy({ publishedById: 1 })),
      });

      await service.update(
        'study-1',
        { title: 'Edited' } as UpdateLifeGroupStudyDto,
        owner,
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(dispatchService.dispatch).not.toHaveBeenCalled();
      expect(
        // eslint-disable-next-line @typescript-eslint/unbound-method
        accessService.resolveNotificationRecipients,
      ).not.toHaveBeenCalled();
    });
  });

  describe('assigned writer (member role with a publisher grant)', () => {
    it('can create a study when canPublish is true despite the member role slug', async () => {
      const writer = makeUser({ id: 9, role: memberRole });
      const { service } = createService();

      await expect(service.create(dto2(), writer)).resolves.toMatchObject({
        publishedById: 9,
      });
    });

    it('cannot create when canPublish is false', async () => {
      const { service } = createService(
        {},
        { canPublish: jest.fn().mockResolvedValue(false) },
      );
      await expect(
        service.create(dto2(), makeUser({ id: 9, role: memberRole })),
      ).rejects.toThrow(ForbiddenException);
    });

    it('a publisher whose grant was revoked can no longer edit or delete their study', async () => {
      const writer = makeUser({ id: 9, role: memberRole });
      const { service } = createService(
        {
          findOne: jest.fn().mockResolvedValue(makeStudy({ publishedById: 9 })),
        },
        { canPublish: jest.fn().mockResolvedValue(false) },
      );
      await expect(
        service.update(
          'study-1',
          { title: 'x' } as UpdateLifeGroupStudyDto,
          writer,
        ),
      ).rejects.toThrow(ForbiddenException);
      await expect(service.remove('study-1', writer)).rejects.toThrow(
        ForbiddenException,
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

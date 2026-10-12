import { NotificationDispatchService } from './notification-dispatch.service';
import {
  Notification,
  NotificationCategory,
} from './entities/notification.entity';
import { User } from '../users/entities/user.entity';

describe('NotificationDispatchService', () => {
  const findOne = jest.fn().mockResolvedValue(null);
  const entityManager = {
    update: jest.fn(),
    findOne,
  } as never;
  const sendToUser = jest.fn().mockResolvedValue(true);
  const fcmService = { sendToUser } as never;
  const emailService = {
    sendToUser: jest.fn().mockResolvedValue(true),
  } as never;
  const smsService = {
    sendToUser: jest.fn().mockResolvedValue(true),
  } as never;
  const whatsAppService = {
    sendToUser: jest.fn().mockResolvedValue(true),
  } as never;

  const makeNotification = (
    overrides: Partial<Notification> = {},
  ): Notification =>
    ({
      id: 1,
      title: 'Title',
      message: 'Message',
      channels: ['push'],
      deepLink: null,
      ...overrides,
    }) as Notification;

  const makeUser = (): User => ({ id: 1, email: 'a@b.com' }) as User;

  beforeEach(() => {
    jest.clearAllMocks();
    findOne.mockResolvedValue(null);
  });

  it('includes channel_id for the forms category and forwards androidChannelId to FCM', async () => {
    const service = new NotificationDispatchService(
      entityManager,
      fcmService,
      emailService,
      smsService,
      whatsAppService,
    );

    const notification = makeNotification({ category: 'forms' });
    await service.dispatch(notification, [makeUser()]);

    /* eslint-disable @typescript-eslint/no-unsafe-assignment -- jest matcher typing */
    expect(sendToUser).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({ channel_id: 'paz_admin_alerts' }),
        androidChannelId: 'paz_admin_alerts',
      }),
    );
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */
  });

  it('includes channel_id for the events category and omits deep_link when absent', async () => {
    const service: NotificationDispatchService =
      new NotificationDispatchService(
        entityManager,
        fcmService,
        emailService,
        smsService,
        whatsAppService,
      );

    const notification = makeNotification({
      category: 'events',
      deepLink: null,
    });
    await service.dispatch(notification, [makeUser()]);

    const call = sendToUser.mock.calls[0] as [
      number,
      { data: Record<string, string> },
    ];
    expect(call[1].data.channel_id).toBe('paz_events');
    expect(call[1].data.deep_link).toBeUndefined();
  });
  describe('deep_link payload key (contract with Android/iOS tap routing)', () => {
    const cases: Array<[NotificationCategory, string]> = [
      ['life_group_attendance', 'paz://presenca/42/2026-10-05'],
      ['life_group_task', 'paz://tarefa/7f1c0a52-aaaa-bbbb-cccc-1234567890ab'],
      ['life_group_study', 'paz://estudo-do-life/study-1'],
      ['forms', 'paz://form/relatorio-semanal'],
      ['events', 'paz://agenda/9'],
      ['member_journey', 'paz://journey'],
    ];

    it.each(cases)(
      'forwards %s deep link under data.deep_link only, as a string',
      async (category, deepLink) => {
        const service = new NotificationDispatchService(
          entityManager,
          fcmService,
          emailService,
          smsService,
          whatsAppService,
        );

        await service.dispatch(makeNotification({ category, deepLink }), [
          makeUser(),
        ]);

        const call = sendToUser.mock.calls[0] as [
          number,
          { data: Record<string, unknown> },
        ];
        // Clients read exactly `deep_link` and `channel_id`; do not rename.
        expect(Object.keys(call[1].data).sort()).toEqual([
          'channel_id',
          'deep_link',
        ]);
        expect(call[1].data.deep_link).toBe(deepLink);
        expect(typeof call[1].data.channel_id).toBe('string');
      },
    );
  });
});

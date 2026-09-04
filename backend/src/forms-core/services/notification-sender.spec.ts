const sendMock = jest.fn().mockResolvedValue({});
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send: sendMock } })),
}));

import { Test } from '@nestjs/testing';
import { ChurchSettingsService } from './church-settings.service';
import { ResendNotificationSender } from './notification-sender';

describe('ResendNotificationSender', () => {
  let sender: ResendNotificationSender;

  const originalApiKey = process.env.RESEND_API_KEY;

  beforeEach(async () => {
    process.env.RESEND_API_KEY = 'test-api-key';
    sendMock.mockClear();
    const m = await Test.createTestingModule({
      providers: [
        ResendNotificationSender,
        {
          provide: ChurchSettingsService,
          useValue: {
            getContactEmail: jest
              .fn()
              .mockResolvedValue('contato@igrejapaz.com.br'),
          },
        },
      ],
    }).compile();
    sender = m.get(ResendNotificationSender);
  });

  afterAll(() => {
    process.env.RESEND_API_KEY = originalApiKey;
  });

  it('sends email using the church contact email as from', async () => {
    await sender.sendEmail({ to: 'a@b.com', subject: 'Hi', html: '<p>x</p>' });
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'contato@igrejapaz.com.br',
        to: 'a@b.com',
      }),
    );
  });

  it('does not throw when send fails', async () => {
    sendMock.mockRejectedValueOnce(new Error('boom'));
    await expect(
      sender.sendEmail({ to: 'a@b.com', subject: 's', html: 'h' }),
    ).resolves.toBeUndefined();
  });
});

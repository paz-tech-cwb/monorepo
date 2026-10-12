import * as admin from 'firebase-admin';
import { FcmService } from './fcm.service';

jest.mock('firebase-admin', () => ({
  apps: [{}],
  messaging: jest.fn(),
  initializeApp: jest.fn(),
  credential: { cert: jest.fn() },
}));

describe('FcmService.sendToUser payload shape', () => {
  const send = jest.fn().mockResolvedValue('msg-id');
  const findAllForUser = jest.fn();
  const markUsed = jest.fn();
  const removeStaleToken = jest.fn();
  const tokens = {
    findAllForUser,
    markUsed,
    removeStaleToken,
  } as never;

  beforeEach(() => {
    jest.clearAllMocks();
    (admin.messaging as unknown as jest.Mock).mockReturnValue({ send });
    findAllForUser.mockResolvedValue([{ token: 'tok-1' }]);
  });

  it('sends a notification block plus top-level data keys and the Android channel', async () => {
    const service = new FcmService(tokens);
    const ok = await service.sendToUser(1, {
      title: 'Presença',
      body: 'Registre a presença',
      data: {
        channel_id: 'paz_life_group',
        deep_link: 'paz://presenca/42/2026-10-05',
      },
      androidChannelId: 'paz_life_group',
    });

    expect(ok).toBe(true);
    expect(send).toHaveBeenCalledWith({
      token: 'tok-1',
      notification: { title: 'Presença', body: 'Registre a presença' },
      // On iOS these land at the top level of userInfo (next to `aps`);
      // on Android background taps they become Intent extras with the same keys.
      data: {
        channel_id: 'paz_life_group',
        deep_link: 'paz://presenca/42/2026-10-05',
      },
      android: { notification: { channelId: 'paz_life_group' } },
    });
  });
});

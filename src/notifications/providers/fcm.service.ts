import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { UserDeviceTokensService } from '../../users/user-device-tokens.service';

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);

  constructor(private readonly deviceTokensService: UserDeviceTokensService) {}

  onModuleInit() {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    }
  }

  /**
   * Send push notification to all FCM tokens for a given user.
   * Returns true if at least one token received the message.
   */
  async sendToUser(
    userId: number,
    payload: { title: string; body: string; data?: Record<string, string> },
  ): Promise<boolean> {
    const tokens = await this.deviceTokensService.findAllForUser(userId);
    if (tokens.length === 0) return false;

    let anySuccess = false;
    for (const deviceToken of tokens) {
      try {
        await admin.messaging().send({
          token: deviceToken.token,
          notification: { title: payload.title, body: payload.body },
          data: payload.data,
        });
        await this.deviceTokensService.markUsed(deviceToken.token);
        anySuccess = true;
      } catch (err: unknown) {
        const code = (err as { code?: string }).code ?? '';
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token'
        ) {
          this.logger.warn(`Removing stale FCM token for user ${userId}`);
          await this.deviceTokensService.removeStaleToken(deviceToken.token);
        } else {
          this.logger.error(`FCM send failed for user ${userId}: ${code}`);
        }
      }
    }
    return anySuccess;
  }
}

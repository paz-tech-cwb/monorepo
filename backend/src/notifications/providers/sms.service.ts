import { Injectable, Logger } from '@nestjs/common';
import twilio, { Twilio } from 'twilio';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly client: Twilio | null;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!accountSid || !authToken || !process.env.TWILIO_FROM_NUMBER) {
      this.logger.warn(
        'Twilio env vars not configured — SMS delivery disabled',
      );
      this.client = null;
      return;
    }

    this.client = twilio(accountSid, authToken);
  }

  async sendToUser(
    phoneNumber: string | null,
    payload: { title: string; body: string },
  ): Promise<boolean> {
    if (!phoneNumber) return false;
    if (!this.client) return false;
    try {
      await this.client.messages.create({
        body: `${payload.title}\n\n${payload.body}`,
        from: process.env.TWILIO_FROM_NUMBER,
        to: phoneNumber,
      });
      return true;
    } catch (err: unknown) {
      this.logger.error(
        `SMS send failed to ${phoneNumber}: ${(err as Error).message}`,
      );
      return false;
    }
  }
}

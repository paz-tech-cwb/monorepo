import { Injectable, Logger } from '@nestjs/common';
import twilio, { Twilio } from 'twilio';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly client: Twilio;

  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );
  }

  async sendToUser(
    phoneNumber: string | null,
    payload: { title: string; body: string },
  ): Promise<boolean> {
    if (!phoneNumber) return false;
    try {
      await this.client.messages.create({
        body: `${payload.title}\n\n${payload.body}`,
        from: process.env.TWILIO_FROM_NUMBER,
        to: phoneNumber,
      });
      return true;
    } catch (err: unknown) {
      this.logger.error(`SMS send failed to ${phoneNumber}: ${(err as Error).message}`);
      return false;
    }
  }
}

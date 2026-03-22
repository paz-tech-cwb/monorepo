import { Injectable, Logger } from '@nestjs/common';
import twilio from 'twilio';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  async sendToUser(
    phoneNumber: string | null,
    payload: { title: string; body: string },
  ): Promise<boolean> {
    if (!phoneNumber) return false;
    try {
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN,
      );
      await client.messages.create({
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

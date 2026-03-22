import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async sendToUser(
    userEmail: string | null,
    payload: { title: string; body: string },
  ): Promise<boolean> {
    if (!userEmail) return false;
    try {
      await this.resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'noreply@pazchurch.com.br',
        to: userEmail,
        subject: payload.title,
        text: payload.body,
      });
      return true;
    } catch (err: unknown) {
      this.logger.error(`Email send failed to ${userEmail}: ${(err as Error).message}`);
      return false;
    }
  }
}

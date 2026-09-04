import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      this.logger.warn(
        'RESEND_API_KEY not configured — email delivery disabled',
      );
      this.resend = null;
      return;
    }

    this.resend = new Resend(apiKey);
  }

  async sendToUser(
    userEmail: string | null,
    payload: { title: string; body: string },
  ): Promise<boolean> {
    if (!userEmail) return false;
    if (!this.resend) return false;
    try {
      await this.resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'noreply@pazchurch.com.br',
        to: userEmail,
        subject: payload.title,
        text: payload.body,
      });
      return true;
    } catch (err: unknown) {
      this.logger.error(
        `Email send failed to ${userEmail}: ${(err as Error).message}`,
      );
      return false;
    }
  }
}

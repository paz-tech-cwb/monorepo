import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { ChurchSettingsService } from './church-settings.service';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export abstract class NotificationSender {
  abstract sendEmail(payload: EmailPayload): Promise<void>;
  abstract sendWhatsApp(to: string, body: string): Promise<void>;
}

@Injectable()
export class ResendNotificationSender extends NotificationSender {
  private readonly logger = new Logger(ResendNotificationSender.name);
  private readonly resend: Resend | null;

  constructor(private readonly settings: ChurchSettingsService) {
    super();

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY not configured — email delivery disabled');
      this.resend = null;
      return;
    }

    this.resend = new Resend(apiKey);
  }

  async sendEmail({ to, subject, html }: EmailPayload): Promise<void> {
    if (!this.resend) {
      return;
    }

    const from = await this.settings.getContactEmail();
    try {
      await this.resend.emails.send({ from, to, subject, html });
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}`, err as Error);
    }
  }

  async sendWhatsApp(_to: string, _body: string): Promise<void> {
    this.logger.warn('WhatsApp deferred to v2 — noop');
  }
}

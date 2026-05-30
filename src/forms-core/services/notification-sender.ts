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
  private readonly resend = new Resend(process.env.RESEND_API_KEY);

  constructor(private readonly settings: ChurchSettingsService) { super(); }

  async sendEmail({ to, subject, html }: EmailPayload): Promise<void> {
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

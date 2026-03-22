import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  async sendToUser(
    phoneNumber: string | null,
    payload: { title: string; body: string },
  ): Promise<boolean> {
    if (!phoneNumber) return false;
    const token = process.env.META_WHATSAPP_TOKEN;
    const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId) {
      this.logger.warn('WhatsApp env vars not configured — skipping');
      return false;
    }

    try {
      const res = await fetch(
        `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: phoneNumber.replace(/\D/g, ''),
            type: 'text',
            text: { body: `*${payload.title}*\n\n${payload.body}` },
          }),
        },
      );
      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`WhatsApp send failed to ${phoneNumber}: HTTP ${res.status} — ${body}`);
        return false;
      }
      return true;
    } catch (err: unknown) {
      this.logger.error(`WhatsApp send failed to ${phoneNumber}: ${(err as Error).message}`);
      return false;
    }
  }
}

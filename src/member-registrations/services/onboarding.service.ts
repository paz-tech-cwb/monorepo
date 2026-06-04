import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { NotificationSender } from '../../forms-core/services/notification-sender';
import { MemberRegistration } from '../entities/member-registration.entity';

@Injectable()
export class OnboardingService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly notifications: NotificationSender,
  ) {}

  async onSubmit(reg: MemberRegistration): Promise<void> {
    let user = await this.users.findOne({
      where: [{ email: reg.email }, { phoneNumber: reg.phone }],
    });
    if (!user) {
      user = this.users.create({
        email: reg.email,
        name: reg.fullName,
        phoneNumber: reg.phone,
        birthDate: new Date(reg.birthDate),
        status: 'pending_first_login',
      });
    } else {
      user.name = reg.fullName;
      user.phoneNumber = reg.phone;
    }
    await this.users.save(user);
    const escHtml = (s: string) =>
      s.replace(
        /[&<>"']/g,
        (c) =>
          ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
          })[c] ?? c,
      );
    void this.notifications.sendEmail({
      to: reg.email,
      subject: 'Bem-vindo à Igreja Paz Curitiba',
      html: `<h1>Olá, ${escHtml(reg.fullName)}!</h1><p>Seu cadastro foi recebido. Baixe o app Paz Curitiba.</p>`,
    });
  }
}

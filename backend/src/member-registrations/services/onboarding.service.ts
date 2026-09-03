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
    if (!reg.phone) return;
    let user = await this.users.findOne({ where: { phoneNumber: reg.phone } });
    if (!user) {
      user = this.users.create({
        name: reg.fullName,
        phoneNumber: reg.phone,
        birthDate: new Date(reg.birthDate),
        status: 'pending_first_login',
      });
    } else {
      user.name = reg.fullName;
    }
    await this.users.save(user);
  }
}

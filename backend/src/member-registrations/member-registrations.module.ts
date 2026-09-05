import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MemberRegistration } from './entities/member-registration.entity';
import { MemberRegistrationsService } from './member-registrations.service';
import { MemberRegistrationsController } from './member-registrations.controller';
import { OnboardingService } from './services/onboarding.service';
import { FormsCoreModule } from '../forms-core/forms-core.module';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MemberRegistration, User]),
    FormsCoreModule,
  ],
  controllers: [MemberRegistrationsController],
  providers: [MemberRegistrationsService, OnboardingService],
})
export class MemberRegistrationsModule {}

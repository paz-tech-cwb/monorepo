import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AnnouncementsModule } from './announcements/announcements.module';
import { ContributionsModule } from './contributions/contributions.module';
import { EventsModule } from './events/events.module';
import { HomeModule } from './home/home.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { AddressesModule } from './addresses/addresses.module';
import { AuthModule } from './auth/auth.module';
import { CoursesModule } from './courses/courses.module';
import { AcademyModule } from './academy/academy.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ChurchModule } from './church/church.module';
import { MemberJourneyModule } from './member-journey/member-journey.module';
import { AdminDashboardModule } from './admin-dashboard/admin-dashboard.module';
import { AreasModule } from './areas/areas.module';
import { SectorsModule } from './sectors/sectors.module';
import { LifeGroupsModule } from './life-groups/life-groups.module';
import { MeetingReportsModule } from './meeting-reports/meeting-reports.module';
import { ConversionsModule } from './conversions/conversions.module';

import ormconfig from './configs/orm.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'short',
          ttl: 60000, // 1 minute
          limit: 20, // 20 requests per minute
        },
        {
          name: 'long',
          ttl: 3600000, // 1 hour
          limit: 500, // 500 requests per hour
        },
      ],
    }),
    TypeOrmModule.forRoot(ormconfig),
    AuthModule,
    HomeModule,
    AnnouncementsModule,
    ContributionsModule,
    EventsModule,
    UsersModule,
    RolesModule,
    AddressesModule,
    CoursesModule,
    AcademyModule,
    NotificationsModule,
    ChurchModule,
    MemberJourneyModule,
    AdminDashboardModule,
    AreasModule,
    SectorsModule,
    LifeGroupsModule,
    MeetingReportsModule,
    ConversionsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

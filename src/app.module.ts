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

import ormconfig from './configs/orm.config';
import { Announcement } from './announcements/entities/announcement.entity';
import { Contribution } from './contributions/entities/contribution.entity';

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
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: '172.28.226.169', // or 'localhost' in dev env
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'postgres',
      entities: [Announcement, Contribution, Event],
      migrations: ['dist/migrations/*.js'],
      synchronize: false, // 🚫 do not use in prod
    }),
    HomeModule,
    AnnouncementsModule,
    ContributionsModule,
    EventsModule,
    UsersModule,
    RolesModule,
    AddressesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }

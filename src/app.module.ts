import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnnouncementsModule } from './announcements/announcements.module';
import { ContributionsModule } from './contributions/contributions.module';
import { EventsModule } from './events/events.module';
import { HomeModule } from './home/home.module';
import { Announcement } from './announcements/entities/announcement.entity';
import { Contribution } from './contributions/entities/contribution.entity';
import { Event } from './events/entities/event.entity';

@Module({
  imports: [
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
	EventsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

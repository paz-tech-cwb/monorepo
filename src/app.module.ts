import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Section } from './home/entities/section.entity';
import { Announcement } from './home/entities/announcement.entity';
import { Contribution } from './home/entities/contribution.entity';
import { Event } from './home/entities/event.entity';
import { HomeModule } from './home/home.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { ContributionsModule } from './contributions/contributions.module';
import { EventsModule } from './events/events.module';
import { SectionsModule } from './sections/sections.module';
import { HomeModule } from './home/home.module';

@Module({
  imports: [
	TypeOrmModule.forRoot({
		type: 'postgres',
		host: '172.28.226.169', // or 'localhost' in dev env
		port: 5432,
		username: 'postgres',
		password: 'postgres',
		database: 'postgres',
		entities: [Section, Announcement, Contribution, Event],
		migrations: ['dist/migrations/*.js'],
		synchronize: false, // 🚫 do not use in prod
	}),
	HomeModule,
	AnnouncementsModule,
	ContributionsModule,
	EventsModule,
	SectionsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

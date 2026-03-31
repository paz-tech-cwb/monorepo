import { Module } from '@nestjs/common';
import { HomeService } from './home.service';
import { HomeController } from './home.controller';
import { AnnouncementsService } from 'src/announcements/announcements.service';
import { ContributionsService } from 'src/contributions/contributions.service';
import { EventsService } from 'src/events/events.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from 'src/events/entities/event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Event])],
  controllers: [HomeController],
  providers: [
    HomeService,
    AnnouncementsService,
    ContributionsService,
    EventsService,
  ],
})
export class HomeModule {}

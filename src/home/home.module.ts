import { Module } from '@nestjs/common';
import { HomeService } from './home.service';
import { HomeController } from './home.controller';
import { AnnouncementsService } from 'src/announcements/announcements.service';
import { ContributionsService } from 'src/contributions/contributions.service';

@Module({
  controllers: [HomeController],
  providers: [HomeService, AnnouncementsService, ContributionsService],
})
export class HomeModule {}

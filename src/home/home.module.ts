import { Module } from '@nestjs/common';
import { HomeService } from './home.service';
import { HomeController } from './home.controller';
import { AnnouncementsService } from 'src/announcements/announcements.service';

@Module({
  controllers: [HomeController],
  providers: [HomeService, AnnouncementsService],
})
export class HomeModule {}

import { Module } from '@nestjs/common';
import { MemberJourneyService } from './member-journey.service';
import { MemberJourneyController } from './member-journey.controller';

@Module({
  controllers: [MemberJourneyController],
  providers: [MemberJourneyService],
})
export class MemberJourneyModule {}

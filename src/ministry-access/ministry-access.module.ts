import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ministry } from '../ministries/entities/ministry.entity';
import { MinistryTeam } from '../ministries/entities/ministry-team.entity';
import { MinistryAccessService } from './ministry-access.service';

@Module({
  imports: [TypeOrmModule.forFeature([Ministry, MinistryTeam])],
  providers: [MinistryAccessService],
  exports: [MinistryAccessService],
})
export class MinistryAccessModule {}

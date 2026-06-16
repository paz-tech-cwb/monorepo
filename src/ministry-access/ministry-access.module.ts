import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ministry } from '../ministries/entities/ministry.entity';
import { MinistryTeam } from '../ministries/entities/ministry-team.entity';
import { MinistryAccessService } from './ministry-access.service';
import { MinistryFormGuard } from './ministry-form.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Ministry, MinistryTeam])],
  providers: [MinistryAccessService, MinistryFormGuard],
  exports: [MinistryAccessService, MinistryFormGuard],
})
export class MinistryAccessModule {}

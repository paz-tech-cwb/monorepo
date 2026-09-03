import { Module } from '@nestjs/common';
import { LifeGroupsService } from './life-groups.service';
import { LifeGroupsController } from './life-groups.controller';

@Module({
  controllers: [LifeGroupsController],
  providers: [LifeGroupsService],
  exports: [LifeGroupsService],
})
export class LifeGroupsModule {}

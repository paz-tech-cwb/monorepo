import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GuestOrigin } from './entities/guest-origin.entity';
import { GuestOriginsService } from './guest-origins.service';
import { GuestOriginsController } from './guest-origins.controller';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GuestOrigin, User])],
  controllers: [GuestOriginsController],
  providers: [GuestOriginsService],
  exports: [GuestOriginsService],
})
export class GuestOriginsModule {}

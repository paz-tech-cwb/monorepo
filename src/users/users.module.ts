import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UserDeviceTokensService } from './user-device-tokens.service';
import { UserNotificationPreferencesService } from './user-notification-preferences.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UserDeviceTokensService, UserNotificationPreferencesService],
  exports: [UserDeviceTokensService, UserNotificationPreferencesService],
})
export class UsersModule {}

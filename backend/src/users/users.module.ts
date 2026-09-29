import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UserDeviceTokensService } from './user-device-tokens.service';
import { UserNotificationPreferencesService } from './user-notification-preferences.service';
import { GuestsService } from './guests.service';
import { FormsCoreModule } from '../forms-core/forms-core.module';

@Module({
  imports: [FormsCoreModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    UserDeviceTokensService,
    UserNotificationPreferencesService,
    GuestsService,
  ],
  exports: [
    UsersService,
    UserDeviceTokensService,
    UserNotificationPreferencesService,
  ],
})
export class UsersModule {}

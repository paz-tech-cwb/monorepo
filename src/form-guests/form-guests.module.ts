import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormGuest } from './entities/form-guest.entity';
import { FormsCoreModule } from '../forms-core/forms-core.module';
import { FormGuestsService } from './form-guests.service';
import { FormGuestsController } from './form-guests.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FormGuest]), FormsCoreModule],
  controllers: [FormGuestsController],
  providers: [FormGuestsService],
})
export class FormGuestsModule {}

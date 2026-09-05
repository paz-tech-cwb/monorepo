import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormConversion } from './entities/form-conversion.entity';
import { FormsCoreModule } from '../forms-core/forms-core.module';
import { FormConversionsService } from './form-conversions.service';
import { FormConversionsController } from './form-conversions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FormConversion]), FormsCoreModule],
  controllers: [FormConversionsController],
  providers: [FormConversionsService],
})
export class FormConversionsModule {}

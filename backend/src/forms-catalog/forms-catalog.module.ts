import { Module } from '@nestjs/common';
import { FormsCatalogService } from './forms-catalog.service';
import { FormsCatalogController } from './forms-catalog.controller';
import { MinistryAccessModule } from '../ministry-access/ministry-access.module';

@Module({
  imports: [MinistryAccessModule],
  controllers: [FormsCatalogController],
  providers: [FormsCatalogService],
  exports: [FormsCatalogService],
})
export class FormsCatalogModule {}

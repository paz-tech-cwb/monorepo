import { Module } from '@nestjs/common';
import { FormsCatalogService } from './forms-catalog.service';
import { FormsCatalogController } from './forms-catalog.controller';

@Module({
  controllers: [FormsCatalogController],
  providers: [FormsCatalogService],
  exports: [FormsCatalogService],
})
export class FormsCatalogModule {}

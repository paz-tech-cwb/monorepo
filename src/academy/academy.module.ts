import { Module } from '@nestjs/common';
import { AcademyService } from './academy.service';
import { AcademyController } from './academy.controller';

@Module({
  controllers: [AcademyController],
  providers: [AcademyService],
})
export class AcademyModule {}

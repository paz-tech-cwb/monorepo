import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CasaDePazLesson } from './entities/casa-de-paz-lesson.entity';
import { CasaDePazLessonsService } from './casa-de-paz-lessons.service';
import { CasaDePazLessonsController } from './casa-de-paz-lessons.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CasaDePazLesson])],
  controllers: [CasaDePazLessonsController],
  providers: [CasaDePazLessonsService],
  exports: [CasaDePazLessonsService],
})
export class CasaDePazLessonsModule {}

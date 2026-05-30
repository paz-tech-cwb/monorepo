import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormCourse } from './entities/form-course.entity';
import { FormCourseLink } from './entities/form-course-link.entity';
import { FormCoursesService } from './form-courses.service';
import { FormCoursesController } from './form-courses.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FormCourse, FormCourseLink])],
  controllers: [FormCoursesController],
  providers: [FormCoursesService],
  exports: [FormCoursesService],
})
export class FormCoursesModule {}

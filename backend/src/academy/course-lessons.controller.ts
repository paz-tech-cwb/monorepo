import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CourseLessonsService } from './course-lessons.service';
import { CreateCourseLessonDto } from './dto/create-course-lesson.dto';
import { UpdateCourseLessonDto } from './dto/update-course-lesson.dto';
import { ReorderCourseLessonsDto } from './dto/reorder-course-lessons.dto';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin')
@SerializeOptions({
  strategy: 'exposeAll',
  excludeExtraneousValues: false,
})
@Controller('courses/:courseId/lessons')
export class CourseLessonsController {
  constructor(private readonly courseLessonsService: CourseLessonsService) {}

  @Get()
  findAll(@Param('courseId') courseId: string) {
    return this.courseLessonsService.findAllForCourse(courseId);
  }

  @Post()
  create(
    @Param('courseId') courseId: string,
    @Body() dto: CreateCourseLessonDto,
  ) {
    return this.courseLessonsService.create(courseId, dto);
  }

  @Put('reorder')
  reorder(
    @Param('courseId') courseId: string,
    @Body() dto: ReorderCourseLessonsDto,
  ) {
    return this.courseLessonsService.reorder(courseId, dto);
  }

  @Put(':lessonId')
  update(
    @Param('courseId') courseId: string,
    @Param('lessonId') lessonId: string,
    @Body() dto: UpdateCourseLessonDto,
  ) {
    return this.courseLessonsService.update(courseId, lessonId, dto);
  }

  @Delete(':lessonId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('courseId') courseId: string,
    @Param('lessonId') lessonId: string,
  ) {
    return this.courseLessonsService.remove(courseId, lessonId);
  }
}

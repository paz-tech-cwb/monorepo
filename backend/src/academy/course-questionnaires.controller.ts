import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CourseQuestionnairesService } from './course-questionnaires.service';
import { UpsertCourseQuestionnaireDto } from './dto/upsert-course-questionnaire.dto';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin')
@SerializeOptions({
  strategy: 'exposeAll',
  excludeExtraneousValues: false,
})
@Controller('courses/:courseId/questionnaire')
export class CourseQuestionnairesController {
  constructor(
    private readonly courseQuestionnairesService: CourseQuestionnairesService,
  ) {}

  @Get()
  findOne(@Param('courseId') courseId: string) {
    return this.courseQuestionnairesService.findForCourseAdmin(courseId);
  }

  @Put()
  upsert(
    @Param('courseId') courseId: string,
    @Body() dto: UpsertCourseQuestionnaireDto,
  ) {
    return this.courseQuestionnairesService.upsertForCourse(courseId, dto);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('courseId') courseId: string) {
    return this.courseQuestionnairesService.removeForCourse(courseId);
  }
}

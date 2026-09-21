import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { AcademyService } from './academy.service';
import { CourseProgressService } from './course-progress.service';
import { CourseQuestionnairesService } from './course-questionnaires.service';
import { ReportLessonProgressDto } from './dto/report-lesson-progress.dto';
import { SubmitQuestionnaireDto } from './dto/submit-questionnaire.dto';

type AuthedRequest = Request & { user: { id: number } };

@UseGuards(AuthGuard('jwt'))
@SerializeOptions({
  strategy: 'exposeAll',
  excludeExtraneousValues: false,
})
@Controller('academy')
export class AcademyController {
  constructor(
    private readonly academyService: AcademyService,
    private readonly courseProgressService: CourseProgressService,
    private readonly courseQuestionnairesService: CourseQuestionnairesService,
  ) {}

  @Get()
  getAcademy(@Req() req: AuthedRequest) {
    return this.academyService.getAcademy(req.user.id);
  }

  @Get('courses/:courseId')
  getCourseDetail(
    @Param('courseId') courseId: string,
    @Req() req: AuthedRequest,
  ) {
    return this.academyService.getCourseDetail(req.user.id, courseId);
  }

  @Post('lessons/:lessonId/progress')
  reportProgress(
    @Param('lessonId') lessonId: string,
    @Body() dto: ReportLessonProgressDto,
    @Req() req: AuthedRequest,
  ) {
    return this.courseProgressService.reportProgress(
      req.user.id,
      lessonId,
      dto,
    );
  }

  @Get('courses/:courseId/questionnaire')
  async getQuestionnaire(
    @Param('courseId') courseId: string,
    @Req() req: AuthedRequest,
  ) {
    const unlocked = await this.courseProgressService.isQuestionnaireUnlocked(
      req.user.id,
      courseId,
    );
    if (!unlocked) {
      throw new ForbiddenException({
        code: 'COURSE_NOT_WATCHED',
        message:
          'All lessons for this course must be watched to at least 90% before viewing the questionnaire.',
      });
    }
    return this.courseQuestionnairesService.findForCourseMember(courseId);
  }

  @Post('courses/:courseId/questionnaire/submit')
  submitQuestionnaire(
    @Param('courseId') courseId: string,
    @Body() dto: SubmitQuestionnaireDto,
    @Req() req: AuthedRequest,
  ) {
    return this.courseProgressService.submitQuestionnaire(
      req.user.id,
      courseId,
      dto.answers,
    );
  }
}

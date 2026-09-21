import { Module } from '@nestjs/common';
import { AcademyService } from './academy.service';
import { AcademyController } from './academy.controller';
import { CourseLessonsService } from './course-lessons.service';
import { CourseLessonsController } from './course-lessons.controller';
import { CourseQuestionnairesService } from './course-questionnaires.service';
import { CourseQuestionnairesController } from './course-questionnaires.controller';
import { CourseProgressService } from './course-progress.service';
import { CourseCertificatesService } from './course-certificates.service';
import { CourseCertificatesController } from './course-certificates.controller';
import { CourseTracksService } from './course-tracks.service';
import { CourseTracksController } from './course-tracks.controller';
import { MemberJourneyModule } from '../member-journey/member-journey.module';

@Module({
  imports: [MemberJourneyModule],
  controllers: [
    AcademyController,
    CourseLessonsController,
    CourseQuestionnairesController,
    CourseCertificatesController,
    CourseTracksController,
  ],
  providers: [
    AcademyService,
    CourseLessonsService,
    CourseQuestionnairesService,
    CourseProgressService,
    CourseCertificatesService,
    CourseTracksService,
  ],
})
export class AcademyModule {}

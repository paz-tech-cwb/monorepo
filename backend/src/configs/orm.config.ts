import { DataSourceOptions } from 'typeorm';
import { Announcement } from '../announcements/entities/announcement.entity';
import { Address } from '../addresses/entities/address.entity';
import { Role } from '../roles/entities/role.entity';
import { Contribution } from '../contributions/entities/contribution.entity';
import { Event } from '../events/entities/event.entity';
import { User } from '../users/entities/user.entity';
import { UserAccount } from '../users/entities/account.entity';
import { Course } from '../courses/entities/course.entity';
import { CourseTrack } from '../academy/entities/course-track.entity';
import { CourseTrackCourse } from '../academy/entities/course-track-course.entity';
import { CourseLesson } from '../academy/entities/course-lesson.entity';
import { CourseQuestionnaire } from '../academy/entities/course-questionnaire.entity';
import { CourseQuestion } from '../academy/entities/course-question.entity';
import { CourseQuestionOption } from '../academy/entities/course-question-option.entity';
import { CourseLessonProgress } from '../academy/entities/course-lesson-progress.entity';
import { CourseQuestionnaireResponse } from '../academy/entities/course-questionnaire-response.entity';
import { CourseCertificate } from '../academy/entities/course-certificate.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { Church } from '../church/entities/church.entity';
import { Area } from '../areas/entities/area.entity';
import { Sector } from '../sectors/entities/sector.entity';
import { LifeGroup } from '../life-groups/entities/life-group.entity';
import { MeetingReport } from '../meeting-reports/entities/meeting-report.entity';
import { Conversion } from '../conversions/entities/conversion.entity';
import { UserDeviceToken } from '../users/entities/user-device-token.entity';
import { UserNotificationPreferences } from '../users/entities/user-notification-preferences.entity';
import { FormSubmissionAuditLog } from '../forms-core/entities/form-submission-audit-log.entity';
import { ChurchSetting } from '../forms-core/entities/church-setting.entity';
import { FormCourse } from '../form-courses/entities/form-course.entity';
import { FormCourseLink } from '../form-courses/entities/form-course-link.entity';
import { MemberRegistration } from '../member-registrations/entities/member-registration.entity';
import { FormConversion } from '../form-conversions/entities/form-conversion.entity';
import { LifeGroupReport } from '../life-group-reports/entities/life-group-report.entity';
import { CasaDePazReport } from '../casa-de-paz-reports/entities/casa-de-paz-report.entity';
import { SectorSupervisorReport } from '../sector-supervisor-reports/entities/sector-supervisor-report.entity';
import { AreaSupervisorReport } from '../area-supervisor-reports/entities/area-supervisor-report.entity';
import { Multiplication } from '../multiplications/entities/multiplication.entity';
import { ServiceReport } from '../service-reports/entities/service-report.entity';
import { LifeGroupStudy } from '../life-group-studies/entities/life-group-study.entity';
import { LifeGroupStudyPublisher } from '../life-group-studies/entities/life-group-study-publisher.entity';
import { LifeGroupAttendance } from '../life-group-attendance/entities/life-group-attendance.entity';
import { LifeGroupAttendanceEntry } from '../life-group-attendance/entities/life-group-attendance-entry.entity';
import { FormGuest } from '../form-guests/entities/form-guest.entity';
import { Ministry } from '../ministries/entities/ministry.entity';
import { MinistryTeam } from '../ministries/entities/ministry-team.entity';
import { ReminderRule } from '../reminders/entities/reminder-rule.entity';
import { ReminderDispatchLog } from '../reminders/entities/reminder-dispatch-log.entity';
import { AuditLog } from '../auth/entities/audit-log.entity';
import { JourneyTrack } from '../journey-tracks/entities/journey-track.entity';
import { JourneyTrackStep } from '../journey-tracks/entities/journey-track-step.entity';
import { MemberJourneyStepProgress } from '../journey-tracks/entities/member-journey-step-progress.entity';
import * as dotenv from 'dotenv';
dotenv.config();

const config: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME,
  entities: [
    Announcement,
    Address,
    Role,
    Contribution,
    Event,
    User,
    UserAccount,
    Course,
    CourseTrack,
    Notification,
    Church,
    Area,
    Sector,
    LifeGroup,
    MeetingReport,
    Conversion,
    UserDeviceToken,
    UserNotificationPreferences,
    FormSubmissionAuditLog,
    ChurchSetting,
    FormCourse,
    FormCourseLink,
    MemberRegistration,
    FormConversion,
    LifeGroupReport,
    SectorSupervisorReport,
    AreaSupervisorReport,
    Multiplication,
    ServiceReport,
    FormGuest,
    Ministry,
    MinistryTeam,
    ReminderRule,
    ReminderDispatchLog,
    AuditLog,
    LifeGroupStudy,
    LifeGroupStudyPublisher,
    LifeGroupAttendance,
    LifeGroupAttendanceEntry,
    CasaDePazReport,
    CourseTrackCourse,
    CourseLesson,
    CourseQuestionnaire,
    CourseQuestion,
    CourseQuestionOption,
    CourseLessonProgress,
    CourseQuestionnaireResponse,
    CourseCertificate,
    JourneyTrack,
    JourneyTrackStep,
    MemberJourneyStepProgress,
  ],
  migrations: ['dist/migrations/*.js'],
  migrationsTransactionMode: 'each',
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  logging: process.env.DB_LOGGING === 'true',
};

export default config;
